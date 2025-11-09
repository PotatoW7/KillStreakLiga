import React, { useState, useEffect } from 'react';
import { 
  collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDocs, orderBy, getDoc 
} from 'firebase/firestore';
import { db, auth } from '../firebase';

function FriendsList({ onSelectFriend }) {
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    if (!auth.currentUser) return;

    const userRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribeUser = onSnapshot(userRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const friendsList = data.friends || [];
        setFriends(friendsList);
        setPendingRequests(data.pendingRequests || []);

        friendsList.forEach(friend => {
          const friendRef = doc(db, 'users', friend.id);
          const unsubscribeFriend = onSnapshot(friendRef, (friendDoc) => {
            if (friendDoc.exists()) {
              const friendData = friendDoc.data();
              setFriends(prevFriends => 
                prevFriends.map(f => 
                  f.id === friend.id 
                    ? { ...f, profileImage: friendData.profileImage }
                    : f
                )
              );
            }
          });

          return unsubscribeFriend;
        });
      }
    });

    return () => unsubscribeUser();
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
          
          results.push({
            id: docSnap.id,
            username: userData.username || 'Anonymous',
            email: userData.email,
            profileImage: userData.profileImage,
            isAlreadyFriend
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
      const targetUserRef = doc(db, 'users', targetUserId);
      await updateDoc(targetUserRef, {
        pendingRequests: arrayUnion({
          from: auth.currentUser.uid,
          fromUsername: auth.currentUser.displayName || 'Anonymous',
          timestamp: new Date()
        })
      });

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
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const friendRef = doc(db, 'users', request.from);

      const friendDoc = await getDoc(friendRef);
      const friendData = friendDoc.exists() ? friendDoc.data() : {};

      const currentUserDoc = await getDoc(userRef);
      const currentUserData = currentUserDoc.exists() ? currentUserDoc.data() : {};

      await updateDoc(userRef, {
        friends: arrayUnion({
          id: request.from,
          username: request.fromUsername || 'Anonymous',
          profileImage: friendData.profileImage || null
        }),
        pendingRequests: arrayRemove(request)
      });

      await updateDoc(friendRef, {
        friends: arrayUnion({
          id: auth.currentUser.uid,
          username: auth.currentUser.displayName || 'Anonymous',
          profileImage: currentUserData.profileImage || null
        })
      });

    } catch (error) {
      console.error('Error accepting friend request:', error);
      alert('Error accepting friend request: ' + error.message);
    }
  };

  const rejectFriendRequest = async (request) => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        pendingRequests: arrayRemove(request)
      });
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      alert('Error rejecting friend request: ' + error.message);
    }
  };

const unfriend = async (friendId, friendUsername) => {
  if (!window.confirm(`Are you sure you want to unfriend ${friendUsername}?`)) {
    return;
  }

     try {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const friendRef = doc(db, 'users', friendId);

    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();

    const friendToRemove = (userData.friends || []).find(f => f.id === friendId);
    if (!friendToRemove) {
      alert("Friend not found in your list.");
      return;
    }

    await updateDoc(userRef, {
      friends: arrayRemove(friendToRemove)
    });

    const friendSnap = await getDoc(friendRef);
    const friendData = friendSnap.data();

    const userToRemove = (friendData.friends || []).find(f => f.id === auth.currentUser.uid);
    if (userToRemove) {
      await updateDoc(friendRef, {
        friends: arrayRemove(userToRemove)
      });
    }

    alert(`You are no longer friends with ${friendUsername}`);
  } catch (error) {
    console.error('Error unfriending:', error);
    alert('Error unfriending: ' + error.message);
  }
};
  return (
    <div className="friends-container">
      <h3>Friends</h3>

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
              ) : (
                <button onClick={() => sendFriendRequest(user.id, user.username)}>
                  Add Friend
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {pendingRequests.length > 0 && (
        <div className="pending-requests">
          <h4>Pending Requests ({pendingRequests.length})</h4>
          {pendingRequests.map((req, idx) => (
            <div key={idx} className="request-item">
              <span className="username">{req.fromUsername || 'Anonymous'}</span>
              <div className="request-actions">
                <button onClick={() => acceptFriendRequest(req)}>Accept</button>
                <button onClick={() => rejectFriendRequest(req)}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

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
    </div>
  );
}

export default FriendsList;