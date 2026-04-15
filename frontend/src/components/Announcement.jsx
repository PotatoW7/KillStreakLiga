import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Copy, PlusSquare, Users, Edit3, Trash2, ShieldCheck, Filter, ChevronDown, X, Clock, Swords, Check, UserPlus } from 'lucide-react';
import { db, auth } from "../firebase";
import {
  collection, query, where, onSnapshot, doc, updateDoc,
  arrayUnion, getDoc, serverTimestamp, writeBatch, arrayRemove
} from "firebase/firestore";

function Announcement({ notificationCount, setNotificationCount, isEmbedded = false, _parentHandleManage = null }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [gameRequests, setGameRequests] = useState([]);
  const [showManageModal, setShowManageModal] = useState(false);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setFriends(userData.friends || []);
      }
    });
    return () => unsubscribe();
  }, []);

  const isAlreadyFriend = (userId) => {
    return friends.some(f => f.id === userId);
  };
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
    if (_parentHandleManage) {
      _parentHandleManage();
    } else {
      setShowManageModal(true);
    }
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
        if (hostPendingToRemove.length > 0) {
          batch.update(hostRef, { pendingRequests: arrayRemove(...hostPendingToRemove) });
        }
        if (hostSentToRemove.length > 0) {
          batch.update(hostRef, { sentFriendRequests: arrayRemove(...hostSentToRemove) });
        }
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
      alert(`Request accepted! ${applicantName} has been added as a friend.`);
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
  ];

  const getRoleImage = (roleId) => {
    if (!roleId) return '/lane-icons/Fill icon.png';
    const role = roles.find(r => r.id === roleId.toLowerCase());
    return role ? role.icon : '/lane-icons/Fill icon.png';
  };

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



  return (
    <>
      {isEmbedded ? (
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
                  <p className="announce-empty-title">No notifications yet</p>
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
                        <div className="announce-request-player-info">
                          <div className="announce-request-avatar-box">
                            <img
                              src={request.profileImage || "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png"}
                              alt=""
                              className="announce-request-avatar"
                              onError={(e) => { e.target.src = "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png"; }}
                            />
                          </div>
                          <div>
                            <div className="announce-request-name-row">
                              <span className="announce-request-name-bar" />
                              <h5
                                className="announce-request-name cursor-pointer hover:text-primary transition-colors"
                                onClick={() => navigate(`/profile/${request.userId}`)}
                              >
                                {request.displayName}
                              </h5>
                            </div>
                            <div className="u-flex u-items-center u-gap-2">
                              <p className="announce-request-subtitle">Wants to join your game</p>
                            </div>
                          </div>
                        </div>
                        <div className="announce-request-meta-badges">
                          <span className="announce-request-queue-badge">{getQueueTypeName(request.gameQueueType)}</span>
                          <div className="announce-role-badge" title={`Role focus: ${roles.find(r => r.id === (request.role?.toLowerCase() || 'fill'))?.name}`}>
                            <img src={getRoleImage(request.role || 'fill')} alt="" />
                          </div>
                        </div>
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
                            onClick={handleManageRequests}
                            className="announce-btn-manage-sm"
                            title="Detailed Analytics"
                          >
                            MANAGE REQUESTS
                          </button>
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
        </div>
      ) : (
        <div style={{ display: 'none' }}></div>
      )}

      {showManageModal && ReactDOM.createPortal(
        <div className="lobby-modal-overlay">
          <div className="lobby-modal-card" style={{ maxWidth: '48rem' }} onClick={e => e.stopPropagation()}>
            <div className="post-panel-header panel-padding u-border-b">
              <div className="status-icon-wrap primary">
                <Users className="icon-md" />
              </div>
              <h3 className="post-panel-title">Incoming Requests</h3>
              <button onClick={handleCloseModal} className="icon-only-btn u-ml-auto">
                <X className="icon-md" />
              </button>
            </div>

            <div className="panel-padding u-max-h-modal u-overflow-y-auto u-bg-black-10">
              {gameRequests.length === 0 ? (
                <div className="text-center u-py-20">
                  <p className="empty-requests-message">NO ACTIVE APPLICANTS YET</p>
                </div>
              ) : (
                <div className="lobbies-stack">
                  {gameRequests.map(request => {
                    const soloQueue = getQueueData(request.rankedData, 'RANKED_SOLO_5x5');
                    const rankText = soloQueue ? formatRankDisplay(soloQueue) : 'Unranked';
                    const rankIcon = getRankIcon(soloQueue?.tier);

                    return (
                      <div key={request.id} className="lobby-card">
                        <div className="author-main-info u-flex u-items-center u-gap-4" style={{ width: '100%' }}>
                          <div className="author-pfp-circle icon-xxl">
                            <img
                              src={request.profileImage || "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png"}
                              alt=""
                              className="author-pfp-img"
                              onError={(e) => { e.target.src = "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png"; }}
                            />
                          </div>

                          <div className="u-flex u-flex-1 u-items-center u-justify-between u-gap-6">
                            <div className="player-identity-group u-flex-1">
                              <h4
                                className="author-name cursor-pointer hover:text-primary transition-colors u-mb-1"
                                style={{ whiteSpace: 'normal', wordBreak: 'break-word', overflow: 'visible', textOverflow: 'clip' }}
                                onClick={() => navigate(`/profile/${request.userId}`)}
                              >
                                {request.displayName}
                              </h4>
                              <div className="u-flex u-flex-col u-items-start u-gap-1">
                                <div className="u-flex u-items-center u-gap-2">
                                  <div className="riot-id-text" style={{ whiteSpace: 'normal', wordBreak: 'break-all' }}>{request.riotAccount}</div>
                                  <button
                                    className="icon-only-btn-xs"
                                    onClick={() => {
                                      navigator.clipboard.writeText(request.riotAccount);
                                      alert('Riot ID copied to clipboard');
                                    }}
                                    title="Copy Riot ID"
                                  >
                                    <Copy className="icon-2xs" />
                                  </button>
                                </div>
                                {isAlreadyFriend(request.userId) && (
                                  <span className="comm-tag voice u-mt-1">FRIEND</span>
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
                              <span className="time-ago-wrapper">Received {formatTimeAgo(request.appliedAt)}</span>
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
                            >
                              DECLINE
                            </button>
                            <button
                              className="btn-publish"
                              onClick={() => handleAcceptRequest(request.gameId, request.userId, request.displayName)}
                              disabled={isAlreadyFriend(request.userId)}
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
                onClick={handleCloseModal}
              >
                Return to Hub
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
