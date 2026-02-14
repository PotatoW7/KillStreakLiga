import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDocs, orderBy, getDoc, writeBatch
} from 'firebase/firestore';
import { db, auth } from '../firebase';

function FriendsList({ onSelectFriend, onUnreadCountChange }) {
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentFriendRequests, setSentFriendRequests] = useState([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [friendsTabView, setFriendsTabView] = useState('all');
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

        setFriends(uniqueFriends);
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
            const unsub = onSnapshot(friendRef, (friendDoc) => {
              if (friendDoc.exists()) {
                const friendData = friendDoc.data();
                setFriends(prevFriends =>
                  prevFriends.map(f =>
                    f.id === friend.id
                      ? { ...f, profileImage: friendData.profileImage, username: friendData.username || f.username }
                      : f
                  )
                );
              }
            });
            friendUnsubscribes.set(friend.id, unsub);
          }
        });
      }
    });

    return () => {
      unsubscribeUser();
      friendUnsubscribes.forEach(unsub => unsub());
    };
  }, []);

  useEffect(() => {
    if (!auth.currentUser || friends.length === 0) return;

    const unsubscribeFunctions = [];

    friends.forEach(friend => {
      const chatId = [auth.currentUser.uid, friend.id].sort().join('_');
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'asc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const unread = messages.filter(msg =>
          msg.senderId !== auth.currentUser.uid && !msg.read
        ).length;

        setUnreadCounts(prev => ({
          ...prev,
          [friend.id]: unread
        }));
      });

      unsubscribeFunctions.push(unsubscribe);
    });

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, [friends]);


  useEffect(() => {
    const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
    if (onUnreadCountChange) {
      onUnreadCountChange(totalUnread);
    }
  }, [unreadCounts, onUnreadCountChange]);

  const searchUsers = async () => {
    if (!searchUsername.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('username', '>=', searchUsername),
        where('username', '<=', searchUsername + '\uf8ff')
      );
      const querySnapshot = await getDocs(q);

      const results = [];
      querySnapshot.forEach((docSnap) => {
        if (docSnap.id !== auth.currentUser.uid) {
          const userData = docSnap.data();
          const isAlreadyFriend = friends.some(friend => friend.id === docSnap.id);
          const hasPendingRequest = sentFriendRequests.some(req => req.to === docSnap.id);

          results.push({
            id: docSnap.id,
            username: userData.username || 'Anonymous',
            email: userData.email,
            profileImage: userData.profileImage,
            isAlreadyFriend,
            hasPendingRequest
          });
        }
      });

      setSearchResults(results);
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

      // Get current user's profile image
      const currentUserDoc = await getDoc(currentUserRef);
      const currentUserData = currentUserDoc.exists() ? currentUserDoc.data() : {};
      const currentUserProfileImage = currentUserData.profileImage || null;

      // Get target user's profile image
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

      const friendDoc = await getDoc(friendRef);
      const friendData = friendDoc.exists() ? friendDoc.data() : {};

      const currentUserDoc = await getDoc(userRef);
      const currentUserData = currentUserDoc.exists() ? currentUserDoc.data() : {};

      // Robustity: Collect all versions of the request to remove
      const pendingToRemove = (currentUserData.pendingRequests || []).filter(
        req => req.from === request.from
      );

      // Robustity: Prevent duplicates if already friends
      const isAlreadyFriend = (currentUserData.friends || []).some(f => f.id === request.from);

      if (!isAlreadyFriend) {
        batch.update(userRef, {
          friends: arrayUnion({
            id: request.from,
            username: friendData.username || request.fromUsername || 'Anonymous',
            profileImage: friendData.profileImage || null
          })
        });
      }

      batch.update(userRef, {
        pendingRequests: pendingToRemove.length > 0 ? arrayRemove(...pendingToRemove) : currentUserData.pendingRequests || []
      });

      // Robustity: Prevent duplicates for the other user too
      const friendIsAlreadyFriend = (friendData.friends || []).some(f => f.id === auth.currentUser.uid);

      if (!friendIsAlreadyFriend) {
        batch.update(friendRef, {
          friends: arrayUnion({
            id: auth.currentUser.uid,
            username: auth.currentUser.displayName || 'Anonymous',
            profileImage: currentUserData.profileImage || null
          })
        });
      }

      const sentRequestToRemove = (friendData.sentFriendRequests || []).filter(
        req => req.to === auth.currentUser.uid
      );
      if (sentRequestToRemove.length > 0) {
        batch.update(friendRef, {
          sentFriendRequests: arrayRemove(...sentRequestToRemove)
        });
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

      const userDoc = await getDoc(userRef);
      const userData = userDoc.exists() ? userDoc.data() : {};
      const pendingToRemove = (userData.pendingRequests || []).filter(
        req => req.from === request.from
      );

      batch.update(userRef, {
        pendingRequests: pendingToRemove.length > 0 ? arrayRemove(...pendingToRemove) : userData.pendingRequests || []
      });

      const senderDoc = await getDoc(senderRef);
      if (senderDoc.exists()) {
        const senderData = senderDoc.data();
        const sentRequestToRemove = (senderData.sentFriendRequests || []).filter(
          req => req.to === auth.currentUser.uid
        );

        if (sentRequestToRemove.length > 0) {
          batch.update(senderRef, {
            sentFriendRequests: arrayRemove(...sentRequestToRemove)
          });
        }

        batch.update(senderRef, {
          friendNotifications: arrayUnion({
            type: 'rejection',
            from: auth.currentUser.uid,
            fromUsername: auth.currentUser.displayName || 'Anonymous',
            timestamp: new Date(),
            read: false
          })
        });
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
    <div className="friends-container">

      <div className="search-friends">
        <input
          type="text"
          placeholder="Search users by username..."
          value={searchUsername}
          onChange={(e) => setSearchUsername(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
        />
        <button onClick={searchUsers} disabled={searchLoading}>
          {searchLoading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {searchResults.length > 0 && (
        <div className="search-results">
          <h4>Search Results ({searchResults.length})</h4>
          {searchResults.map(user => (
            <div key={user.id} className="search-result-item">
              <div className="user-info">
                <div className="user-avatar">
                  <img
                    src={user.profileImage || "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"}
                    alt={user.username}
                    className="avatar-img"
                    onError={(e) => {
                      e.target.src = "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png";
                    }}
                  />
                </div>
                <div className="user-details">
                  <span className="username">{user.username}</span>
                </div>
              </div>
              {user.isAlreadyFriend ? (
                <button disabled className="already-friends-btn">
                  Already Friends
                </button>
              ) : user.hasPendingRequest ? (
                <button disabled className="pending-status-btn">
                  Pending
                </button>
              ) : (
                <button onClick={() => sendFriendRequest(user.id, user.username)}>
                  Add Friend
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Mini Tabs for Friends/Pending */}
      <div className="friends-mini-tabs">
        <button
          className={`friends-mini-tab ${friendsTabView === 'all' ? 'active' : ''}`}
          onClick={() => setFriendsTabView('all')}
        >
          All Friends
        </button>
        <button
          className={`friends-mini-tab ${friendsTabView === 'pending' ? 'active' : ''}`}
          onClick={() => setFriendsTabView('pending')}
        >
          Pending
          {totalPendingCount > 0 && (
            <span className="mini-tab-badge">{totalPendingCount}</span>
          )}
        </button>
      </div>

      {/* Show content based on selected mini tab */}
      {friendsTabView === 'pending' ? (
        <div className="pending-requests" style={{ borderBottom: 'none' }}>
          {/* Received Requests Section */}
          {pendingRequests.length > 0 && (
            <>
              <div className="pending-section-header">Received Requests</div>
              {pendingRequests.map((req, idx) => (
                <div key={`received-${idx}`} className="request-item">
                  <div
                    className="request-user-info clickable"
                    onClick={() => navigate(`/profile/${req.from}`)}
                    title={`View ${req.fromUsername}'s profile`}
                  >
                    <div className="request-avatar">
                      <img
                        src={req.fromProfileImage || "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"}
                        alt={req.fromUsername || 'Anonymous'}
                        className="avatar-img"
                        onError={(e) => {
                          e.target.src = "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png";
                        }}
                      />
                    </div>
                    <span className="username">{req.fromUsername || 'Anonymous'}</span>
                  </div>
                  <div className="request-actions">
                    <button onClick={() => acceptFriendRequest(req)}>Accept</button>
                    <button onClick={() => rejectFriendRequest(req)}>Reject</button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Sent Requests Section */}
          {sentFriendRequests.length > 0 && (
            <>
              <div className="pending-section-header">Sent Requests</div>
              {sentFriendRequests.map((req, idx) => (
                <div key={`sent-${idx}`} className="request-item sent-request-item">
                  <div
                    className="request-user-info clickable"
                    onClick={() => navigate(`/profile/${req.to}`)}
                    title={`View ${req.toUsername}'s profile`}
                  >
                    <div className="request-avatar">
                      <img
                        src={req.toProfileImage || "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"}
                        alt={req.toUsername || 'Anonymous'}
                        className="avatar-img"
                        onError={(e) => {
                          e.target.src = "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png";
                        }}
                      />
                    </div>
                    <span className="username">{req.toUsername || 'Anonymous'}</span>
                  </div>
                  <div className="request-actions">
                    <button disabled className="pending-status-btn">Pending</button>
                    <button
                      className="cancel-request-btn"
                      onClick={() => cancelSentRequest(req)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Empty state */}
          {pendingRequests.length === 0 && sentFriendRequests.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 'var(--space-lg)' }}>
              No pending friend requests
            </p>
          )}
        </div>
      ) : (
        <>

          <div className="friends-list">
            {friends.length === 0 ? (
              <p>No friends yet. Search to add!</p>
            ) : (
              friends.map(friend => (
                <div
                  key={friend.id}
                  className={`friend-item ${unreadCounts[friend.id] > 0 ? 'has-unread' : ''}`}
                >
                  <div
                    className="friend-content"
                    onClick={() => onSelectFriend({
                      id: friend.id,
                      username: friend.username,
                      profileImage: friend.profileImage || null
                    })}
                  >
                    <div className="friend-avatar">
                      <img
                        src={friend.profileImage || "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"}
                        alt={friend.username}
                        className="avatar-img"
                        onError={(e) => {
                          e.target.src = "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png";
                        }}
                      />
                    </div>
                    <div className="friend-info">
                      <span className="friend-name">{friend.username}</span>
                    </div>
                    {unreadCounts[friend.id] > 0 && (
                      <div className="unread-badge">
                        {unreadCounts[friend.id]}
                      </div>
                    )}
                  </div>

                  <button
                    className="unfriend-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      unfriend(friend.id, friend.username);
                    }}
                    title="Unfriend"
                  >
                    Unfriend
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default FriendsList;