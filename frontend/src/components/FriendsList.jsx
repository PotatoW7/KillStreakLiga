import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDocs, orderBy, getDoc, writeBatch
} from 'firebase/firestore';
import { db, auth } from '../firebase';

function FriendsList({ onSelectFriend, unreadCounts }) {
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentFriendRequests, setSentFriendRequests] = useState([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [friendsTabView, setFriendsTabView] = useState('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) return;
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const friendUnsubscribes = new Map();

    const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const friendsList = data.friends || [];

        const uniqueFriends = [];
        const seenIds = new Set();
        friendsList.forEach(f => {
          if (!seenIds.has(f.id)) {
            uniqueFriends.push(f);
            seenIds.add(f.id);
          }
        });

        setFriends(prev => {
          const freshFriends = uniqueFriends.map(f => {
            const existing = prev.find(p => p.id === f.id);
            return f;
          });
          return freshFriends;
        });
        setPendingRequests(data.pendingRequests || []);
        setSentFriendRequests(data.sentFriendRequests || []);

        const currentFriendIds = new Set(uniqueFriends.map(f => f.id));

        for (const [id, unsub] of friendUnsubscribes.entries()) {
          if (!currentFriendIds.has(id)) {
            unsub();
            friendUnsubscribes.delete(id);
          }
        }

        uniqueFriends.forEach(friend => {
          if (!friendUnsubscribes.has(friend.id)) {
            const friendRef = doc(db, 'users', friend.id);
            const firestoreUnsub = onSnapshot(friendRef, (friendDoc) => {
              if (friendDoc.exists()) {
                const friendData = friendDoc.data();
                setFriends(prevFriends =>
                  prevFriends.map(f =>
                    f.id === friend.id
                      ? {
                        ...f,
                        profileImage: friendData.profileImage,
                        username: friendData.username || f.username
                      }
                      : f
                  )
                );
              }
            });

            friendUnsubscribes.set(friend.id, () => {
              firestoreUnsub();
            });
          }
        });
      }
    });

    return () => {
      unsubscribeUser();
      friendUnsubscribes.forEach(unsub => unsub());
    };
  }, []);


  const searchUsers = async () => {
    if (!searchUsername.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    setHasSearched(true);
    try {
      const usersRef = collection(db, 'users');
      const searchTerm = searchUsername.toLowerCase().trim();
      const rawSearchTerm = searchUsername.trim();
      const q1 = query(
        usersRef,
        where('usernameLowercase', '>=', searchTerm),
        where('usernameLowercase', '<=', searchTerm + '\uf8ff')
      );

      const q2 = query(
        usersRef,
        where('username', '>=', rawSearchTerm),
        where('username', '<=', rawSearchTerm + '\uf8ff')
      );

      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

      const resultsMap = new Map();

      const processDoc = (docSnap) => {
        if (docSnap.id !== auth.currentUser.uid && !resultsMap.has(docSnap.id)) {
          const userData = docSnap.data();
          const isAlreadyFriend = friends.some(friend => friend.id === docSnap.id);
          const hasPendingRequest = sentFriendRequests.some(req => req.to === docSnap.id);

          resultsMap.set(docSnap.id, {
            id: docSnap.id,
            username: userData.username || 'Anonymous',
            email: userData.email,
            profileImage: userData.profileImage,
            isAlreadyFriend,
            hasPendingRequest
          });
        }
      };

      snap1.forEach(processDoc);
      snap2.forEach(processDoc);

      setSearchResults(Array.from(resultsMap.values()));
    } catch (error) {
      console.error('Search error:', error);
      alert('Error searching users: ' + error.message);
    }
    setSearchLoading(false);
  };

  const sendFriendRequest = async (targetUserId, targetUsername) => {
    try {
      const batch = writeBatch(db);
      const currentUserRef = doc(db, 'users', auth.currentUser.uid);
      const targetUserRef = doc(db, 'users', targetUserId);

      const currentUserDoc = await getDoc(currentUserRef);
      const currentUserData = currentUserDoc.exists() ? currentUserDoc.data() : {};
      const currentUserProfileImage = currentUserData.profileImage || null;

      const targetUserDoc = await getDoc(targetUserRef);
      const targetUserData = targetUserDoc.exists() ? targetUserDoc.data() : {};
      const targetProfileImage = targetUserData.profileImage || null;

      const requestData = {
        from: auth.currentUser.uid,
        fromUsername: auth.currentUser.displayName || 'Anonymous',
        fromProfileImage: currentUserProfileImage,
        timestamp: new Date()
      };

      const sentRequestData = {
        to: targetUserId,
        toUsername: targetUsername,
        toProfileImage: targetProfileImage,
        timestamp: new Date()
      };

      batch.update(targetUserRef, {
        pendingRequests: arrayUnion(requestData)
      });

      batch.update(currentUserRef, {
        sentFriendRequests: arrayUnion(sentRequestData)
      });

      await batch.commit();

      setSearchResults([]);
      setSearchUsername('');
      alert(`Friend request sent to ${targetUsername}!`);
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Error sending friend request: ' + error.message);
    }
  };

  const acceptFriendRequest = async (request) => {
    try {
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const friendRef = doc(db, 'users', request.from);

      const [friendDoc, currentUserDoc] = await Promise.all([
        getDoc(friendRef),
        getDoc(userRef)
      ]);

      const friendData = friendDoc.exists() ? friendDoc.data() : {};
      const currentUserData = currentUserDoc.exists() ? currentUserDoc.data() : {};

      const pendingToRemove = (currentUserData.pendingRequests || []).filter(
        req => req.from === request.from
      );

      const userUpdates = {
        pendingRequests: pendingToRemove.length > 0 ? arrayRemove(...pendingToRemove) : currentUserData.pendingRequests || []
      };

      if (!(currentUserData.friends || []).some(f => f.id === request.from)) {
        userUpdates.friends = arrayUnion({
          id: request.from,
          username: friendData.username || request.fromUsername || 'Anonymous',
          profileImage: friendData.profileImage || null
        });
      }

      batch.update(userRef, userUpdates);

      const sentRequestToRemove = (friendData.sentFriendRequests || []).filter(
        req => req.to === auth.currentUser.uid
      );

      const friendUpdates = {};

      if (sentRequestToRemove.length > 0) {
        friendUpdates.sentFriendRequests = arrayRemove(...sentRequestToRemove);
      }

      if (!(friendData.friends || []).some(f => f.id === auth.currentUser.uid)) {
        friendUpdates.friends = arrayUnion({
          id: auth.currentUser.uid,
          username: auth.currentUser.displayName || 'Anonymous',
          profileImage: currentUserData.profileImage || null
        });
      }

      if (Object.keys(friendUpdates).length > 0) {
        batch.update(friendRef, friendUpdates);
      }

      await batch.commit();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      alert('Error accepting friend request: ' + error.message);
    }
  };

  const rejectFriendRequest = async (request) => {
    try {
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const senderRef = doc(db, 'users', request.from);

      const [userDoc, senderDoc] = await Promise.all([
        getDoc(userRef),
        getDoc(senderRef)
      ]);

      const userData = userDoc.exists() ? userDoc.data() : {};
      const pendingToRemove = (userData.pendingRequests || []).filter(
        req => req.from === request.from
      );

      batch.update(userRef, {
        pendingRequests: pendingToRemove.length > 0 ? arrayRemove(...pendingToRemove) : userData.pendingRequests || []
      });

      if (senderDoc.exists()) {
        const senderData = senderDoc.data();
        const sentRequestToRemove = (senderData.sentFriendRequests || []).filter(
          req => req.to === auth.currentUser.uid
        );

        const senderUpdates = {
          friendNotifications: arrayUnion({
            type: 'rejection',
            from: auth.currentUser.uid,
            fromUsername: auth.currentUser.displayName || 'Anonymous',
            timestamp: new Date(),
            read: false
          })
        };

        if (sentRequestToRemove.length > 0) {
          senderUpdates.sentFriendRequests = arrayRemove(...sentRequestToRemove);
        }

        batch.update(senderRef, senderUpdates);
      }

      await batch.commit();
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      alert('Error rejecting friend request: ' + error.message);
    }
  };

  const cancelSentRequest = async (request) => {
    try {
      const batch = writeBatch(db);
      const currentUserRef = doc(db, 'users', auth.currentUser.uid);
      const targetUserRef = doc(db, 'users', request.to);

      const currentUserDoc = await getDoc(currentUserRef);
      const currentUserData = currentUserDoc.exists() ? currentUserDoc.data() : {};
      const sentToRemove = (currentUserData.sentFriendRequests || []).filter(
        req => req.to === request.to
      );

      batch.update(currentUserRef, {
        sentFriendRequests: sentToRemove.length > 0 ? arrayRemove(...sentToRemove) : currentUserData.sentFriendRequests || []
      });

      const targetDoc = await getDoc(targetUserRef);
      if (targetDoc.exists()) {
        const targetData = targetDoc.data();
        const pendingToRemove = (targetData.pendingRequests || []).filter(
          req => req.from === auth.currentUser.uid
        );

        if (pendingToRemove.length > 0) {
          batch.update(targetUserRef, {
            pendingRequests: arrayRemove(...pendingToRemove)
          });
        }
      }

      await batch.commit();

    } catch (error) {
      console.error('Error canceling friend request:', error);
      alert('Error canceling friend request: ' + error.message);
    }
  };

  const unfriend = async (friendId, friendUsername) => {
    if (!window.confirm(`Are you sure you want to unfriend ${friendUsername}?`)) {
      return;
    }

    try {
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const friendRef = doc(db, 'users', friendId);

      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};

      const friendsToRemove = (userData.friends || []).filter(f => f.id === friendId);
      if (friendsToRemove.length === 0) {
        alert("Friend not found in your list.");
        return;
      }

      batch.update(userRef, {
        friends: arrayRemove(...friendsToRemove)
      });

      const friendSnap = await getDoc(friendRef);
      if (friendSnap.exists()) {
        const friendData = friendSnap.data();
        const userToRemoveFromFriend = (friendData.friends || []).filter(f => f.id === auth.currentUser.uid);
        if (userToRemoveFromFriend.length > 0) {
          batch.update(friendRef, {
            friends: arrayRemove(...userToRemoveFromFriend)
          });
        }
      }

      await batch.commit();

      alert(`You are no longer friends with ${friendUsername}`);
    } catch (error) {
      console.error('Error unfriending:', error);
      alert('Error unfriending: ' + error.message);
    }
  };

  const totalPendingCount = pendingRequests.length + sentFriendRequests.length;

  return (
    <div className="friends-list-container">
      <div className="fl-search-section">
        <div className="fl-search-wrapper">
          <input
            type="text"
            placeholder="Search Users..."
            value={searchUsername}
            onChange={(e) => {
              setSearchUsername(e.target.value);
              if (hasSearched) setHasSearched(false);
            }}
            onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
            className="fl-search-input"
          />
          <button
            onClick={searchUsers}
            disabled={searchLoading}
            className="fl-search-btn"
          >
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {searchResults.length > 0 && (
        <div className="fl-search-results">
          <div className="fl-section-title-row">
            <div className="fl-title-dot" />
            <h4 className="fl-section-title">Search Results ({searchResults.length})</h4>
          </div>
          <div className="fl-results-list">
            {searchResults.map(user => (
              <div key={user.id} className="fl-result-card">
                <div className="fl-user-info">
                  <img
                    src={user.profileImage || "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png"}
                    alt={user.username}
                    className="fl-user-avatar"
                    onError={(e) => { e.target.src = "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png"; }}
                  />
                  <span className="fl-user-name">{user.username}</span>
                </div>
                {user.isAlreadyFriend ? (
                  <span className="fl-status-badge friends">Friends</span>
                ) : user.hasPendingRequest ? (
                  <span className="fl-status-badge sent">Sent</span>
                ) : (
                  <button
                    onClick={() => sendFriendRequest(user.id, user.username)}
                    className="fl-connect-btn"
                  >
                    + Connect
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {hasSearched && searchResults.length === 0 && !searchLoading && (
        <div className="fl-no-results glass-panel">
          <p>No users found matching "{searchUsername}"</p>
        </div>
      )}

      <div className="fl-tabs">
        <button
          className={`fl-tab-btn ${friendsTabView === 'all' ? 'active' : ''}`}
          onClick={() => setFriendsTabView('all')}
        >
          All Friends
        </button>
        <button
          className={`fl-tab-btn ${friendsTabView === 'pending' ? 'active' : ''}`}
          onClick={() => setFriendsTabView('pending')}
        >
          Pending
          {totalPendingCount > 0 && (
            <span className="fl-tab-count">{totalPendingCount}</span>
          )}
        </button>
      </div>

      <div className="fl-content custom-scrollbar">
        {friendsTabView === 'pending' ? (
          <div className="fl-list-padding fl-requests-list">
            {pendingRequests.length > 0 && (
              <div className="fl-request-group">
                <div className="fl-request-header">
                  <div className="fl-header-dot pending" />
                  <h5 className="fl-header-label">Friend Requests</h5>
                </div>
                {pendingRequests.map((req, idx) => (
                  <div key={`received-${idx}`} className="fl-request-card glass-panel">
                    <div className="fl-card-bg-glow" />
                    <div className="fl-request-user">
                      <div className="fl-avatar-container" onClick={() => navigate(`/profile/${req.from}`)}>
                        <img
                          src={req.fromProfileImage || "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png"}
                          alt={req.fromUsername}
                          className="fl-request-avatar"
                        />
                        <div className="fl-pulse-dot" />
                      </div>
                      <span className="fl-user-name">{req.fromUsername}</span>
                    </div>
                    <div className="fl-actions">
                      <button onClick={() => acceptFriendRequest(req)} className="fl-accept-btn">✓ Accept</button>
                      <button onClick={() => rejectFriendRequest(req)} className="fl-cancel-btn">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {sentFriendRequests.length > 0 && (
              <div className="fl-request-group">
                <div className="fl-request-header">
                  <div className="fl-header-dot sent" />
                  <h5 className="fl-header-label">Sent Requests</h5>
                </div>
                {sentFriendRequests.map((req, idx) => (
                  <div key={`sent-${idx}`} className="fl-request-card sent glass-panel">
                    <div className="fl-request-user">
                      <div className="fl-avatar-container" onClick={() => navigate(`/profile/${req.to}`)}>
                        <img
                          src={req.toProfileImage || "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png"}
                          alt={req.toUsername}
                          className="fl-request-avatar"
                        />
                      </div>
                      <span className="fl-user-name">{req.toUsername}</span>
                    </div>
                    <button
                      className="fl-cancel-text-btn"
                      onClick={() => cancelSentRequest(req)}
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}

            {pendingRequests.length === 0 && sentFriendRequests.length === 0 && (
              <div className="fl-empty-state">
                <div className="fl-empty-icon-box">
                  <img src="/project-icons/Friends and Chat icons/bell.png" alt="Empty" className="fl-empty-icon" />
                </div>
                <p className="fl-empty-text">No pending requests</p>
              </div>
            )}
          </div>
        ) : (
          <div className="fl-list-padding">
            {friends.length === 0 ? (
              <div className="fl-empty-state" style={{ marginTop: '5rem' }}>
                <div className="fl-empty-icon-box" style={{ width: '4rem', height: '4rem', borderRadius: '1.5rem' }}>
                  <img src="/project-icons/Friends and Chat icons/comment chat balloon.png" alt="No Friends" className="fl-empty-icon" />
                </div>
                <div className="space-y-2">
                  <p className="fl-empty-text">No friends yet</p>
                  <p className="fl-empty-subtext">No friends found. Search for users to add them.</p>
                </div>
              </div>
            ) : (
              <div className="fl-friends-grid">
                {friends.map(friend => {
                  return (
                    <div
                      key={friend.id}
                      className={`fl-friend-card glass-panel ${unreadCounts[friend.id] > 0 ? 'unread' : ''}`}
                    >
                      <div className="fl-card-bg-glow" />
                      <div
                        className="fl-friend-info-group"
                        onClick={() => onSelectFriend({
                          id: friend.id,
                          username: friend.username,
                          profileImage: friend.profileImage || null
                        })}
                      >
                        <div className="fl-avatar-container" onClick={() => navigate(`/profile/${friend.id}`)}>
                          <div className="fl-avatar-glow" />
                          <img
                            src={friend.profileImage || "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png"}
                            alt={friend.username}
                            className="fl-friend-avatar"
                            onError={(e) => { e.target.src = "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png"; }}
                          />
                        </div>
                        <div className="fl-friend-text">
                          <span className="fl-friend-username">{friend.username}</span>
                        </div>
                        {unreadCounts[friend.id] > 0 && (
                          <div className="fl-unread-badge">
                            {unreadCounts[friend.id]}
                          </div>
                        )}
                      </div>

                      <button
                        className="fl-unfriend-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          unfriend(friend.id, friend.username);
                        }}
                        title="Unfriend"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default FriendsList;