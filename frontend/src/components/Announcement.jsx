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
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 space-y-4">
              <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 italic">Processing Data...</p>
            </div>
          ) : gameRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 opacity-40">
              <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
                <img src="/project-icons/Friends and Chat icons/bell.png" alt="Empty" className="w-8 h-8 grayscale opacity-50" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-widest text-white italic">Node Status: Nomimal</p>
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] max-w-[180px] leading-relaxed">System logs are currently clear. No active neural requests detected.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="px-2 mb-4">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 italic">Pending game requests ({gameRequests.length})</p>
              </div>
              {gameRequests.map(request => (
                <div key={request.id} className="glass-panel p-5 rounded-2xl border-white/5 hover:border-primary/30 transition-all group relative overflow-hidden">
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-1 h-3 bg-primary rounded-full" />
                          <h5 className="font-display font-black text-sm text-white uppercase italic tracking-tight">{request.displayName}</h5>
                        </div>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Wants to synchronize</p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-black tracking-widest uppercase italic">{getQueueTypeName(request.gameQueueType)}</span>
                    </div>

                    {request.gameDescription && (
                      <p className="text-[11px] font-medium text-white/40 italic leading-relaxed pl-3 border-l border-white/10">
                        "{request.gameDescription}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-[9px] font-black text-white/20 uppercase tracking-widest italic">{formatTimeAgo(request.appliedAt)}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeclineRequest(request.gameId, request.userId, request.displayName)}
                          className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-xl active:scale-95"
                          title="Purge Request"
                        >
                          ✕
                        </button>
                        <button
                          onClick={() => handleAcceptRequest(request.gameId, request.userId, request.displayName)}
                          className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center hover:bg-primary hover:text-black transition-all shadow-xl active:scale-95"
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
          <div className="p-6 border-t border-white/5 bg-white/[0.02]">
            <button
              onClick={handleManageRequests}
              className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-primary hover:text-black hover:border-primary font-black text-[10px] tracking-[0.3em] uppercase transition-all flex items-center justify-center group"
            >
              Manage All Requests
              <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-10">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleCloseModal} />
          <div className="w-full max-w-4xl max-h-[90vh] glass-panel rounded-[3rem] border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col relative z-10 animate-in fade-in zoom-in-95 duration-500">
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
                  <h3 className="font-display text-2xl font-black text-white uppercase italic tracking-tight">System Log Analyst</h3>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 italic ml-4">Active Requests</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-red-500 border border-white/10 hover:border-red-500 text-white transition-all flex items-center justify-center active:scale-90 group"
              >
                <span className="text-xl group-hover:scale-125 transition-transform">✕</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {gameRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center opacity-40">
                  <div className="w-24 h-24 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                    <img src="/project-icons/Friends and Chat icons/bell.png" alt="Empty" className="w-10 h-10 grayscale" />
                  </div>
                  <h4 className="font-display text-xl font-black text-white uppercase italic mb-2">Logs Decrypted: Null</h4>
                  <p className="text-[11px] font-bold text-white/20 uppercase tracking-[0.3em]">No synchronization requests found in existing data stream.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                  {gameRequests.map(request => {
                    const soloQueue = getQueueData(request.rankedData, 'RANKED_SOLO_5x5');
                    const rankText = soloQueue ? formatRankDisplay(soloQueue) : 'Unranked';
                    const rankIcon = getRankIcon(soloQueue?.tier);

                    return (
                      <div key={request.id} className="glass-panel p-6 rounded-[2rem] border-white/5 hover:border-primary/20 transition-all group relative overflow-hidden flex flex-col">
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="relative z-10 space-y-6 flex-1">
                          <div className="flex items-start gap-5">
                            <div className="relative">
                              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-0 group-hover:scale-100 transition-transform duration-700" />
                              <img
                                src={request.profileImage || "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"}
                                alt={request.displayName}
                                className="w-16 h-16 rounded-2xl object-cover relative z-10 border border-white/10 group-hover:border-primary/40 transition-colors"
                                onError={(e) => { e.target.src = "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"; }}
                              />
                            </div>
                            <div className="space-y-1">
                              <h4 className="font-display text-xl font-black text-white uppercase italic group-hover:text-primary transition-colors">{request.displayName}</h4>
                              <div className="flex items-center gap-2">
                                <img src={rankIcon} alt={rankText} className="w-4 h-4 object-contain grayscale group-hover:grayscale-0 transition-all" />
                                <span className="text-[10px] font-black text-white/30 group-hover:text-white/60 transition-colors uppercase tracking-widest">{rankText}</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black text-white opacity-60 uppercase tracking-widest italic">{getQueueTypeName(request.gameQueueType)}</span>
                              <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-2">
                                <img src={getRoleImage(request.role || 'fill')} alt="Role" className="w-3 h-3" />
                                <span className="text-[9px] font-black text-primary uppercase tracking-widest italic">{roles.find(r => r.id === (request.role?.toLowerCase() || 'fill'))?.name || 'Fill'}</span>
                              </div>
                            </div>

                            {request.message && (
                              <div className="p-4 rounded-xl bg-white/2 border border-white/5 relative">
                                <span className="absolute -top-2 left-3 px-2 bg-background text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">Message</span>
                                <p className="text-[11px] font-medium text-white/40 italic leading-relaxed">"{request.message}"</p>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[9px] font-black text-white/20 uppercase tracking-[0.4em] italic mb-4">
                            <span>Sent {formatTimeAgo(request.appliedAt)}</span>
                          </div>
                        </div>

                        <div className="relative z-10 mt-6 pt-6 border-t border-white/5 grid grid-cols-2 gap-3">
                          <button
                            onClick={() => handleDeclineRequest(request.gameId, request.userId, request.displayName)}
                            className="h-12 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/50 font-black text-[10px] tracking-[0.3em] uppercase transition-all shadow-xl active:scale-95 italic"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => handleAcceptRequest(request.gameId, request.userId, request.displayName)}
                            className="h-12 rounded-xl bg-primary text-black font-black text-[10px] tracking-[0.3em] uppercase transition-all shadow-xl hover:bg-white active:scale-95 italic"
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

            <div className="p-8 border-t border-white/5 bg-white/[0.01]">
              <button
                onClick={handleCloseModal}
                className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:bg-white hover:text-black font-black text-[11px] tracking-[0.3em] uppercase transition-all flex items-center justify-center italic active:scale-95"
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