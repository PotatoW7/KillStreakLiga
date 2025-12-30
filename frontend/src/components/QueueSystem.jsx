import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { 
  collection, query, where, onSnapshot, addDoc, 
  serverTimestamp, doc, getDoc, orderBy, deleteDoc, 
  updateDoc, arrayUnion, arrayRemove, getDocs
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

function QueueSystem() {
  const [isPostingGame, setIsPostingGame] = useState(false);
  const [isEditingGame, setIsEditingGame] = useState(null);
  const [gameListings, setGameListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [userFriends, setUserFriends] = useState([]);
  const [loading, setLoading] = useState(true);
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
    { id: 'all', name: 'All Roles', icon: '/lane-icons/Fill icon.jpg' },
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
    { id: 'vn2', name: 'Vietnam' }
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
      'vn2': 'vn2'
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
      'vn2': 'Vietnam'
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
    fetchUserFriends();
    fetchGameListings();
    fetchMyGameRequests();
    
    return () => {
      const unsubscribe = fetchGameListings();
      if (unsubscribe) unsubscribe();
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
            const response = await fetch(`http://localhost:3000/summoner-info/${userData.riotAccount.region}/${encodeURIComponent(userData.riotAccount.gameName)}/${encodeURIComponent(userData.riotAccount.tagLine)}`);
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

  const fetchUserFriends = async () => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserFriends(data.friends || []);
      }
    } catch (error) {
      console.error('Error fetching user friends:', error);
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
        setLoading(false);
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
        setLoading(false);
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
      
      const alreadyFriends = hostFriends.some(friend => friend.id === applicantUserId) ||
                            applicantFriends.some(friend => friend.id === hostUserId);
      
      if (!alreadyFriends) {
        await updateDoc(hostRef, {
          friends: arrayUnion({
            id: applicantUserId,
            username: applicantName,
            profileImage: applicantData.profileImage || null,
            addedAt: new Date()
          })
        });
        
        await updateDoc(applicantRef, {
          friends: arrayUnion({
            id: hostUserId,
            username: hostData.username || auth.currentUser?.displayName || 'Host',
            profileImage: hostData.profileImage || null,
            addedAt: new Date()
          })
        });
        
        console.log("Auto-friended users after queue acceptance");
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
      alert('Game updated successfully!');
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
        alert('You have already requested to join this queue.');
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
        role: userProfile?.preferredRole || 'fill'
      };

      await updateDoc(gameRef, {
        applicants: arrayUnion(userData),
        updatedAt: serverTimestamp()
      });

      setShowJoinModal(false);
      setJoinMessage('');
      alert('Request to join sent! The host will review your request.');
    } catch (error) {
      console.error('Error joining queue:', error);
      alert('Error joining queue. Please try again. Error: ' + error.message);
    }
  };

  const handleManageRequests = () => {
    setShowRequestModal(true);
  };

  const handleAcceptRequest = async (gameId, applicantUserId, applicantName) => {
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

      alert(`Request accepted! ${applicantName} has been added to your game and as a friend.`);
      
      setMyGameRequests(prev => prev.filter(req => 
        !(req.gameId === gameId && req.userId === applicantUserId)
      ));
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Error accepting request. Please try again.');
    }
  };

  const handleDeclineRequest = async (gameId, applicantUserId, applicantName) => {
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

      alert(`Request from ${applicantName} declined.`);
      
      setMyGameRequests(prev => prev.filter(req => 
        !(req.gameId === gameId && req.userId === applicantUserId)
      ));
    } catch (error) {
      console.error('Error declining request:', error);
      alert('Error declining request. Please try again.');
    }
  };

  const handleViewProfile = (userId) => {
    window.open(`/profile/${userId}`, '_blank');
  };

  const handleDeleteListing = async (gameId) => {
    if (!window.confirm('Are you sure you want to delete this game listing?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'gameListings', gameId));
    } catch (error) {
      console.error('Error deleting listing:', error);
      alert('Error deleting listing. Please try again.');
    }
  };

  const handleAddFriend = async (userId) => {
    if (!auth.currentUser || userId === auth.currentUser.uid) return;

    try {
      const targetUserRef = doc(db, 'users', userId);
      await updateDoc(targetUserRef, {
        pendingRequests: arrayUnion({
          from: auth.currentUser.uid,
          fromUsername: userProfile?.displayName || auth.currentUser.displayName || 'Anonymous',
          timestamp: new Date()
        })
      });
      
      alert('Friend request sent!');
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Error sending friend request: ' + error.message);
    }
  };

  const handleCopyRiotAccount = (riotAccount) => {
    if (!riotAccount || riotAccount === 'Not linked') return;
    
    if (riotAccount.includes('Not linked') || riotAccount.includes('Linked (no name)') || riotAccount === 'Linked') {
      alert('No Riot account to copy');
      return;
    }
    
    navigator.clipboard.writeText(riotAccount)
      .then(() => {
        alert('Riot account copied to clipboard: ' + riotAccount);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        alert('Failed to copy Riot account');
      });
  };

  const isAlreadyFriend = (userId) => {
    return userFriends.some(friend => friend.id === userId);
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
    return roleObj ? roleObj.icon : '/lane-icons/Fill icon.jpg';
  };

  const getRoleImage = (role) => {
    const roleObj = roles.find(r => r.id === role);
    return roleObj ? roleObj.icon : '/lane-icons/Fill icon.jpg';
  };

  const handleRoleToggle = (roleId) => {
    setFilters(prev => {
      if (roleId === 'all') {
        return { ...prev, roles: [] };
      }
      
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

  if (loading) {
    return (
      <div className="queue-container">
        <div className="queue-loading">
          <div className="spinner">Loading...</div>
          <p>Loading game listings...</p>
        </div>
      </div>
    );
  }

  if (!auth.currentUser) {
    return (
      <div className="queue-container">
        <div className="queue-warning">
          <div className="warning-icon">⚠️</div>
          <p>Please login to use the queue system</p>
          <button onClick={() => navigate('/login')} className="link-profile-btn">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="queue-container">
      <div className="queue-header">
        <h1>Find League Teammates</h1>
        <p>Post your game or join others to find the perfect duo partner</p>
        
        <div className="header-actions">
          <button 
            className="post-game-btn"
            onClick={() => {
              setIsEditingGame(null);
              setIsPostingGame(!isPostingGame);
            }}
          >
            {isPostingGame ? 'Cancel' : 'Post a Game'}
          </button>
          
          {myGameRequests.length > 0 && (
            <button 
              className="manage-requests-btn"
              onClick={handleManageRequests}
            >
              Manage Requests ({myGameRequests.length})
            </button>
          )}
        </div>
      </div>

      <div className="filter-section">
        <h3>Filter Games</h3>
        <div className="filters-grid">
          <div className="filter-group">
            <label className="filter-label">Role</label>
            <div className="filter-buttons">
              {roles.filter(r => r.id !== 'fill').map(role => (
                <button
                  key={role.id}
                  type="button"
                  className={`filter-btn ${filters.roles.includes(role.id) ? 'active' : ''}`}
                  onClick={() => handleRoleToggle(role.id)}
                >
                  <img 
                    src={role.icon} 
                    alt={role.name}
                    className="filter-icon-img"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <span className="filter-text">{role.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">Rank</label>
            <div className="rank-filter-wrapper" ref={rankDropdownRef}>
              <div 
                className="rank-filter-display"
                onClick={() => setShowRankDropdown(!showRankDropdown)}
              >
                <div className="rank-filter-display-content">
                  <img 
                    src={getRankIconForFilter(filters.rank)} 
                    alt={rankTiers.find(r => r.id === filters.rank)?.name}
                    className="rank-filter-display-icon"
                    onError={(e) => {
                      console.error('Failed to load rank icon:', e.target.src);
                      e.target.style.display = 'none';
                    }}
                  />
                  <span>{rankTiers.find(r => r.id === filters.rank)?.name}</span>
                </div>
                <span className={`rank-filter-chevron ${showRankDropdown ? 'open' : ''}`}>▼</span>
              </div>
              
              {showRankDropdown && (
                <div className="rank-filter-dropdown">
                  {rankTiers.map(rank => (
                    <div
                      key={rank.id}
                      className={`rank-filter-option ${filters.rank === rank.id ? 'active' : ''}`}
                      onClick={() => {
                        handleFilterChange('rank', rank.id);
                        setShowRankDropdown(false);
                      }}
                    >
                      <img 
                        src={getRankIconForFilter(rank.id)} 
                        alt={rank.name}
                        className="rank-filter-option-icon"
                        onError={(e) => {
                          console.error('Failed to load rank icon:', e.target.src);
                          e.target.style.display = 'none';
                        }}
                      />
                      <span>{rank.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">Queue Type</label>
            <select 
              value={filters.queueType}
              onChange={(e) => handleFilterChange('queueType', e.target.value)}
              className="filter-select"
            >
              {queueTypes.map(queue => (
                <option key={queue.id} value={queue.id}>
                  {queue.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Region</label>
            <select 
              value={filters.region}
              onChange={(e) => handleFilterChange('region', e.target.value)}
              className="filter-select"
            >
              {regions.map(region => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(filters.roles.length > 0 || filters.rank !== 'all' || filters.queueType !== 'all' || filters.region !== 'all') && (
          <div className="active-filters">
            <div className="active-filters-header">
              <span className="active-filters-label">Active Filters:</span>
              <button 
                className="reset-filters-btn-small"
                onClick={resetFilters}
              >
                Reset
              </button>
            </div>
            <div className="filter-tags-container">
              {filters.roles.length > 0 && filters.roles.map(roleId => {
                const role = roles.find(r => r.id === roleId);
                return role && (
                  <span key={roleId} className="filter-tag">
                    Role: {role.name}
                    <button 
                      className="remove-filter-btn"
                      onClick={() => handleRoleToggle(roleId)}
                    >
                      ✕
                    </button>
                  </span>
                );
              })}
              {filters.rank !== 'all' && (
                <span className="filter-tag" data-rank={filters.rank}>
                  Rank: {rankTiers.find(r => r.id === filters.rank)?.name}
                  <button 
                    className="remove-filter-btn"
                    onClick={() => handleFilterChange('rank', 'all')}
                  >
                    ✕
                  </button>
                </span>
              )}
              {filters.queueType !== 'all' && (
                <span className="filter-tag">
                  Queue: {queueTypes.find(q => q.id === filters.queueType)?.name}
                  <button 
                    className="remove-filter-btn"
                    onClick={() => handleFilterChange('queueType', 'all')}
                  >
                    ✕
                  </button>
                </span>
              )}
              {filters.region !== 'all' && (
                <span className="filter-tag">
                  Region: {regions.find(r => r.id === filters.region)?.name}
                  <button 
                    className="remove-filter-btn"
                    onClick={() => handleFilterChange('region', 'all')}
                  >
                    ✕
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {(isPostingGame || isEditingGame) && (
        <div className="compact-post-form">
          <h3>{isEditingGame ? 'Edit Your Game Post' : 'Create New Game Post'}</h3>
          
          <div className="form-grid-compact">
            <div className="form-group-compact">
              <label className="form-label-compact">Your Riot Account</label>
              <div className="riot-account-compact">
                <span className="riot-account-text">
                  {userProfile?.riotAccountData ? userProfile.riotAccount : 'Not linked'}
                </span>
                {!userProfile?.riotAccountData && (
                  <button 
                    className="link-account-btn-compact"
                    onClick={() => navigate('/profile')}
                  >
                    Link Account
                  </button>
                )}
              </div>
            </div>

            <div className="form-group-compact">
              <label className="form-label-compact">Queue Type</label>
              <select 
                name="queueType"
                value={gameData.queueType}
                onChange={handleInputChange}
                className="select-compact"
              >
                {queueTypes.filter(q => q.id !== 'all').map(queue => (
                  <option key={queue.id} value={queue.id}>
                    {queue.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group-compact">
            <label className="form-label-compact">My Role</label>
            <div className="role-grid-compact">
              {roles.filter(r => r.id !== 'all').map(role => (
                <button
                  key={role.id}
                  type="button"
                  className={`role-btn-compact ${gameData.role === role.id ? 'active' : ''}`}
                  onClick={() => handleInputChange({ target: { name: 'role', value: role.id } })}
                >
                  <img 
                    src={role.icon} 
                    alt={role.name}
                    className="role-icon-img-compact"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <span>{role.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group-compact">
            <label className="form-label-compact">Looking For Role</label>
            <div className="role-grid-compact">
              {roles.filter(r => r.id !== 'all').map(role => (
                <button
                  key={role.id}
                  type="button"
                  className={`role-btn-compact ${gameData.preferredDuoRole === role.id ? 'active' : ''}`}
                  onClick={() => handleInputChange({ target: { name: 'preferredDuoRole', value: role.id } })}
                >
                  <img 
                    src={role.icon} 
                    alt={role.name}
                    className="role-icon-img-compact"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <span>{role.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-grid-compact">
            <div className="form-group-compact">
              <label className="form-label-compact">Communication</label>
              <div className="comm-buttons-compact">
                {communicationTypes.map(comm => (
                  <button
                    key={comm.id}
                    type="button"
                    className={`comm-btn-compact ${gameData.communication === comm.id ? 'active' : ''}`}
                    onClick={() => handleCommunicationSelect(comm.id)}
                  >
                    <span>{comm.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group-compact">
              <label className="form-label-compact">
                Description ({gameData.description.length}/200)
              </label>
              <textarea
                name="description"
                value={gameData.description}
                onChange={(e) => {
                  handleInputChange(e);
                  handleTextareaResize(e);
                }}
                placeholder="Brief description about your playstyle..."
                className="textarea-compact"
                maxLength={200}
                rows="1"
              />
              <div className="char-counter-compact">
                {gameData.description.length}/200
              </div>
            </div>
          </div>

          <div className="form-actions-compact">
            <button 
              className="cancel-btn-compact"
              onClick={isEditingGame ? handleCancelEdit : () => setIsPostingGame(false)}
            >
              Cancel
            </button>
            <button 
              className="submit-btn-compact"
              onClick={isEditingGame ? handleUpdateGame : handlePostGame}
              disabled={!gameData.description.trim() || !userProfile?.riotAccountData}
            >
              {isEditingGame ? 'Update Post' : 'Create Post'}
            </button>
          </div>
        </div>
      )}

      <div className="listings-container">
        <h3 className="listings-title">
          Available Games ({filteredListings.length})
          {filteredListings.length !== gameListings.length && (
            <span className="filtered-count">
              (Filtered from {gameListings.length} total)
            </span>
          )}
        </h3>
        
        {filteredListings.length === 0 ? (
          <div className="no-listings">
            <p>
              {gameListings.length === 0 
                ? "No games posted yet. Be the first to post!"
                : "No games match your filters. Try adjusting your criteria."}
            </p>
            {gameListings.length > 0 && (
              <button 
                className="reset-filters-inline"
                onClick={resetFilters}
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="game-cards-grid">
            {filteredListings.map(game => {
              const isOwnGame = game.userId === auth.currentUser?.uid;
              const isFriend = isAlreadyFriend(game.userId);
              
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
              
              return (
                <div key={game.id} className="game-card-compact">
                  <div className="card-left-section">
                    <div className="user-info-compact">
                      <div className="user-avatar-small">
                        {profileImage && profileImage.startsWith('data:image') ? (
                          <img 
                            src={profileImage} 
                            alt={game.userDisplayName}
                            className="avatar-img-small"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png";
                            }}
                          />
                        ) : (
                          <img 
                            src="https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"
                            alt={game.userDisplayName}
                            className="avatar-img-small"
                          />
                        )}
                      </div>
                      <div className="user-text-small">
                        <div className="user-name-small">
                          {game.userDisplayName}
                          <span className="region-badge" title={`Region: ${region}`}>
                            Region: {region}
                          </span>
                        </div>
                        <div className="riot-account-with-copy">
                          <span className="riot-account-small">{game.userRiotAccount}</span>
                          {game.userRiotAccount && game.userRiotAccount !== 'Not linked' && 
                          game.userRiotAccount !== 'Linked (no name)' && game.userRiotAccount !== 'Linked' && (
                            <button 
                              className="copy-riot-btn"
                              onClick={() => handleCopyRiotAccount(game.userRiotAccount)}
                              title="Copy Riot ID"
                            >
                              Copy
                            </button>
                          )}
                        </div>
                        {game.userAboutMe && (
                          <div className="user-about-me-small" title={game.userAboutMe}>
                            {game.userAboutMe.length > 50 ? game.userAboutMe.substring(0, 50) + '...' : game.userAboutMe}
                          </div>
                        )}
                        
                        <div className="rank-info-container">
                          <div className="rank-info-item">
                            {soloRankIcon && (
                              <img 
                                src={soloRankIcon} 
                                alt={soloRankText} 
                                className="rank-icon-small"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            )}
                            <div className="rank-details">
                              <div className="rank-queue">Solo/Duo</div>
                              <div className="rank-tier">{soloRankText}</div>
                              <div className="rank-stats">
                                <span className="winrate">{soloWinRate}</span>
                                {soloGames > 0 && (
                                  <span className="games">{soloGames}G</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="rank-info-item">
                            {flexRankIcon && (
                              <img 
                                src={flexRankIcon} 
                                alt={flexRankText} 
                                className="rank-icon-small"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            )}
                            <div className="rank-details">
                              <div className="rank-queue">Flex</div>
                              <div className="rank-tier">{flexRankText}</div>
                              <div className="rank-stats">
                                <span className="winrate">{flexWinRate}</span>
                                {flexGames > 0 && (
                                  <span className="games">{flexGames}G</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="time-ago-compact">
                      {formatTimeAgo(game.createdAt)}
                    </div>
                  </div>

                  <div className="card-middle-section">
                    <div className="roles-grid-compact">
                      <div className="role-tag">
                        <img 
                          src={roleIcon} 
                          alt="My Role"
                          className="role-icon-small"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (game.role === 'support') {
                              e.target.src = '/lane-icons/sup icon.png';
                              e.target.style.display = 'block';
                            }
                          }}
                        />
                        <span>My Role: {roles.find(r => r.id === game.role)?.name}</span>
                      </div>
                      <div className="role-tag">
                        <img 
                          src={preferredRoleIcon} 
                          alt="Looking For"
                          className="role-icon-small"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (game.preferredDuoRole === 'support') {
                              e.target.src = '/lane-icons/sup icon.png';
                              e.target.style.display = 'block';
                            }
                          }}
                        />
                        <span>Looking For: {roles.find(r => r.id === game.preferredDuoRole)?.name}</span>
                      </div>
                      <div className="role-tag">
                        <span>{getQueueTypeName(game.queueType)}</span>
                      </div>
                      <div className="role-tag">
                        <span>{game.communication === 'voice' ? 'Voice' : 'Text'}</span>
                      </div>
                    </div>
                    <div className="description-compact">
                      {game.description}
                    </div>
                  </div>

                  <div className="card-right-section">
                    <div className="actions-container">
                      {isOwnGame ? (
                        <div className="owner-actions-compact">
                          <div className="action-row">
                            <button 
                              className="edit-btn-compact"
                              onClick={() => handleEditGame(game)}
                            >
                              Edit
                            </button>
                          </div>
                          <div className="action-row">
                            <button 
                              className="delete-btn-compact"
                              onClick={() => handleDeleteListing(game.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="actions-compact">
                          <div className="action-row">
                            <button 
                              className="join-btn-compact"
                              onClick={() => openJoinModal(game)}
                            >
                              Request to Join
                            </button>
                          </div>
                          <div className="action-row">
                            <button 
                              className="friend-btn-compact"
                              onClick={() => handleAddFriend(game.userId)}
                              disabled={isFriend}
                            >
                              {isFriend ? 'Friends' : 'Add Friend'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showJoinModal && (
        <div className="join-modal-overlay">
          <div className="join-modal-content">
            <div className="join-modal-header">
              <h3>Request to Join Game</h3>
              <button className="modal-close-btn" onClick={() => setShowJoinModal(false)}>
                ✕
              </button>
            </div>
            <div className="join-modal-body">
              {selectedGame && (
                <>
                  <p>You're requesting to join <strong>{selectedGame.userDisplayName}'s</strong> game:</p>
                  <div className="game-info-preview">
                    <div className="info-row">
                      <span>Queue:</span>
                      <span>{getQueueTypeName(selectedGame.queueType)}</span>
                    </div>
                    <div className="info-row">
                      <span>Host Role:</span>
                      <span>{roles.find(r => r.id === selectedGame.role)?.name}</span>
                    </div>
                    <div className="info-row">
                      <span>Looking For:</span>
                      <span>{roles.find(r => r.id === selectedGame.preferredDuoRole)?.name}</span>
                    </div>
                    <div className="info-row">
                      <span>Region:</span>
                      <span>{getRegionFromGame(selectedGame)}</span>
                    </div>
                  </div>
                </>
              )}
              
              <div className="message-input-container">
                <label htmlFor="joinMessage">Add a message (optional):</label>
                <textarea
                  id="joinMessage"
                  value={joinMessage}
                  onChange={(e) => setJoinMessage(e.target.value)}
                  placeholder="Tell the host why you want to join their game..."
                  maxLength={200}
                  rows={3}
                />
                <div className="char-counter">
                  {joinMessage.length}/200 characters
                </div>
              </div>
            </div>
            <div className="join-modal-footer">
              <button className="cancel-btn" onClick={() => setShowJoinModal(false)}>
                Cancel
              </button>
              <button 
                className="submit-btn"
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
        <div className="request-management-modal">
          <div className="request-modal-content">
            <div className="request-modal-header">
              <h3 className="request-modal-title">
                Manage Game Requests ({myGameRequests.length})
              </h3>
              <button className="request-modal-close" onClick={() => setShowRequestModal(false)}>
                ✕
              </button>
            </div>

            <div className="request-modal-body">
              {myGameRequests.length === 0 ? (
                <div className="no-requests">
                  <p>No pending requests</p>
                  <p style={{ fontSize: '14px', color: '#7f8c8d' }}>
                    Players who request to join your games will appear here
                  </p>
                </div>
              ) : (
                <div className="request-list">
                  {myGameRequests.map(request => (
                    <div key={request.id} className="request-item">
                      <div className="request-user-info">
                        <div className="request-user-avatar">
                          {request.profileImage && request.profileImage.startsWith('data:image') ? (
                            <img 
                              src={request.profileImage} 
                              alt={request.displayName}
                              onError={(e) => {
                                e.target.src = "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png";
                              }}
                            />
                          ) : (
                            <img 
                              src="https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"
                              alt={request.displayName}
                            />
                          )}
                        </div>
                        <div className="request-user-details">
                          <div className="request-user-name">
                            {request.displayName}
                            <span className="request-status-badge request-status-pending">
                              Pending
                            </span>
                          </div>
                          <div className="request-riot-account">
                            {request.riotAccount || 'No Riot account linked'}
                          </div>
                        </div>
                      </div>

                      <div className="request-game-info">
                        <div className="request-info-tag">
                          {getQueueTypeName(request.gameQueueType)}
                        </div>
                        <div className="request-info-tag">
                          {request.role || 'Fill role'}
                        </div>
                      </div>

                      <div className="request-applied-time">
                        Applied {formatTimeAgo(new Date(request.appliedAt))}
                      </div>

                      {request.message && (
                        <div className="request-message">
                          "{request.message}"
                        </div>
                      )}

                      <div className="request-actions">
                        <button 
                          className="request-profile-btn"
                          onClick={() => handleViewProfile(request.userId)}
                        >
                          View Profile
                        </button>
                        <button 
                          className="request-decline-btn"
                          onClick={() => handleDeclineRequest(request.gameId, request.userId, request.displayName)}
                        >
                          Decline
                        </button>
                        <button 
                          className="request-accept-btn"
                          onClick={() => handleAcceptRequest(request.gameId, request.userId, request.displayName)}
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="request-modal-footer">
              <button 
                onClick={() => setShowRequestModal(false)}
                style={{
                  background: 'rgba(52, 152, 219, 0.1)',
                  color: '#3498db',
                  border: '1px solid #3498db',
                  padding: '10px 30px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QueueSystem;