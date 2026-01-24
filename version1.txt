import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  sendEmailVerification,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "firebase/auth";
import {
  doc, updateDoc, getDoc, deleteDoc, collection,
  query, where, getDocs, addDoc, serverTimestamp,
  orderBy, onSnapshot, arrayUnion, arrayRemove
} from "firebase/firestore";
import { fetchDDragon } from "../utils/fetchDDragon";

const REGIONS = [
  { value: "na1", label: "NA" },
  { value: "euw1", label: "EUW" },
  { value: "eun1", label: "EUNE" },
  { value: "kr", label: "KR" },
  { value: "br1", label: "BR" },
  { value: "la1", label: "LAN" },
  { value: "la2", label: "LAS" },
  { value: "oc1", label: "OCE" },
  { value: "ru", label: "RU" },
  { value: "tr1", label: "TR" },
  { value: "jp1", label: "JP" },
  { value: "ph2", label: "PH" },
  { value: "sg2", label: "SG" },
  { value: "th2", label: "TH" },
  { value: "tw2", label: "TW" },
  { value: "vn2", label: "VN" }
];

const RankedInfo = ({ rankedData }) => {
  const getRankIcon = (tier) => tier ? `/rank-icons/Rank=${tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase()}.png` : null;

  const getQueueData = (queueType) => {
    return rankedData?.find(queue => queue.queueType === queueType);
  };

  const renderRankCard = (queue, queueName) => {
    if (!queue) return (
      <div className="rank-card">
        <div className="queue-name">{queueName}</div>
        <div className="unranked">Unranked</div>
      </div>
    );
    const totalGames = queue.wins + queue.losses;
    const winRate = totalGames > 0 ? Math.round((queue.wins / totalGames) * 100) : 0;
    return (
      <div className="rank-card">
        <div className="rank-info">
          {getRankIcon(queue.tier) && <img src={getRankIcon(queue.tier)} alt={`${queue.tier} icon`} className="rank-icon" />}
          <div className="rank-details">
            <div className="tier">{queue.tier} {queue.rank}</div>
            <div className="queue-label">{queueName}</div>
            <div className="stats">
              <div className="lp">{queue.leaguePoints} LP</div>
              <div className="winrate">{winRate}% WR</div>
              <div className="games">{totalGames}G</div>
            </div>
            <div className="record">{queue.wins}W {queue.losses}L</div>
          </div>
        </div>
      </div>
    );
  };

  const rankedSolo = getQueueData('RANKED_SOLO_5x5');
  const rankedFlex = getQueueData('RANKED_FLEX_SR');

  return (
    <div className="ranked-container">
      {renderRankCard(rankedSolo, "Solo/Duo")}
      {renderRankCard(rankedFlex, "Flex")}
    </div>
  );
};

