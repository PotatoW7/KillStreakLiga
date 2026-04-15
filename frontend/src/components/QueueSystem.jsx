import React, { useState, useEffect, useRef } from 'react';
const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_URL || "";
import ReactDOM from 'react-dom';
import { auth, db } from '../firebase';
import {
  collection, query, where, onSnapshot, addDoc,
  serverTimestamp, doc, getDoc, orderBy, deleteDoc,
  updateDoc, arrayUnion, arrayRemove, getDocs, writeBatch
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Users, Swords, Filter, Clock, ShieldCheck, ShieldX, Star, Trash2, Edit3, UserPlus, Check, X, Copy, ExternalLink, ChevronDown, PlusSquare } from 'lucide-react';
import '../styles/componentsCSS/queue-system.css';

const normalizeProfileIcon = (url) => {
  if (!url) return url;
  if (typeof url !== 'string') return url;
  if (url.includes('profileicon/588.png')) {
    return 'https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png';
  }
  if (url.includes('ddragon.leagueoflegends.com/cdn/13.20.1/')) {
    return url.replace('13.20.1', '14.3.1');
  }
  return url;
};

function QueueSystem() {
  const [isPostingGame, setIsPostingGame] = useState(false);
  const [isEditingGame, setIsEditingGame] = useState(null);
  const [gameListings, setGameListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [userFriends, setUserFriends] = useState([]);
  const [sentFriendRequests, setSentFriendRequests] = useState([]);
  const [processingRequests, setProcessingRequests] = useState(new Set());
  const [selectedJoinRole, setSelectedJoinRole] = useState('fill');

  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    roles: [],
    rank: 'all',
    queueType: 'all',
    region: 'all'
  });

  const [playerProfiles, setPlayerProfiles] = useState({});
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [joinMessage, setJoinMessage] = useState('');

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [myGameRequests, setMyGameRequests] = useState([]);


  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [gameToDelete, setGameToDelete] = useState(null);

  const [gameData, setGameData] = useState({
    role: 'fill',
    queueType: 'ranked_solo_duo',
    communication: 'text',
    preferredDuoRole: 'fill',
    description: '',
  });

  const [showRiotLinkModal, setShowRiotLinkModal] = useState(false);

  const rankDropdownRef = useRef(null);
  const queueDropdownRef = useRef(null);
  const regionDropdownRef = useRef(null);
  const postQueueDropdownRef = useRef(null);
  const [showRankDropdown, setShowRankDropdown] = useState(false);
  const [showQueueDropdown, setShowQueueDropdown] = useState(false);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [showPostQueueDropdown, setShowPostQueueDropdown] = useState(false);

  const roles = [
    { id: 'fill', name: 'Fill', icon: '/lane-icons/Fill icon.png' },
    { id: 'top', name: 'Top', icon: '/lane-icons/top lane.png' },
    { id: 'jungle', name: 'Jungle', icon: '/lane-icons/jg icon.png' },
    { id: 'mid', name: 'Mid', icon: '/lane-icons/mid lane.png' },
    { id: 'adc', name: 'ADC', icon: '/lane-icons/adc lane.png' },
    { id: 'support', name: 'Support', icon: '/lane-icons/sup icon.png' }
  ];

  const queueTypes = [
    { id: 'all', name: 'All Queues' },
    { id: 'ranked_solo_duo', name: 'Ranked Solo/Duo' },
    { id: 'ranked_flex', name: 'Ranked Flex' },
    { id: 'normal_draft', name: 'Normal Draft' },
    { id: 'aram', name: 'ARAM' },
    { id: 'swiftplay', name: 'Swiftplay' }
  ];

  const communicationTypes = [
    { id: 'text', name: 'Text Chat' },
    { id: 'voice', name: 'Voice Chat' },
  ];

  const rankTiers = [
    { id: 'all', name: 'All Ranks' },
    { id: 'unranked', name: 'Unranked' },
    { id: 'IRON', name: 'Iron' },
    { id: 'BRONZE', name: 'Bronze' },
    { id: 'SILVER', name: 'Silver' },
    { id: 'GOLD', name: 'Gold' },
    { id: 'PLATINUM', name: 'Platinum' },
    { id: 'EMERALD', name: 'Emerald' },
    { id: 'DIAMOND', name: 'Diamond' },
    { id: 'MASTER', name: 'Master' },
    { id: 'GRANDMASTER', name: 'Grandmaster' },
    { id: 'CHALLENGER', name: 'Challenger' },
  ];

  const regions = [
    { id: 'all', name: 'All Regions' },
    { id: 'na1', name: 'North America' },
    { id: 'euw1', name: 'EU West' },
    { id: 'eun1', name: 'EU Nordic & East' },
    { id: 'kr', name: 'Korea' },
    { id: 'jp1', name: 'Japan' },
    { id: 'br1', name: 'Brazil' },
    { id: 'la2', name: 'Latin America South' },
    { id: 'la1', name: 'Latin America North' },
    { id: 'oc1', name: 'Oceania' },
    { id: 'ru', name: 'Russia' },
    { id: 'tr1', name: 'Turkey' },
    { id: 'ph2', name: 'Philippines' },
    { id: 'sg2', name: 'Singapore' },
    { id: 'th2', name: 'Thailand' },
    { id: 'tw2', name: 'Taiwan' },
    { id: 'vn2', name: 'Vietnam' },
    { id: 'me1', name: 'Middle East' }
  ];

  const rankIconsMap = {
    'UNRANKED': 'Rank=Unranked.png',
    'IRON': 'Rank=Iron.png',
    'BRONZE': 'Rank=Bronze.png',
    'SILVER': 'Rank=Silver.png',
    'GOLD': 'Rank=Gold.png',
    'PLATINUM': 'Rank=Platinum.png',
    'EMERALD': 'Rank=Emerald.png',
    'DIAMOND': 'Rank=Diamond.png',
    'MASTER': 'Rank=Master.png',
    'GRANDMASTER': 'Rank=Grandmaster.png',
    'CHALLENGER': 'Rank=Challenger.png'
  };

  const mapRegionToFilter = (regionFromDB) => {
    if (!regionFromDB) return null;

    const regionMap = {
      'na1': 'na1',
      'euw1': 'euw1',
      'eun1': 'eun1',
      'kr': 'kr',
      'jp1': 'jp1',
      'br1': 'br1',
      'la2': 'la2',
      'la1': 'la1',
      'oc1': 'oc1',
      'ru': 'ru',
      'tr1': 'tr1',
      'ph2': 'ph2',
      'sg2': 'sg2',
      'th2': 'th2',
      'tw2': 'tw2',
      'vn2': 'vn2',
      'me1': 'me1'
    };

    return regionMap[regionFromDB.toLowerCase()] || regionFromDB.toLowerCase();
  };

  const getDisplayRegion = (regionFromDB) => {
    if (!regionFromDB) return 'Unknown';

    const displayMap = {
      'na1': 'North America',
      'euw1': 'EUW',
      'eun1': 'EUNE',
      'kr': 'Korea',
      'jp1': 'Japan',
      'br1': 'Brazil',
      'la2': 'LAS',
      'la1': 'LAN',
      'oc1': 'Oceania',
      'ru': 'Russia',
      'tr1': 'Turkey',
      'ph2': 'Philippines',
      'sg2': 'Singapore',
      'th2': 'Thailand',
      'tw2': 'Taiwan',
      'vn2': 'Vietnam',
      'me1': 'Middle East'
    };

    return displayMap[regionFromDB.toLowerCase()] || regionFromDB.toUpperCase();
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (rankDropdownRef.current && !rankDropdownRef.current.contains(event.target)) {
        setShowRankDropdown(false);
      }
      if (queueDropdownRef.current && !queueDropdownRef.current.contains(event.target)) {
        setShowQueueDropdown(false);
      }
      if (regionDropdownRef.current && !regionDropdownRef.current.contains(event.target)) {
        setShowRegionDropdown(false);
      }
      if (postQueueDropdownRef.current && !postQueueDropdownRef.current.contains(event.target)) {
        setShowPostQueueDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleTextareaResize = (e) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;

    if (textarea.scrollHeight > 300) {
      textarea.style.height = '300px';
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.overflowY = 'hidden';
    }
  };

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }

    updateUserRankedData();
    fetchUserProfile();
    fetchGameListings();
    fetchMyGameRequests();

    const friendsUnsubscribe = fetchUserFriends();

    return () => {
      const listingUnsubscribe = fetchGameListings();
      if (listingUnsubscribe) listingUnsubscribe();
      if (friendsUnsubscribe) friendsUnsubscribe();
    };
  }, []);

  useEffect(() => {
    if (gameListings.length > 0) {
      gameListings.forEach(game => {
        if (game.userId && !playerProfiles[game.userId]) {
          fetchUserProfileById(game.userId);
        }
      });
    }
  }, [gameListings]);

  useEffect(() => {
    applyFilters();
  }, [filters, gameListings]);

  const applyFilters = () => {
    if (gameListings.length === 0) {
      setFilteredListings([]);
      return;
    }

    let filtered = [...gameListings];

    if (filters.roles.length > 0) {
      filtered = filtered.filter(game => {
        const roleMatch = filters.roles.includes(game.role);
        const preferredRoleMatch = filters.roles.includes(game.preferredDuoRole);
        return roleMatch || preferredRoleMatch;
      });
    }

    if (filters.rank !== 'all') {
      filtered = filtered.filter(game => {
        const rankedData = game.userRankedData || [];

        if (filters.rank === 'unranked') {
          return !rankedData || rankedData.length === 0 ||
            (!rankedData.find(q => q.queueType.includes('SOLO')) &&
              !rankedData.find(q => q.queueType.includes('FLEX')));
        }

        const soloQueue = getQueueData(rankedData, 'RANKED_SOLO_5x5');
        const flexQueue = getQueueData(rankedData, 'RANKED_FLEX_SR');

        const soloMatch = soloQueue && soloQueue.tier &&
          soloQueue.tier.toLowerCase() === filters.rank.toLowerCase();
        const flexMatch = flexQueue && flexQueue.tier &&
          flexQueue.tier.toLowerCase() === filters.rank.toLowerCase();

        return soloMatch || flexMatch;
      });
    }

    if (filters.queueType !== 'all') {
      filtered = filtered.filter(game => game.queueType === filters.queueType);
    }

    if (filters.region !== 'all' && filters.region !== 'undefined') {
      filtered = filtered.filter(game => {
        if (!game.userRiotAccountObject || !game.userRiotAccountObject.region) {
          return false;
        }

        const gameRegion = mapRegionToFilter(game.userRiotAccountObject.region);
        return gameRegion === filters.region;
      });
    }

    setFilteredListings(filtered);
  };

  const getRankIconForFilter = (rankId) => {
    if (rankId === 'all') return '/rank-icons/tool.png';
    if (rankId === 'unranked') return '/rank-icons/Rank=Unranked.png';

    const fileName = rankIconsMap[rankId];
    return fileName ? `/rank-icons/${fileName}` : '/rank-icons/Rank=Unranked.png';
  };

  const updateUserRankedData = async () => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();

        if (userData.riotAccount && userData.riotAccount.gameName && userData.riotAccount.tagLine) {
          try {
            const response = await fetch(`${API_URL}/summoner-info/${userData.riotAccount.region}/${encodeURIComponent(userData.riotAccount.gameName)}/${encodeURIComponent(userData.riotAccount.tagLine)}`);
            if (response.ok) {
              const summonerData = await response.json();
              const rankedData = summonerData.ranked || [];

              await updateDoc(userRef, {
                rankedData: rankedData,
                lastRankedUpdate: new Date(),
                'riotAccount.summonerLevel': summonerData.summonerLevel,
                'riotAccount.profileIconId': summonerData.profileIconId
              });

              console.log("Ranked data updated from QueueSystem");

              if (userProfile) {
                setUserProfile(prev => ({
                  ...prev,
                  rankedData: rankedData,
                  riotAccountData: {
                    ...prev.riotAccountData,
                    summonerLevel: summonerData.summonerLevel,
                    profileIconId: summonerData.profileIconId
                  }
                }));
              }
            }
          } catch (error) {
            console.error("Error updating ranked data from API:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error updating ranked data in QueueSystem:", error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const data = userDoc.data();

        let riotAccountDisplay = 'Not linked';
        let riotAccountObject = null;
        let profileImage = null;
        let aboutMe = '';
        let rankedData = null;
        let displayName = auth.currentUser.displayName || 'Anonymous';

        if (data.riotAccount && typeof data.riotAccount === 'object') {
          riotAccountObject = data.riotAccount;
          const { gameName, tagLine } = data.riotAccount;
          if (gameName && tagLine) {
            riotAccountDisplay = `${gameName}#${tagLine}`;
          } else if (gameName) {
            riotAccountDisplay = gameName;
          } else {
            riotAccountDisplay = 'Linked (no name)';
          }
        } else if (data.riotAccount) {
          riotAccountDisplay = data.riotAccount;
        }

        profileImage = data.profileImage || null;

        aboutMe = data.aboutMe || '';
        rankedData = data.rankedData || null;
        displayName = auth.currentUser.displayName || data.username || 'Anonymous';

        setUserProfile({
          displayName: displayName,
          riotAccount: riotAccountDisplay,
          riotAccountData: riotAccountObject,
          profileImage: profileImage,
          rankedData: rankedData,
          aboutMe: aboutMe,
          userData: data
        });

        setPlayerProfiles(prev => ({
          ...prev,
          [auth.currentUser.uid]: {
            profileImage: profileImage,
            username: displayName
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchUserProfileById = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();

        const profileImage = userData.profileImage || null;
        const username = userData.username || userData.displayName || 'Anonymous';

        setPlayerProfiles(prev => ({
          ...prev,
          [userId]: {
            profileImage: profileImage,
            username: username
          }
        }));
      }
    } catch (error) {
      console.error("Error fetching user profile by ID:", error);
    }
  };

  const fetchUserFriends = () => {
    if (!auth.currentUser) return;

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const unsubscribe = onSnapshot(userRef, (userDoc) => {
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserFriends(data.friends || []);
          setSentFriendRequests(data.sentFriendRequests || []);
        }
      });
      return unsubscribe;
    } catch (error) {
      console.error('Error fetching user friends/requests:', error);
    }
  };

  const fetchGameListings = () => {
    try {
      const q = query(
        collection(db, 'gameListings'),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const listings = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        }));
        setGameListings(listings);

      });

      return unsubscribe;
    } catch (error) {
      console.error('Error in fetchGameListings:', error);

      const q = query(collection(db, 'gameListings'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const allListings = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        }));

        const activeListings = allListings
          .filter(listing => listing.status === 'active')
          .sort((a, b) => b.createdAt - a.createdAt);

        setGameListings(activeListings);

      });

      return unsubscribe;
    }
  };

  const fetchMyGameRequests = async () => {
    if (!auth.currentUser) return;

    try {
      const q = query(
        collection(db, 'gameListings'),
        where('userId', '==', auth.currentUser.uid),
        where('status', '==', 'active')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const requests = [];
        snapshot.forEach((docSnap) => {
          const gameData = docSnap.data();
          const applicants = gameData.applicants || [];

          const pendingRequests = applicants
            .filter(applicant => applicant.status === 'pending')
            .map(applicant => ({
              id: `${docSnap.id}_${applicant.userId}`,
              gameId: docSnap.id,
              gameTitle: `${gameData.queueType} - ${gameData.role}`,
              gameQueueType: gameData.queueType,
              gameDescription: gameData.description,
              ...applicant,
              appliedAt: applicant.appliedAt || new Date().toISOString()
            }));

          requests.push(...pendingRequests);
        });

        setMyGameRequests(requests);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error fetching game requests:", error);
    }
  };

  const addFriendOnAccept = async (hostUserId, applicantUserId, applicantName) => {
    try {
      const hostRef = doc(db, 'users', hostUserId);
      const applicantRef = doc(db, 'users', applicantUserId);

      const [hostDoc, applicantDoc] = await Promise.all([
        getDoc(hostRef),
        getDoc(applicantRef)
      ]);

      if (!hostDoc.exists() || !applicantDoc.exists()) {
        console.log("User not found for auto-friend");
        return;
      }

      const hostData = hostDoc.data();
      const applicantData = applicantDoc.data();

      const hostFriends = hostData.friends || [];
      const applicantFriends = applicantData.friends || [];

      const hostHasApplicant = hostFriends.some(friend => friend.id === applicantUserId);
      const applicantHasHost = applicantFriends.some(friend => friend.id === hostUserId);

      const hostPendingToRemove = (hostData.pendingRequests || []).filter(req => req.from === applicantUserId);
      const hostSentToRemove = (hostData.sentFriendRequests || []).filter(req => req.to === applicantUserId);
      const applicantPendingToRemove = (applicantData.pendingRequests || []).filter(req => req.from === hostUserId);
      const applicantSentToRemove = (applicantData.sentFriendRequests || []).filter(req => req.to === hostUserId);

      const needsFriendUpdate = !hostHasApplicant || !applicantHasHost;
      const needsRequestCleanup = hostPendingToRemove.length > 0 || hostSentToRemove.length > 0 ||
        applicantPendingToRemove.length > 0 || applicantSentToRemove.length > 0;

      if (needsFriendUpdate || needsRequestCleanup) {
        const batch = writeBatch(db);

        const hostUpdates = {};
        if (!hostHasApplicant) {
          hostUpdates.friends = arrayUnion({
            id: applicantUserId,
            username: applicantName || applicantData.username || 'Anonymous',
            profileImage: applicantData.profileImage || null,
            addedAt: new Date()
          });
        }
        if (hostPendingToRemove.length > 0) hostUpdates.pendingRequests = arrayRemove(...hostPendingToRemove);
        if (hostSentToRemove.length > 0) hostUpdates.sentFriendRequests = arrayRemove(...hostSentToRemove);

        if (Object.keys(hostUpdates).length > 0) batch.update(hostRef, hostUpdates);

        const applicantUpdates = {};
        if (!applicantHasHost) {
          applicantUpdates.friends = arrayUnion({
            id: hostUserId,
            username: hostData.username || 'Anonymous',
            profileImage: hostData.profileImage || null,
            addedAt: new Date()
          });
        }
        if (applicantPendingToRemove.length > 0) applicantUpdates.pendingRequests = arrayRemove(...applicantPendingToRemove);
        if (applicantSentToRemove.length > 0) applicantUpdates.sentFriendRequests = arrayRemove(...applicantSentToRemove);

        if (Object.keys(applicantUpdates).length > 0) batch.update(applicantRef, applicantUpdates);

        await batch.commit();
        console.log("Auto-friended and cleaned up requests (Atomic)");
      }
    } catch (error) {
      console.error("Error auto-friending users:", error);
    }
  };

  const getProfileImage = (game) => {
    if (game.userId && playerProfiles[game.userId]?.profileImage) {
      return normalizeProfileIcon(playerProfiles[game.userId].profileImage);
    }
    if (game.userProfileImage) {
      return normalizeProfileIcon(game.userProfileImage);
    }
    return 'https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png';
  };

  const getQueueData = (rankedData, queueType) => {
    if (!rankedData || !Array.isArray(rankedData)) return null;

    const queue = rankedData.find(queue => {
      if (!queue.queueType) return false;

      if (queue.queueType === queueType) return true;

      if (queueType === 'RANKED_SOLO_5x5') {
        return queue.queueType.includes('SOLO') ||
          queue.queueType.includes('Solo') ||
          queue.queueType === 'RANKED_SOLO/DUO';
      }

      if (queueType === 'RANKED_FLEX_SR') {
        return queue.queueType.includes('FLEX') ||
          queue.queueType.includes('Flex');
      }

      return false;
    });

    return queue;
  };

  const calculateWinRate = (queue) => {
    if (!queue || typeof queue.wins !== 'number' || typeof queue.losses !== 'number') return 'N/A';
    const totalGames = queue.wins + queue.losses;
    if (totalGames === 0) return '0%';
    const winRate = Math.round((queue.wins / totalGames) * 100);
    return `${winRate}%`;
  };

  const getRankIcon = (tier) => {
    if (!tier) return '/rank-icons/Rank=Unranked.png';
    const tierUpper = tier.toUpperCase();

    const fileName = rankIconsMap[tierUpper];
    return fileName ? `/rank-icons/${fileName}` : '/rank-icons/unranked.png';
  };

  const formatRankDisplay = (queue) => {
    if (!queue) return 'Unranked';
    const { tier, rank } = queue;
    if (!tier) return 'Unranked';
    if (tier === 'CHALLENGER' || tier === 'GRANDMASTER' || tier === 'MASTER') {
      return `${tier} (${queue.leaguePoints || 0} LP)`;
    }
    return `${tier} ${rank || ''} (${queue.leaguePoints || 0} LP)`.trim();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'description' && value.length > 200) {
      return;
    }

    setGameData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCommunicationSelect = (commType) => {
    setGameData(prev => ({
      ...prev,
      communication: commType
    }));
  };

  const handleEditGame = (game) => {
    setIsEditingGame(game.id);
    setGameData({
      role: game.role,
      queueType: game.queueType,
      communication: game.communication,
      preferredDuoRole: game.preferredDuoRole,
      description: game.description,
    });
    setIsPostingGame(true);

    setTimeout(() => {
      const textarea = document.querySelector('.textarea-compact');
      if (textarea) {
        handleTextareaResize({ target: textarea });
      }
    }, 100);
  };

  const handleUpdateGame = async () => {
    if (!isEditingGame) return;

    if (!gameData.description.trim()) {
      alert('Please add a description for your game');
      return;
    }

    try {
      const gameRef = doc(db, 'gameListings', isEditingGame);

      await updateDoc(gameRef, {
        role: gameData.role,
        queueType: gameData.queueType,
        communication: gameData.communication,
        preferredDuoRole: gameData.preferredDuoRole,
        description: gameData.description.trim(),
        updatedAt: serverTimestamp()
      });

      setGameData({
        role: 'fill',
        queueType: 'ranked_solo_duo',
        communication: 'text',
        preferredDuoRole: 'fill',
        description: '',
      });

      setIsEditingGame(null);
      setIsPostingGame(false);
    } catch (error) {
      console.error('Error updating game:', error);
      alert('Error updating game. Please try again.');
    }
  };

  const handlePostGame = async () => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }

    if (!userProfile?.riotAccountData) {
      setShowRiotLinkModal(true);
      return;
    }

    if (!gameData.description.trim()) {
      alert('Please add a description for your game');
      return;
    }

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        alert('User data not found!');
        return;
      }

      const userData = userDoc.data();

      let riotAccountDisplay = 'Not linked';
      let riotAccountObject = null;
      let profileImage = null;
      let aboutMe = '';
      let rankedData = null;
      let displayName = auth.currentUser.displayName || 'Anonymous';

      if (userData.riotAccount && typeof userData.riotAccount === 'object') {
        riotAccountObject = userData.riotAccount;
        const { gameName, tagLine } = userData.riotAccount;
        if (gameName && tagLine) {
          riotAccountDisplay = `${gameName}#${tagLine}`;
        } else if (gameName) {
          riotAccountDisplay = gameName;
        } else {
          riotAccountDisplay = 'Linked (no name)';
        }
      } else if (userData.riotAccount) {
        riotAccountDisplay = userData.riotAccount;
      }

      profileImage = userData.profileImage || null;

      aboutMe = userData.aboutMe || '';
      rankedData = userData.rankedData || null;
      displayName = auth.currentUser.displayName || userData.username || 'Anonymous';

      const gameListing = {
        userId: auth.currentUser.uid,
        userDisplayName: displayName,
        userProfileImage: profileImage,
        userRiotAccount: riotAccountDisplay,
        userRiotAccountObject: riotAccountObject,
        userAboutMe: aboutMe,
        userRankedData: rankedData,

        role: gameData.role,
        queueType: gameData.queueType,
        communication: gameData.communication,
        preferredDuoRole: gameData.preferredDuoRole,
        description: gameData.description.trim(),

        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        applicants: [],
        acceptedPlayers: []
      };

      await addDoc(collection(db, 'gameListings'), gameListing);

      setGameData({
        role: 'fill',
        queueType: 'ranked_solo_duo',
        communication: 'text',
        preferredDuoRole: 'fill',
        description: '',
      });

      setIsPostingGame(false);

      setPlayerProfiles(prev => ({
        ...prev,
        [auth.currentUser.uid]: {
          profileImage: profileImage,
          username: displayName
        }
      }));

      fetchGameListings();
    } catch (error) {
      console.error('Error posting game:', error);
      alert('Error posting game. Please try again.');
    }
  };

  const openJoinModal = (game) => {
    if (!userProfile?.riotAccountData) {
      setShowRiotLinkModal(true);
      return;
    }
    setSelectedGame(game);
    setJoinMessage('');
    setShowJoinModal(true);
  };

  const handleJoinQueue = async (gameId, message = '') => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }

    try {
      const gameRef = doc(db, 'gameListings', gameId);
      const gameDoc = await getDoc(gameRef);

      if (!gameDoc.exists()) {
        alert('This game listing no longer exists.');
        return;
      }

      const gameData = gameDoc.data();

      const alreadyApplied = gameData.applicants?.some(
        applicant => applicant.userId === auth.currentUser.uid
      );

      if (alreadyApplied) {
        return;
      }

      const userData = {
        userId: auth.currentUser.uid,
        displayName: userProfile?.displayName || auth.currentUser.displayName || 'Anonymous',
        riotAccount: userProfile?.riotAccount || 'Not linked',
        profileImage: userProfile?.profileImage,
        appliedAt: new Date().toISOString(),
        status: 'pending',
        message: message.trim(),
        role: selectedJoinRole,
        rankedData: userProfile?.rankedData || []
      };

      await updateDoc(gameRef, {
        applicants: arrayUnion(userData),
        updatedAt: serverTimestamp()
      });

      setShowJoinModal(false);
      setJoinMessage('');
    } catch (error) {
      console.error('Error joining queue:', error);
      alert('Error joining queue. Please try again. Error: ' + error.message);
    }
  };

  const handleManageRequests = () => {
    setShowRequestModal(true);
  };

  const handleAcceptRequest = async (gameId, applicantUserId, applicantName) => {
    const requestId = `${gameId}_${applicantUserId}`;
    if (processingRequests.has(requestId)) return;

    setProcessingRequests(prev => {
      const next = new Set(prev);
      next.add(requestId);
      return next;
    });

    try {
      const gameRef = doc(db, 'gameListings', gameId);
      const gameDoc = await getDoc(gameRef);

      if (!gameDoc.exists()) {
        alert('This game listing no longer exists.');
        return;
      }

      const gameData = gameDoc.data();
      const applicants = gameData.applicants || [];

      const updatedApplicants = applicants.map(applicant =>
        applicant.userId === applicantUserId
          ? { ...applicant, status: 'accepted', acceptedAt: new Date().toISOString() }
          : applicant
      );
      const acceptedPlayers = gameData.acceptedPlayers || [];
      const applicantData = applicants.find(app => app.userId === applicantUserId);

      if (applicantData && !acceptedPlayers.some(p => p.userId === applicantUserId)) {
        acceptedPlayers.push({
          userId: applicantUserId,
          displayName: applicantData.displayName,
          riotAccount: applicantData.riotAccount,
          profileImage: applicantData.profileImage,
          joinedAt: new Date().toISOString()
        });
      }

      await updateDoc(gameRef, {
        applicants: updatedApplicants,
        acceptedPlayers: acceptedPlayers,
        updatedAt: serverTimestamp()
      });

      await addFriendOnAccept(gameData.userId, applicantUserId, applicantName);

      const alreadyFriend = isAlreadyFriend(applicantUserId);
      const successMessage = alreadyFriend
        ? `Request accepted! You are already friends with ${applicantName}.`
        : `Request accepted! ${applicantName} has been added as a friend.`;

      alert(successMessage);

      setMyGameRequests(prev => prev.filter(req =>
        !(req.gameId === gameId && req.userId === applicantUserId)
      ));
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Error accepting request. Please try again.');
    } finally {
      setProcessingRequests(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const handleDeclineRequest = async (gameId, applicantUserId, applicantName) => {
    const requestId = `${gameId}_${applicantUserId}`;
    if (processingRequests.has(requestId)) return;

    setProcessingRequests(prev => {
      const next = new Set(prev);
      next.add(requestId);
      return next;
    });

    try {
      const gameRef = doc(db, 'gameListings', gameId);
      const gameDoc = await getDoc(gameRef);

      if (!gameDoc.exists()) {
        alert('This game listing no longer exists.');
        return;
      }

      const gameData = gameDoc.data();
      const applicants = gameData.applicants || [];

      const updatedApplicants = applicants.map(applicant =>
        applicant.userId === applicantUserId
          ? { ...applicant, status: 'declined', declinedAt: new Date().toISOString() }
          : applicant
      );

      await updateDoc(gameRef, {
        applicants: updatedApplicants,
        updatedAt: serverTimestamp()
      });

      setMyGameRequests(prev => prev.filter(req =>
        !(req.gameId === gameId && req.userId === applicantUserId)
      ));
    } catch (error) {
      console.error('Error declining request:', error);
      alert('Error declining request. Please try again.');
    } finally {
      setProcessingRequests(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const handleViewProfile = (userId) => {
    window.open(`/profile/${userId}`, '_blank');
  };

  const handleDeleteListing = (gameId) => {
    setGameToDelete(gameId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteListing = async () => {
    if (!gameToDelete) return;

    try {
      await deleteDoc(doc(db, 'gameListings', gameToDelete));
      setShowDeleteConfirm(false);
      setGameToDelete(null);
    } catch (error) {
      console.error('Error deleting listing:', error);
      alert('Error deleting listing. Please try again.');
    }
  };

  const cancelDeleteListing = () => {
    setShowDeleteConfirm(false);
    setGameToDelete(null);
  };

  const handleAddFriend = async (userId) => {
    if (!auth.currentUser || userId === auth.currentUser.uid) return;

    try {
      const currentUserRef = doc(db, 'users', auth.currentUser.uid);
      const targetUserRef = doc(db, 'users', userId);

      const currentUserDoc = await getDoc(currentUserRef);
      const currentUserData = currentUserDoc.exists() ? currentUserDoc.data() : {};

      const targetUserDoc = await getDoc(targetUserRef);
      const targetUserData = targetUserDoc.exists() ? targetUserDoc.data() : {};

      const isAlreadyFriend = (currentUserData.friends || []).some(f => f.id === userId);
      if (isAlreadyFriend) {
        alert("You are already friends with this user.");
        return;
      }

      const hasPendingRequest = (currentUserData.sentFriendRequests || []).some(req => req.to === userId);
      if (hasPendingRequest) {
        alert("A friend request is already pending.");
        return;
      }

      const targetUsername = targetUserData.username || 'Anonymous';
      const targetProfileImage = targetUserData.profileImage || null;

      const requestData = {
        from: auth.currentUser.uid,
        fromUsername: userProfile?.displayName || auth.currentUser.displayName || 'Anonymous',
        fromProfileImage: userProfile?.profileImage || null,
        timestamp: new Date()
      };

      const sentRequestData = {
        to: userId,
        toUsername: targetUsername,
        toProfileImage: targetProfileImage,
        timestamp: new Date()
      };


      const batch = writeBatch(db);

      batch.update(targetUserRef, {
        pendingRequests: arrayUnion(requestData)
      });

      batch.update(currentUserRef, {
        sentFriendRequests: arrayUnion(sentRequestData)
      });

      await batch.commit();
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Error sending friend request: ' + error.message);
    }
  };

  const handleCopyRiotAccount = (riotAccount) => {
    if (!riotAccount || riotAccount === 'Not linked') return;

    navigator.clipboard.writeText(riotAccount)
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  const isAlreadyFriend = (userId) => {
    return userFriends.some(friend => friend.id === userId);
  };

  const hasRequestSent = (userId) => {
    return sentFriendRequests.some(req => req.to === userId);
  };

  const handleCancelEdit = () => {
    setIsEditingGame(null);
    setGameData({
      role: 'fill',
      queueType: 'ranked_solo_duo',
      communication: 'text',
      preferredDuoRole: 'fill',
      description: '',
    });
    setIsPostingGame(false);
  };

  const formatTimeAgo = (date) => {
    if (!date) return 'just now';

    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getQueueTypeName = (queueType) => {
    const queueTypeMap = {
      'ranked_solo_duo': 'Ranked Solo/Duo',
      'ranked_flex': 'Ranked Flex',
      'normal_draft': 'Normal Draft',
      'aram': 'ARAM',
      'swiftplay': 'Swiftplay'
    };
    return queueTypeMap[queueType] || queueType;
  };

  const getRoleIcon = (role) => {
    const roleObj = roles.find(r => r.id === role);
    return roleObj ? roleObj.icon : '/lane-icons/Fill icon.png';
  };

  const getRoleImage = (role) => {
    const roleObj = roles.find(r => r.id === role);
    return roleObj ? roleObj.icon : '/lane-icons/Fill icon.png';
  };

  const handleRoleToggle = (roleId) => {
    setFilters(prev => {
      const newRoles = prev.roles.includes(roleId)
        ? prev.roles.filter(id => id !== roleId)
        : [...prev.roles, roleId];

      return { ...prev, roles: newRoles };
    });
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      roles: [],
      rank: 'all',
      queueType: 'all',
      region: 'all'
    });
  };

  const getRegionFromGame = (game) => {
    if (!game.userRiotAccountObject || !game.userRiotAccountObject.region) {
      return 'Unknown';
    }
    return getDisplayRegion(game.userRiotAccountObject.region);
  };

  const renderGameForm = (isEditMode) => {
    return (
      <div className={isEditMode ? "" : "post-lobby-panel"}>
        {!isEditMode && (
          <div className="post-panel-header">
            <div className="status-icon-wrap primary">
              <PlusSquare className="icon-md" />
            </div>
            <h3 className="post-panel-title">Post a New Game</h3>
          </div>
        )}

        <div className="post-form-grid">
          <div className="form-field-group">
            <label className="form-field-label">My Role</label>
            <div className="role-filter-row">
              {roles.map(role => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setGameData(prev => ({ ...prev, role: role.id }))}
                  className={`role-btn ${gameData.role === role.id ? 'active' : ''}`}
                  title={role.name}
                >
                  <img src={role.icon} alt={role.name} />
                </button>
              ))}
            </div>
          </div>
          <div className="form-field-group">
            <label className="form-field-label">Queue System</label>
            <div className="filter-select-wrapper" ref={postQueueDropdownRef}>
              <button
                type="button"
                className="filter-custom-select u-flex-between filter-btn-queue"
                onClick={() => setShowPostQueueDropdown(!showPostQueueDropdown)}
              >
                <div className="u-flex-center u-gap-3">
                  <span className="queue-icon-dot"></span>
                  <span className="font-medium">
                    {queueTypes.find(q => q.id === gameData.queueType)?.name || 'Select Queue'}
                  </span>
                </div>
                <ChevronDown className={`icon-sm transition-transform duration-300 ${showPostQueueDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showPostQueueDropdown && (
                <div className="filter-dropdown-menu filter-dropdown-queue">
                  {queueTypes.filter(q => q.id !== 'all').map(queue => (
                    <button
                      key={queue.id}
                      type="button"
                      className={`dropdown-item ${gameData.queueType === queue.id ? 'active' : ''}`}
                      onClick={() => {
                        setGameData(prev => ({ ...prev, queueType: queue.id }));
                        setShowPostQueueDropdown(false);
                      }}
                    >
                      <span className="queue-dot-small"></span>
                      <span className="font-medium">{queue.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="form-field-group">
            <label className="form-field-label">Communication</label>
            <div className="comm-type-grid">
              {communicationTypes.map(comm => (
                <button
                  key={comm.id}
                  type="button"
                  onClick={() => handleCommunicationSelect(comm.id)}
                  className={`comm-btn ${gameData.communication === comm.id ? 'active' : ''}`}
                >
                  {comm.name}
                </button>
              ))}
            </div>
          </div>
          <div className="form-field-group">
            <label className="form-field-label">Searching For</label>
            <div className="role-filter-row">
              {roles.map(role => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setGameData(prev => ({ ...prev, preferredDuoRole: role.id }))}
                  className={`role-btn ${gameData.preferredDuoRole === role.id ? 'active' : ''}`}
                  title={role.name}
                >
                  <img src={role.icon} alt={role.name} />
                </button>
              ))}
            </div>
          </div>
          <div className="form-field-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-field-label">Description (Optional)</label>
            <textarea
              name="description"
              value={gameData.description}
              onChange={(e) => {
                handleInputChange(e);
                handleTextareaResize(e);
              }}
              placeholder="Tell your potential duo something about yourself or your goals..."
              className="post-form-textarea"
              maxLength={200}
            />
          </div>
        </div>

        <div className="post-panel-footer">
          <button
            type="button"
            className="btn-discard"
            onClick={isEditMode ? handleCancelEdit : () => setIsPostingGame(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-publish"
            onClick={isEditMode ? handleUpdateGame : handlePostGame}
          >
            {isEditMode ? 'Update Lobby' : 'Publish Lobby'}
          </button>
        </div>
      </div>
    );
  };



  if (!auth.currentUser) {
    return (
      <div className="lobby-hub-page auth-denied">
        <div className="glass-panel text-center-panel">
          <div className="status-icon-wrap error">
            <ShieldCheck className="icon-xxl" />
          </div>
          <h2 className="filters-title">Access Denied</h2>
          <p className="lobby-subtitle">Please login to access the Queue finder and find your perfect duo partner.</p>
          <button
            onClick={() => navigate('/login')}
            className="btn-publish w-full"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-hub-page">
      <div className="lobby-hub-header">
        <div className="lobby-title-group">
          <h1>Queue finder</h1>
          <p className="lobby-subtitle">
            Find your perfect duo or group. Filter by rank, role, and region to dominate the Rift.
          </p>
        </div>
        <div className="lobby-header-actions">
          <button
            className="post-lobby-btn"
            onClick={() => {
              if (!isPostingGame && !userProfile?.riotAccountData) {
                setShowRiotLinkModal(true);
              } else {
                setIsPostingGame(!isPostingGame);
              }
            }}
          >
            {isPostingGame ? <X className="icon-md" /> : <PlusSquare className="icon-md" />}
            {isPostingGame ? 'Cancel Post' : 'Post a Game'}
          </button>

          <button
            className="manage-requests-btn"
            onClick={handleManageRequests}
          >
            <Users className="icon-md" />
            Manage Requests ({myGameRequests.length})
          </button>
        </div>
      </div>
      <div className="lobby-filters-panel">
        <div className="filters-accent-bar"></div>

        <div className="filters-header">
          <div className="status-icon-wrap primary">
            <Filter className="icon-md u-text-cyan" />
          </div>
          <h3 className="filters-title">Advanced Search</h3>
        </div>

        <div className="filters-grid">
          <div className="filter-group">
            <label className="filter-label">Select Roles</label>
            <div className="role-filter-row">
              {roles.map(role => (
                <button
                  key={role.id}
                  onClick={() => handleRoleToggle(role.id)}
                  className={`role-btn ${filters.roles.includes(role.id) ? 'active' : ''}`}
                  title={role.name}
                >
                  <img src={role.icon} alt={role.name} />
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <label className="filter-label">Skill Level</label>
            <div className="filter-select-wrapper" ref={rankDropdownRef}>
              <button
                className="filter-custom-select u-flex-between filter-btn-rank"
                onClick={() => setShowRankDropdown(!showRankDropdown)}
              >
                <div className="u-flex-center u-gap-3">
                  <img src={getRankIconForFilter(filters.rank)} alt="" className="icon-sm" />
                  <span className="font-medium">{rankTiers.find(r => r.id === filters.rank)?.name}</span>
                </div>
                <ChevronDown className={`icon-sm transition-transform duration-300 ${showRankDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showRankDropdown && (
                <div className="filter-dropdown-menu">
                  {rankTiers.map(rank => (
                    <button
                      key={rank.id}
                      className={`dropdown-item ${filters.rank === rank.id ? 'active' : ''}`}
                      onClick={() => {
                        handleFilterChange('rank', rank.id);
                        setShowRankDropdown(false);
                      }}
                    >
                      <img src={getRankIconForFilter(rank.id)} alt="" className="icon-md" />
                      <span className="font-medium">{rank.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="filter-group">
            <label className="filter-label">Queue System</label>
            <div className="filter-select-wrapper" ref={queueDropdownRef}>
              <button
                className="filter-custom-select u-flex-between filter-btn-queue"
                onClick={() => setShowQueueDropdown(!showQueueDropdown)}
              >
                <div className="u-flex-center u-gap-3">
                  <span className="queue-icon-dot"></span>
                  <span className="font-medium">{queueTypes.find(q => q.id === filters.queueType)?.name}</span>
                </div>
                <ChevronDown className={`icon-sm transition-transform duration-300 ${showQueueDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showQueueDropdown && (
                <div className="filter-dropdown-menu filter-dropdown-queue">
                  {queueTypes.map(queue => (
                    <button
                      key={queue.id}
                      className={`dropdown-item ${filters.queueType === queue.id ? 'active' : ''}`}
                      onClick={() => { handleFilterChange('queueType', queue.id); setShowQueueDropdown(false); }}
                    >
                      <span className="queue-dot-small"></span>
                      <span className="font-medium">{queue.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="filter-group">
            <label className="filter-label">Server Region</label>
            <div className="filter-select-wrapper" ref={regionDropdownRef}>
              <button
                className="filter-custom-select u-flex-between filter-btn-region"
                onClick={() => setShowRegionDropdown(!showRegionDropdown)}
              >
                <div className="u-flex-center u-gap-3">
                  <span className="region-icon-dot"></span>
                  <span className="font-medium">{regions.find(r => r.id === filters.region)?.name}</span>
                </div>
                <ChevronDown className={`icon-sm transition-transform duration-300 ${showRegionDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showRegionDropdown && (
                <div className="filter-dropdown-menu filter-dropdown-region dropdown-below">
                  {regions.map(region => (
                    <button
                      key={region.id}
                      className={`dropdown-item ${filters.region === region.id ? 'active active-region' : ''}`}
                      onClick={() => { handleFilterChange('region', region.id); setShowRegionDropdown(false); }}
                    >
                      <span className="font-medium">{region.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {(filters.roles.length > 0 || filters.rank !== 'all' || filters.queueType !== 'all' || filters.region !== 'all') && (
          <div className="active-filters-row">
            <div className="active-tags-container">
              {filters.roles.map(roleId => (
                <span key={roleId} className="filter-active-tag cyan">
                  {roles.find(r => r.id === roleId)?.name}
                  <X className="icon-xs cursor-pointer" onClick={() => handleRoleToggle(roleId)} />
                </span>
              ))}
              {filters.rank !== 'all' && (
                <span key="rank-tag" className="filter-active-tag gold">
                  {rankTiers.find(r => r.id === filters.rank)?.name}
                  <X className="icon-xs cursor-pointer" onClick={() => handleFilterChange('rank', 'all')} />
                </span>
              )}
              {filters.queueType !== 'all' && (
                <span key="queue-tag" className="filter-active-tag purple">
                  {queueTypes.find(q => q.id === filters.queueType)?.name}
                  <X className="icon-xs cursor-pointer" onClick={() => handleFilterChange('queueType', 'all')} />
                </span>
              )}
              {filters.region !== 'all' && (
                <span key="region-tag" className="filter-active-tag green">
                  {regions.find(r => r.id === filters.region)?.name}
                  <X className="icon-xs cursor-pointer" onClick={() => handleFilterChange('region', 'all')} />
                </span>
              )}
              <button onClick={resetFilters} className="reset-filters-btn"><X className="icon-xs" /> Clear All</button>
            </div>
          </div>
        )}
      </div>


      {isPostingGame && !isEditingGame && renderGameForm(false)}


      <div className="active-lobbies-section">
        {!userProfile?.riotAccountData && (
          <div className="unlinked-warning-banner">
            <div className="warning-banner-content">
              <ShieldX className="warning-banner-icon color-error" />
              <div className="warning-banner-text">
                <h4>You have not connected Riot account</h4>
                <p>You need to link your Riot Games account to join or post lobbies. This ensures fair matchmaking and verification.</p>
              </div>
            </div>
            <button
              className="btn-publish compact-btn"
              onClick={() => navigate('/profile')}
            >
              Connect Now
            </button>
          </div>
        )}

        <div className="active-lobbies-header">
          <h3 className="active-lobbies-title">
            Active Lobbies
            <span className="lobby-count-badge">
              {filteredListings.length}
            </span>
          </h3>
          {filteredListings.length !== gameListings.length && (
            <span className="filtered-status-text">
              Filtered from {gameListings.length} total
            </span>
          )}
        </div>

        {filteredListings.length === 0 ? (
          <div className="glass-panel text-center-panel big-padding">
            <div className="status-icon-wrap secondary mx-auto">
              <Swords className="icon-xxl" />
            </div>
            <p className="lobby-subtitle u-text-sm u-mb-8">
              {gameListings.length === 0
                ? "The Rift is quiet. Be the first to start a lobby!"
                : "No lobbies match your specific search criteria."}
            </p>
            {gameListings.length > 0 && (
              <button
                className="btn-discard"
                onClick={resetFilters}
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="lobbies-stack">
            {filteredListings.map(game => {
              if (isEditingGame === game.id) {
                return (
                  <div key={game.id} className="lobby-card-inline-edit">
                    {renderGameForm(true)}
                  </div>
                );
              }

              const isOwnGame = game.userId === auth.currentUser?.uid;
              const isFriend = isAlreadyFriend(game.userId);
              const requestSent = hasRequestSent(game.userId);

              const rankedData = game.userRankedData || [];
              const soloQueue = getQueueData(rankedData, 'RANKED_SOLO_5x5');
              const flexQueue = getQueueData(rankedData, 'RANKED_FLEX_SR');

              const soloWinRate = calculateWinRate(soloQueue);
              const flexWinRate = calculateWinRate(flexQueue);
              const soloGames = soloQueue ? soloQueue.wins + soloQueue.losses : 0;
              const flexGames = flexQueue ? flexQueue.wins + flexQueue.losses : 0;

              const soloRankIcon = getRankIcon(soloQueue?.tier);
              const flexRankIcon = getRankIcon(flexQueue?.tier);
              const soloRankText = formatRankDisplay(soloQueue);
              const flexRankText = formatRankDisplay(flexQueue);

              const profileImage = getProfileImage(game);
              const region = getRegionFromGame(game);
              const roleIcon = getRoleImage(game.role);
              const preferredRoleIcon = getRoleImage(game.preferredDuoRole);

              const alreadyApplied = game.applicants?.some(
                applicant => applicant.userId === auth.currentUser?.uid
              );

              return (
                <div key={game.id} className="lobby-card">
                  {isOwnGame && <div className="own-lobby-indicator"></div>}
                  <div className="lobby-author-area">
                    <div className="author-main-info">
                      <div className="author-pfp-container">
                        <div className="pfp-glow"></div>
                        <div className="author-pfp-circle">
                          <img
                            src={profileImage || "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png"}
                            alt=""
                            className="author-pfp-img"
                          />
                        </div>
                      </div>
                      <div className="author-meta-text">
                        <div className="author-name">{game.userDisplayName}</div>
                        <div className="author-sub-meta">
                          <span className="region-tag">{region}</span>
                          <span className="riot-id-text">{game.userRiotAccount}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rank-summaries">
                      <div className="rank-mini-card">
                        <img src={soloRankIcon} alt="" className="rank-mini-icon" />
                        <div className="rank-mini-details">
                          <div className="rank-type-label solo">Solo/Duo</div>
                          <div className="rank-tier-text">{soloRankText}</div>
                          <div className="rank-wr-text">WR: <span>{soloWinRate}</span> • {soloGames}G</div>
                        </div>
                      </div>

                      <div className="rank-mini-card">
                        <img src={flexRankIcon} alt="" className="rank-mini-icon" />
                        <div className="rank-mini-details">
                          <div className="rank-type-label flex">Flex</div>
                          <div className="rank-tier-text">{flexRankText}</div>
                          <div className="rank-wr-text">WR: <span>{flexWinRate}</span> • {flexGames}G</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="lobby-main-content">
                    <div>
                      <div className="lobby-tags-row">
                        <span className="queue-type-tag">
                          {getQueueTypeName(game.queueType)}
                        </span>
                        {game.communication === 'voice' ? (
                          <span className="comm-tag voice">VC ENABLED</span>
                        ) : (
                          <span className="comm-tag text">TEXT ONLY</span>
                        )}
                        <span className="time-ago-wrapper">
                          <Clock className="time-ago-icon" />
                          {formatTimeAgo(game.createdAt)}
                        </span>
                      </div>

                      <div className="roles-focus-grid">
                        <div className="role-focus-box">
                          <div className="role-focus-icon-wrap my-role">
                            <img src={roleIcon} alt="" className="w-full h-full object-contain" />
                          </div>
                          <div className="role-focus-details">
                            <div className="role-focus-label">Playing</div>
                            <div className="role-focus-val">{roles.find(r => r.id === game.role)?.name}</div>
                          </div>
                        </div>
                        <div className="role-focus-box">
                          <div className="role-focus-icon-wrap search-role">
                            <img src={preferredRoleIcon} alt="" className="w-full h-full object-contain" />
                          </div>
                          <div className="role-focus-details">
                            <div className="role-focus-label">Searching</div>
                            <div className="role-focus-val">{roles.find(r => r.id === game.preferredDuoRole)?.name}</div>
                          </div>
                        </div>
                      </div>

                      <div className="lobby-description">
                        "{game.description}"
                      </div>
                    </div>
                  </div>
                  <div className="lobby-actions-area">
                    {isOwnGame ? (
                      <>
                        <button
                          onClick={() => handleEditGame(game)}
                          className="icon-only-btn"
                          title="Edit Post"
                        >
                          <Edit3 className="icon-md" />
                        </button>
                        <button
                          onClick={() => handleDeleteListing(game.id)}
                          className="icon-only-btn"
                          title="Delete Post"
                        >
                          <Trash2 className="icon-md" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => openJoinModal(game)}
                          disabled={alreadyApplied}
                          className="join-lobby-btn"
                        >
                          {alreadyApplied ? <Check className="icon-sm" /> : <Swords className="icon-sm" />}
                          {alreadyApplied ? 'Applied' : 'Join lobby'}
                        </button>
                        <button
                          onClick={() => handleAddFriend(game.userId)}
                          disabled={isFriend || requestSent}
                          className={`add-friend-btn ${isFriend ? 'is-friend' : ''}`}
                        >
                          {isFriend || requestSent ? <Check className="icon-sm" /> : <UserPlus className="icon-sm" />}
                          {isFriend ? 'Friends' : requestSent ? 'Sent' : 'Add friend'}
                        </button>
                        <button
                          onClick={() => handleCopyRiotAccount(game.userRiotAccount)}
                          className="icon-only-btn"
                          title="Copy Riot ID"
                        >
                          <Copy className="icon-md" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {
        showJoinModal && (
          <div className="lobby-modal-overlay" onClick={() => setShowJoinModal(false)}>
            <div className="lobby-modal-card" onClick={e => e.stopPropagation()}>
              <div className="post-panel-header panel-padding u-border-b">
                <div className="status-icon-wrap primary">
                  <Swords className="icon-md" />
                </div>
                <h3 className="post-panel-title">Apply to Join</h3>
                <button onClick={() => setShowJoinModal(false)} className="icon-only-btn u-ml-auto">
                  <X className="icon-md" />
                </button>
              </div>

              <div className="panel-padding">
                <div className="form-field-group">
                  <label className="form-field-label">Lobby Lead</label>
                  <div className="linked-account-card">
                    <div className="account-info-bundle">
                      <div className="account-pfp-wrapper">
                        <img
                          src={selectedGame?.userProfileImage || "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png"}
                          alt=""
                          className="account-pfp"
                          onError={(e) => { e.target.src = "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png"; }}
                        />
                      </div>
                      <div className="account-names">
                        <div className="account-username">{selectedGame?.userDisplayName}</div>
                        <div className="account-riot-id">{selectedGame?.userRiotAccount}</div>
                      </div>
                    </div>
                    <div className="u-flex-col u-gap-1 u-text-right">
                      <span className="form-field-label">Region</span>
                      <span className="region-tag">{selectedGame?.region || 'EUW'}</span>
                    </div>
                  </div>

                  <div className="u-flex-between u-mb-3">
                    <label className="form-field-label">Battle Cry (Optional)</label>
                    <span className={`char-counter ${joinMessage.length >= 200 ? 'error' : ''}`}>
                      {joinMessage.length}/200
                    </span>
                  </div>
                  <textarea
                    value={joinMessage}
                    onChange={(e) => setJoinMessage(e.target.value)}
                    placeholder="Why should you join this lobby? (e.g. 'Emerald peak, maining Vayne')"
                    className="post-form-textarea"
                    maxLength={200}
                  />

                  <div className="u-mt-4">
                    <label className="form-field-label u-mb-3">My Role for this game</label>
                    <div className="role-selector-row">
                      {roles.map((role) => (
                        <button
                          key={role.id}
                          className={`role-select-btn ${selectedJoinRole === role.id ? 'active' : ''}`}
                          onClick={() => setSelectedJoinRole(role.id)}
                          title={role.name}
                        >
                          <img src={role.icon} alt={role.name} />
                          <span className="role-tooltip">{role.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="post-panel-footer panel-padding u-bg-black-20">
                <button
                  className="btn-discard"
                  onClick={() => setShowJoinModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn-publish"
                  onClick={() => handleJoinQueue(selectedGame.id, joinMessage)}
                  disabled={!selectedGame}
                >
                  Send Request
                </button>
              </div>
            </div>
          </div>
        )
      }

      {
        showRequestModal && (
          <div className="lobby-modal-overlay" onClick={() => setShowRequestModal(false)}>
            <div className="lobby-modal-card" style={{ maxWidth: '48rem' }} onClick={e => e.stopPropagation()}>
              <div className="post-panel-header panel-padding u-border-b">
                <div className="status-icon-wrap primary">
                  <Users className="icon-md" />
                </div>
                <h3 className="post-panel-title">Incoming Requests</h3>
                <button onClick={() => setShowRequestModal(false)} className="icon-only-btn u-ml-auto">
                  <X className="icon-md" />
                </button>
              </div>

              <div className="panel-padding u-max-h-modal u-overflow-y-auto u-bg-black-10">
                {myGameRequests.length === 0 ? (
                  <div className="text-center u-py-20">
                    <p className="empty-requests-message">NO ACTIVE APPLICANTS YET</p>
                  </div>
                ) : (
                  <div className="lobbies-stack">
                    {myGameRequests.map(request => {
                      const soloQueue = getQueueData(request.rankedData, 'RANKED_SOLO_5x5');
                      const rankText = soloQueue ? formatRankDisplay(soloQueue) : 'Unranked';
                      const rankIcon = getRankIcon(soloQueue?.tier);
                      const isProcessing = processingRequests.has(`${request.gameId}_${request.userId}`);

                      return (
                        <div key={request.id} className="lobby-card">
                          <div className="author-main-info u-flex u-items-center u-gap-4" style={{ width: '100%' }}>
                            <div className="author-pfp-circle icon-xxl">
                              <img src={request.profileImage || "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png"} alt="" className="author-pfp-img" />
                            </div>

                            <div className="u-flex u-flex-1 u-items-center u-justify-between u-gap-6">
                              <div className="player-identity-group">
                                <h4
                                  className="author-name cursor-pointer hover:text-primary transition-colors u-mb-1"
                                  onClick={() => handleViewProfile(request.userId)}
                                >
                                  {request.displayName}
                                </h4>
                                <div className="u-flex u-items-center u-gap-2">
                                  <div className="riot-id-text">{request.riotAccount}</div>
                                  <button
                                    className="icon-only-btn-xs"
                                    onClick={() => {
                                      navigator.clipboard.writeText(request.riotAccount);
                                    }}
                                    title="Copy Riot ID"
                                  >
                                    <Copy className="icon-2xs" />
                                  </button>
                                  {isAlreadyFriend(request.userId) && (
                                    <span className="comm-tag voice u-ml-2">FRIEND</span>
                                  )}
                                </div>
                              </div>

                              <div className="rank-summaries u-flex u-gap-3" style={{ width: 'auto', flexDirection: 'row' }}>
                                <div className="rank-mini-card compact">
                                  <img src={rankIcon} alt="" className="rank-mini-icon" />
                                  <div className="rank-mini-details">
                                    <div className="rank-tier-text">{rankText}</div>
                                  </div>
                                </div>
                                {getQueueData(request.rankedData, 'RANKED_FLEX_SR') && (
                                  <div className="rank-mini-card compact">
                                    <img
                                      src={getRankIcon(getQueueData(request.rankedData, 'RANKED_FLEX_SR')?.tier)}
                                      alt=""
                                      className="rank-mini-icon"
                                    />
                                    <div className="rank-mini-details">
                                      <div className="rank-tier-text">{formatRankDisplay(getQueueData(request.rankedData, 'RANKED_FLEX_SR'))}</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="lobby-details-row u-mt-4 u-flex u-gap-4 u-items-center">
                            <div className="role-mini-display-card" title={`Selected Role: ${roles.find(r => r.id === (request.role?.toLowerCase() || 'fill'))?.name}`}>
                              <img src={getRoleImage(request.role)} alt="" />
                            </div>
                            <div className="u-flex-1">
                              <div className="u-flex-between u-items-center u-mb-2">
                                <span className="queue-type-tag">{getQueueTypeName(request.gameQueueType)}</span>
                                <span className="time-ago-wrapper">Received {formatTimeAgo(new Date(request.appliedAt))}</span>
                              </div>
                              {request.message && (
                                <div className="lobby-description-inner">
                                  "{request.message}"
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="lobby-card-actions-row compact-actions">
                            <div className="main-actions u-ml-auto">
                              <button
                                className="btn-discard"
                                onClick={() => handleDeclineRequest(request.gameId, request.userId, request.displayName)}
                                disabled={isProcessing}
                              >
                                DECLINE
                              </button>
                              <button
                                className="btn-publish"
                                onClick={() => handleAcceptRequest(request.gameId, request.userId, request.displayName)}
                                disabled={isProcessing || isAlreadyFriend(request.userId)}
                              >
                                {isAlreadyFriend(request.userId) ? 'ACCEPTED' : 'ACCEPT'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="post-panel-footer panel-padding">
                <button
                  className="post-lobby-btn u-w-full u-flex-center"
                  onClick={() => setShowRequestModal(false)}
                >
                  Return to Hub
                </button>
              </div>
            </div>
          </div>
        )
      }

      {
        showDeleteConfirm && ReactDOM.createPortal(
          <div className="lobby-modal-overlay">
            <div className="lobby-modal-card" style={{ maxWidth: '28rem' }}>
              <div className="panel-padding text-center">
                <div className="status-icon-wrap error u-mx-auto u-mb-6">
                  <Trash2 className="icon-xl" />
                </div>
                <h3 className="post-panel-title u-mb-2">Delete Lobby?</h3>
                <p className="lobby-subtitle u-text-sm u-mb-8">This operation is irreversible. You will lose all active applications.</p>

                <div className="u-flex-row u-gap-4">
                  <button
                    className="btn-discard u-flex-1"
                    onClick={cancelDeleteListing}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-publish u-flex-1"
                    style={{ background: '#ef4444', color: 'white' }}
                    onClick={confirmDeleteListing}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      }

      {showRiotLinkModal && (
        <div className="lobby-modal-overlay" onClick={() => setShowRiotLinkModal(false)}>
          <div className="lobby-modal-card" style={{ maxWidth: '32rem' }} onClick={e => e.stopPropagation()}>
            <div className="panel-padding text-center">
              <div className="status-icon-wrap error u-mx-auto u-mb-6">
                <ExternalLink className="icon-xl" />
              </div>
              <h3 className="post-panel-title u-mb-2">Riot Account Required</h3>
              <p className="lobby-subtitle u-text-sm u-mb-8">
                To maintain a safe and competitive environment, all players must link their Riot Games account before joining or posting lobbies.
              </p>

              <div className="u-flex-row u-gap-4">
                <button
                  className="btn-discard u-flex-1"
                  onClick={() => setShowRiotLinkModal(false)}
                >
                  Close
                </button>
                <button
                  className="btn-publish u-flex-1"
                  onClick={() => {
                    setShowRiotLinkModal(false);
                    navigate('/profile');
                  }}
                >
                  Link Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div >
  );
}

export default QueueSystem;
