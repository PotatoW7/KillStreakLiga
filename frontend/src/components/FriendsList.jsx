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
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-white/5 bg-white/[0.01]">
        <div className="relative group">
          <input
            type="text"
            placeholder="Search Users..."
            value={searchUsername}
            onChange={(e) => setSearchUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
            className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:bg-white/8 transition-all uppercase tracking-widest italic"
          />
          <button
            onClick={searchUsers}
            disabled={searchLoading}
            className="absolute right-2 top-2 h-8 px-4 bg-primary text-black font-black text-[9px] tracking-widest uppercase rounded-lg hover:bg-white transition-all disabled:opacity-50 italic"
          >
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {searchResults.length > 0 && (
        <div className="p-6 bg-primary/5 border-b border-white/5 animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-3 bg-primary rounded-full shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
            <h4 className="font-display font-black text-[10px] uppercase tracking-[0.3em] text-white italic">Search Results ({searchResults.length})</h4>
          </div>
          <div className="space-y-3">
            {searchResults.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 rounded-2xl bg-black/20 border border-white/5 group hover:border-primary/20 transition-all">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={user.profileImage || "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"}
                      alt={user.username}
                      className="w-10 h-10 rounded-xl object-cover border border-white/10"
                      onError={(e) => { e.target.src = "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"; }}
                    />
                  </div>
                  <span className="font-display font-black text-xs text-white uppercase italic tracking-tight">{user.username}</span>
                </div>
                {user.isAlreadyFriend ? (
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-widest px-3 py-1.5 rounded-lg bg-white/5 italic">Friends</span>
                ) : user.hasPendingRequest ? (
                  <span className="text-[8px] font-black text-primary uppercase tracking-widest px-3 py-1.5 rounded-lg bg-primary/10 italic">Sent</span>
                ) : (
                  <button
                    onClick={() => sendFriendRequest(user.id, user.username)}
                    className="h-8 px-4 bg-white/5 hover:bg-primary hover:text-black border border-white/10 hover:border-primary font-black text-[9px] tracking-[0.2em] uppercase rounded-lg transition-all italic"
                  >
                    + Connect
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex p-2 bg-black/20 mx-6 mt-6 rounded-xl border border-white/5">
        <button
          className={`flex-1 h-9 rounded-lg font-black text-[9px] tracking-[0.3em] uppercase transition-all flex items-center justify-center italic ${friendsTabView === 'all' ? 'bg-primary text-black' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
          onClick={() => setFriendsTabView('all')}
        >
          All Friends
        </button>
        <button
          className={`flex-1 h-9 rounded-lg font-black text-[9px] tracking-[0.3em] uppercase transition-all flex items-center justify-center gap-2 italic ${friendsTabView === 'pending' ? 'bg-primary text-black' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
          onClick={() => setFriendsTabView('pending')}
        >
          Pending
          {totalPendingCount > 0 && (
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] ${friendsTabView === 'pending' ? 'bg-black text-primary' : 'bg-primary text-black shadow-[0_0_8px_rgba(234,179,8,0.5)]'}`}>{totalPendingCount}</span>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {friendsTabView === 'pending' ? (
          <div className="p-6 space-y-8">
            {pendingRequests.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                  <div className="w-1 h-3 bg-primary/40 rounded-full" />
                  <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 italic">Friend Requests</h5>
                </div>
                {pendingRequests.map((req, idx) => (
                  <div key={`received-${idx}`} className="glass-panel p-4 rounded-2xl border-white/5 flex items-center justify-between group hover:border-primary/20 transition-all relative overflow-hidden">
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10 flex items-center gap-4">
                      <div className="relative cursor-pointer" onClick={() => navigate(`/profile/${req.from}`)}>
                        <img
                          src={req.fromProfileImage || "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"}
                          alt={req.fromUsername}
                          className="w-10 h-10 rounded-xl object-cover border border-white/10"
                        />
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary border-2 border-background rounded-full animate-pulse" />
                      </div>
                      <span className="font-display font-black text-xs text-white uppercase italic tracking-tight">{req.fromUsername}</span>
                    </div>
                    <div className="relative z-10 flex gap-2">
                      <button onClick={() => acceptFriendRequest(req)} className="h-9 px-4 bg-primary text-black font-black text-[9px] tracking-widest uppercase rounded-lg hover:bg-white transition-all shadow-xl active:scale-95 italic text-center">✓ Accept</button>
                      <button onClick={() => rejectFriendRequest(req)} className="w-9 h-9 bg-white/5 border border-white/10 text-white/40 hover:text-red-500 hover:border-red-500/30 flex items-center justify-center rounded-lg transition-all active:scale-95 text-center">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {sentFriendRequests.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                  <div className="w-1 h-3 bg-white/20 rounded-full" />
                  <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 italic">Sent Requests</h5>
                </div>
                {sentFriendRequests.map((req, idx) => (
                  <div key={`sent-${idx}`} className="glass-panel p-4 rounded-2xl border-white/5 flex items-center justify-between group opacity-70 hover:opacity-100 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="relative cursor-pointer" onClick={() => navigate(`/profile/${req.to}`)}>
                        <img
                          src={req.toProfileImage || "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"}
                          alt={req.toUsername}
                          className="w-10 h-10 rounded-xl object-cover border border-white/10"
                        />
                      </div>
                      <span className="font-display font-black text-xs text-white uppercase italic tracking-tight">{req.toUsername}</span>
                    </div>
                    <button
                      className="h-9 px-4 border border-white/10 text-white/20 hover:text-red-500 hover:border-red-500/30 font-black text-[9px] tracking-widest uppercase rounded-lg transition-all italic text-center"
                      onClick={() => cancelSentRequest(req)}
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}

            {pendingRequests.length === 0 && sentFriendRequests.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-center opacity-30 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <img src="/project-icons/Friends and Chat icons/bell.png" alt="Empty" className="w-5 h-5 grayscale" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white italic">No pending requests</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6">
            {friends.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center opacity-30 space-y-4 mt-20">
                <div className="w-16 h-16 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center">
                  <img src="/project-icons/Friends and Chat icons/comment chat balloon.png" alt="No Friends" className="w-6 h-6 grayscale" />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-widest text-white italic">No friends yet</p>
                  <p className="text-[9px] font-bold text-white uppercase tracking-[0.2em] max-w-[160px]">No friends found. Search for users to add them.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pb-8">
                {friends.map(friend => (
                  <div
                    key={friend.id}
                    className={`glass-panel p-4 rounded-[2rem] border-white/5 hover:border-primary/30 transition-all group relative overflow-hidden flex items-center justify-between ${unreadCounts[friend.id] > 0 ? 'bg-primary/5' : ''}`}
                  >
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div
                      className="relative z-10 flex items-center gap-4 flex-1 cursor-pointer"
                      onClick={() => onSelectFriend({
                        id: friend.id,
                        username: friend.username,
                        profileImage: friend.profileImage || null
                      })}
                    >
                      <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full scale-0 group-hover:scale-100 transition-transform duration-700" />
                        <img
                          src={friend.profileImage || "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"}
                          alt={friend.username}
                          className="w-12 h-12 rounded-2xl object-cover border border-white/10 group-hover:border-primary/40 transition-colors"
                          onError={(e) => { e.target.src = "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"; }}
                        />
                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="font-display font-black text-sm text-white uppercase italic tracking-tight group-hover:text-primary transition-colors">{friend.username}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] group-hover:text-white/40 transition-colors italic">Online</span>
                        </div>
                      </div>
                      {unreadCounts[friend.id] > 0 && (
                        <div className="ml-auto w-6 h-6 rounded-lg bg-red-500 flex items-center justify-center text-[10px] font-black text-white shadow-lg animate-bounce border border-red-400/50">
                          {unreadCounts[friend.id]}
                        </div>
                      )}
                    </div>

                    <button
                      className="relative z-10 p-3 opacity-0 group-hover:opacity-40 hover:opacity-100 hover:text-red-500 transition-all flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        unfriend(friend.id, friend.username);
                      }}
                      title="Unfriend"
                    >
                      <span className="text-lg">✕</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default FriendsList;