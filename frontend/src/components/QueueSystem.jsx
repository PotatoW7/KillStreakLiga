import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, getDoc, orderBy, deleteDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

function QueueSystem() {
  const [isPostingGame, setIsPostingGame] = useState(false);
  const [isEditingGame, setIsEditingGame] = useState(null);
  const [gameListings, setGameListings] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [userFriends, setUserFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [playerProfiles, setPlayerProfiles] = useState({});

  const [gameData, setGameData] = useState({
    role: 'any',
    queueType: 'ranked_solo_duo',
    communication: 'text',
    preferredDuoRole: 'any',
    description: '',
  });

  const roles = [
    { id: 'any', name: 'Any', icon: '🔄' },
    { id: 'top', name: 'Top', icon: '⚔️' },
    { id: 'jungle', name: 'Jungle', icon: '🌲' },
    { id: 'mid', name: 'Mid', icon: '✨' },
    { id: 'adc', name: 'ADC', icon: '🎯' },
    { id: 'support', name: 'Support', icon: '🛡️' }
  ];

  const queueTypes = [
    { id: 'ranked_solo_duo', name: 'Ranked Solo/Duo', icon: '🥇' },
    { id: 'ranked_flex', name: 'Ranked Flex', icon: '👥' },
    { id: 'normal_draft', name: 'Normal Draft', icon: '⚔️' },
    { id: 'aram', name: 'ARAM', icon: '🎲' },
    { id: 'swiftplay', name: 'Swiftplay', icon: '⚡' }
  ];

  const communicationTypes = [
    { id: 'text', name: 'Text Chat', icon: '💬' },
    { id: 'voice', name: 'Voice Chat', icon: '🎤' },
  ];

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
    if (!tier) return null;
    const tierLower = tier.toLowerCase();
    return `/rank-icons/Rank=${tierLower.charAt(0).toUpperCase() + tierLower.slice(1)}.png`;
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
        role: 'any',
        queueType: 'ranked_solo_duo',
        communication: 'text',
        preferredDuoRole: 'any',
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
        role: 'any',
        queueType: 'ranked_solo_duo',
        communication: 'text',
        preferredDuoRole: 'any',
        description: '',
      });
      
      setIsPostingGame(false);
      alert('Game posted successfully!');
      
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

  const handleJoinQueue = async (gameId) => {
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
        status: 'pending'
      };

      await updateDoc(gameRef, {
        applicants: arrayUnion(userData)
      });

      alert('Request to join sent! The host will review your request.');
    } catch (error) {
      console.error('Error joining queue:', error);
      alert('Error joining queue. Please try again.');
    }
  };

  const handleDeleteListing = async (gameId) => {
    if (!window.confirm('Are you sure you want to delete this game listing?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'gameListings', gameId));
      alert('Game listing deleted successfully!');
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
      role: 'any',
      queueType: 'ranked_solo_duo',
      communication: 'text',
      preferredDuoRole: 'any',
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

  if (loading) {
    return (
      <div className="queue-container">
        <div className="queue-loading">
          <div className="spinner">🌀</div>
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
        
        <button 
          className="post-game-btn"
          onClick={() => {
            setIsEditingGame(null);
            setIsPostingGame(!isPostingGame);
          }}
        >
          {isPostingGame ? '✖ Cancel' : '➕ Post a Game'}
        </button>
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
                {queueTypes.map(queue => (
                  <option key={queue.id} value={queue.id}>
                    {queue.icon} {queue.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group-compact">
            <label className="form-label-compact">My Role</label>
            <div className="role-grid-compact">
              {roles.map(role => (
                <button
                  key={role.id}
                  type="button"
                  className={`role-btn-compact ${gameData.role === role.id ? 'active' : ''}`}
                  onClick={() => handleInputChange({ target: { name: 'role', value: role.id } })}
                >
                  <span className="role-icon-compact">{role.icon}</span>
                  <span>{role.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group-compact">
            <label className="form-label-compact">Looking For Role</label>
            <div className="role-grid-compact">
              {roles.map(role => (
                <button
                  key={role.id}
                  type="button"
                  className={`role-btn-compact ${gameData.preferredDuoRole === role.id ? 'active' : ''}`}
                  onClick={() => handleInputChange({ target: { name: 'preferredDuoRole', value: role.id } })}
                >
                  <span className="role-icon-compact">{role.icon}</span>
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
                    <span>{comm.icon}</span>
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
        <h3 className="listings-title">Available Games ({gameListings.length})</h3>
        
        {gameListings.length === 0 ? (
          <div className="no-listings">
            <p>No games posted yet. Be the first to post!</p>
          </div>
        ) : (
          <div className="game-cards-grid">
            {gameListings.map(game => {
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
                        <div className="user-name-small">{game.userDisplayName}</div>
                        <div className="riot-account-with-copy">
                          <span className="riot-account-small">{game.userRiotAccount}</span>
                          {game.userRiotAccount && game.userRiotAccount !== 'Not linked' && 
                          game.userRiotAccount !== 'Linked (no name)' && game.userRiotAccount !== 'Linked' && (
                            <button 
                              className="copy-riot-btn"
                              onClick={() => handleCopyRiotAccount(game.userRiotAccount)}
                              title="Copy Riot ID"
                            >
                              📋
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
                      <span>⏰</span>
                      {formatTimeAgo(game.createdAt)}
                    </div>
                  </div>

                  <div className="card-middle-section">
                    <div className="roles-grid-compact">
                      <div className="role-tag">
                        <span className="icon">{roles.find(r => r.id === game.role)?.icon}</span>
                        <span>My Role: {roles.find(r => r.id === game.role)?.name}</span>
                      </div>
                      <div className="role-tag">
                        <span className="icon">{roles.find(r => r.id === game.preferredDuoRole)?.icon}</span>
                        <span>Looking For: {roles.find(r => r.id === game.preferredDuoRole)?.name}</span>
                      </div>
                      <div className="role-tag">
                        <span className="icon">{queueTypes.find(q => q.id === game.queueType)?.icon}</span>
                        <span>{queueTypes.find(q => q.id === game.queueType)?.name}</span>
                      </div>
                      <div className="role-tag">
                        <span className="icon">{game.communication === 'voice' ? '🎤' : '💬'}</span>
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
                              ✏️ Edit
                            </button>
                          </div>
                          <div className="action-row">
                            <button 
                              className="delete-btn-compact"
                              onClick={() => handleDeleteListing(game.id)}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="actions-compact">
                          <div className="action-row">
                            <button 
                              className="join-btn-compact"
                              onClick={() => handleJoinQueue(game.id)}
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
                              {isFriend ? '✓ Friends' : '+ Add Friend'}
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
    </div>
  );
}

export default QueueSystem;