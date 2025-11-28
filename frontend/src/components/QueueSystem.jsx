import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { 
  collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDocs, orderBy, getDoc 
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const QueueSystem = () => {
  const [inQueue, setInQueue] = useState(false);
  const [queueTime, setQueueTime] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [currentUserInQueue, setCurrentUserInQueue] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [loading, setLoading] = useState(true);
  const [queueStats, setQueueStats] = useState(null);
  const [queuePreferences, setQueuePreferences] = useState({
    queueType: 'solo_duo',
    partySize: 2,
    preferredRoles: [],
    communicationPrefs: { voice: false, text: true }
  });
  const [friendRequestsSent, setFriendRequestsSent] = useState(new Set());
  const [playerProfiles, setPlayerProfiles] = useState({});
  const [friendsList, setFriendsList] = useState(new Set()); 
  const navigate = useNavigate();

  const GAME_MODES = {
    solo_duo: {
      name: 'Ranked Solo/Duo',
      maxPlayers: 2,
      minPlayers: 2,
      description: 'Competitive ranked play for solo players or duos',
      ranked: true,
      map: "Summoner's Rift",
      validSizes: [2]
    },
    ranked_flex: {
      name: 'Ranked Flex',
      maxPlayers: 5,
      minPlayers: 1,
      description: 'Ranked play with flexible team sizes',
      ranked: true,
      map: "Summoner's Rift",
      validSizes: [1, 2, 3, 5]
    },
    draft: {
      name: 'Normal Draft',
      maxPlayers: 5,
      minPlayers: 1,
      description: 'Casual draft mode with team coordination',
      ranked: false,
      map: "Summoner's Rift",
      validSizes: [1, 2, 3, 4, 5]
    },
    swiftplay: {
      name: 'Swiftplay',
      maxPlayers: 5,
      minPlayers: 1,
      description: 'Shorter matches for quick games',
      ranked: false,
      map: "Summoner's Rift",
      validSizes: [1, 2, 3, 4, 5]
    },
    aram: {
      name: 'ARAM',
      maxPlayers: 5,
      minPlayers: 1,
      description: 'All Random All Mid - Fast-paced fun',
      ranked: false,
      map: "Howling Abyss",
      validSizes: [1, 2, 3, 4, 5]
    }
  };

  const ROLES = ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      loadUserProfile(user.uid);
      checkQueueStatus(user.uid);
      loadFriendsList(); 
      
      const interval = setInterval(() => {
        if (user.uid) {
          checkQueueStatus(user.uid);
          fetchAvailablePlayers();
          fetchQueueStats();
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    let interval;
    if (inQueue) {
      interval = setInterval(() => {
        setQueueTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [inQueue, queueTime]);

  const loadUserProfile = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const profile = userDoc.data();
        setUserProfile(profile);
        
        if (profile.queuePreferences) {
          const validQueueType = GAME_MODES[profile.queuePreferences.queueType] 
            ? profile.queuePreferences.queueType 
            : 'solo_duo';
          
          const preferredRoles = Array.isArray(profile.queuePreferences.preferredRoles) 
            ? profile.queuePreferences.preferredRoles 
            : [];
          
          setQueuePreferences({
            ...profile.queuePreferences,
            queueType: validQueueType,
            preferredRoles: preferredRoles,
            partySize: validQueueType === 'solo_duo' ? 2 : (profile.queuePreferences.partySize || 1)
          });
        }
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFriendsList = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const friends = userData.friends || [];
        const friendIds = new Set(friends.map(friend => friend.id));
        setFriendsList(friendIds);
      }
    } catch (error) {
      console.error('Error loading friends list:', error);
    }
  };

  const fetchUserProfile = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setPlayerProfiles(prev => ({
          ...prev,
          [userId]: {
            profileImage: userData.profileImage,
            username: userData.username
          }
        }));
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const saveQueuePreferences = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await updateDoc(doc(db, "users", user.uid), {
        queuePreferences: queuePreferences
      });
    } catch (error) {
      console.error("Error saving queue preferences:", error);
    }
  };

  const checkQueueStatus = async (userId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/queue/status/${userId}`);
      const data = await response.json();
      
      setInQueue(data.inQueue);
      setQueuePosition(data.queuePosition);
      setQueueStats(data.queueStats);
      
      if (data.inQueue && userProfile && auth.currentUser?.uid === userId) {
        setCurrentUserInQueue(prev => {
          const existingData = prev || {
            userId: userId,
            playerName: userProfile.username || auth.currentUser.displayName || 'You',
            riotAccount: userProfile.riotAccount,
            region: userProfile.riotAccount?.region || 'na1',
            preferredRoles: getSafePreferredRoles(),
            queueType: queuePreferences.queueType,
            partySize: queuePreferences.partySize,
            rank: userProfile.rank,
            communicationPrefs: queuePreferences.communicationPrefs,
            waitTime: queueTime,
            queuePosition: data.queuePosition
          };
          
          return {
            ...existingData,
            queuePosition: data.queuePosition
          };
        });
      } else if (!data.inQueue && auth.currentUser?.uid === userId) {
        setCurrentUserInQueue(null);
      }
      
      setCurrentMatch(null);
      if (data.currentMatch) {
        console.log('Unexpected match found, ignoring...');
        setCurrentMatch(null);
      }
    } catch (error) {
      console.error('Error checking queue status:', error);
    }
  };

  const fetchAvailablePlayers = async () => {
    try {
      const currentUserId = auth.currentUser?.uid;
      const response = await fetch(`http://localhost:3000/api/queue/players?excludeUserId=${currentUserId}`);
      const data = await response.json();
      
      const playersWithIds = (data.players || []).map(player => ({
        ...player,
        userId: player.userId,
        riotAccount: player.riotAccount || {
          gameName: player.playerName || 'Unknown',
          tagLine: player.tagLine || '0000'
        }
      }));
      
      setAvailablePlayers(playersWithIds);
      
      playersWithIds.forEach(player => {
        if (player.userId && !playerProfiles[player.userId]) {
          fetchUserProfile(player.userId);
        }
      });
    } catch (error) {
      console.error('Error fetching available players:', error);
      setAvailablePlayers([]);
    }
  };

  const fetchQueueStats = async () => {
    try {
      const region = userProfile?.riotAccount?.region || 'na1';
      const response = await fetch(`http://localhost:3000/api/queue/analytics?region=${region}`);
      if (response.ok) {
        const data = await response.json();
        setQueueStats(data);
      }
    } catch (error) {
      console.error('Error fetching queue stats:', error);
    }
  };

  const findUserByRiotId = async (riotId) => {
    try {
      if (!riotId || riotId === 'No Riot ID') return null;
      
      const [gameName, tagLine] = riotId.split('#');
      if (!gameName || !tagLine) return null;

      const usersRef = collection(db, "users");
      const q = query(
        usersRef,
        where("riotAccount.gameName", "==", gameName),
        where("riotAccount.tagLine", "==", tagLine)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].id;
      }
      
      return null;
    } catch (error) {
      console.error('Error finding user by Riot ID:', error);
      return null;
    }
  };

  const findUserByDisplayName = async (displayName) => {
    try {
      if (!displayName) return null;

      const usersRef = collection(db, "users");
      const q = query(
        usersRef,
        where("username", ">=", displayName),
        where("username", "<=", displayName + '\uf8ff')
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].id;
      }
      
      return null;
    } catch (error) {
      console.error('Error finding user by display name:', error);
      return null;
    }
  };

  const isAlreadyFriend = async (player) => {
    try {
      const user = auth.currentUser;
      if (!user) return false;

      const targetUsername = getPlayerName(player);
      const playerRiotId = getRiotId(player);
      
      let targetUserId = player.userId;

      if (!targetUserId || targetUserId.startsWith('temp_')) {
        targetUserId = await findUserByRiotId(playerRiotId);
      }

      if (!targetUserId) {
        targetUserId = await findUserByDisplayName(targetUsername);
      }

      if (!targetUserId) return false;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      return (userData.friends || []).some(friend => friend.id === targetUserId);
    } catch (error) {
      console.error('Error checking friend status:', error);
      return false;
    }
  };

  const sendFriendRequest = async (player) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const targetUsername = getPlayerName(player);
      const playerRiotId = getRiotId(player);
      
      let targetUserId = player.userId;

      if (!targetUserId || targetUserId.startsWith('temp_')) {
        targetUserId = await findUserByRiotId(playerRiotId);
      }

      if (!targetUserId) {
        targetUserId = await findUserByDisplayName(targetUsername);
      }

      if (!targetUserId) {
        alert(`Could not find user "${targetUsername}" in the system. They may need to link their Riot account in their profile.`);
        return;
      }

      if (targetUserId === user.uid) {
        alert("You cannot send a friend request to yourself!");
        return;
      }

      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      const isAlreadyFriend = (userData.friends || []).some(friend => friend.id === targetUserId);
      
      if (isAlreadyFriend) {
        alert(`You are already friends with ${targetUsername}!`);
        return;
      }

      const targetUserDoc = await getDoc(doc(db, "users", targetUserId));
      if (!targetUserDoc.exists()) {
        alert(`User ${targetUsername} not found in the system.`);
        return;
      }

      const targetUserData = targetUserDoc.data();
      const hasPendingRequest = (targetUserData.pendingRequests || []).some(
        req => req.from === user.uid
      );

      if (hasPendingRequest) {
        alert(`Friend request already sent to ${targetUsername}!`);
        return;
      }

      const targetUserRef = doc(db, "users", targetUserId);
      await updateDoc(targetUserRef, {
        pendingRequests: arrayUnion({
          from: user.uid,
          fromUsername: user.displayName || 'Anonymous',
          timestamp: new Date()
        })
      });

      setFriendRequestsSent(prev => new Set([...prev, targetUserId]));
      alert(`Friend request sent to ${targetUsername}!`);
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Error sending friend request: ' + error.message);
    }
  };

  const joinQueue = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (!userProfile?.riotAccount?.gameName) {
      alert("Please link your Riot account in your profile before joining the queue!");
      return;
    }

    const modeConfig = GAME_MODES[queuePreferences.queueType];
    if (!modeConfig) {
      alert("Invalid game mode selected");
      return;
    }

    if (!modeConfig.validSizes.includes(queuePreferences.partySize)) {
      alert(`For ${modeConfig.name}, valid party sizes are: ${modeConfig.validSizes.join(', ')}`);
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/queue/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          playerName: user.displayName || 'Anonymous',
          riotAccount: userProfile.riotAccount,
          region: userProfile.riotAccount?.region || 'na1',
          queueType: queuePreferences.queueType,
          partySize: queuePreferences.partySize,
          preferredRoles: getSafePreferredRoles(),
          rank: userProfile.rank || null,
          communicationPrefs: queuePreferences.communicationPrefs
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setInQueue(true);
        setQueueTime(0);
        setCurrentMatch(null);
        saveQueuePreferences();
        fetchAvailablePlayers();
        
        setCurrentUserInQueue({
          userId: user.uid,
          playerName: userProfile.username || user.displayName || 'You',
          riotAccount: userProfile.riotAccount,
          region: userProfile.riotAccount?.region || 'na1',
          preferredRoles: getSafePreferredRoles(),
          queueType: queuePreferences.queueType,
          partySize: queuePreferences.partySize,
          rank: userProfile.rank,
          communicationPrefs: queuePreferences.communicationPrefs,
          waitTime: 0,
          queuePosition: data.position
        });
      } else {
        alert(data.error || 'Failed to join queue');
      }
    } catch (error) {
      console.error('Error joining queue:', error);
      alert('Failed to join queue');
    }
  };

  const leaveQueue = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await fetch('http://localhost:3000/api/queue/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid
        })
      });

      setInQueue(false);
      setQueueTime(0);
      setQueuePosition(0);
      setCurrentMatch(null);
      setCurrentUserInQueue(null);
      fetchAvailablePlayers();
    } catch (error) {
      console.error('Error leaving queue:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRankIcon = (rank) => {
    if (!rank?.tier) return '/rank-icons/Rank=Unranked.png';
    const tier = rank.tier.charAt(0).toUpperCase() + rank.tier.slice(1).toLowerCase();
    return `/rank-icons/Rank=${tier}.png`;
  };

  const handlePlayerClick = (playerRiotId) => {
    navigate('/summoner');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('searchPlayer', { 
        detail: { riotId: playerRiotId, region: userProfile?.riotAccount?.region || 'euw1' }
      }));
    }, 100);
  };

  const getValidPartySizes = (queueType) => {
    const mode = GAME_MODES[queueType];
    if (!mode) return [1];
    return mode.validSizes;
  };

  const getSafePreferredRoles = () => {
    return Array.isArray(queuePreferences.preferredRoles) ? queuePreferences.preferredRoles : [];
  };

  const toggleRole = (role) => {
    setQueuePreferences(prev => {
      const currentRoles = getSafePreferredRoles();
      const roleIndex = currentRoles.indexOf(role);
      
      if (roleIndex > -1) {
        currentRoles.splice(roleIndex, 1);
      } else {
        currentRoles.push(role);
      }
      
      return {
        ...prev,
        preferredRoles: currentRoles
      };
    });
  };

  const getPlayerRoles = (player) => {
    return Array.isArray(player?.preferredRoles) ? player.preferredRoles : [];
  };

  const getPlayerName = (player) => {
    return player?.playerName || 'Unknown Player';
  };

  const getRiotId = (player) => {
    if (!player?.riotAccount) return 'No Riot ID';
    const gameName = player.riotAccount.gameName || 'Unknown';
    const tagLine = player.riotAccount.tagLine || '0000';
    return `${gameName}#${tagLine}`;
  };

  const getGameModeName = (queueType) => {
    return GAME_MODES[queueType]?.name || queueType || 'Unknown Mode';
  };

  const hasSentFriendRequest = (player) => {
    return friendRequestsSent.has(player.userId);
  };

  const getPlayerProfileImage = (player) => {
    if (player.userId && playerProfiles[player.userId]?.profileImage) {
      return playerProfiles[player.userId].profileImage;
    }
    return "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png";
  };

  if (loading) {
    return (
      <div className="queue-container">
        <div className="queue-loading">
          <div className="spinner">⚔️</div>
          <p>Loading queue system...</p>
        </div>
      </div>
    );
  }

  const currentMode = GAME_MODES[queuePreferences.queueType];
  const safePreferredRoles = getSafePreferredRoles();

  return (
    <div className="queue-container">
      <div className="queue-header">
        <div className="header-icon">🎮</div>
        <h1>League of Legends Queue</h1>
        <p>Find your perfect teammates and dominate the Rift</p>
      </div>
      
      {!userProfile?.riotAccount?.gameName ? (
        <div className="queue-warning">
          <div className="warning-icon">⚠️</div>
          <p>You need to link your Riot account in your profile before queuing!</p>
          <button 
            onClick={() => navigate('/profile')}
            className="link-profile-btn"
          >
            Go to Profile
          </button>
        </div>
      ) : (
        <>
          <div className="queue-content">
            <div className="preferences-section">
              <div className="section-card">
                <h3>Queue Settings</h3>
                
                <div className="preference-group">
                  <label>Game Mode</label>
                  <div className="modes-grid">
                    {Object.entries(GAME_MODES).map(([key, mode]) => (
                      <button
                        key={key}
                        className={`mode-btn ${queuePreferences.queueType === key ? 'active' : ''}`}
                        onClick={() => {
                          const defaultPartySize = key === 'solo_duo' ? 2 : 1;
                          setQueuePreferences(prev => ({ 
                            ...prev, 
                            queueType: key,
                            partySize: defaultPartySize
                          }));
                        }}
                      >
                        <div className="mode-icon">
                          {mode.ranked ? '🏆' : '🎯'}
                        </div>
                        <div className="mode-info">
                          <div className="mode-name">{mode.name}</div>
                          <div className="mode-desc">{mode.description}</div>
                          <div className="mode-map">🗺️ {mode.map}</div>
                          <div className="mode-players">
                            {mode.validSizes.join(', ')} players
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="preference-group">
                  <label>Party Size</label>
                  <div className="party-size-selector">
                    {getValidPartySizes(queuePreferences.queueType).map(size => (
                      <button
                        key={size}
                        className={`party-size-btn ${queuePreferences.partySize === size ? 'active' : ''}`}
                        onClick={() => setQueuePreferences(prev => ({ ...prev, partySize: size }))}
                      >
                        {size} {size === 1 ? 'Player' : 'Players'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="preference-group">
                  <label>Preferred Roles</label>
                  <div className="roles-grid">
                    {ROLES.map(role => (
                      <button
                        key={role}
                        className={`role-btn ${safePreferredRoles.includes(role) ? 'active' : ''}`}
                        onClick={() => toggleRole(role)}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="preference-group">
                  <label>Communication</label>
                  <div className="communication-options">
                    <label className="comm-option">
                      <input
                        type="checkbox"
                        checked={queuePreferences.communicationPrefs.text}
                        onChange={(e) => setQueuePreferences(prev => ({
                          ...prev,
                          communicationPrefs: { ...prev.communicationPrefs, text: e.target.checked }
                        }))}
                      />
                      <span className="comm-icon">💬</span>
                      <span className="comm-label">Text Chat</span>
                    </label>
                    <label className="comm-option">
                      <input
                        type="checkbox"
                        checked={queuePreferences.communicationPrefs.voice}
                        onChange={(e) => setQueuePreferences(prev => ({
                          ...prev,
                          communicationPrefs: { ...prev.communicationPrefs, voice: e.target.checked }
                        }))}
                      />
                      <span className="comm-icon">🎤</span>
                      <span className="comm-label">Voice Chat</span>
                    </label>
                  </div>
                </div>

                {userProfile?.rank && (
                  <div className="preference-group">
                    <label>Your Rank</label>
                    <div className="user-rank-display">
                      <img 
                        src={getRankIcon(userProfile.rank)} 
                        alt={userProfile.rank.tier}
                        className="rank-icon-large"
                      />
                      <div className="rank-info">
                        <div className="rank-tier">{userProfile.rank.tier} {userProfile.rank.rank}</div>
                        <div className="rank-lp">{userProfile.rank.leaguePoints} LP</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="queue-section">
              {!inQueue ? (
                <div className="queue-start">
                  <div className="start-icon">⚔️</div>
                  <h3>Ready to Queue?</h3>
                  <div className="queue-summary">
                    <div className="summary-item">
                      <span className="label">Mode:</span>
                      <span className="value">{currentMode?.name}</span>
                    </div>
                    <div className="summary-item">
                      <span className="label">Map:</span>
                      <span className="value">{currentMode?.map}</span>
                    </div>
                    <div className="summary-item">
                      <span className="label">Party:</span>
                      <span className="value">{queuePreferences.partySize} {queuePreferences.partySize === 1 ? 'player' : 'players'}</span>
                    </div>
                    <div className="summary-item">
                      <span className="label">Preferred Roles:</span>
                      <span className="value">
                        {safePreferredRoles.length > 0 
                          ? safePreferredRoles.join(', ')
                          : 'Any role'
                        }
                      </span>
                    </div>
                  </div>
                  <button onClick={joinQueue} className="join-btn">
                    Find Teammates for {currentMode?.name}
                  </button>
                </div>
              ) : (
                <div className="queue-active">
                  <div className="searching-header">
                    <div className="search-icon">🔍</div>
                    <h3>Finding Teammates...</h3>
                    <div className="queue-type-badge">
                      {currentMode?.name}
                    </div>
                  </div>
                  
                  {currentUserInQueue && (
                    <div className="current-user-queue-status">
                      <div className="current-user-header">
                        <h4>Your Queue Status</h4>
                        <span className="queue-position">Position: #{currentUserInQueue.queuePosition}</span>
                      </div>
                      <div className="current-user-details">
                       <div className="current-user-avatar">
                        <img
                          src={userProfile?.profileImage|| "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"}
                          alt="Your Profile" 
                          className="current-user-profile-image"
                          onError={(e) => {
                            e.target.src = "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"}}
                            />
                            </div>
                        <div className="current-user-info">
                          <span className="user-name">{currentUserInQueue.playerName}</span>
                             <span className="queue-mode">{getGameModeName(currentUserInQueue.queueType)}</span>
                          <span className="user-roles">{getPlayerRoles(currentUserInQueue).join(', ') || 'Any role'}</span>
                          <span className="user-party">Party size: {currentUserInQueue.partySize}</span>
                        </div>
                        <div className="current-user-stats">
                        </div>
                      </div>
                    </div>
                   
                  )}
              
                  <div className="queue-info">
                    <div className="info-item">
                      <span className="label">Time in Queue</span>
                      <span className="value">{formatTime(queueTime)}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Available Teammates</span>
                      <span className="value">{availablePlayers.length}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Your Region</span>
                      <span className="value">{userProfile?.riotAccount?.region || 'Unknown'}</span>
                    </div>
                  </div>

                  <button onClick={leaveQueue} className="leave-btn">
                    Cancel Search
                  </button>

                  {availablePlayers.length > 0 && (
                    <div className="available-players">
                      <h4>Available Teammates ({availablePlayers.length})</h4>
                      <div className="players-grid">
                        {availablePlayers.map((player, index) => (
                          <div key={index} className="player-card">
                            <div className="player-header">
                              <div className="player-avatar">
                                <img
                                  src={getPlayerProfileImage(player)}
                                  alt={getPlayerName(player)}
                                  className="player-profile-image"
                                  onError={(e) => {
                                    e.target.src = "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png";
                                  }}
                                />
                              </div>
                              <div className="player-main">
                                <strong 
                                  className="clickable-player"
                                  onClick={() => handlePlayerClick(getRiotId(player))}
                                >
                                  {getPlayerName(player)}
                                </strong>
                                <span className="riot-id">{getRiotId(player)}</span>
                              </div>
                              <span className="queue-time">
                                {formatTime(player.waitTime || 0)}
                              </span>
                            </div>
                            <div className="player-details">
                              <span className="queue-type-badge">
                                {getGameModeName(player.queueType)}
                              </span>
                              <span className="player-roles">{getPlayerRoles(player).join(', ') || 'Any role'}</span>
                              <span className="player-party">Party: {player.partySize || 1}</span>
                            </div>
                            <div className="player-actions">
                              <div className="player-comm">
                                {player.communicationPrefs?.voice && <span className="comm-indicator">🎤</span>}
                                {player.communicationPrefs?.text && <span className="comm-indicator">💬</span>}
                              </div>
                              <button 
                                className={`add-friend-btn ${
                                  hasSentFriendRequest(player) ? 'sent' : 
                                  friendsList.has(player.userId) ? 'already-friends' : ''
                                }`}
                                onClick={() => sendFriendRequest(player)}
                                disabled={hasSentFriendRequest(player) || friendsList.has(player.userId)}
                                title={
                                  friendsList.has(player.userId) ? 'Already Friends' :
                                  hasSentFriendRequest(player) ? 'Request Sent' : 
                                  `Send friend request to ${getPlayerName(player)}`
                                }
                              >
                                {friendsList.has(player.userId) ? 'Already Friends' :
                                 hasSentFriendRequest(player) ? 'Request Sent' : 'Add Friend'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {availablePlayers.length > 0 && !inQueue && (
            <div className="available-players">
              <h4>Players Looking for Teammates ({availablePlayers.length})</h4>
              <div className="players-grid">
                {availablePlayers.map((player, index) => (
                  <div key={index} className="player-card">
                    <div className="player-header">
                      <div className="player-avatar">
                        <img
                          src={getPlayerProfileImage(player)}
                          alt={getPlayerName(player)}
                          className="player-profile-image"
                          onError={(e) => {
                            e.target.src = "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png";
                          }}
                        />
                      </div>
                      <div className="player-main">
                        <strong 
                          className="clickable-player"
                          onClick={() => handlePlayerClick(getRiotId(player))}
                        >
                          {getPlayerName(player)}
                        </strong>
                        <span className="riot-id">{getRiotId(player)}</span>
                      </div>
                      <span className="queue-time">
                        {formatTime(player.waitTime || 0)}
                      </span>
                    </div>
                    <div className="player-details">
                      <span className="queue-type-badge">
                        {getGameModeName(player.queueType)}
                      </span>
                      <span className="player-roles">{getPlayerRoles(player).join(', ') || 'Any role'}</span>
                      <span className="player-party">Party: {player.partySize || 1}</span>
                    </div>
                    <div className="player-actions">
                      <div className="player-comm">
                        {player.communicationPrefs?.voice && <span className="comm-indicator">🎤</span>}
                        {player.communicationPrefs?.text && <span className="comm-indicator">💬</span>}
                      </div>
                      <button 
                        className={`add-friend-btn ${
                          hasSentFriendRequest(player) ? 'sent' : 
                          friendsList.has(player.userId) ? 'already-friends' : ''
                        }`}
                        onClick={() => sendFriendRequest(player)}
                        disabled={hasSentFriendRequest(player) || friendsList.has(player.userId)}
                        title={
                          friendsList.has(player.userId) ? 'Already Friends' :
                          hasSentFriendRequest(player) ? 'Request Sent' : 
                          `Send friend request to ${getPlayerName(player)}`
                        }
                      >
                        {friendsList.has(player.userId) ? 'Already Friends' :
                         hasSentFriendRequest(player) ? 'Request Sent' : 'Add Friend'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {queueStats && !inQueue && (
            <div className="stats-section">
              <h4>Queue Statistics</h4>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{availablePlayers.length}</div>
                  <div className="stat-label">Players Looking for Teammates</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{formatTime(queueStats.averageWaitTime)}</div>
                  <div className="stat-label">Avg Wait Time</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">
                    {queueStats.modePreferences ? Object.keys(queueStats.modePreferences).length : 0}
                  </div>
                  <div className="stat-label">Active Game Modes</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default QueueSystem;