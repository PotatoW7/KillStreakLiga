import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { auth, db } from '../firebase';
import {
  collection, query, where, onSnapshot, addDoc,
  serverTimestamp, doc, getDoc, orderBy, deleteDoc,
  updateDoc, arrayUnion, arrayRemove, getDocs, writeBatch
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Users, Swords, Filter, Clock, ShieldCheck, Star, Trash2, Edit3, UserPlus, Check, X, Copy, ExternalLink, ChevronDown, PlusSquare, Search } from 'lucide-react';

function QueueSystem() {
  const [isPostingGame, setIsPostingGame] = useState(false);
  const [isEditingGame, setIsEditingGame] = useState(null);
  const [gameListings, setGameListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [userFriends, setUserFriends] = useState([]);
  const [sentFriendRequests, setSentFriendRequests] = useState([]);
  const [processingRequests, setProcessingRequests] = useState(new Set());

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

  const rankDropdownRef = useRef(null);
  const [showRankDropdown, setShowRankDropdown] = useState(false);

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
            const response = await fetch(`${import.meta.env.VITE_API_URL}/summoner-info/${userData.riotAccount.region}/${encodeURIComponent(userData.riotAccount.gameName)}/${encodeURIComponent(userData.riotAccount.tagLine)}`);
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
    if (game.userProfileImage) {
      if (typeof game.userProfileImage === 'string' && game.userProfileImage.startsWith('data:image')) {
        return game.userProfileImage;
      }
    }

    if (game.userId && playerProfiles[game.userId]?.profileImage) {
      const image = playerProfiles[game.userId].profileImage;
      if (image && typeof image === 'string' && image.startsWith('data:image')) {
        return image;
      }
    }

    return null;
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
    if (!tier) return '/rank-icons/unranked.png';
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
      alert('Please link your Riot account first in your Profile!');
      navigate('/profile');
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
        role: userProfile?.preferredRole || 'fill',
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



  if (!auth.currentUser) {
    return (
      <div className="container max-w-7xl mx-auto py-24 px-6 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
        <div className="glass-panel p-12 rounded-3xl border-border/50 max-w-md">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-3xl font-display font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-8 text-lg">Please login to access the Queue System and find your perfect duo partner.</p>
          <button
            onClick={() => navigate('/login')}
            className="btn-gold w-full py-4 text-lg font-bold rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.3)]"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-12 px-6 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6 pb-8 border-b border-border/50">
        <div>
          <h1 className="font-display text-5xl font-bold bg-gradient-to-r from-cyan-400 via-white to-gold bg-clip-text text-transparent mb-3 drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]">
            Lobby Hub
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl">
            Find your perfect duo or group. Filter by rank, role, and region to dominate the Rift.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <button
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-secondary/80 hover:bg-secondary border border-border/50 transition-all hover:border-gold/50"
            onClick={() => setIsPostingGame(!isPostingGame)}
          >
            {isPostingGame ? <X className="w-5 h-5" /> : <PlusSquare className="w-5 h-5" />}
            {isPostingGame ? 'Cancel Post' : 'Post a Game'}
          </button>

          {myGameRequests.length > 0 && (
            <button
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-gold text-black hover:bg-gold/90 transition-all shadow-[0_0_15px_rgba(234,179,8,0.4)]"
              onClick={handleManageRequests}
            >
              <Users className="w-5 h-5" />
              Manage Requests ({myGameRequests.length})
            </button>
          )}
        </div>
      </div>

      {/* Filter Section */}
      <div className="glass-panel p-8 rounded-3xl border-border/50 mb-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>

        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <Filter className="w-5 h-5 text-cyan-400" />
          </div>
          <h3 className="text-2xl font-display font-bold text-white">Advanced Search</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Role Filter */}
          <div className="space-y-4">
            <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Select Roles</label>
            <div className="flex flex-wrap gap-2">
              {roles.map(role => (
                <button
                  key={role.id}
                  onClick={() => handleRoleToggle(role.id)}
                  className={`p-2 rounded-xl border transition-all duration-300 group ${filters.roles.includes(role.id)
                    ? 'bg-cyan-500/20 border-cyan-500/50 scale-110 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                    : 'bg-secondary/40 border-border/50 hover:border-cyan-500/30'
                    }`}
                  title={role.name}
                >
                  <img src={role.icon} alt={role.name} className="w-8 h-8 filter grayscale group-hover:grayscale-0 transition-all" />
                </button>
              ))}
            </div>
          </div>

          {/* Rank Filter */}
          <div className="space-y-4">
            <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Skill Level</label>
            <div className="relative" ref={rankDropdownRef}>
              <button
                className="w-full flex items-center justify-between px-4 py-3 bg-secondary/40 border border-border/50 rounded-xl hover:border-gold/50 transition-all"
                onClick={() => setShowRankDropdown(!showRankDropdown)}
              >
                <div className="flex items-center gap-3">
                  <img src={getRankIconForFilter(filters.rank)} alt="" className="w-6 h-6" />
                  <span className="font-medium">{rankTiers.find(r => r.id === filters.rank)?.name}</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showRankDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showRankDropdown && (
                <div className="absolute top-full left-0 w-full mt-2 bg-[#0b0f17] border border-border/80 rounded-2xl shadow-2xl z-50 py-2 max-h-[400px] overflow-y-auto scrollbar-hide animate-in fade-in slide-in-from-top-4">
                  {rankTiers.map(rank => (
                    <button
                      key={rank.id}
                      className={`w-full flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors text-left ${filters.rank === rank.id ? 'bg-gold/10 text-gold' : ''
                        }`}
                      onClick={() => {
                        handleFilterChange('rank', rank.id);
                        setShowRankDropdown(false);
                      }}
                    >
                      <img src={getRankIconForFilter(rank.id)} alt="" className="w-8 h-8" />
                      <span className="font-medium">{rank.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Queue Type Filter */}
          <div className="space-y-4">
            <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Queue System</label>
            <div className="relative group/select">
              <select
                value={filters.queueType}
                onChange={(e) => handleFilterChange('queueType', e.target.value)}
                className="w-full px-4 pr-10 py-3 bg-secondary/40 border border-border/50 rounded-xl hover:border-cyan-500/50 transition-all outline-none appearance-none cursor-pointer"
              >
                {queueTypes.map(queue => (
                  <option key={queue.id} value={queue.id} className="bg-[#0b0f17]">{queue.name}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/30 group-hover/select:text-cyan-500/50 transition-colors">
                <ChevronDown className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Region Filter */}
          <div className="space-y-4">
            <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Server Region</label>
            <div className="relative group/select">
              <select
                value={filters.region}
                onChange={(e) => handleFilterChange('region', e.target.value)}
                className="w-full px-4 pr-10 py-3 bg-secondary/40 border border-border/50 rounded-xl hover:border-gold/50 transition-all outline-none appearance-none cursor-pointer"
              >
                {regions.map(region => (
                  <option key={region.id} value={region.id} className="bg-[#0b0f17]">{region.name}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/30 group-hover/select:text-gold/50 transition-colors">
                <ChevronDown className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Active Filters */}
        {(filters.roles.length > 0 || filters.rank !== 'all' || filters.queueType !== 'all' || filters.region !== 'all') && (
          <div className="mt-8 pt-6 border-t border-border/30 flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Search className="w-4 h-4" /> Active Filters:
            </span>
            <div className="flex flex-wrap gap-2">
              {filters.roles.map(roleId => (
                <span key={roleId} className="px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full text-xs font-bold flex items-center gap-2">
                  {roles.find(r => r.id === roleId)?.name}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => handleRoleToggle(roleId)} />
                </span>
              ))}
              {filters.rank !== 'all' && (
                <span className="px-3 py-1 bg-gold/10 text-gold border border-gold/30 rounded-full text-xs font-bold flex items-center gap-2">
                  {rankTiers.find(r => r.id === filters.rank)?.name}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => handleFilterChange('rank', 'all')} />
                </span>
              )}
              {filters.queueType !== 'all' && (
                <span className="px-3 py-1 bg-white/5 text-white border border-white/20 rounded-full text-xs font-bold flex items-center gap-2">
                  {queueTypes.find(q => q.id === filters.queueType)?.name}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => handleFilterChange('queueType', 'all')} />
                </span>
              )}
              <button onClick={resetFilters} className="text-xs font-bold text-red-400 hover:text-red-300 ml-2 transition-colors">RESET ALL</button>
            </div>
          </div>
        )}
      </div>


      {(isPostingGame || isEditingGame) && (
        <div className="glass-panel p-8 rounded-3xl border-border/50 mb-12 animate-in slide-in-from-top duration-500 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-3xl rounded-full -mr-16 -mt-16"></div>

          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-gold/10 rounded-lg text-gold">
              {isEditingGame ? <Edit3 className="w-5 h-5" /> : <PlusSquare className="w-5 h-5" />}
            </div>
            <h3 className="text-2xl font-display font-bold text-white">
              {isEditingGame ? 'Edit Listing' : 'Create New Listing'}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Left Col: Info */}
            <div className="space-y-6">
              <div>
                <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest block mb-3">Linked Identity</label>
                <div className="flex items-center justify-between p-4 bg-secondary/40 border border-border/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-gold/30 p-0.5">
                      <img src={userProfile?.profileImage || "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png"} alt="" className="w-full h-full rounded-full object-cover" />
                    </div>
                    <div>
                      <div className="font-bold text-white leading-none mb-1">{userProfile?.displayName}</div>
                      <div className="text-xs text-gold font-medium tracking-tight uppercase">{userProfile?.riotAccount || 'No account'}</div>
                    </div>
                  </div>
                  {!userProfile?.riotAccountData && (
                    <button onClick={() => navigate('/profile')} className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-widest">Link account</button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest block mb-3">Queue Type</label>
                <select
                  name="queueType"
                  value={gameData.queueType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-secondary/40 border border-border/50 rounded-xl hover:border-gold/50 transition-all outline-none appearance-none cursor-pointer"
                >
                  {queueTypes.filter(q => q.id !== 'all').map(queue => (
                    <option key={queue.id} value={queue.id} className="bg-[#0b0f17]">{queue.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest block mb-3">Communication</label>
                <div className="grid grid-cols-2 gap-3">
                  {communicationTypes.map(comm => (
                    <button
                      key={comm.id}
                      type="button"
                      onClick={() => handleCommunicationSelect(comm.id)}
                      className={`py-3 rounded-xl border font-bold transition-all ${gameData.communication === comm.id
                        ? 'bg-gold text-black border-gold shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                        : 'bg-secondary/40 border-border/50 text-muted-foreground hover:border-border hover:bg-secondary/60'
                        }`}
                    >
                      {comm.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Col: Roles & Description */}
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest block mb-3">My Role</label>
                  <div className="flex flex-wrap gap-2">
                    {roles.filter(r => r.id !== 'all').map(role => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => handleInputChange({ target: { name: 'role', value: role.id } })}
                        className={`p-1.5 rounded-lg border transition-all ${gameData.role === role.id
                          ? 'bg-cyan-500/20 border-cyan-500/50 scale-110 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                          : 'bg-secondary/40 border-border/50 hover:border-cyan-500/30'
                          }`}
                        title={role.name}
                      >
                        <img src={role.icon} alt={role.name} className="w-6 h-6" />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest block mb-3">Looking For</label>
                  <div className="flex flex-wrap gap-2">
                    {roles.filter(r => r.id !== 'all').map(role => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => handleInputChange({ target: { name: 'preferredDuoRole', value: role.id } })}
                        className={`p-1.5 rounded-lg border transition-all ${gameData.preferredDuoRole === role.id
                          ? 'bg-gold/20 border-gold/50 scale-110 shadow-[0_0_10px_rgba(234,179,8,0.3)]'
                          : 'bg-secondary/40 border-border/50 hover:border-gold/30'
                          }`}
                        title={role.name}
                      >
                        <img src={role.icon} alt={role.name} className="w-6 h-6" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-3">
                  <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Message</label>
                  <span className={`text-[10px] font-bold ${gameData.description.length >= 200 ? 'text-red-400' : 'text-muted-foreground'}`}>
                    {gameData.description.length}/200
                  </span>
                </div>
                <textarea
                  name="description"
                  value={gameData.description}
                  onChange={(e) => {
                    handleInputChange(e);
                    handleTextareaResize(e);
                  }}
                  placeholder="Need an aggressive jungler for duo queue, have discord..."
                  className="w-full bg-secondary/40 border border-border/50 rounded-xl p-4 min-h-[120px] outline-none focus:border-gold/50 transition-all text-white resize-none scrollbar-hide"
                  maxLength={200}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t border-border/30">
            <button
              className="px-8 py-3 rounded-xl font-bold bg-secondary/80 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/50 border border-border/50 transition-all uppercase tracking-widest text-xs"
              onClick={isEditingGame ? handleCancelEdit : () => setIsPostingGame(false)}
            >
              Discard
            </button>
            <button
              className="px-10 py-3 rounded-xl font-bold bg-gold text-black hover:bg-gold/90 transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)] uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={isEditingGame ? handleUpdateGame : handlePostGame}
              disabled={!gameData.description.trim() || !userProfile?.riotAccountData}
            >
              {isEditingGame ? 'Update Lobby' : 'Post Lobby'}
            </button>
          </div>
        </div>
      )}


      <div className="space-y-6">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            Active Lobbies
            <span className="text-sm font-medium text-muted-foreground px-3 py-1 bg-white/5 rounded-full border border-white/10">
              {filteredListings.length}
            </span>
          </h3>
          {filteredListings.length !== gameListings.length && (
            <span className="text-sm text-gold font-medium">
              Filtered from {gameListings.length} total
            </span>
          )}
        </div>

        {filteredListings.length === 0 ? (
          <div className="glass-panel p-16 rounded-3xl border-border/50 text-center animate-in fade-in duration-500">
            <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground/30">
              <Swords className="w-10 h-10" />
            </div>
            <p className="text-xl text-muted-foreground mb-8">
              {gameListings.length === 0
                ? "The Rift is quiet. Be the first to start a lobby!"
                : "No lobbies match your specific search criteria."}
            </p>
            {gameListings.length > 0 && (
              <button
                className="px-8 py-3 rounded-xl font-bold bg-white/5 hover:bg-white/10 border border-white/10 transition-all uppercase tracking-widest text-xs"
                onClick={resetFilters}
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredListings.map(game => {
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
                <div key={game.id} className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row gap-6 border-border/50 hover:bg-white/[0.03] transition-all group relative overflow-hidden">
                  {isOwnGame && <div className="absolute top-0 left-0 w-1 h-full bg-gold shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>}

                  {/* User Section */}
                  <div className="w-full md:w-64 shrink-0 flex flex-col items-center md:items-start md:border-r border-border/30 pr-0 md:pr-6 gap-4">
                    <div className="flex items-center gap-4 w-full">
                      <div className="relative group/avatar">
                        <div className="absolute inset-0 bg-gold/20 rounded-full blur-md opacity-0 group-hover/avatar:opacity-100 transition-opacity"></div>
                        <div className="w-14 h-14 rounded-full border-2 border-gold/30 p-0.5 relative">
                          <img
                            src={profileImage || "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png"}
                            alt=""
                            className="w-full h-full rounded-full object-cover"
                          />
                        </div>
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-bold text-white truncate text-lg leading-tight mb-1">{game.userDisplayName}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gold uppercase tracking-tighter bg-gold/10 px-2 py-0.5 rounded border border-gold/20">{region}</span>
                          <span className="text-[10px] font-medium text-muted-foreground truncate">{game.userRiotAccount}</span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full space-y-3">
                      <div className="flex items-center gap-3 p-2 bg-secondary/30 rounded-lg border border-border/20">
                        <img src={soloRankIcon} alt="" className="w-8 h-8 drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]" />
                        <div className="overflow-hidden">
                          <div className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-1 text-cyan-400">Solo/Duo</div>
                          <div className="text-xs font-bold text-white truncate">{soloRankText}</div>
                          <div className="text-[9px] font-medium text-muted-foreground">WR: <span className="text-white">{soloWinRate}</span> • {soloGames}G</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-2 bg-secondary/30 rounded-lg border border-border/20">
                        <img src={flexRankIcon} alt="" className="w-8 h-8 brightness-75" />
                        <div className="overflow-hidden">
                          <div className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-1 text-gold">Flex</div>
                          <div className="text-xs font-bold text-white truncate">{flexRankText}</div>
                          <div className="text-[9px] font-medium text-muted-foreground">WR: <span className="text-white">{flexWinRate}</span> • {flexGames}G</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded text-[10px] font-bold uppercase tracking-widest">
                          {getQueueTypeName(game.queueType)}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          {game.communication === 'voice' ? (
                            <span className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 text-green-400 rounded border border-green-500/20">
                              VC ENABLED
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
                              TEXT ONLY
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground ml-auto flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-gold" />
                          {formatTimeAgo(game.createdAt)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-3 bg-secondary/20 rounded-xl border border-border/30 flex items-center gap-3">
                          <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center p-1.5 border border-cyan-500/20">
                            <img src={roleIcon} alt="" className="w-full h-full object-contain" />
                          </div>
                          <div>
                            <div className="text-[9px] font-bold text-muted-foreground uppercase leading-none mb-1">Playing</div>
                            <div className="text-sm font-bold text-white">{roles.find(r => r.id === game.role)?.name}</div>
                          </div>
                        </div>
                        <div className="p-3 bg-secondary/20 rounded-xl border border-border/30 flex items-center gap-3">
                          <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center p-1.5 border border-gold/20">
                            <img src={preferredRoleIcon} alt="" className="w-full h-full object-contain" />
                          </div>
                          <div>
                            <div className="text-[9px] font-bold text-muted-foreground uppercase leading-none mb-1">Searching</div>
                            <div className="text-sm font-bold text-white">{roles.find(r => r.id === game.preferredDuoRole)?.name}</div>
                          </div>
                        </div>
                      </div>

                      <div className="text-muted-foreground leading-relaxed italic border-l-2 border-border/30 pl-4 py-1">
                        "{game.description}"
                      </div>
                    </div>
                  </div>

                  {/* Actions Section */}
                  <div className="w-full md:w-auto shrink-0 flex md:flex-col justify-end gap-3 pt-4 md:pt-0 md:pl-6 md:border-l border-border/30 items-center">
                    {isOwnGame ? (
                      <>
                        <button
                          onClick={() => handleEditGame(game)}
                          className="flex-1 md:flex-none p-3 bg-secondary/50 rounded-xl border border-border/50 text-white hover:text-gold hover:border-gold/50 transition-all"
                          title="Edit Post"
                        >
                          <Edit3 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteListing(game.id)}
                          className="flex-1 md:flex-none p-3 bg-secondary/50 rounded-xl border border-border/50 text-white hover:text-red-400 hover:border-red-400/50 transition-all font-bold"
                          title="Delete Post"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => openJoinModal(game)}
                          disabled={alreadyApplied}
                          className={`flex-1 md:min-w-[140px] px-6 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${alreadyApplied
                            ? 'bg-secondary/50 text-muted-foreground cursor-not-allowed border border-border/50'
                            : 'bg-gold text-black hover:bg-gold/90 scale-100 hover:scale-105 active:scale-95'
                            }`}
                        >
                          {alreadyApplied ? <Check className="w-4 h-4" /> : <Swords className="w-4 h-4" />}
                          {alreadyApplied ? 'Applied' : 'Join lobby'}
                        </button>
                        <button
                          onClick={() => handleAddFriend(game.userId)}
                          disabled={isFriend || requestSent}
                          className={`flex-1 md:min-w-[140px] px-6 py-3 rounded-xl font-bold border transition-all flex items-center justify-center gap-2 ${isFriend
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : requestSent
                              ? 'bg-white/5 text-muted-foreground border-white/10'
                              : 'bg-white/5 text-white border-white/20 hover:bg-white/10 hover:border-white/30'
                            }`}
                        >
                          {isFriend || requestSent ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                          {isFriend ? 'Friends' : requestSent ? 'Sent' : 'Add friend'}
                        </button>
                        <button
                          onClick={() => handleCopyRiotAccount(game.userRiotAccount)}
                          className="p-3 bg-secondary/50 rounded-xl border border-border/50 text-muted-foreground hover:text-white transition-all"
                          title="Copy Riot ID"
                        >
                          <Copy className="w-5 h-5" />
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


      {showJoinModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowJoinModal(false)}></div>
          <div className="glass-panel w-full max-w-xl rounded-3xl border-border/50 relative overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold/50 to-transparent"></div>

            <div className="flex items-center justify-between p-8 border-b border-border/30">
              <h3 className="text-2xl font-display font-bold text-white flex items-center gap-3">
                <Swords className="w-6 h-6 text-gold" />
                Join Lobby
              </h3>
              <button onClick={() => setShowJoinModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {selectedGame && (
                <div className="p-6 bg-secondary/30 rounded-2xl border border-border/20">
                  <p className="text-muted-foreground mb-4">Requesting to join <strong className="text-gold">{selectedGame.userDisplayName}'s</strong> lobby:</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">System</span>
                      <span className="text-sm font-bold text-white">{getQueueTypeName(selectedGame.queueType)}</span>
                    </div>
                    <div className="flex flex-col gap-1 text-right">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Region</span>
                      <span className="text-sm font-bold text-cyan-400">{getRegionFromGame(selectedGame)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Battle Cry (Optional)</label>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{joinMessage.length}/200</span>
                </div>
                <textarea
                  value={joinMessage}
                  onChange={(e) => setJoinMessage(e.target.value)}
                  placeholder="Why should you join this lobby? (e.g. 'Emerald peak, maining Vayne')"
                  className="w-full bg-secondary/40 border border-border/50 rounded-2xl p-5 min-h-[140px] outline-none focus:border-gold/50 transition-all text-white resize-none"
                  maxLength={200}
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 p-8 pt-0">
              <button
                className="px-8 py-3 rounded-xl font-bold bg-secondary/80 hover:bg-white/10 border border-border/50 transition-all uppercase tracking-widest text-xs"
                onClick={() => setShowJoinModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-10 py-3 rounded-xl font-bold bg-gold text-black hover:bg-gold/90 transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)] uppercase tracking-widest text-xs"
                onClick={() => handleJoinQueue(selectedGame.id, joinMessage)}
                disabled={!selectedGame}
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {showRequestModal && (
        <div className="fixed inset-0 z-110 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowRequestModal(false)}></div>
          <div className="glass-panel w-full max-w-4xl max-h-[85vh] rounded-3xl border-border/50 relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>

            <div className="flex items-center justify-between p-8 border-b border-border/30 shrink-0">
              <div>
                <h3 className="text-3xl font-display font-bold text-white mb-1">Incoming Requests</h3>
                <p className="text-sm text-muted-foreground uppercase tracking-[0.2em] font-medium">Lobby Management Interface</p>
              </div>
              <button onClick={() => setShowRequestModal(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all group">
                <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto scrollbar-hide bg-black/20 flex-1">
              {myGameRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-20 h-20 bg-secondary/30 rounded-full flex items-center justify-center mb-6 text-muted-foreground/20 border border-border/20">
                    <Users className="w-10 h-10" />
                  </div>
                  <p className="text-xl font-display font-bold text-muted-foreground mb-2">No active applicants</p>
                  <p className="text-sm text-muted-foreground uppercase tracking-widest">Searching for players...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myGameRequests.map(request => {
                    const soloQueue = getQueueData(request.rankedData, 'RANKED_SOLO_5x5');
                    const rankText = soloQueue ? formatRankDisplay(soloQueue) : 'Unranked';
                    const rankIcon = getRankIcon(soloQueue?.tier);
                    const isProcessing = processingRequests.has(`${request.gameId}_${request.userId}`);

                    return (
                      <div key={request.id} className="p-6 bg-secondary/40 border border-border/30 rounded-2xl flex flex-col gap-6 hover:border-gold/30 transition-all animate-in slide-in-from-right duration-300">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                          <div className="flex items-center gap-5">
                            <div className="relative">
                              <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-md animate-pulse"></div>
                              <div className="w-16 h-16 rounded-full border-2 border-cyan-500/30 p-1 relative">
                                <img
                                  src={request.profileImage || "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png"}
                                  alt=""
                                  className="w-full h-full rounded-full object-cover"
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <h4 className="text-xl font-bold text-white">{request.displayName}</h4>
                                {isAlreadyFriend(request.userId) && (
                                  <span className="text-[9px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20 uppercase tracking-tighter">Companion</span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground font-medium mb-3">{request.riotAccount}</div>
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded-lg border border-white/5 w-fit">
                                <img src={rankIcon} alt="" className="w-5 h-5" />
                                <span className="text-xs font-bold text-white">{rankText}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-4 items-center">
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">TARGET LOBBY</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-cyan-400">{getQueueTypeName(request.gameQueueType)}</span>
                                <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                                <span className="text-xs font-bold text-white">{roles.find(r => r.id === (request.role || 'fill'))?.name}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                className="px-5 py-2.5 rounded-xl font-bold bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs uppercase tracking-widest disabled:opacity-50"
                                onClick={() => handleViewProfile(request.userId)}
                                disabled={isProcessing}
                              >
                                Profile
                              </button>
                              <button
                                className="px-5 py-2.5 rounded-xl font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-xs uppercase tracking-widest disabled:opacity-50"
                                onClick={() => handleDeclineRequest(request.gameId, request.userId, request.displayName)}
                                disabled={isProcessing}
                              >
                                Decline
                              </button>
                              <button
                                className="px-7 py-2.5 rounded-xl font-bold bg-gold text-black hover:bg-gold/90 transition-all text-xs uppercase tracking-widest disabled:opacity-50 shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                                onClick={() => handleAcceptRequest(request.gameId, request.userId, request.displayName)}
                                disabled={isProcessing || isAlreadyFriend(request.userId)}
                              >
                                {isAlreadyFriend(request.userId) ? 'Accepted' : 'Accept'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {request.message && (
                          <div className="p-4 bg-black/30 rounded-xl border-l-2 border-gold/50 relative">
                            <span className="text-muted-foreground italic text-sm">"{request.message}"</span>
                            <div className="absolute top-2 right-4 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                              Request received {formatTimeAgo(new Date(request.appliedAt))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-8 border-t border-border/30 bg-black/20 shrink-0">
              <button
                className="w-full py-4 rounded-xl font-bold bg-secondary/80 hover:bg-white/5 border border-border/50 transition-all uppercase tracking-widest text-xs"
                onClick={() => setShowRequestModal(false)}
              >
                Return to Lobby
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && ReactDOM.createPortal(
        <div className="fixed inset-0 z-120 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={cancelDeleteListing}></div>
          <div className="glass-panel w-full max-w-md rounded-3xl border-red-500/30 relative overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-2xl font-display font-bold text-white mb-2">Delete Lobby?</h3>
              <p className="text-muted-foreground text-sm uppercase tracking-widest font-medium mb-8">This operation is irreversible</p>

              <div className="flex gap-4">
                <button className="flex-1 py-4 rounded-xl font-bold bg-secondary hover:bg-white/5 transition-all uppercase tracking-widest text-xs border border-border/30" onClick={cancelDeleteListing}>
                  Cancel
                </button>
                <button className="flex-1 py-4 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-all uppercase tracking-widest text-xs shadow-lg shadow-red-500/20" onClick={confirmDeleteListing}>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default QueueSystem;
