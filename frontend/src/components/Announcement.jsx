import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { db, auth } from "../firebase";
import {
  collection, query, where, onSnapshot, doc, updateDoc,
  arrayUnion, getDoc, serverTimestamp
} from "firebase/firestore";

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

      // Check each side independently to fix non-reciprocal states
      const hostHasApplicant = hostFriends.some(friend => friend.id === applicantUserId);
      const applicantHasHost = applicantFriends.some(friend => friend.id === hostUserId);

      // Clear any stale friend requests between them
      const hostPendingToRemove = (hostData.pendingRequests || []).filter(req => req.from === applicantUserId);
      const hostSentToRemove = (hostData.sentFriendRequests || []).filter(req => req.to === applicantUserId);
      const applicantPendingToRemove = (applicantData.pendingRequests || []).filter(req => req.from === hostUserId);
      const applicantSentToRemove = (applicantData.sentFriendRequests || []).filter(req => req.to === hostUserId);

      const needsFriendUpdate = !hostHasApplicant || !applicantHasHost;
      const needsRequestCleanup = hostPendingToRemove.length > 0 || hostSentToRemove.length > 0 ||
        applicantPendingToRemove.length > 0 || applicantSentToRemove.length > 0;

      if (needsFriendUpdate || needsRequestCleanup) {
        const batch = writeBatch(db);

        if (!hostHasApplicant) {
          batch.update(hostRef, {
            friends: arrayUnion({
              id: applicantUserId,
              username: applicantName || applicantData.username || 'Anonymous',
              profileImage: applicantData.profileImage || null,
              addedAt: new Date()
            })
          });
        }

        if (!applicantHasHost) {
          batch.update(applicantRef, {
            friends: arrayUnion({
              id: hostUserId,
              username: hostData.username || 'Anonymous',
              profileImage: hostData.profileImage || null,
              addedAt: new Date()
            })
          });
        }

        // Cleanup requests for host
        if (hostPendingToRemove.length > 0) {
          batch.update(hostRef, { pendingRequests: arrayRemove(...hostPendingToRemove) });
        }
        if (hostSentToRemove.length > 0) {
          batch.update(hostRef, { sentFriendRequests: arrayRemove(...hostSentToRemove) });
        }

        // Cleanup requests for applicant
        if (applicantPendingToRemove.length > 0) {
          batch.update(applicantRef, { pendingRequests: arrayRemove(...applicantPendingToRemove) });
        }
        if (applicantSentToRemove.length > 0) {
          batch.update(applicantRef, { sentFriendRequests: arrayRemove(...applicantSentToRemove) });
        }

        await batch.commit();
        console.log("Auto-friended and cleaned up requests (Atomic)");
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
      <div className="announce-embed">
        <div className="announce-embed-list">
          {loading ? (
            <div className="announce-loading">
              <div className="announce-spinner" />
              <p className="announce-loading-text">Processing Data...</p>
            </div>
          ) : gameRequests.length === 0 ? (
            <div className="announce-empty">
              <div className="announce-empty-icon-box">
                <img src="/project-icons/Friends and Chat icons/bell.png" alt="Empty" className="announce-empty-icon" />
              </div>
              <div>
                <p className="announce-empty-title">Node Status: Nominal</p>
                <p className="announce-empty-desc">System logs are currently clear. No active neural requests detected.</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="announce-pending-header">
                <p className="announce-pending-label">Pending game requests ({gameRequests.length})</p>
              </div>
              {gameRequests.map(request => (
                <div key={request.id} className="announce-request-card glass-panel">
                  <div className="announce-request-hover-overlay" />
                  <div className="announce-request-inner">
                    <div className="announce-request-top">
                      <div>
                        <div className="announce-request-name-row">
                          <span className="announce-request-name-bar" />
                          <h5 className="announce-request-name">{request.displayName}</h5>
                        </div>
                        <p className="announce-request-subtitle">Wants to synchronize</p>
                      </div>
                      <span className="announce-request-queue-badge">{getQueueTypeName(request.gameQueueType)}</span>
                    </div>

                    {request.gameDescription && (
                      <p className="announce-request-desc">
                        "{request.gameDescription}"
                      </p>
                    )}

                    <div className="announce-request-footer">
                      <span className="announce-request-time">{formatTimeAgo(request.appliedAt)}</span>
                      <div className="announce-request-actions">
                        <button
                          onClick={() => handleDeclineRequest(request.gameId, request.userId, request.displayName)}
                          className="announce-btn-decline-sm"
                          title="Purge Request"
                        >
                          ✕
                        </button>
                        <button
                          onClick={() => handleAcceptRequest(request.gameId, request.userId, request.displayName)}
                          className="announce-btn-accept-sm"
                          title="Authorize Sync"
                        >
                          ✓
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {gameRequests.length > 0 && (
          <div className="announce-manage-footer">
            <button
              onClick={handleManageRequests}
              className="announce-manage-btn"
            >
              Manage All Requests
              <span className="arrow">→</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'none' }}></div>
      {showManageModal && ReactDOM.createPortal(
        <div className="announce-modal-overlay">
          <div className="announce-modal-backdrop" onClick={handleCloseModal} />
          <div className="announce-modal glass-panel">
            <div className="announce-modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="announce-modal-title-bar" />
                  <h3 className="announce-modal-title">System Log Analyst</h3>
                </div>
                <p className="announce-modal-subtitle">Active Requests</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="announce-modal-close"
              >
                <span>✕</span>
              </button>
            </div>

            <div className="announce-modal-content custom-scrollbar">
              {gameRequests.length === 0 ? (
                <div className="announce-modal-empty">
                  <div className="announce-modal-empty-icon-box">
                    <img src="/project-icons/Friends and Chat icons/bell.png" alt="Empty" className="announce-modal-empty-icon" />
                  </div>
                  <h4 className="announce-modal-empty-title">Logs Decrypted: Null</h4>
                  <p className="announce-modal-empty-desc">No synchronization requests found in existing data stream.</p>
                </div>
              ) : (
                <div className="announce-modal-grid">
                  {gameRequests.map(request => {
                    const soloQueue = getQueueData(request.rankedData, 'RANKED_SOLO_5x5');
                    const rankText = soloQueue ? formatRankDisplay(soloQueue) : 'Unranked';
                    const rankIcon = getRankIcon(soloQueue?.tier);

                    return (
                      <div key={request.id} className="announce-modal-card glass-panel">
                        <div className="announce-modal-card-hover-overlay" />

                        <div className="announce-modal-card-inner">
                          <div className="announce-modal-player">
                            <div className="announce-modal-avatar-wrapper">
                              <div className="announce-modal-avatar-glow" />
                              <img
                                src={request.profileImage || "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"}
                                alt={request.displayName}
                                className="announce-modal-avatar"
                                onError={(e) => { e.target.src = "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"; }}
                              />
                            </div>
                            <div>
                              <h4 className="announce-modal-player-name">{request.displayName}</h4>
                              <div className="announce-modal-rank-row">
                                <img src={rankIcon} alt={rankText} className="announce-modal-rank-icon" />
                                <span className="announce-modal-rank-text">{rankText}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div className="announce-modal-tags">
                              <span className="announce-modal-tag queue">{getQueueTypeName(request.gameQueueType)}</span>
                              <div className="announce-modal-tag role">
                                <img src={getRoleImage(request.role || 'fill')} alt="Role" />
                                <span>{roles.find(r => r.id === (request.role?.toLowerCase() || 'fill'))?.name || 'Fill'}</span>
                              </div>
                            </div>

                            {request.message && (
                              <div className="announce-modal-message">
                                <span className="announce-modal-message-label">Message</span>
                                <p className="announce-modal-message-text">"{request.message}"</p>
                              </div>
                            )}
                          </div>

                          <div className="announce-modal-time">
                            <span>Sent {formatTimeAgo(request.appliedAt)}</span>
                          </div>
                        </div>

                        <div className="announce-modal-actions">
                          <button
                            onClick={() => handleDeclineRequest(request.gameId, request.userId, request.displayName)}
                            className="announce-btn-decline"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => handleAcceptRequest(request.gameId, request.userId, request.displayName)}
                            className="announce-btn-accept"
                          >
                            Accept
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="announce-modal-footer">
              <button
                onClick={handleCloseModal}
                className="announce-modal-close-btn"
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