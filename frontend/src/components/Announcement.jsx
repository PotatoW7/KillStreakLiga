import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { db, auth } from "../firebase";
import {
  collection, query, where, onSnapshot, doc, updateDoc,
  arrayUnion, getDoc, serverTimestamp
} from "firebase/firestore";
import "../styles/componentsCSS/announcement.css";

function Announcement({ notificationCount, setNotificationCount, isEmbedded = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [gameRequests, setGameRequests] = useState([]);
  const [showManageModal, setShowManageModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef(null);
  const bellRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target) &&
        bellRef.current &&
        !bellRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'gameListings'),
      where('userId', '==', auth.currentUser.uid),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allRequests = [];
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

        allRequests.push(...pendingRequests);
      });

      setGameRequests(allRequests);
      setNotificationCount(allRequests.length);
      setLoading(false);
    }, (error) => {
      console.error("Error listening for requests:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setNotificationCount]);

  const togglePanel = () => {
    setIsOpen(!isOpen);
  };

  const handleManageRequests = () => {
    setShowManageModal(true);
    setIsOpen(false);
  };

  const handleCloseModal = () => {
    setShowManageModal(false);
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
      setGameRequests(prev => prev.filter(req =>
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

      setGameRequests(prev => prev.filter(req =>
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

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const roles = [
    { id: 'fill', name: 'Fill', icon: '/lane-icons/Fill icon.png' },
    { id: 'top', name: 'Top', icon: '/lane-icons/top lane.png' },
    { id: 'jungle', name: 'Jungle', icon: '/lane-icons/jg icon.png' },
    { id: 'mid', name: 'Mid', icon: '/lane-icons/mid lane.png' },
    { id: 'adc', name: 'ADC', icon: '/lane-icons/adc lane.png' },
    { id: 'support', name: 'Support', icon: '/lane-icons/sup icon.png' }
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

  const getQueueData = (rankedData, queueType) => {
    if (!rankedData || !Array.isArray(rankedData)) return null;
    return rankedData.find(queue => {
      if (!queue.queueType) return false;
      if (queue.queueType === queueType) return true;
      if (queueType === 'RANKED_SOLO_5x5') {
        return queue.queueType.includes('SOLO') || queue.queueType.includes('Solo') || queue.queueType === 'RANKED_SOLO/DUO';
      }
      if (queueType === 'RANKED_FLEX_SR') {
        return queue.queueType.includes('FLEX') || queue.queueType.includes('Flex');
      }
      return false;
    });
  };

  const getRankIcon = (tier) => {
    if (!tier) return '/rank-icons/Rank=Unranked.png';
    const tierUpper = tier.toUpperCase();
    const fileName = rankIconsMap[tierUpper];
    return fileName ? `/rank-icons/${fileName}` : '/rank-icons/Rank=Unranked.png';
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

  const getQueueTypeName = (queueType) => {
    const queueTypes = {
      'ranked_solo_duo': 'Ranked Solo/Duo',
      'ranked_flex': 'Ranked Flex',
      'normal_draft': 'Normal Draft',
      'aram': 'ARAM',
      'swiftplay': 'Swiftplay'
    };
    return queueTypes[queueType] || queueType;
  };

  const getRoleIcon = (role) => {
    const roleIcons = {
      'top': '/lane-icons/top lane.png',
      'jungle': '/lane-icons/jg icon.png',
      'mid': '/lane-icons/mid lane.png',
      'adc': '/lane-icons/adc lane.png',
      'support': '/lane-icons/sup icon.png',
      'fill': '/lane-icons/Fill icon.png'
    };
    return roleIcons[role?.toLowerCase()] || '/lane-icons/Fill icon.png';
  };

  const getRoleImage = (role) => {
    const roleObj = roles.find(r => r.id === role?.toLowerCase());
    return roleObj ? roleObj.icon : '/lane-icons/Fill icon.png';
  };


  if (isEmbedded) {
    return (
      <>
        <div className="embedded-notification-content">
          <div className="notification-panel-body">
            {loading ? (
              <div className="notification-loading">
                <div className="loading-spinner"></div>
                <p>Loading requests...</p>
              </div>
            ) : gameRequests.length === 0 ? (
              <div className="notification-empty">
                <div className="empty-icon">📭</div>
                <p>No pending requests</p>
                <span>Players who request to join your games will appear here</span>
              </div>
            ) : (
              <div className="notification-list">
                {gameRequests.map(request => (
                  <div key={request.id} className="notification-item">
                    <div className="notification-item-content">
                      <div className="notification-item-badge">NEW</div>
                      <div className="notification-item-user">
                        <strong>{request.displayName}</strong> wants to join
                      </div>
                      <div className="notification-item-details">
                        <span className="notification-queue-type">
                          {getQueueTypeName(request.gameQueueType)}
                        </span>
                        <span className="notification-time">
                          {formatTimeAgo(request.appliedAt)}
                        </span>
                      </div>
                      {request.gameDescription && (
                        <div className="notification-item-preview">
                          "{request.gameDescription.substring(0, 50)}..."
                        </div>
                      )}

                      <div className="notification-item-actions">
                        <button
                          className="notification-accept-btn"
                          onClick={() => handleAcceptRequest(request.gameId, request.userId, request.displayName)}
                        >
                          ✅ Accept
                        </button>
                        <button
                          className="notification-decline-btn"
                          onClick={() => handleDeclineRequest(request.gameId, request.userId, request.displayName)}
                        >
                          ❌ Decline
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {gameRequests.length > 0 && (
            <div className="notification-panel-footer">
              <button onClick={handleManageRequests} className="notification-manage-all-btn">
                Manage All Requests →
              </button>
            </div>
          )}
        </div>
        {showManageModal && ReactDOM.createPortal(
          <div className="request-management-modal">
            <div className="request-modal-content">
              <div className="request-modal-header">
                <h3 className="request-modal-title">
                  Manage Game Requests ({gameRequests.length})
                </h3>
                <button className="request-modal-close" onClick={handleCloseModal}>
                  ✕
                </button>
              </div>

              <div className="request-modal-body">
                {gameRequests.length === 0 ? (
                  <div className="no-requests">
                    <div className="no-requests-icon">📭</div>
                    <p>No pending requests</p>
                    <p style={{ fontSize: '14px', color: '#7f8c8d' }}>
                      Players who request to join your games will appear here
                    </p>
                  </div>
                ) : (
                  <div className="request-list">
                    {gameRequests.map(request => {
                      const soloQueue = getQueueData(request.rankedData, 'RANKED_SOLO_5x5');
                      const rankText = soloQueue ? formatRankDisplay(soloQueue) : 'Unranked';
                      const rankIcon = getRankIcon(soloQueue?.tier);

                      return (
                        <div key={request.id} className="request-card-new">
                          <div className="request-card-top">
                            <div className="request-profile-section">
                              <div className="request-avatar-wrapper">
                                {request.profileImage && request.profileImage.startsWith('data:image') ? (
                                  <img
                                    src={request.profileImage}
                                    alt={request.displayName}
                                    className="request-avatar"
                                    onError={(e) => {
                                      e.target.src = "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png";
                                    }}
                                  />
                                ) : (
                                  <img
                                    src="https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"
                                    alt={request.displayName}
                                    className="request-avatar"
                                  />
                                )}
                              </div>
                              <div className="request-user-info-main">
                                <div className="name-status-row">
                                  <span className="request-name-text">{request.displayName}</span>
                                  <span className="request-badge">Pending</span>
                                </div>
                                <div className="request-riot-id">
                                  {request.riotAccount || 'No Riot account linked'}
                                </div>
                                <div className="request-rank-display">
                                  <img
                                    src={rankIcon}
                                    alt={rankText}
                                    className="req-rank-icon"
                                    onError={(e) => e.target.style.display = 'none'}
                                  />
                                  <span className="req-rank-text">{rankText}</span>
                                </div>
                              </div>
                            </div>

                            <div className="request-details-section">
                              <div className="request-tags-group">
                                <span className="req-tag queue-tag">
                                  {getQueueTypeName(request.gameQueueType)}
                                </span>
                                <span className="req-tag role-tag-new">
                                  <img
                                    src={getRoleImage(request.role || 'fill')}
                                    alt={request.role || 'fill'}
                                    className="tag-icon"
                                    onError={(e) => e.target.style.display = 'none'}
                                  />
                                  {roles.find(r => r.id === (request.role?.toLowerCase() || 'fill'))?.name || 'Fill'}
                                </span>
                              </div>
                              <div className="request-time-text">
                                Applied {formatTimeAgo(request.appliedAt)}
                              </div>
                            </div>

                            <div className="request-actions-section">
                              <button
                                className="btn-view-profile"
                                onClick={() => handleViewProfile(request.userId)}
                              >
                                View Profile
                              </button>
                              <button
                                className="btn-decline"
                                onClick={() => handleDeclineRequest(request.gameId, request.userId, request.displayName)}
                              >
                                Decline
                              </button>
                              <button
                                className="btn-accept"
                                onClick={() => handleAcceptRequest(request.gameId, request.userId, request.displayName)}
                              >
                                Accept
                              </button>
                            </div>
                          </div>

                          {request.message && (
                            <div className="request-message-block">
                              <span className="quote-mark">"</span>
                              <span className="message-content">{request.message}</span>
                              <span className="quote-mark">"</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="request-modal-footer">
                <button
                  onClick={handleCloseModal}
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
          </div>,
          document.body
        )}
      </>
    );
  }


  return (
    <>
      <div style={{ display: 'none' }}></div>
      {showManageModal && ReactDOM.createPortal(
        <div className="request-management-modal">
          <div className="request-modal-content">
            <div className="request-modal-header">
              <h3 className="request-modal-title">
                Manage Game Requests ({gameRequests.length})
              </h3>
              <button className="request-modal-close" onClick={handleCloseModal}>
                ✕
              </button>
            </div>

            <div className="request-modal-body">
              {gameRequests.length === 0 ? (
                <div className="no-requests">
                  <p>No pending requests</p>
                  <p style={{ fontSize: '14px', color: '#7f8c8d' }}>
                    Players who request to join your games will appear here
                  </p>
                </div>
              ) : (
                <div className="request-list">
                  {gameRequests.map(request => {
                    const soloQueue = getQueueData(request.rankedData, 'RANKED_SOLO_5x5');
                    const rankText = soloQueue ? formatRankDisplay(soloQueue) : 'Unranked';
                    const rankIcon = getRankIcon(soloQueue?.tier);

                    return (
                      <div key={request.id} className="request-card-new">
                        <div className="request-card-top">
                          <div className="request-profile-section">
                            <div className="request-avatar-wrapper">
                              {request.profileImage && request.profileImage.startsWith('data:image') ? (
                                <img
                                  src={request.profileImage}
                                  alt={request.displayName}
                                  className="request-avatar"
                                  onError={(e) => {
                                    e.target.src = "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png";
                                  }}
                                />
                              ) : (
                                <img
                                  src="https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"
                                  alt={request.displayName}
                                  className="request-avatar"
                                />
                              )}
                            </div>
                            <div className="request-user-info-main">
                              <div className="name-status-row">
                                <span className="request-name-text">{request.displayName}</span>
                                <span className="request-badge">Pending</span>
                              </div>
                              <div className="request-riot-id">
                                {request.riotAccount || 'No Riot account linked'}
                              </div>
                              <div className="request-rank-display">
                                <img
                                  src={rankIcon}
                                  alt={rankText}
                                  className="req-rank-icon"
                                  onError={(e) => e.target.style.display = 'none'}
                                />
                                <span className="req-rank-text">{rankText}</span>
                              </div>
                            </div>
                          </div>

                          <div className="request-details-section">
                            <div className="request-tags-group">
                              <span className="req-tag queue-tag">
                                {getQueueTypeName(request.gameQueueType)}
                              </span>
                              <span className="req-tag role-tag-new">
                                <img
                                  src={getRoleImage(request.role || 'fill')}
                                  alt={request.role || 'fill'}
                                  className="tag-icon"
                                  onError={(e) => e.target.style.display = 'none'}
                                />
                                {roles.find(r => r.id === (request.role?.toLowerCase() || 'fill'))?.name || 'Fill'}
                              </span>
                            </div>
                            <div className="request-time-text">
                              Applied {formatTimeAgo(request.appliedAt)}
                            </div>
                          </div>

                          <div className="request-actions-section">
                            <button
                              className="btn-view-profile"
                              onClick={() => handleViewProfile(request.userId)}
                            >
                              View Profile
                            </button>
                            <button
                              className="btn-decline"
                              onClick={() => handleDeclineRequest(request.gameId, request.userId, request.displayName)}
                            >
                              Decline
                            </button>
                            <button
                              className="btn-accept"
                              onClick={() => handleAcceptRequest(request.gameId, request.userId, request.displayName)}
                            >
                              Accept
                            </button>
                          </div>
                        </div>

                        {request.message && (
                          <div className="request-message-block">
                            <span className="quote-mark">"</span>
                            <span className="message-content">{request.message}</span>
                            <span className="quote-mark">"</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="request-modal-footer">
              <button
                className="btn-modal-close"
                onClick={handleCloseModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default Announcement;