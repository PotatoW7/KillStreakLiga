import React, { useEffect, useState, useRef } from "react";
const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_URL || "";
import { useParams, useNavigate, Link } from "react-router-dom";
import { auth, db, rtdb } from "../firebase";
import { ref, onValue } from "firebase/database";
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
import "../styles/componentsCSS/profile.css";

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
  const getQueueData = (queueType) => {
    return rankedData?.find(queue => queue.queueType === queueType);
  };

  const renderRankCard = (queue, queueName) => {
    if (!queue) return (
      <div className="rank-card unranked-state">
        <div className="rank-queue-name">{queueName}</div>
        <div className="unranked-text">Unranked</div>
      </div>
    );
    const totalGames = queue.wins + queue.losses;
    const winRate = totalGames > 0 ? Math.round((queue.wins / totalGames) * 100) : 0;
    const tierName = queue.tier.charAt(0) + queue.tier.slice(1).toLowerCase();

    return (
      <div className="rank-card">
        <div className="rank-card-header">
          <div className="rank-queue-name">{queueName}</div>
          <div className={`rank-wr ${winRate >= 50 ? 'positive' : 'negative'}`}>
            {winRate}% WR
          </div>
        </div>

        <div className="rank-card-body">
          <img
            src={`/rank-icons/Rank=${tierName}.png`}
            alt={queue.tier}
            className="rank-icon-large"
            onError={(e) => (e.target.src = "/rank-icons/Rank=Unranked.png")}
          />
          <div>
            <div className="rank-tier-text">{queue.tier} {queue.rank}</div>
            <div className="rank-lp-text">{queue.leaguePoints} LP</div>
          </div>
        </div>

        <div className="rank-stats-row">
          <span>{queue.wins} Wins</span>
          <span>{queue.losses} Losses</span>
        </div>
        <div className="rank-progress-bg" title={`${queue.leaguePoints} LP`}>
          <div
            className="rank-progress-fill"
            style={{ width: `${Math.min(100, queue.leaguePoints)}%` }}
          />
        </div>
      </div>
    );
  };

  const rankedSolo = getQueueData('RANKED_SOLO_5x5');
  const rankedFlex = getQueueData('RANKED_FLEX_SR');

  return (
    <div className="ranked-cards-row">
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
    loadingPosts: true,
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

      const response = await fetch(`${API_URL}/summoner-info/${account.region}/${encodeURIComponent(account.gameName)}/${encodeURIComponent(account.tagLine)}`);
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

    setState(prev => ({ ...prev, loadingPosts: true, posts: [] }));

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
        if (post.visibility === "public" || post.visibility === "profile only") return true;
        if (post.visibility === "friends only" && isFriend) return true;
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
              emailVerificationSent: userData.emailVerificationSent || false,
              loadingPosts: true
            }));

            if (userData.riotAccount) {
              await checkAndUpdateRankedData(currentUser.uid, userData.riotAccount);
            }
          } else {
            setState(prev => ({
              ...prev,
              profileImage: userData.profileImage || null,
              linkedAccount: userData.riotAccount || null,
              loadingPosts: true
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
      const response = await fetch(`${API_URL}/summoner-info/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
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
        await fetch(`${API_URL}/api/queue/leave`, {
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

  if (!state.profileData) return <div className="loading">Loading profile...</div>;

  const displayEmail = state.isOwnProfile ? state.user?.email : null;
  const joinedDate = state.profileData?.createdAt ? new Date(state.profileData.createdAt.seconds * 1000) : new Date();
  const accountAgeDays = Math.floor((Date.now() - joinedDate) / 86400000);
  const currentProfileImage = state.profileImage || "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png";
  const userRole = state.profileData?.role || "user";
  const coachAppStatus = state.profileData?.coachApplication?.status;

  return (
    <div className="profile-page">
      <div className="profile-max-width">
        <div className="profile-header-row">
          <div className="profile-header-left">
            <h2 className="profile-title">
              <div className="profile-title-bar" />
              {state.isOwnProfile ? "Profile Dashboard" : `${state.profileData.username || "Member"}`}
            </h2>
            {userRole !== "user" && (
              <span className={`role-tag-large ${userRole}`}>
                {userRole.toUpperCase()}
              </span>
            )}
            {coachAppStatus === "pending" && state.isOwnProfile && (
              <span className="coach-pending-badge">Coach App Pending</span>
            )}
          </div>

        </div>

        <div className="profile-main-panel glass-panel">
          <div className="profile-panel-glow" />

          {state.notification.visible && (
            <div className={`profile-notification ${state.notification.type}`}>
              {state.notification.message}
            </div>
          )}

          {state.isOwnProfile && (
            <div className="profile-menu-container">
              <button
                ref={hamburgerRef}
                className={`profile-hamburger ${state.menuOpen ? 'open' : ''}`}
                onClick={() => setState(prev => ({ ...prev, menuOpen: !prev.menuOpen }))}
              >
                <span />
                <span />
                <span />
              </button>

              {state.menuOpen && (
                <div ref={menuRef} className="profile-dropdown-menu">
                  <button
                    className="menu-item"
                    onClick={() => setState(prev => ({ ...prev, menuOpen: false, accountInfoOpen: true }))}
                  >
                    <div className="menu-item-dot" />
                    Account Info
                  </button>
                  {userRole !== 'admin' &&
                    state.profileData?.adminApplication?.status !== 'pending' && (
                      <Link
                        to="/apply-admin"
                        className="menu-item"
                        onClick={() => setState(prev => ({ ...prev, menuOpen: false }))}
                      >
                        <div className="menu-item-dot" />
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
                    className="menu-item danger"
                  >
                    <div className="menu-item-dot" />
                    Delete Account
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="profile-info-grid">
            <div className="profile-avatar-container" ref={profileIconRef}>
              <div className="avatar-hover-glow" />
              <img
                src={currentProfileImage}
                alt="Profile"
                className="profile-main-avatar"
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
                  className="image-context-menu"
                >
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setState(prev => ({ ...prev, contextMenuPosition: null }));
                    }}
                    disabled={state.uploading}
                    className="image-menu-btn"
                  >
                    {state.uploading ? "Uploading..." : "Update Image"}
                  </button>
                  {state.profileImage && (
                    <button
                      onClick={() => {
                        updateProfileImage("https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png");
                        setState(prev => ({ ...prev, contextMenuPosition: null }));
                        showNotification("Profile image removed!", "success");
                      }}
                      className="image-menu-btn delete"
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

            <div className="profile-details-column">
              <h3 className="profile-display-name">
                {state.profileData?.username || "Member"}
              </h3>

              <div className="bio-container">
                <div className="bio-header">
                  <h4 className="bio-label">Bio</h4>
                  {!state.isEditingAbout && state.isOwnProfile && (
                    <button onClick={startEditingAbout} className="bio-edit-btn">
                      <img src="/project-icons/Profile icons/edit.png" alt="" />
                    </button>
                  )}
                </div>

                {state.isEditingAbout ? (
                  <div className="bio-textarea-wrapper">
                    <textarea
                      value={state.tempAbout}
                      onChange={(e) => {
                        const text = e.target.value;
                        if (text.length <= 200) {
                          setState(prev => ({ ...prev, tempAbout: text }));
                        }
                      }}
                      placeholder="Tell us about yourself..."
                      className="bio-textarea"
                      maxLength={200}
                      autoFocus
                    />
                    <div className={`bio-char-count ${state.tempAbout.length >= 180 ? 'warning' : ''}`}>
                      {state.tempAbout.length}/200
                    </div>
                    <div className="bio-save-row">
                      <button
                        onClick={saveAboutMe}
                        className="bio-save-btn"
                        disabled={state.tempAbout === state.aboutMe}
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => setState(prev => ({ ...prev, isEditingAbout: false }))}
                        className="bio-cancel-btn"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bio-text-display">
                    <p className="bio-text">
                      {state.aboutMe || "No bio data recorded..."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="riot-link-section">
            <div className="section-title-row">
              <div className="section-title-bar" />
              <h4 className="section-title-text">Riot Account Link</h4>
            </div>

            {state.linkedAccount ? (
              <div className="riot-account-active">
                <div className="riot-account-banner">
                  <div className="riot-banner-glow" />

                  <div className="riot-icon-wrapper">
                    <img
                      src={getProfileIconUrl(state.linkedAccount.profileIconId)}
                      alt="Summoner icon"
                      className="riot-banner-icon"
                      onError={(e) => {
                        e.target.src = `https://ddragon.leagueoflegends.com/cdn/25.22/img/profileicon/${state.linkedAccount.profileIconId}.png`;
                      }}
                    />
                    <div className="riot-banner-level">
                      {state.linkedAccount.summonerLevel}
                    </div>
                  </div>

                  <div className="riot-banner-info">
                    <div className="riot-id-row">
                      <span className="riot-id-text">
                        {state.linkedAccount.gameName}#{state.linkedAccount.tagLine}
                      </span>
                      <span className="riot-verified-badge">
                        <div className="verified-dot" />
                        Verified
                      </span>
                    </div>
                    <div className="riot-meta-row">
                      <span className="riot-meta-item">
                        <img src="/project-icons/Profile icons/globe icon.png" alt="" />
                        Region: {REGIONS.find(r => r.value === state.linkedAccount.region)?.label || state.linkedAccount.region.toUpperCase()}
                      </span>
                      {state.isOwnProfile && (
                        <span className="riot-meta-item">
                          Last synced: {formatTimeAgo(state.lastUpdateTime)}
                        </span>
                      )}
                    </div>
                  </div>

                  {state.isOwnProfile && (
                    <div className="riot-actions-column">
                      <button
                        onClick={handleManualRankedUpdate}
                        disabled={state.rankedUpdateLoading}
                        className="riot-sync-btn"
                      >
                        <img src="/project-icons/Profile icons/update icon.png" alt="" />
                        {state.rankedUpdateLoading ? "Syncing..." : "Sync Data"}
                      </button>
                      <button
                        onClick={unlinkRiotAccount}
                        className="riot-unlink-btn"
                      >
                        Unlink Account
                      </button>
                    </div>
                  )}
                </div>

                {state.backendError && (
                  <div className="backend-error-notice">
                    <div className="error-icon-wrapper">
                      <span className="error-icon">!</span>
                    </div>
                    <div className="error-text-content">
                      <h5 className="error-title">Backend Offline</h5>
                      <p className="error-msg">Sync Unavailable - Server connection failed</p>
                    </div>
                  </div>
                )}

                {state.rankedData ? (
                  <div className="ranked-data-container">
                    <div className="sub-section-header">
                      <div className="header-dot" />
                      <h5 className="sub-section-label">Ranked Data</h5>
                    </div>
                    <RankedInfo rankedData={state.rankedData} />
                  </div>
                ) : state.backendError ? (
                  <div className="updating-data-state">
                    <p className="updating-status">Updating Account Data...</p>
                  </div>
                ) : null}
              </div>
            ) : state.isOwnProfile ? (
              <div className="empty-riot-card">
                <div className="riot-placeholder-icon">
                  <img src="/project-icons/Profile icons/riot guest icon.png" alt="" />
                </div>
                <div className="riot-empty-text">
                  <h5>Link Riot Account</h5>
                  <p>Connect your Riot ID to sync your ranked standings.</p>
                </div>

                <form onSubmit={handleRiotAccountLink} className="riot-link-form">
                  <div className="form-field">
                    <label htmlFor="riotId" className="form-label">Riot ID</label>
                    <input
                      type="text"
                      id="riotId"
                      value={state.riotId}
                      onChange={(e) => setState(prev => ({ ...prev, riotId: e.target.value }))}
                      placeholder="Riot#TAG"
                      className="form-input"
                      maxLength={25}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="region" className="form-label">Region</label>
                    <div className="select-wrapper">
                      <select
                        id="region"
                        value={state.region}
                        onChange={(e) => setState(prev => ({ ...prev, region: e.target.value }))}
                        className="form-select"
                      >
                        {REGIONS.map(region => <option key={region.value} value={region.value}>{region.label}</option>)}
                      </select>
                      <div className="select-caret">
                        <ChevronDown className="icon-md" />
                      </div>
                    </div>
                  </div>

                  {state.linkError && (
                    <div className="form-error-msg animate-shake">
                      {state.linkError}
                    </div>
                  )}
                  {state.linkSuccess && (
                    <div className="form-success-msg animate-bounce">
                      {state.linkSuccess}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={state.linkingAccount}
                    className="link-btn"
                  >
                    {state.linkingAccount ? "Syncing..." : "Link Account"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="no-account-linked">
                <p className="no-account-text">No Riot Account Linked.</p>
              </div>
            )}
          </div>
        </div>

        <ProfilePosts
          user={state.user}
          profileImage={state.profileImage}
          posts={state.posts}
          isOwnProfile={state.isOwnProfile}
          onPostCreated={() => { }}
          loadingPosts={state.loadingPosts}
        />

        {state.accountInfoOpen && state.isOwnProfile && (
          <div className="profile-modal-overlay">
            <div className="profile-modal-backdrop" onClick={() => setState(prev => ({ ...prev, accountInfoOpen: false }))} />
            <div ref={accountInfoModalRef} className="profile-modal-content">
              <div className="profile-modal-title-row">
                <div className="profile-modal-title-bar" />
                <h3 className="profile-modal-title">Account Info</h3>
              </div>

              <div className="modal-items-column">
                <div className="modal-item-row">
                  <span className="modal-item-label">Email</span>
                  <span className="modal-item-value">{displayEmail || "No data"}</span>
                </div>

                <div className="modal-item-row">
                  <span className="modal-item-label">Link Status</span>
                  <div className="link-status-group">
                    <span className={`status-text ${state.user?.emailVerified ? "verified" : "unverified"}`}>
                      {state.user?.emailVerified ? "Verified" : "Unverified"}
                    </span>
                    {!state.user?.emailVerified && (
                      <button
                        onClick={verifyEmail}
                        className="resend-verify-btn"
                        disabled={state.verificationLoading || state.emailVerificationSent}
                      >
                        {state.verificationLoading ? "Sending..." : "Send Verification"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="modal-item-row">
                  <span className="modal-item-label">Joined</span>
                  <span className="modal-item-value">
                    {joinedDate.toLocaleDateString()} <span className="joined-age">({accountAgeDays} days ago)</span>
                  </span>
                </div>

                {state.user?.metadata?.lastSignInTime && (
                  <div className="modal-item-row">
                    <span className="modal-item-label">Last Session</span>
                    <span className="modal-item-value secondary">
                      {new Date(state.user.metadata.lastSignInTime).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setState(prev => ({ ...prev, accountInfoOpen: false }))}
                className="modal-close-btn"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {state.isOwnProfile && state.showDeleteConfirm && (
          <div className="profile-modal-overlay">
            <div className="profile-modal-backdrop danger" onClick={() => setState(prev => ({ ...prev, showDeleteConfirm: false }))} />
            <div className="profile-modal-content delete-modal">
              <div className="profile-modal-title-row">
                <div className="profile-modal-title-bar danger" />
                <h3 className="profile-modal-title delete-title">Delete Account</h3>
              </div>

              <div className="delete-modal-body">
                <div className="delete-warning-box">
                  <p className="delete-warning-text">
                    Are you absolutely certain? Account deletion is a destructive operation that cannot be reversed.
                  </p>
                  <ul className="delete-impact-list">
                    {["Full Profile Data Wipe", "Riot Account Unlinked", "Post History Deleted"].map((item, i) => (
                      <li key={i} className="impact-item">
                        <div className="impact-dot" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="modal-actions-row">
                  <button
                    onClick={() => setState(prev => ({ ...prev, showDeleteConfirm: false }))}
                    className="modal-abort-btn"
                  >
                    Abort
                  </button>
                  <button
                    onClick={() => setState(prev => ({ ...prev, showDeleteConfirm: false, showReauthModal: true }))}
                    className="modal-confirm-btn"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {state.isOwnProfile && state.showReauthModal && (
          <div className="profile-modal-overlay">
            <div className="profile-modal-backdrop" onClick={() => setState(prev => ({ ...prev, showReauthModal: false, password: "", reauthError: "" }))} />
            <div className="profile-modal-content security-modal">
              <div className="profile-modal-title-row">
                <div className="profile-modal-title-bar" />
                <h3 className="profile-modal-title">Security Check</h3>
              </div>

              <div className="security-modal-body">
                <p className="security-desc">
                  Enter your password to confirm account deletion.
                </p>

                <div className="form-field">
                  <label htmlFor="password" className="form-label">Password</label>
                  <input
                    id="password"
                    type="password"
                    value={state.password}
                    onChange={(e) => setState(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter Password"
                    className="form-input security-input"
                  />
                  {state.reauthError && (
                    <div className="form-error-msg animate-shake">
                      {state.reauthError}
                    </div>
                  )}
                </div>

                <div className="modal-actions-row">
                  <button
                    onClick={() => setState(prev => ({ ...prev, showReauthModal: false, password: "", reauthError: "" }))}
                    className="modal-abort-btn"
                    disabled={state.deletingAccount}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReauthentication}
                    className="modal-confirm-btn danger"
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
