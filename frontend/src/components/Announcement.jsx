import React, { useState, useEffect } from 'react';
import { db, auth } from "../firebase";
import { 
  collection, query, where, onSnapshot, doc, updateDoc, 
  arrayUnion, arrayRemove, getDoc, serverTimestamp 
} from "firebase/firestore";
import "../styles/componentsCSS/Announcement.css";

function Announcement() {
  const [isVisible, setIsVisible] = useState(true);
  const [gameRequests, setGameRequests] = useState([]);
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
      
      if (allRequests.length > 0 && !localStorage.getItem('announcement_hidden')) {
        setIsVisible(true);
      }
    }, (error) => {
      console.error("Error listening for requests:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('announcement_hidden', 'true');
    setTimeout(() => {
      localStorage.removeItem('announcement_hidden');
    }, 60000);
  };

  const handleManageRequests = () => {
    setShowManageModal(true);
  };

  const handleCloseModal = () => {
    setShowManageModal(false);
    setSelectedGame(null);
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
      'top': '⚔️',
      'jungle': '🌲',
      'mid': '✨',
      'adc': '🎯',
      'support': '🛡️',
      'any': '🔄'
    };
    return roleIcons[role] || '🎮';
  };

  if (loading || gameRequests.length === 0) return null;

  return (
    <>
      {isVisible && (
        <div className="announcement-container">
          <div className="announcement-header">
            <h3 className="announcement-title">
              ⚡ Game Requests ({gameRequests.length})
            </h3>
            <button className="announcement-close-btn" onClick={handleClose}>
              ✕
            </button>
          </div>

          <div className="announcement-list">
            {gameRequests.slice(0, 3).map(request => (
              <div 
                key={request.id} 
                className="announcement-item"
              >
                <div className="announcement-content">
                  <div className="announcement-badge">NEW</div>
                  <div className="announcement-user">
                    <strong>{request.displayName}</strong> wants to join your game
                  </div>
                  <div className="announcement-details">
                    <span className="announcement-queue">
                      {getQueueTypeName(request.gameQueueType)}
                    </span>
                    <span className="announcement-time">
                      {formatTimeAgo(request.appliedAt)}
                    </span>
                  </div>
                  <div className="announcement-preview">
                    "{request.gameDescription?.substring(0, 60)}..."
                  </div>
                  
                  <div className="announcement-quick-actions">
                    <button 
                      className="announcement-accept-btn"
                      onClick={() => handleAcceptRequest(request.gameId, request.userId, request.displayName)}
                      title="Accept Request"
                    >
                      ✅ Accept
                    </button>
                    <button 
                      className="announcement-decline-btn"
                      onClick={() => handleDeclineRequest(request.gameId, request.userId, request.displayName)}
                      title="Decline Request"
                    >
                      ❌ Decline
                    </button>
                    <button 
                      className="announcement-manage-btn"
                      onClick={handleManageRequests}
                      title="Manage All Requests"
                    >
                      📋 Manage
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="announcement-footer">
            <button onClick={handleManageRequests} className="announcement-view-all">
              Manage All Requests →
            </button>
          </div>
        </div>
      )}
      {showManageModal && (
        <div className="request-management-modal">
          <div className="request-modal-content">
            <div className="request-modal-header">
              <h3 className="request-modal-title">
                🎮 Manage Game Requests ({gameRequests.length})
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
                  {gameRequests.map(request => (
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
                              ⏳ Pending
                            </span>
                          </div>
                          <div className="request-riot-account">
                            {request.riotAccount || 'No Riot account linked'}
                          </div>
                        </div>
                      </div>

                      <div className="request-game-info">
                        <div className="request-info-tag">
                          🎮 {getQueueTypeName(request.gameQueueType)}
                        </div>
                        <div className="request-info-tag">
                          {getRoleIcon(request.role)} {request.role || 'Any role'}
                        </div>
                      </div>

                      <div className="request-applied-time">
                        ⏰ Applied {formatTimeAgo(request.appliedAt)}
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
                          👤 View Profile
                        </button>
                        <button 
                          className="request-decline-btn"
                          onClick={() => handleDeclineRequest(request.gameId, request.userId, request.displayName)}
                        >
                          ❌ Decline
                        </button>
                        <button 
                          className="request-accept-btn"
                          onClick={() => handleAcceptRequest(request.gameId, request.userId, request.displayName)}
                        >
                          ✅ Accept
                        </button>
                      </div>
                    </div>
                  ))}
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
        </div>
      )}
    </>
  );
}

export default Announcement;