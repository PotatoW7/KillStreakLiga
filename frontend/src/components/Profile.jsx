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
  query, where, getDocs, onSnapshot, writeBatch
} from "firebase/firestore";
import { fetchDDragon } from "../utils/fetchDDragon";
import ProfilePosts from "./ProfilePosts";
import { ChevronDown } from "lucide-react";

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
      <div className="bg-secondary/20 backdrop-blur-md rounded-2xl p-4 border border-white/5 flex flex-col justify-center min-w-[200px]">
        <div className="text-[10px] text-muted-foreground/50 font-black uppercase tracking-widest mb-1">{queueName}</div>
        <div className="text-xs font-bold text-muted-foreground/30 italic">Unranked</div>
      </div>
    );
    const totalGames = queue.wins + queue.losses;
    const winRate = totalGames > 0 ? Math.round((queue.wins / totalGames) * 100) : 0;
    const tierName = queue.tier.charAt(0) + queue.tier.slice(1).toLowerCase();

    return (
      <div className="bg-secondary/40 backdrop-blur-md rounded-2xl p-6 border border-white/5 min-w-[280px] hover:border-primary/20 transition-all group/rank relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">{queueName}</div>
          <div className={`text-[10px] font-black ${winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
            {winRate}% WR
          </div>
        </div>

        <div className="flex items-center gap-4">
          <img
            src={`/rank-icons/Rank=${tierName}.png`}
            alt={queue.tier}
            className="w-16 h-16 group-hover/rank:scale-110 transition-transform duration-500"
            onError={(e) => (e.target.src = "/rank-icons/Rank=Unranked.png")}
          />
          <div>
            <div className="font-display text-2xl font-black text-primary leading-none mb-1">{queue.tier} {queue.rank}</div>
            <div className="font-bold text-lg text-foreground">{queue.leaguePoints} LP</div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[10px] font-black text-muted-foreground uppercase tracking-widest">
          <span>{queue.wins} Wins</span>
          <span>{queue.losses} Losses</span>
        </div>
        <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden" title={`${winRate}% Win Rate`}>
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000"
            style={{ width: `${winRate}%` }}
          />
        </div>
      </div>
    );
  };

  const rankedSolo = getQueueData('RANKED_SOLO_5x5');
  const rankedFlex = getQueueData('RANKED_FLEX_SR');

  return (
    <div className="flex flex-wrap gap-4 mt-6">
      {renderRankCard(rankedSolo, "Ranked Solo")}
      {renderRankCard(rankedFlex, "Ranked Flex")}
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
    deleteButtonActive: false,
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
    posts: [],
    loadingPosts: false,
    backendError: false,
    notification: { message: "", type: "", visible: false }
  });

  const showNotification = (message, type = "success") => {
    setState(prev => ({
      ...prev,
      notification: { message, type, visible: true }
    }));
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        notification: { ...prev.notification, visible: false }
      }));
    }, 3000);
  };

  const contextMenuRef = useRef(null);
  const fileInputRef = useRef(null);
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

      const response = await fetch(`${import.meta.env.VITE_API_URL}/summoner-info/${account.region}/${encodeURIComponent(account.gameName)}/${encodeURIComponent(account.tagLine)}`);
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
          showNotification("Ranked data updated successfully!", "success");
        }

        return rankedData;
      } else {
        setState(prev => ({ ...prev, rankedUpdateLoading: false }));
        throw new Error('Failed to fetch ranked data');
      }
    } catch (error) {
      console.error("Error fetching ranked data:", error);
      const isConnectionError = error.message.includes('Failed to fetch') || error.name === 'TypeError';

      setState(prev => ({
        ...prev,
        rankedUpdateLoading: false,
        backendError: isConnectionError
      }));

      if (isManualUpdate) {
        showNotification(isConnectionError
          ? "Failed to update ranked data. Please check if the backend server is running."
          : "Failed to update ranked data. Please try again.", "error");
      }
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



  const fetchUserPosts = (targetUserId, viewerId, isFriend) => {
    if (!targetUserId) return;

    if (postsUnsubscribe.current) {
      postsUnsubscribe.current();
    }

    setState(prev => ({ ...prev, loadingPosts: true }));

    const postsQuery = query(
      collection(db, "posts"),
      where("userId", "==", targetUserId)
    );

    postsUnsubscribe.current = onSnapshot(postsQuery, (snapshot) => {
      let fetchedPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));


      const isOwn = viewerId === targetUserId;

      fetchedPosts = fetchedPosts.filter(post => {

        if (isOwn) return true;


        if (!post.visibility) return true;


        if (post.visibility === "public" || post.visibility === "profile-only") return true;


        if (post.visibility === "private" && isFriend) return true;

        return false;
      });

      fetchedPosts.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });

      setState(prev => ({
        ...prev,
        posts: fetchedPosts,
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

          const isFriend = userData.friends?.some(f => f.id === currentUser?.uid) || false;
          fetchUserPosts(targetUserId, currentUser?.uid, isFriend);
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

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
  });

  const handleFileSelect = async (e) => {
    if (!state.isOwnProfile) return;

    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) return showNotification("Invalid file type (JPEG, PNG, GIF, WebP)", "error");
    if (file.size > 1 * 1024 * 1024) return showNotification("Max 1MB allowed", "error");

    setState(prev => ({ ...prev, uploading: true, contextMenuPosition: null }));

    try {
      const base64 = await fileToBase64(file);
      await updateProfileImage(base64);
      showNotification("Profile image updated successfully!", "success");
    } catch (err) {
      console.error(err);
      showNotification("Error updating profile image", "error");
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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/summoner-info/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
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
      setState(prev => ({ ...prev, emailVerificationSent: true, verificationLoading: false }));
      showNotification("Verification email sent! Please check your inbox.", "success");
    } catch (error) {
      console.error("Error sending verification:", error);
      showNotification(error.code === 'auth/too-many-requests' ? "Too many requests. Please wait." : "Error sending email.", "error");
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
        await fetch(`${import.meta.env.VITE_API_URL}/api/queue/leave`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId })
        });
      } catch (error) { console.log("Could not remove from queue system, continuing..."); }

      const allUsersQuery = query(collection(db, "users"));
      const allUsersSnapshot = await getDocs(allUsersQuery);

      let batch = writeBatch(db);
      let operationCount = 0;

      allUsersSnapshot.forEach(otherUserDoc => {
        if (otherUserDoc.id !== userId) {
          const otherUserData = otherUserDoc.data();
          const updates = {};

          if (otherUserData.friends?.some(friend => friend.id === userId)) {
            updates.friends = otherUserData.friends.filter(friend => friend.id !== userId);
          }
          if (otherUserData.pendingRequests?.some(req => req.from === userId)) {
            updates.pendingRequests = otherUserData.pendingRequests.filter(req => req.from !== userId);
          }
          if (otherUserData.sentFriendRequests?.some(req => req.to === userId)) {
            updates.sentFriendRequests = otherUserData.sentFriendRequests.filter(req => req.to !== userId);
          }

          if (Object.keys(updates).length > 0) {
            batch.update(doc(db, "users", otherUserDoc.id), updates);
            operationCount++;

            if (operationCount >= 400) {
              batch.commit();
              batch = writeBatch(db);
              operationCount = 0;
            }
          }
        }
      });

      if (operationCount > 0) {
        await batch.commit();
      }

      try {
        const chatsQuery = query(collection(db, "chats"), where("participants", "array-contains", userId));
        const chatsSnapshot = await getDocs(chatsQuery);
        for (const chatDoc of chatsSnapshot.docs) {
          await deleteDoc(doc(db, "chats", chatDoc.id));
        }
      } catch (error) { console.log("Could not delete chat documents, continuing..."); }

      const postsQuery = query(collection(db, "posts"), where("userId", "==", userId));
      const postsSnapshot = await getDocs(postsQuery);
      for (const postDoc of postsSnapshot.docs) {
        await deleteDoc(doc(db, "posts", postDoc.id));
      }

      await deleteDoc(doc(db, "users", userId));
      await deleteUser(state.user);

      window.location.href = "/";
    } catch (error) {
      console.error("Error during account deletion:", error);
      showNotification(error.code === 'permission-denied' ? "Permission denied." :
        error.code === 'unavailable' ? "Network error." :
          "Error deleting account.", "error");
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
      setState(prev => ({ ...prev, aboutMe: state.tempAbout, isEditingAbout: false }));
      showNotification("About me updated successfully!", "success");
    } catch (error) {
      console.error("Error updating about me:", error);
      showNotification("Error updating about me.", "error");
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
    <div className="min-h-screen py-12 px-4 animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-2">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <h2 className="font-display text-4xl font-black tracking-tight uppercase italic flex items-center gap-4">
              <div className="w-2 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
              {state.isOwnProfile ? "Profile Dashboard" : `${state.profileData.username || "Member"}`}
            </h2>
            {userRole !== "user" && (
              <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-xl ${userRole === 'owner' ? 'bg-primary text-black' :
                userRole === 'admin' ? 'bg-red-500 text-white' :
                  'bg-blue-500 text-white'
                }`}>
                {userRole.toUpperCase()}
              </span>
            )}
            {coachAppStatus === "pending" && state.isOwnProfile && (
              <span className="px-4 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] font-black uppercase tracking-widest">Coach App Pending</span>
            )}
          </div>

          {!state.isOwnProfile && state.user && (
            <button className="px-8 py-3 rounded-xl bg-primary text-black font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-white transition-all active:scale-95 flex items-center gap-3">
              <img src="/project-icons/Profile icons/follow icon.png" alt="" className="w-4 h-4 brightness-0" />
              Follow
            </button>
          )}
        </div>



        <div className="glass-panel p-8 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px]" />

          {state.notification.visible && (
            <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[70] px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest animate-in slide-in-from-top duration-300 shadow-2xl ${state.notification.type === 'success' ? 'bg-green-500 text-black' : 'bg-red-500 text-white'
              }`}>
              {state.notification.message}
            </div>
          )}

          {state.isOwnProfile && (
            <div className="absolute top-8 right-8 z-20">
              <button
                ref={hamburgerRef}
                className="w-10 h-10 rounded-xl bg-secondary/50 border border-white/5 flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-all group/ham"
                onClick={() => setState(prev => ({ ...prev, menuOpen: !prev.menuOpen }))}
              >
                <span className={`w-5 h-0.5 bg-muted-foreground transition-all ${state.menuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
                <span className={`w-5 h-0.5 bg-muted-foreground transition-all ${state.menuOpen ? 'opacity-0' : ''}`}></span>
                <span className={`w-5 h-0.5 bg-muted-foreground transition-all ${state.menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
              </button>

              {state.menuOpen && (
                <div ref={menuRef} className="absolute right-0 mt-4 w-56 glass-panel rounded-2xl py-3 animate-in fade-in zoom-in-95 duration-200 shadow-2xl">
                  <button
                    className="w-full text-left px-5 py-3 hover:bg-primary hover:text-black font-bold transition-all text-sm flex items-center gap-3"
                    onClick={() => setState(prev => ({ ...prev, menuOpen: false, accountInfoOpen: true }))}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                    Account Info
                  </button>
                  {userRole !== 'admin' && userRole !== 'owner' &&
                    state.profileData?.adminApplication?.status !== 'pending' && (
                      <Link
                        to="/apply-admin"
                        className="w-full text-left px-5 py-3 hover:bg-primary hover:text-black font-bold transition-all text-sm flex items-center gap-3"
                        onClick={() => setState(prev => ({ ...prev, menuOpen: false }))}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
                        Apply for Admin
                      </Link>
                    )}
                  <button
                    onClick={() => {
                      setState(prev => ({
                        ...prev,
                        menuOpen: false,
                        showDeleteConfirm: true
                      }));
                    }}
                    className="w-full text-left px-5 py-3 hover:bg-red-500 hover:text-white font-bold transition-all text-sm flex items-center gap-3"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                    Delete Account
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col md:flex-row items-center md:items-start gap-10">
            <div className="relative group" ref={profileIconRef}>
              <div className="absolute -inset-2 bg-primary/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <img
                src={currentProfileImage}
                alt="Profile"
                className="w-40 h-40 rounded-2xl border-4 border-secondary/50 shadow-2xl relative z-10 object-cover"
                onContextMenu={state.isOwnProfile ? (e) => {
                  e.preventDefault();
                  const x = 160 + 10;
                  const y = 0;
                  setState(prev => ({ ...prev, contextMenuPosition: { x, y } }));
                } : undefined}
                style={{ cursor: state.isOwnProfile ? "pointer" : "default" }}
              />

              {state.isOwnProfile && state.contextMenuPosition && (
                <div
                  ref={contextMenuRef}
                  className="absolute left-[170px] top-0 z-[100] w-48 glass-panel rounded-2xl py-2 overflow-hidden animate-in fade-in slide-in-from-left-4 duration-200 shadow-2xl"
                >
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setState(prev => ({ ...prev, contextMenuPosition: null }));
                    }}
                    disabled={state.uploading}
                    className="w-full text-left px-4 py-2.5 hover:bg-primary hover:text-black font-bold transition-all text-[10px] uppercase tracking-widest"
                  >
                    {state.uploading ? "Uploading..." : "Update Image"}
                  </button>
                  {state.profileImage && (
                    <button
                      onClick={() => {
                        updateProfileImage(null);
                        setState(prev => ({ ...prev, contextMenuPosition: null }));
                        showNotification("Profile image removed!", "success");
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-red-500 hover:text-white font-bold transition-all text-[10px] uppercase tracking-widest border-t border-white/5"
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

            <div className="flex-1 text-center md:text-left pt-4">
              <h3 className="font-display text-4xl font-black text-white tracking-widest mb-4 uppercase italic">
                {displayUser?.displayName || "Member"}
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-center md:justify-start gap-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary italic">Bio</h4>
                  {!state.isEditingAbout && state.isOwnProfile && (
                    <button onClick={startEditingAbout} className="p-1 hover:text-primary transition-colors opacity-50 hover:opacity-100">
                      <img src="/project-icons/Profile icons/edit.png" alt="" className="w-3 h-3 invert" />
                    </button>
                  )}
                </div>

                {state.isEditingAbout ? (
                  <div className="space-y-4 max-w-xl">
                    <div className="relative group">
                      <textarea
                        value={state.tempAbout}
                        onChange={(e) => {
                          const text = e.target.value;
                          if (text.length <= 200) {
                            setState(prev => ({ ...prev, tempAbout: text }));
                          }
                        }}
                        placeholder="Tell us about yourself..."
                        className="w-full bg-secondary/30 border border-white/5 rounded-2xl p-4 text-xs font-medium min-h-[100px] outline-none focus:border-primary/30 transition-all resize-none"
                        maxLength={200}
                        autoFocus
                      />
                      <div className={`absolute bottom-3 right-4 text-[9px] font-black ${state.tempAbout.length >= 180 ? 'text-yellow-500' : 'text-muted-foreground/30'}`}>
                        {state.tempAbout.length}/200
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveAboutMe}
                        className="px-6 py-2 rounded-xl bg-primary text-black font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50"
                        disabled={state.tempAbout === state.aboutMe}
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => setState(prev => ({ ...prev, isEditingAbout: false }))}
                        className="px-6 py-2 rounded-xl bg-secondary border border-white/5 text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="about-me-content">
                    <p className="text-sm text-muted-foreground/70 leading-relaxed font-medium max-w-xl italic">
                      {state.aboutMe || (state.isOwnProfile ? "No bio data recorded..." : "No bio data recorded...")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-12 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              <h4 className="font-display text-xl font-black uppercase tracking-tight">Riot Account Link</h4>
            </div>

            {state.linkedAccount ? (
              <div className="space-y-8 animate-in zoom-in-95 duration-500">
                <div className="glass-panel p-6 rounded-3xl border-primary/20 bg-primary/5 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all" />

                  <div className="relative">
                    <img
                      src={getProfileIconUrl(state.linkedAccount.profileIconId)}
                      alt="Summoner icon"
                      className="w-20 h-20 rounded-2xl border-2 border-primary/30 shadow-xl object-cover"
                      onError={(e) => {
                        e.target.src = `https://ddragon.leagueoflegends.com/cdn/25.22/img/profileicon/${state.linkedAccount.profileIconId}.png`;
                      }}
                    />
                    <div className="absolute -bottom-2 -right-2 bg-background border-2 border-primary text-primary px-2 py-0.5 rounded-lg text-[10px] font-black shadow-lg">
                      Lvl {state.linkedAccount.summonerLevel}
                    </div>
                  </div>

                  <div className="flex-1 text-center md:text-left">
                    <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                      <span className="font-display text-2xl font-black text-white">
                        {state.linkedAccount.gameName}#{state.linkedAccount.tagLine}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-current animate-pulse" />
                        Verified
                      </span>
                    </div>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <img src="/project-icons/Profile icons/globe icon.png" alt="" className="w-3 h-3 opacity-30 invert" />
                        Region: {REGIONS.find(r => r.value === state.linkedAccount.region)?.label || state.linkedAccount.region.toUpperCase()}
                      </span>
                      {state.isOwnProfile && (
                        <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                          Last synced: {formatTimeAgo(state.lastUpdateTime)}
                        </span>
                      )}
                    </div>
                  </div>

                  {state.isOwnProfile && (
                    <div className="flex flex-col gap-2 w-full md:w-auto">
                      <button
                        onClick={handleManualRankedUpdate}
                        disabled={state.rankedUpdateLoading}
                        className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-black hover:border-primary transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                      >
                        <img src="/project-icons/Profile icons/update icon.png" alt="" className="w-3 h-3 group-hover/btn:rotate-180 transition-transform" />
                        {state.rankedUpdateLoading ? "Syncing..." : "Sync Data"}
                      </button>
                      <button
                        onClick={unlinkRiotAccount}
                        className="px-6 py-2.5 rounded-xl text-red-400/50 hover:text-red-400 hover:bg-red-400/10 text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Unlink Account
                      </button>
                    </div>
                  )}
                </div>

                {state.backendError && (
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-4 animate-in slide-in-from-left duration-500">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 font-black">!</div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-400">
                      Backend Offline - Sync Unavailable
                    </p>
                  </div>
                )}

                {state.rankedData ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                      <div className="w-1 h-4 bg-muted-foreground/30 rounded-full" />
                      <h5 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/70 italic">Ranked Data</h5>
                    </div>
                    <RankedInfo rankedData={state.rankedData} />
                  </div>
                ) : state.backendError ? (
                  <div className="glass-panel p-12 rounded-3xl flex flex-col items-center justify-center text-center">
                    <p className="text-muted-foreground/40 font-black text-[10px] uppercase tracking-[0.3em]">
                      Updating Account Data...
                    </p>
                  </div>
                ) : null}
              </div>
            ) : state.isOwnProfile ? (
              <div className="glass-panel p-8 rounded-3xl border-dashed border-white/10 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center border border-white/5 shadow-xl group-hover:scale-110 transition-transform duration-500">
                  <img src="/project-icons/Profile icons/riot guest icon.png" alt="" className="w-8 h-8 opacity-20 invert" />
                </div>
                <div>
                  <h5 className="font-display text-lg font-black text-white uppercase italic tracking-wider mb-2">Link Riot Account</h5>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] max-w-xs mx-auto">
                    Connect your Riot ID to sync your ranked standings.
                  </p>
                </div>

                <form onSubmit={handleRiotAccountLink} className="w-full max-w-sm space-y-4">
                  <div className="space-y-1.5 text-left">
                    <label htmlFor="riotId" className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/50 ml-1 italic">Riot ID</label>
                    <input
                      type="text"
                      id="riotId"
                      value={state.riotId}
                      onChange={(e) => setState(prev => ({ ...prev, riotId: e.target.value }))}
                      placeholder="Riot#TAG"
                      className="w-full bg-secondary/50 border border-white/5 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:border-primary/30 transition-all placeholder:text-muted-foreground/20"
                      maxLength={25}
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label htmlFor="region" className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/50 ml-1 italic">Region</label>
                    <div className="relative group/select">
                      <select
                        id="region"
                        value={state.region}
                        onChange={(e) => setState(prev => ({ ...prev, region: e.target.value }))}
                        className="w-full bg-secondary/50 border border-white/5 rounded-2xl pl-5 pr-12 py-4 text-sm font-black uppercase tracking-widest outline-none focus:border-primary/30 transition-all appearance-none cursor-pointer"
                      >
                        {REGIONS.map(region => <option key={region.value} value={region.value} className="bg-secondary text-white">{region.label}</option>)}
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-white/20 group-hover/select:text-primary transition-colors">
                        <ChevronDown className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {state.linkError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[10px] font-black text-red-500 uppercase tracking-widest italic animate-shake">
                      {state.linkError}
                    </div>
                  )}
                  {state.linkSuccess && (
                    <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-[10px] font-black text-green-500 uppercase tracking-widest animate-bounce">
                      Riot Account Linked
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={state.linkingAccount}
                    className="w-full py-4 rounded-2xl bg-primary text-black font-black text-xs uppercase tracking-[0.3em] hover:bg-white transition-all shadow-xl shadow-primary/20 active:scale-[0.98] disabled:opacity-50"
                  >
                    {state.linkingAccount ? "Syncing..." : "Link Account"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="glass-panel p-12 rounded-3xl flex flex-col items-center justify-center text-center">
                <p className="text-muted-foreground/30 font-black text-[10px] uppercase tracking-[0.3em]">
                  No Riot Account Linked.
                </p>
              </div>
            )}
          </div>
        </div>

        <ProfilePosts
          user={state.user}
          profileImage={state.profileImage}
          posts={state.posts}
          isOwnProfile={state.isOwnProfile}
          onPostCreated={() => {
          }}
        />

        {state.accountInfoOpen && state.isOwnProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setState(prev => ({ ...prev, accountInfoOpen: false }))} />
            <div ref={accountInfoModalRef} className="glass-panel w-full max-w-lg rounded-3xl p-8 relative z-10 animate-in zoom-in-95 duration-300 shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />

              <div className="flex items-center gap-4 mb-8">
                <div className="w-1.5 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                <h3 className="font-display text-2xl font-black uppercase tracking-tight italic">Account Info</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/2 rounded-2xl border border-white/5 group hover:border-white/10 transition-colors">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 italic">Email</span>
                  <span className="text-sm font-bold text-white selection:bg-primary selection:text-black">{displayEmail || "No data"}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/2 rounded-2xl border border-white/5 group hover:border-white/10 transition-colors">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 italic">Link Status</span>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${state.user?.emailVerified ? "text-green-500" : "text-red-500"}`}>
                      {state.user?.emailVerified ? "Verified" : "Unverified"}
                    </span>
                    {!state.user?.emailVerified && (
                      <button
                        onClick={verifyEmail}
                        className="px-3 py-1 rounded-lg bg-red-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                        disabled={state.verificationLoading || state.emailVerificationSent}
                      >
                        {state.verificationLoading ? "Sending..." : "Send Verification"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/2 rounded-2xl border border-white/5 group hover:border-white/10 transition-colors">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 italic">Joined</span>
                  <span className="text-sm font-bold text-white">
                    {joinedDate.toLocaleDateString()} <span className="text-muted-foreground/30 ml-2 font-black italic">({accountAgeDays} days ago)</span>
                  </span>
                </div>

                {state.user?.metadata?.lastSignInTime && (
                  <div className="flex items-center justify-between p-4 bg-white/2 rounded-2xl border border-white/5 group hover:border-white/10 transition-colors">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 italic">Last Session</span>
                    <span className="text-xs font-bold text-white/50">{new Date(state.user.metadata.lastSignInTime).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setState(prev => ({ ...prev, accountInfoOpen: false }))}
                className="w-full mt-8 py-4 rounded-xl bg-secondary border border-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all shadow-xl"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {state.isOwnProfile && state.showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-red-950/20 backdrop-blur-xl" onClick={() => setState(prev => ({ ...prev, showDeleteConfirm: false }))} />
            <div className="glass-panel w-full max-w-lg rounded-3xl p-8 relative z-10 animate-in zoom-in-95 duration-300 shadow-2xl overflow-hidden border-red-500/20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl opacity-50" />

              <div className="flex items-center gap-4 mb-6">
                <div className="w-1.5 h-8 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                <h3 className="font-display text-2xl font-black uppercase tracking-tight italic text-red-500 font-black">Delete Account</h3>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-red-500/5 rounded-2xl border border-red-500/20">
                  <p className="text-sm font-bold text-red-200 leading-relaxed mb-4">
                    Are you absolutely certain? Account deletion is a destructive operation that cannot be reversed.
                  </p>
                  <ul className="space-y-2">
                    {["Full Profile Data Wipe", "Riot Account Unlinked", "Post History Deleted"].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-400/70">
                        <div className="w-1 h-1 rounded-full bg-red-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setState(prev => ({ ...prev, showDeleteConfirm: false }))}
                    className="flex-1 py-4 rounded-xl bg-secondary border border-white/5 text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Abort
                  </button>
                  <button
                    onClick={() => setState(prev => ({ ...prev, showDeleteConfirm: false, showReauthModal: true }))}
                    className="flex-1 py-4 rounded-xl bg-red-500 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all shadow-xl shadow-red-500/20 active:scale-95"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {state.isOwnProfile && state.showReauthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setState(prev => ({ ...prev, showReauthModal: false, password: "", reauthError: "" }))} />
            <div className="glass-panel w-full max-w-lg rounded-3xl p-8 relative z-10 animate-in zoom-in-95 duration-300 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-1.5 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                <h3 className="font-display text-2xl font-black uppercase tracking-tight italic">Security Check</h3>
              </div>

              <div className="space-y-6">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">
                  Enter your password to confirm account deletion.
                </p>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/50 ml-1 italic">Password</label>
                  <input
                    id="password"
                    type="password"
                    value={state.password}
                    onChange={(e) => setState(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter Password"
                    className="w-full bg-secondary/50 border border-white/5 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:border-red-500/30 transition-all placeholder:text-muted-foreground/10"
                  />
                  {state.reauthError && (
                    <div className="text-[10px] font-black text-red-500 uppercase tracking-widest italic animate-shake ml-1">
                      {state.reauthError}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setState(prev => ({ ...prev, showReauthModal: false, password: "", reauthError: "" }))}
                    className="flex-1 py-4 rounded-xl bg-secondary border border-white/5 text-[10px] font-black uppercase tracking-widest transition-all"
                    disabled={state.deletingAccount}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReauthentication}
                    className="flex-1 py-4 rounded-xl bg-red-500 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all shadow-xl shadow-red-500/20 active:scale-95 disabled:opacity-50"
                    disabled={state.deletingAccount || !state.password}
                  >
                    {state.deletingAccount ? "Deleting..." : "Delete Account"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div >
  );
}

export default Profile;