function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({
    user: null,
    uploading: false,
    profileImage: null,
    contextMenuPosition: null,
    linkingAccount: false,
    riotId: "",
    region: "euw1",
    linkedAccount: null,
    linkError: "",
    linkSuccess: "",
    rankedData: null,
    showDeleteConfirm: false,
    showReauthModal: false,
    password: "",
    reauthError: "",
    deletingAccount: false,
    latestVersion: "25.12",
    verificationLoading: false,
    emailVerificationSent: false,
    terminationButtonActive: false,
    ripple: false,
    profileData: null,
    isOwnProfile: true,
    aboutMe: "",
    isEditingAbout: false,
    tempAbout: "",
    menuOpen: false,
    accountInfoOpen: false,
    rankedUpdateLoading: false,
    lastUpdateTime: null,
    newPostContent: "",
    newPostImages: [], // Changed to array
    posts: [],
    creatingPost: false,
    loadingPosts: false,
    editingPostId: null,
    editContent: "",
    updatingPost: false,
    newCommentText: {}, // Map of postId -> currentComment
    postingCommentId: null,
    openCommentsPostId: null
  });

  const contextMenuRef = useRef(null);
  const fileInputRef = useRef(null);
  const postImageInputRef = useRef(null);
  const profileIconRef = useRef(null);
  const updateIntervalRef = useRef(null);
  const postsUnsubscribe = useRef(null);
  const menuRef = useRef(null);
  const hamburgerRef = useRef(null);
  const accountInfoModalRef = useRef(null);

  const fetchRankedDataAndUpdate = async (account, userId, isManualUpdate = false) => {
    if (!account || !userId) return;

    try {
      setState(prev => ({ ...prev, rankedUpdateLoading: true }));

      const response = await fetch(`http://localhost:3000/summoner-info/${account.region}/${encodeURIComponent(account.gameName)}/${encodeURIComponent(account.tagLine)}`);
      if (response.ok) {
        const summonerData = await response.json();
        const rankedData = summonerData.ranked || [];

        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
          rankedData: rankedData,
          lastRankedUpdate: new Date(),
          'riotAccount.summonerLevel': summonerData.summonerLevel,
          'riotAccount.profileIconId': summonerData.profileIconId
        });

        setState(prev => ({
          ...prev,
          rankedData: rankedData,
          rankedUpdateLoading: false,
          lastUpdateTime: new Date(),
          linkedAccount: prev.linkedAccount ? {
            ...prev.linkedAccount,
            summonerLevel: summonerData.summonerLevel,
            profileIconId: summonerData.profileIconId
          } : null
        }));

        if (isManualUpdate) {
          alert("Ranked data updated successfully!");
        }

        return rankedData;
      } else {
        setState(prev => ({ ...prev, rankedUpdateLoading: false }));
        throw new Error('Failed to fetch ranked data');
      }
    } catch (error) {
      console.error("Error fetching ranked data:", error);
      setState(prev => ({ ...prev, rankedUpdateLoading: false }));

      if (isManualUpdate) {
        alert("Failed to update ranked data. Please try again.");
      }
      throw error;
    }
  };

  const checkAndUpdateRankedData = async (userId, linkedAccount) => {
    if (!userId || !linkedAccount) return;

    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const lastUpdate = userData.lastRankedUpdate?.toDate ? userData.lastRankedUpdate.toDate() : null;
        const now = new Date();

        if (!lastUpdate || (now - lastUpdate) > 1800000) {
          await fetchRankedDataAndUpdate(linkedAccount, userId);
          console.log("Ranked data updated automatically (30 min interval)");
        } else {
          setState(prev => ({
            ...prev,
            rankedData: userData.rankedData || [],
            lastUpdateTime: lastUpdate
          }));
        }
      }
    } catch (error) {
      console.error("Error checking ranked data:", error);
    }
  };

  const handleManualRankedUpdate = async () => {
    if (!state.user || !state.linkedAccount || state.rankedUpdateLoading) return;

    try {
      await fetchRankedDataAndUpdate(state.linkedAccount, state.user.uid, true);
    } catch (error) {
      console.error("Error updating ranked data:", error);
    }
  };

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
  });

  const getSocialPreview = (content) => {
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const tiktokRegex = /(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com\/@[\w.-]+\/video\/\d+|vt\.tiktok\.com\/\w+)/;
    const instagramRegex = /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com\/(?:p|reels|reel)\/([\w-]+))/;

    const ytMatch = content.match(youtubeRegex);
    if (ytMatch) {
      return { type: 'youtube', id: ytMatch[1], thumbnail: `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg` };
    }

    const ttMatch = content.match(tiktokRegex);
    if (ttMatch) {
      return { type: 'tiktok', thumbnail: '/project-icons/social-placeholders/tiktok-preview.png' };
    }

    const igMatch = content.match(instagramRegex);
    if (igMatch) {
      return { type: 'instagram', thumbnail: '/project-icons/social-placeholders/instagram-preview.png' };
    }

    return null;
  };

  const createPost = async () => {
    if (!state.user || !state.newPostContent.trim() || state.creatingPost) return;

    try {
      setState(prev => ({ ...prev, creatingPost: true }));

      const socialPreview = getSocialPreview(state.newPostContent);

      const postData = {
        userId: state.user.uid,
        username: state.user.displayName || "Anonymous User",
        userProfileImage: state.profileImage || "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png",
        content: state.newPostContent.trim(),
        createdAt: serverTimestamp(),
        likes: [],
        dislikes: [],
        comments: [],
        mediaUrls: [],
        socialPreview: socialPreview || null,
        postImages: state.newPostImages || [], // Changed to array
        comments: []
      };

      await addDoc(collection(db, "posts"), postData);

      setState(prev => ({
        ...prev,
        newPostContent: "",
        newPostImages: [], // Changed to array
        creatingPost: false
      }));

      alert("Post created successfully!");
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post. Please try again.");
      setState(prev => ({ ...prev, creatingPost: false }));
    }
  };

  const deletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      await deleteDoc(doc(db, "posts", postId));
      alert("Post deleted successfully!");
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Failed to delete post.");
    }
  };

  const startEditingPost = (post) => {
    setState(prev => ({
      ...prev,
      editingPostId: post.id,
      editContent: post.content
    }));
  };

  const cancelEditingPost = () => {
    setState(prev => ({
      ...prev,
      editingPostId: null,
      editContent: ""
    }));
  };

  const updatePost = async (postId) => {
    if (!state.editContent.trim() || state.updatingPost) return;

    try {
      setState(prev => ({ ...prev, updatingPost: true }));
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, {
        content: state.editContent.trim(),
        updatedAt: serverTimestamp()
      });

      setState(prev => ({
        ...prev,
        editingPostId: null,
        editContent: "",
        updatingPost: false
      }));
    } catch (error) {
      console.error("Error updating post:", error);
      alert("Failed to update post.");
      setState(prev => ({ ...prev, updatingPost: false }));
    }
  };

  const handleLike = async (post) => {
    if (!state.user) return;
    const postRef = doc(db, "posts", post.id);
    const userId = state.user.uid;

    // Detailed user info for reaction display
    const userData = {
      uid: userId,
      username: state.user.displayName || "Anonymous User",
      profileImage: state.profileImage || "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"
    };

    const existingLike = post.likes?.find(l => l.uid === userId);
    const existingDislike = post.dislikes?.find(d => d.uid === userId);

    try {
      if (existingLike) {
        await updateDoc(postRef, {
          likes: arrayRemove(existingLike)
        });
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(userData),
          dislikes: existingDislike ? arrayRemove(existingDislike) : post.dislikes || []
        });
      }
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const handleDislike = async (post) => {
    if (!state.user) return;
    const postRef = doc(db, "posts", post.id);
    const userId = state.user.uid;

    const userData = {
      uid: userId,
      username: state.user.displayName || "Anonymous User",
      profileImage: state.profileImage || "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"
    };

    const existingLike = post.likes?.find(l => l.uid === userId);
    const existingDislike = post.dislikes?.find(d => d.uid === userId);

    try {
      if (existingDislike) {
        await updateDoc(postRef, {
          dislikes: arrayRemove(existingDislike)
        });
      } else {
        await updateDoc(postRef, {
          dislikes: arrayUnion(userData),
          likes: existingLike ? arrayRemove(existingLike) : post.likes || []
        });
      }
    } catch (error) {
      console.error("Error disliking post:", error);
    }
  };

  const handleAddComment = async (postId) => {
    const commentText = state.newCommentText[postId]?.trim();
    if (!state.user || !commentText || state.postingCommentId === postId) return;

    try {
      setState(prev => ({ ...prev, postingCommentId: postId }));
      const postRef = doc(db, "posts", postId);
      const newComment = {
        id: Date.now().toString(),
        userId: state.user.uid,
        username: state.user.displayName || "Anonymous User",
        userProfileImage: state.profileImage || "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png",
        text: commentText,
        createdAt: new Date().toISOString()
      };

      await updateDoc(postRef, {
        comments: arrayUnion(newComment)
      });

      setState(prev => ({
        ...prev,
        newCommentText: { ...prev.newCommentText, [postId]: "" },
        postingCommentId: null
      }));
    } catch (error) {
      console.error("Error adding comment:", error);
      setState(prev => ({ ...prev, postingCommentId: null }));
    }
  };

  const removePostImage = (index) => {
    setState(prev => ({
      ...prev,
      newPostImages: prev.newPostImages.filter((_, i) => i !== index)
    }));
  };

  const handlePostImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) return alert("Image too large (Max 2MB)");

    try {
      const base64 = await fileToBase64(file);
      setState(prev => ({
        ...prev,
        newPostImages: [...prev.newPostImages, base64]
      }));
    } catch (err) {
      alert("Error processing image");
    }
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          if (file.size > 2 * 1024 * 1024) {
            alert("Pasted image too large (Max 2MB)");
            continue;
          }
          try {
            const base64 = await fileToBase64(file);
            setState(prev => ({
              ...prev,
              newPostImages: [...prev.newPostImages, base64]
            }));
            e.preventDefault();
          } catch (err) {
            console.error("Paste error:", err);
          }
        }
      }
    }
  };

  const fetchUserPosts = (targetUserId) => {
    if (!targetUserId) return;

    if (postsUnsubscribe.current) {
      postsUnsubscribe.current();
    }

    setState(prev => ({ ...prev, loadingPosts: true }));

    // FIX: Simplified query without orderBy to avoid index requirement
    const postsQuery = query(
      collection(db, "posts"),
      where("userId", "==", targetUserId)
      // Removed orderBy temporarily until index is created
      // orderBy("createdAt", "desc")
    );

    postsUnsubscribe.current = onSnapshot(postsQuery, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort posts by createdAt manually (client-side)
      posts.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA; // Descending order
      });

      setState(prev => ({
        ...prev,
        posts,
        loadingPosts: false
      }));
    }, (error) => {
      console.error("Error fetching posts:", error);
      setState(prev => ({ ...prev, loadingPosts: false }));
    });
  };
  const createFirestoreIndex = async () => {
    console.log("To fix the posts query, create a Firestore composite index with:");
    console.log("Collection: posts");
    console.log("Fields: userId (Ascending), createdAt (Descending)");
  };

  useEffect(() => {
    const loadLatestVersion = async () => {
      try {
        const ddragonData = await fetchDDragon();
        setState(prev => ({ ...prev, latestVersion: ddragonData.latestVersion }));
      } catch (error) {
        console.error("Failed to load latest version:", error);
      }
    };

    loadLatestVersion();

    const checkProfileType = async () => {
      const currentUser = auth.currentUser;
      const targetUserId = userId || currentUser?.uid;

      if (!targetUserId) return;

      const isOwn = !userId || targetUserId === currentUser?.uid;

      try {
        const docSnap = await getDoc(doc(db, "users", targetUserId));
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setState(prev => ({
            ...prev,
            profileData: userData,
            aboutMe: userData.aboutMe || "",
            isOwnProfile: isOwn,
            rankedData: userData.rankedData || [],
            lastUpdateTime: userData.lastRankedUpdate?.toDate ? userData.lastRankedUpdate.toDate() : null
          }));

          if (isOwn && currentUser) {
            setState(prev => ({
              ...prev,
              user: currentUser,
              profileImage: userData.profileImage || null,
              linkedAccount: userData.riotAccount || null,
              emailVerificationSent: userData.emailVerificationSent || false
            }));

            if (userData.riotAccount) {
              await checkAndUpdateRankedData(currentUser.uid, userData.riotAccount);
            }
          } else {
            setState(prev => ({
              ...prev,
              profileImage: userData.profileImage || null,
              linkedAccount: userData.riotAccount || null
            }));
          }

          fetchUserPosts(targetUserId);
        }
      } catch (error) {
        console.error("Error loading profile data:", error);
      }
    };

    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setState(prev => ({ ...prev, user: currentUser }));
      }
      await checkProfileType();
    });

    updateIntervalRef.current = setInterval(() => {
      if (state.user && state.linkedAccount) {
        checkAndUpdateRankedData(state.user.uid, state.linkedAccount);
      }
    }, 1800000);

    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target) &&
        profileIconRef.current && !profileIconRef.current.contains(e.target)) {
        setState(prev => ({ ...prev, contextMenuPosition: null }));
      }

      if (menuRef.current && hamburgerRef.current &&
        !menuRef.current.contains(e.target) &&
        !hamburgerRef.current.contains(e.target) &&
        state.menuOpen) {
        setState(prev => ({ ...prev, menuOpen: false }));
      }

      if (accountInfoModalRef.current &&
        !accountInfoModalRef.current.contains(e.target) &&
        state.accountInfoOpen) {
        setState(prev => ({ ...prev, accountInfoOpen: false }));
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      unsubscribe();
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      if (postsUnsubscribe.current) {
        postsUnsubscribe.current();
      }
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userId, state.menuOpen, state.accountInfoOpen]);

  const updateProfileImage = async (newImage) => {
    if (!state.user) return;
    const userRef = doc(db, "users", state.user.uid);
    await updateDoc(userRef, { profileImage: newImage, profileImageUpdated: new Date() });
    setState(prev => ({ ...prev, profileImage: newImage }));
  };

  const handleFileSelect = async (e) => {
    if (!state.isOwnProfile) return;

    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) return alert("Invalid file type (JPEG, PNG, GIF, WebP)");
    if (file.size > 1 * 1024 * 1024) return alert("Max 1MB allowed");

    setState(prev => ({ ...prev, uploading: true, contextMenuPosition: null }));

    try {
      const base64 = await fileToBase64(file);
      await updateProfileImage(base64);
      alert("Profile image updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Error updating profile image");
    } finally {
      setState(prev => ({ ...prev, uploading: false }));
    }
  };


  const validateRiotId = async (riotId, region) => {
    const parts = riotId.split('#');
    if (parts.length !== 2) throw new Error('Invalid Riot ID format. Use: name#tag');

    const [gameName, tagLine] = parts;
    if (!gameName.trim() || !tagLine.trim()) throw new Error('Both name and tag are required');
    if (tagLine.length > 5) throw new Error('Tag line cannot be longer than 5 characters');
    if (gameName.length < 3) throw new Error('Game name must be at least 3 characters long');
    if (gameName.length > 16) throw new Error('Game name cannot be longer than 16 characters');

    try {
      const response = await fetch(`http://localhost:3000/summoner-info/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
      if (!response.ok) {
        let errorMessage = 'Summoner not found';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) { }
        throw new Error(errorMessage);
      }

      const summonerData = await response.json();
      return {
        gameName,
        tagLine,
        region,
        puuid: summonerData.puuid,
        summonerLevel: summonerData.summonerLevel,
        profileIconId: summonerData.profileIconId,
        verified: true
      };
    } catch (error) {
      if (error.message.includes('Summoner not found') || error.message.includes('404')) throw new Error('Riot account not found. Please check the Riot ID and region.');
      if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) throw new Error('There was an error connecting to the Riot servers. Please try again later.');
      throw new Error('Failed to validate Riot account. Please try again.');
    }
  };

  const handleRiotAccountLink = async (e) => {
    e.preventDefault();
    if (!state.isOwnProfile) return;

    setState(prev => ({ ...prev, linkError: "", linkSuccess: "" }));

    if (!state.riotId.trim()) return setState(prev => ({ ...prev, linkError: "Please enter your Riot ID (name#tag)" }));
    if (!state.riotId.includes('#')) return setState(prev => ({ ...prev, linkError: "Invalid format. Use: name#tag" }));

    setState(prev => ({ ...prev, linkingAccount: true }));

    try {
      const validatedAccount = await validateRiotId(state.riotId, state.region);
      const userRef = doc(db, "users", state.user.uid);
      const accountData = { ...validatedAccount, linkedAt: new Date() };

      const rankedData = await fetchRankedDataAndUpdate(accountData, state.user.uid);

      await updateDoc(userRef, {
        riotAccount: accountData,
        rankedData: rankedData || [],
        lastRankedUpdate: new Date()
      });

      setState(prev => ({
        ...prev,
        linkedAccount: accountData,
        linkSuccess: `Riot account ${validatedAccount.gameName}#${validatedAccount.tagLine} linked successfully!`,
        riotId: "",
        region: "na1",
        linkingAccount: false
      }));

    } catch (error) {
      console.error("Error linking Riot account:", error);
      setState(prev => ({ ...prev, linkError: error.message, linkingAccount: false }));
    }
  };

  const unlinkRiotAccount = async () => {
    if (!state.isOwnProfile) return;
    if (!window.confirm("Are you sure you want to unlink your Riot account?")) return;

    try {
      const userRef = doc(db, "users", state.user.uid);
      await updateDoc(userRef, {
        riotAccount: null,
        rankedData: null,
        lastRankedUpdate: null
      });
      setState(prev => ({
        ...prev,
        linkedAccount: null,
        rankedData: null,
        lastUpdateTime: null,
        linkSuccess: "Riot account unlinked successfully!"
      }));
    } catch (error) {
      console.error("Error unlinking Riot account:", error);
      setState(prev => ({ ...prev, linkError: "Failed to unlink Riot account. Please try again." }));
    }
  };

  const verifyEmail = async () => {
    if (!state.user) return;

    try {
      setState(prev => ({ ...prev, verificationLoading: true }));
      await sendEmailVerification(state.user);

      const userRef = doc(db, "users", state.user.uid);
      await updateDoc(userRef, { emailVerificationSent: true, lastVerificationSent: new Date() });

      setState(prev => ({ ...prev, emailVerificationSent: true, verificationLoading: false }));
      alert("Verification email sent! Please check your inbox and spam folder.");
    } catch (error) {
      console.error("Error sending verification:", error);
      alert(error.code === 'auth/too-many-requests' ? "Too many verification requests. Please wait a few minutes." : "Error sending verification email. Please try again.");
      setState(prev => ({ ...prev, verificationLoading: false }));
    }
  };

  const handleReauthentication = async () => {
    if (!state.user || !state.user.email) return setState(prev => ({ ...prev, reauthError: "No user email found" }));

    try {
      const credential = EmailAuthProvider.credential(state.user.email, state.password);
      await reauthenticateWithCredential(state.user, credential);

      setState(prev => ({ ...prev, showReauthModal: false, password: "", reauthError: "" }));
      await performAccountDeletion();
    } catch (error) {
      console.error("Reauthentication error:", error);
      const errorMsg = error.code === 'auth/wrong-password' ? "Incorrect password. Please try again." :
        error.code === 'auth/invalid-credential' ? "Invalid credentials. Please check your password." :
          "Reauthentication failed. Please try again.";
      setState(prev => ({ ...prev, reauthError: errorMsg }));
    }
  };

  const performAccountDeletion = async () => {
    setState(prev => ({ ...prev, deletingAccount: true }));
    try {
      const userId = state.user.uid;

      try {
        await fetch('http://localhost:3000/api/queue/leave', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId })
        });
      } catch (error) { console.log("Could not remove from queue system, continuing..."); }

      const allUsersQuery = query(collection(db, "users"));
      const allUsersSnapshot = await getDocs(allUsersQuery);
      const updatePromises = [];

      allUsersSnapshot.forEach(otherUserDoc => {
        if (otherUserDoc.id !== userId) {
          const otherUserData = otherUserDoc.data();
          const updates = {};

          if (otherUserData.friends?.some(friend => friend.id === userId)) updates.friends = otherUserData.friends.filter(friend => friend.id !== userId);
          if (otherUserData.pendingRequests?.some(req => req.from === userId)) updates.pendingRequests = otherUserData.pendingRequests.filter(req => req.from !== userId);
          if (Object.keys(updates).length > 0) updatePromises.push(updateDoc(doc(db, "users", otherUserDoc.id), updates));
        }
      });

      if (updatePromises.length > 0) await Promise.all(updatePromises);

      try {
        const chatsQuery = query(collection(db, "chats"), where("participants", "array-contains", userId));
        const chatsSnapshot = await getDocs(chatsQuery);
        const chatDeletionPromises = chatsSnapshot.docs.map(chatDoc => deleteDoc(doc(db, "chats", chatDoc.id)));
        if (chatDeletionPromises.length > 0) await Promise.all(chatDeletionPromises);
      } catch (error) { console.log("Could not delete chat documents, continuing..."); }

      const postsQuery = query(collection(db, "posts"), where("userId", "==", userId));
      const postsSnapshot = await getDocs(postsQuery);
      const postsDeletionPromises = postsSnapshot.docs.map(postDoc => deleteDoc(doc(db, "posts", postDoc.id)));
      if (postsDeletionPromises.length > 0) await Promise.all(postsDeletionPromises);

      await deleteDoc(doc(db, "users", userId));
      await deleteUser(state.user);

      alert("Account terminated successfully! Your profile has been deleted. Goodbye!");
      window.location.href = "/";
    } catch (error) {
      console.error("Error during account deletion:", error);
      alert(error.code === 'permission-denied' ? "Permission denied. Your profile was still deleted." :
        error.code === 'unavailable' ? "Network error. Please check your connection." :
          "Error terminating account. Please try again.");
      setState(prev => ({ ...prev, deletingAccount: false, showDeleteConfirm: false }));
    }
  };

  const saveAboutMe = async () => {
    if (!state.isOwnProfile || !state.user) return;

    try {
      const userRef = doc(db, "users", state.user.uid);
      await updateDoc(userRef, {
        aboutMe: state.tempAbout,
        aboutMeUpdated: new Date()
      });

      setState(prev => ({ ...prev, aboutMe: state.tempAbout, isEditingAbout: false }));
      alert("About me updated successfully!");
    } catch (error) {
      console.error("Error updating about me:", error);
      alert("Error updating about me. Please try again.");
    }
  };

  const startEditingAbout = () => {
    if (!state.isOwnProfile) return;
    setState(prev => ({ ...prev, tempAbout: state.aboutMe, isEditingAbout: true }));
  };

  const getProfileIconUrl = (profileIconId) => `https://ddragon.leagueoflegends.com/cdn/${state.latestVersion}/img/profileicon/${profileIconId}.png`;

  const formatTimeAgo = (date) => {
    if (!date) return "Never updated";

    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  const formatPostTime = (timestamp) => {
    if (!timestamp) return "Recently";

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (!state.profileData) return <div className="loading">Loading profile...</div>;

  const displayUser = state.isOwnProfile ? state.user : { displayName: state.profileData?.username || "Anonymous User" };
  const displayEmail = state.isOwnProfile ? state.user?.email : null;
  const joinedDate = state.profileData?.createdAt ? new Date(state.profileData.createdAt.seconds * 1000) : new Date();
  const accountAgeDays = Math.floor((Date.now() - joinedDate) / 86400000);
  const currentProfileImage = state.profileImage || "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png";
  const userRole = state.profileData?.role || "user";
  const coachAppStatus = state.profileData?.coachApplication?.status;

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-title-row">
          <h2 className="profile-title">
            {state.isOwnProfile ? "Your Profile" : `${state.profileData.username || "Anonymous User"}'s Profile`}
          </h2>
          {!state.isOwnProfile && state.user && (
            <button className="follow-btn">
              <img src="/project-icons/Profile icons/follow icon.png" alt="Follow" className="btn-icon" onError={(e) => e.target.style.display = 'none'} />
              Follow
            </button>
          )}
          {userRole !== "user" && (
            <span className={`role-badge ${userRole}`}>
              {userRole === "coach" ? "Coach" : userRole === "admin" ? "Admin" : userRole === "owner" ? "Owner" : ""}
            </span>
          )}
          {coachAppStatus === "pending" && state.isOwnProfile && (
            <span className="role-badge pending">Coach App Pending</span>
          )}
          {state.profileData?.adminApplication?.status === "pending" && state.isOwnProfile && (
            <span className="role-badge pending">Admin App Pending</span>
          )}
        </div>

        <div className="profile-card">
          {state.isOwnProfile && (
            <div className="profile-actions-menu">
              <button
                ref={hamburgerRef}
                className={`hamburger-menu ${state.menuOpen ? 'active' : ''}`}
                onClick={() => setState(prev => ({ ...prev, menuOpen: !prev.menuOpen }))}
              >
                <span></span>
                <span></span>
                <span></span>
              </button>

              {state.menuOpen && (
                <div ref={menuRef} className="menu-dropdown">
                  <button
                    className="menu-item"
                    onClick={() => setState(prev => ({ ...prev, menuOpen: false, accountInfoOpen: true }))}
                  >
                    Account Info
                  </button>
                  {userRole !== 'admin' && userRole !== 'owner' &&
                    state.profileData?.adminApplication?.status !== 'pending' && (
                      <Link
                        to="/apply-admin"
                        className="menu-item apply-admin-btn"
                        onClick={() => setState(prev => ({ ...prev, menuOpen: false }))}
                      >
                        Apply for Admin
                      </Link>
                    )}
                  <button
                    onClick={() => {
                      setState(prev => ({
                        ...prev,
                        menuOpen: false,
                        terminationButtonActive: true,
                        ripple: true,
                        showDeleteConfirm: true
                      }));
                      setTimeout(() => setState(prev => ({ ...prev, terminationButtonActive: false })), 300);
                      setTimeout(() => setState(prev => ({ ...prev, ripple: false })), 600);
                    }}
                    className={`menu-item terminate-menu-btn ${state.terminationButtonActive ? 'active' : ''}`}
                  >
                    Terminate Account
                    {state.ripple && <span className="ripple"></span>}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="profile-header">
            <div className="profile-icon-container" ref={profileIconRef}>
              <img
                src={currentProfileImage}
                alt="Profile"
                className="profile-avatar"
                onContextMenu={state.isOwnProfile ? (e) => {
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const profileCardRect = e.currentTarget.closest('.profile-card').getBoundingClientRect();

                  const x = rect.right - profileCardRect.left + 10;
                  const y = rect.top - profileCardRect.top;

                  setState(prev => ({
                    ...prev,
                    contextMenuPosition: {
                      x: x,
                      y: y
                    }
                  }));
                } : undefined}
                style={{ cursor: state.isOwnProfile ? "pointer" : "default" }}
              />

              {state.isOwnProfile && state.contextMenuPosition && (
                <div
                  ref={contextMenuRef}
                  className="context-menu"
                  style={{
                    position: "absolute",
                    left: `${state.contextMenuPosition.x}px`,
                    top: `${state.contextMenuPosition.y}px`,
                    zIndex: 1000
                  }}
                >
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setState(prev => ({ ...prev, contextMenuPosition: null }));
                    }}
                    disabled={state.uploading}
                    className="context-menu-btn"
                  >
                    {state.uploading ? "Uploading..." : "Upload Image"}
                  </button>
                  {state.profileImage && (
                    <button
                      onClick={() => {
                        updateProfileImage(null);
                        setState(prev => ({ ...prev, contextMenuPosition: null }));
                        alert("Profile image removed!");
                      }}
                      className="context-menu-btn delete-btn"
                    >
                      Delete Image
                    </button>
                  )}
                </div>
              )}

              {state.isOwnProfile && (
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept="image/*"
                  style={{ display: "none" }}
                />
              )}
            </div>

            <div className="profile-info">
              <h3 className="profile-display-name">{displayUser?.displayName || "Anonymous User"}</h3>
              <div className="about-me-section">
                <div className="about-me-header">
                  <h4 className="about-me-label">About Me</h4>
                  {!state.isEditingAbout && state.isOwnProfile && (
                    <button onClick={startEditingAbout} className="edit-about-btn">
                      <img src="/project-icons/Profile icons/edit.png" alt="Edit" className="btn-icon" />
                    </button>
                  )}
                </div>

                {state.isEditingAbout ? (
                  <div className="about-me-edit-container">
                    <div className="about-me-textarea-container">
                      <textarea
                        value={state.tempAbout}
                        onChange={(e) => {
                          const text = e.target.value;
                          if (text.length <= 200) {
                            setState(prev => ({ ...prev, tempAbout: text }));
                          }
                        }}
                        placeholder="Tell us about yourself, your gaming preferences, favorite champions, etc..."
                        className="about-me-textarea"
                        maxLength={200}
                        autoFocus
                        rows={4}
                      />
                      <div className={`char-counter ${state.tempAbout.length >= 180 ? 'warning' : ''} ${state.tempAbout.length >= 195 ? 'error' : ''}`}>
                        {state.tempAbout.length}/200
                      </div>
                    </div>
                    <div className="about-me-edit-buttons">
                      <button
                        onClick={saveAboutMe}
                        className="save-about-btn"
                        disabled={state.tempAbout === state.aboutMe}
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => setState(prev => ({ ...prev, isEditingAbout: false }))}
                        className="cancel-about-btn"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="about-me-content">
                    <p className="about-me-text">
                      {state.aboutMe || (state.isOwnProfile ? "No about me yet. Click edit to add a bio." : "No about me yet.")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="riot-account-section">
            <h4>Riot Games Account</h4>

            {state.linkedAccount ? (
              <div className="linked-account-container">
                <div className="linked-account-info">
                  <div className="account-header">
                    <div className="account-icon-name">
                      <img
                        src={getProfileIconUrl(state.linkedAccount.profileIconId)}
                        alt="Summoner icon"
                        className="summoner-icon"
                        onError={(e) => {
                          e.target.src = `https://ddragon.leagueoflegends.com/cdn/25.22/img/profileicon/${state.linkedAccount.profileIconId}.png`;
                        }}
                      />
                      <div>
                        <span className="account-name">
                          {state.linkedAccount.gameName}#{state.linkedAccount.tagLine}
                        </span>
                        <span className="account-level">Level {state.linkedAccount.summonerLevel}</span>
                      </div>
                    </div>
                    <span className="account-status verified">✅ Verified</span>
                  </div>
                  <span className="account-region">
                    <img src="/project-icons/Profile icons/globe icon.png" alt="Region" className="detail-icon" />
                    Region: {REGIONS.find(r => r.value === state.linkedAccount.region)?.label || state.linkedAccount.region}
                  </span>

                  {state.isOwnProfile && (
                    <div className="ranked-update-section">
                      <div className="update-info">
                        <span className="last-update">
                          Last updated: {formatTimeAgo(state.lastUpdateTime)}
                        </span>
                        <button
                          onClick={handleManualRankedUpdate}
                          className="update-ranked-btn"
                          disabled={state.rankedUpdateLoading}
                        >
                          <img src="/project-icons/Profile icons/update icon.png" alt="Update" className="btn-icon" />
                          {state.rankedUpdateLoading ? "Updating..." : "Update Ranked Data"}
                        </button>
                      </div>
                      <span className="update-hint">
                        Ranked data updates automatically every 30 minutes
                      </span>
                    </div>
                  )}
                </div>

                {state.rankedData && (
                  <div className="ranked-section">
                    <h5>Ranked Information</h5>
                    <RankedInfo rankedData={state.rankedData} />
                  </div>
                )}

                {state.isOwnProfile && (
                  <button onClick={unlinkRiotAccount} className="unlink-account-btn">
                    Unlink Account
                  </button>
                )}
              </div>
            ) : state.isOwnProfile ? (
              <form onSubmit={handleRiotAccountLink} className="link-account-form">
                <div className="form-group">
                  <label htmlFor="riotId">Riot ID</label>
                  <input type="text" id="riotId" value={state.riotId} onChange={(e) => setState(prev => ({ ...prev, riotId: e.target.value }))} placeholder="Enter your Riot ID" className="riot-id-input" maxLength={25} />
                  <div className="input-hint">Format: Name#Tag</div>
                </div>

                <div className="form-group">
                  <label htmlFor="region">Region</label>
                  <select
                    id="region"
                    value={state.region}
                    onChange={(e) => setState(prev => ({ ...prev, region: e.target.value }))}
                    className="region-select"
                  >
                    {REGIONS.map(region => <option key={region.value} value={region.value}>{region.label}</option>)}
                  </select>
                </div>

                {state.linkError && <div className="error-message">{state.linkError}</div>}
                {state.linkSuccess && <div className="success-message">{state.linkSuccess}</div>}

                <button type="submit" disabled={state.linkingAccount} className="link-account-btn">
                  {state.linkingAccount ? "Validating..." : "Link Riot Account"}
                </button>
              </form>
            ) : (
              <div className="no-riot-account">
                <p>This user hasn't linked a Riot account yet.</p>
              </div>
            )}
          </div>
        </div>

        {state.isOwnProfile && (
          <div className="social-features-section">
            <div className="make-post-container">
              <h4>Create a Post</h4>
              <div className="post-input-wrapper">
                <textarea
                  placeholder="Share something with the community... (Links to Youtube/TikTok/Instagram supported)"
                  className="post-textarea"
                  value={state.newPostContent}
                  onChange={(e) => setState(prev => ({ ...prev, newPostContent: e.target.value }))}
                  onPaste={handlePaste}
                  maxLength={500}
                ></textarea>
                <div className="post-char-counter">
                  {state.newPostContent.length}/500 characters
                </div>

                {state.newPostImages.length > 0 && (
                  <div className="post-images-preview-grid">
                    {state.newPostImages.map((img, index) => (
                      <div key={index} className="post-image-preview-container">
                        <img src={img} alt={`Preview ${index}`} className="post-image-preview" />
                        <button
                          className="remove-post-image-btn"
                          onClick={() => removePostImage(index)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="post-actions">
                  <input
                    type="file"
                    ref={postImageInputRef}
                    onChange={handlePostImageSelect}
                    accept="image/*"
                    style={{ display: "none" }}
                  />
                  <button
                    className="post-media-btn"
                    onClick={() => postImageInputRef.current?.click()}
                  >
                    Add Image
                  </button>
                  <button
                    className="post-submit-btn"
                    onClick={createPost}
                    disabled={!state.newPostContent.trim() || state.creatingPost}
                  >
                    {state.creatingPost ? "Posting..." : "Post to Feed"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {state.profileData && (
          <div className="profile-social-feed">
            <h4>Activity Feed</h4>
            {state.loadingPosts ? (
              <div className="loading-posts">Loading posts...</div>
            ) : state.posts.length === 0 ? (
              <div className="no-posts-message">
                <p>No posts yet. Share something with the community!</p>
              </div>
            ) : (
              <div className="feed-posts">
                {state.posts.map(post => (
                  <div key={post.id} className={`feed-post-wrapper ${state.openCommentsPostId === post.id ? 'comments-open' : ''}`}>
                    <div className="feed-post">
                      <div className="post-header">
                        <img
                          src={post.userProfileImage || currentProfileImage}
                          alt="Poster"
                          className="post-avatar"
                        />
                        <div className="post-meta">
                          <span className="post-author">
                            {post.username || displayUser?.displayName || "Anonymous User"}
                          </span>
                          <div className="post-meta-right">
                            <span className="post-date">
                              {formatPostTime(post.createdAt)}
                            </span>
                            {state.isOwnProfile && post.userId === state.user?.uid && (
                              <div className="post-mgmt-btns">
                                <button
                                  className="mgmt-btn edit-btn"
                                  onClick={() => startEditingPost(post)}
                                  title="Edit Post"
                                >
                                  <img src="/project-icons/Profile icons/edit.png" alt="Edit" />
                                </button>
                                <button
                                  className="mgmt-btn delete-btn"
                                  onClick={() => deletePost(post.id)}
                                  title="Delete Post"
                                >
                                  <span>×</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="post-content">
                        {state.editingPostId === post.id ? (
                          <div className="edit-post-container">
                            <textarea
                              className="edit-post-textarea"
                              value={state.editContent}
                              onChange={(e) => setState(prev => ({ ...prev, editContent: e.target.value }))}
                              rows={3}
                            />
                            <div className="edit-actions">
                              <button
                                className="edit-save-btn"
                                onClick={() => updatePost(post.id)}
                                disabled={state.updatingPost || !state.editContent.trim()}
                              >
                                {state.updatingPost ? "Saving..." : "Save"}
                              </button>
                              <button
                                className="edit-cancel-btn"
                                onClick={cancelEditingPost}
                                disabled={state.updatingPost}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          post.content
                        )}
                      </div>

                      {post.socialPreview && (
                        <div className="social-preview-container">
                          {post.socialPreview.type === 'youtube' ? (
                            <div className="yt-embed-wrapper">
                              <iframe
                                width="100%"
                                height="315"
                                src={`https://www.youtube.com/embed/${post.socialPreview.id}`}
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              ></iframe>
                            </div>
                          ) : (
                            <div className="generic-social-preview">
                              <img src={post.socialPreview.thumbnail} alt="Preview" className="social-thumb" />
                              <div className="social-info">
                                <span className="social-type">{post.socialPreview.type.toUpperCase()} PREVIEW</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {post.postImages && post.postImages.length > 0 && (
                        <div className={`post-media-content ${post.postImages.length > 1 ? 'multi-image' : 'single-image'}`}>
                          {post.postImages.map((img, idx) => (
                            <img key={idx} src={img} alt={`Post ${idx}`} className="post-uploaded-image" />
                          ))}
                        </div>
                      )}

                      {post.mediaUrls && post.mediaUrls.length > 0 && (
                        <div className="post-media">
                          {post.mediaUrls.map((url, index) => (
                            <a
                              key={index}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="media-link"
                            >
                              {url}
                            </a>
                          ))}
                        </div>
                      )}
                      {((post.likes?.length > 0) || (post.dislikes?.length > 0)) && (
                        <div className="reaction-summary">
                          {post.likes?.length > 0 && (
                            <span className="summary-item liked">
                              Liked by {post.likes[0].username}
                              {post.likes.length > 1 && ` and ${post.likes.length - 1} others`}
                            </span>
                          )}
                          {post.dislikes?.length > 0 && (
                            <span className="summary-item disliked">
                              Disliked by {post.dislikes[0].username}
                              {post.dislikes.length > 1 && ` and ${post.dislikes.length - 1} others`}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="post-interactions">
                        <button
                          className={`interaction-btn count-btn ${post.likes?.some(l => l.uid === state.user?.uid) ? 'active liked' : ''}`}
                          onClick={() => handleLike(post)}
                        >
                          <img src="/project-icons/Profile icons/thumbs-up.png" alt="Like" className="interaction-icon" />
                          <span>{post.likes?.length || 0}</span>
                        </button>
                        <button
                          className={`interaction-btn count-btn ${post.dislikes?.some(d => d.uid === state.user?.uid) ? 'active disliked' : ''}`}
                          onClick={() => handleDislike(post)}
                        >
                          <img src="/project-icons/Profile icons/dislike.png" alt="Dislike" className="interaction-icon" />
                          <span>{post.dislikes?.length || 0}</span>
                        </button>
                        <button
                          className={`interaction-btn count-btn ${state.openCommentsPostId === post.id ? 'active' : ''}`}
                          onClick={() => setState(prev => ({
                            ...prev,
                            openCommentsPostId: prev.openCommentsPostId === post.id ? null : post.id
                          }))}
                        >
                          <img src="/project-icons/Profile icons/comments.png" alt="Comment" className="interaction-icon" />
                          <span>{post.comments?.length || 0}</span>
                        </button>
                      </div>
                    </div>

                    {state.openCommentsPostId === post.id && (
                      <div className="post-comments-sidebar">
                        <div className="sidebar-header">
                          <h5>Comments</h5>
                          <button
                            className="close-sidebar-btn"
                            onClick={() => setState(prev => ({ ...prev, openCommentsPostId: null }))}
                          >
                            ×
                          </button>
                        </div>
                        <div className="comments-list-container">
                          {post.comments && post.comments.length > 0 ? (
                            <div className="comments-list">
                              {post.comments.map((comment) => (
                                <div key={comment.id} className="comment-item">
                                  <img src={comment.userProfileImage} alt={comment.username} className="comment-avatar" />
                                  <div className="comment-body">
                                    <div className="comment-header">
                                      <span className="comment-author">{comment.username}</span>
                                      <span className="comment-date">{formatPostTime(comment.createdAt)}</span>
                                    </div>
                                    <div className="comment-text">{comment.text}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="no-comments">No comments yet.</div>
                          )}
                        </div>
                        {state.user && (
                          <div className="add-comment-container">
                            <input
                              type="text"
                              placeholder="Add a comment..."
                              className="comment-input"
                              value={state.newCommentText[post.id] || ""}
                              onChange={(e) => setState(prev => ({
                                ...prev,
                                newCommentText: { ...prev.newCommentText, [post.id]: e.target.value }
                              }))}
                              onKeyPress={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                            />
                            <button
                              className="comment-submit-btn"
                              onClick={() => handleAddComment(post.id)}
                              disabled={!state.newCommentText[post.id]?.trim() || state.postingCommentId === post.id}
                            >
                              {state.postingCommentId === post.id ? "..." : "Send"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {state.accountInfoOpen && state.isOwnProfile && (
          <div className="modal-overlay">
            <div ref={accountInfoModalRef} className="account-info-modal">
              <h3>Account Information</h3>
              <div className="account-info-details">
                <div className="info-row">
                  <span className="label">Email:</span>
                  <span className="value">{displayEmail || "No email"}</span>
                </div>
                <div className="info-row">
                  <span className="label">Verified:</span>
                  <span className={`value ${state.user?.emailVerified ? "verified" : "not-verified"}`}>
                    {state.user?.emailVerified ? "✅ Yes" : "No"}
                  </span>
                </div>
                {!state.user?.emailVerified && (
                  <div className="verification-actions">
                    <button
                      onClick={verifyEmail}
                      className="verify-btn-small"
                      disabled={state.verificationLoading || state.emailVerificationSent}
                    >
                      {state.verificationLoading ? "Sending..." : "Verify Email"}
                    </button>
                  </div>
                )}
                <div className="info-row">
                  <span className="label">Joined:</span>
                  <span className="value">
                    {joinedDate.toLocaleDateString()} ({accountAgeDays} days ago)
                  </span>
                </div>
                {state.user?.metadata?.lastSignInTime && (
                  <div className="info-row">
                    <span className="label">Last Login:</span>
                    <span className="value">{new Date(state.user.metadata.lastSignInTime).toLocaleString()}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setState(prev => ({ ...prev, accountInfoOpen: false }))}
                className="close-modal-btn"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {state.isOwnProfile && state.showDeleteConfirm && (
          <div className="modal-overlay">
            <div className="delete-modal">
              <h3>Confirm Account Termination</h3>
              <div className="delete-warning">
                <span className="delete-icon"></span>
                <div>
                  <p>Are you sure you want to terminate your account? This action is permanent and cannot be undone.</p>
                  <ul>
                    <li>All your profile data will be deleted</li>
                    <li>Your chat history will be removed</li>
                    <li>Linked Riot account will be unlinked</li>
                    <li>You will be removed from any active queues</li>
                    <li>This action cannot be reversed</li>
                  </ul>
                </div>
              </div>
              <div className="modal-actions">
                <button onClick={() => setState(prev => ({ ...prev, showDeleteConfirm: false }))} className="cancel-btn" disabled={state.deletingAccount}>Cancel</button>
                <button onClick={() => setState(prev => ({ ...prev, showDeleteConfirm: false, showReauthModal: true }))} className="confirm-delete-btn" disabled={state.deletingAccount}>
                  {state.deletingAccount ? "Deleting..." : "Yes, Delete My Account"}
                </button>
              </div>
            </div>
          </div>
        )}

        {state.isOwnProfile && state.showReauthModal && (
          <div className="modal-overlay">
            <div className="reauth-modal">
              <h3>Verify Your Identity</h3>
              <div className="reauth-warning">
                <span className="reauth-icon"></span>
                <p>For security reasons, please enter your password to confirm account deletion.</p>
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input id="password" type="password" value={state.password} onChange={(e) => setState(prev => ({ ...prev, password: e.target.value }))} placeholder="Enter your password" className="riot-id-input" />
                {state.reauthError && <div className="error-message">{state.reauthError}</div>}
              </div>
              <div className="modal-actions">
                <button onClick={() => setState(prev => ({ ...prev, showReauthModal: false, password: "", reauthError: "" }))} className="cancel-btn" disabled={state.deletingAccount}>Cancel</button>
                <button onClick={handleReauthentication} className="confirm-delete-btn" disabled={state.deletingAccount || !state.password}>
                  {state.deletingAccount ? "Deleting..." : "Confirm Deletion"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
