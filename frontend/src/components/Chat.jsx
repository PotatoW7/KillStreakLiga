import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, onSnapshot as onSnapshotListener } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Link, useNavigate } from 'react-router-dom';

function Chat({ selectedFriend, onBack }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [friendProfile, setFriendProfile] = useState({
    ...selectedFriend,
    profileImage: selectedFriend.profileImage || null
  });
  const [senderProfiles, setSenderProfiles] = useState({});
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  if (!selectedFriend) return null;

  const chatId = [auth.currentUser.uid, selectedFriend.id].sort().join('_');

  useEffect(() => {
    const unsubscribeFunctions = [];
    
    const currentUserRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribeCurrentUser = onSnapshotListener(currentUserRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setSenderProfiles(prev => ({
          ...prev,
          [auth.currentUser.uid]: userData.profileImage || null
        }));
      }
    });
    unsubscribeFunctions.push(unsubscribeCurrentUser);

    const friendRef = doc(db, 'users', selectedFriend.id);
    const unsubscribeFriend = onSnapshotListener(friendRef, (docSnap) => {
      if (docSnap.exists()) {
        const friendData = docSnap.data();
        setFriendProfile(prev => ({
          ...prev,
          profileImage: friendData.profileImage || prev.profileImage,
          username: friendData.username || prev.username
        }));
        
        setSenderProfiles(prev => ({
          ...prev,
          [selectedFriend.id]: friendData.profileImage || null
        }));
      }
    });
    unsubscribeFunctions.push(unsubscribeFriend);

    const uniqueSenders = [...new Set(messages.map(msg => msg.senderId))];
    
    uniqueSenders.forEach(senderId => {
      if (senderId !== auth.currentUser.uid && senderId !== selectedFriend.id) {
        const senderRef = doc(db, 'users', senderId);
        const unsubscribe = onSnapshotListener(senderRef, (docSnap) => {
          if (docSnap.exists()) {
            const senderData = docSnap.data();
            setSenderProfiles(prev => ({
              ...prev,
              [senderId]: senderData.profileImage || null
            }));
          }
        });
        unsubscribeFunctions.push(unsubscribe);
      }
    });

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, [selectedFriend.id, messages]);

  useEffect(() => {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshotListener(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      scrollToBottom();
      markMessagesAsRead(msgs);
    });
    return () => unsubscribe();
  }, [chatId]);

  const markMessagesAsRead = async (msgs) => {
    const unreadMessages = msgs.filter(msg => 
      msg.senderId !== auth.currentUser.uid && 
      !msg.read
    );

    for (const msg of unreadMessages) {
      const messageRef = doc(db, 'chats', chatId, 'messages', msg.id);
      await updateDoc(messageRef, {
        read: true,
        readAt: serverTimestamp()
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    await addDoc(messagesRef, {
      text: newMessage,
      senderId: auth.currentUser.uid,
      senderName: auth.currentUser.displayName,
      timestamp: serverTimestamp(),
      read: false,
      type: 'text'
    });
    setNewMessage('');
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, GIF, WebP)');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      alert('Image size should be less than 20MB');
      return;
    }

    setUploading(true);
    try {
      const base64String = await fileToBase64(file);
      
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      await addDoc(messagesRef, {
        imageData: base64String,
        fileName: file.name,
        fileSize: file.size,
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName,
        timestamp: serverTimestamp(),
        read: false,
        type: 'image'
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const getOptimizedImageSrc = (base64Data) => {
    return base64Data;
  };

  const getSenderProfileImage = (senderId) => {
    if (senderProfiles[senderId]) {
      return senderProfiles[senderId];
    }
    
    if (senderId === auth.currentUser.uid) {
      return auth.currentUser.photoURL || "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png";
    }
    
    return "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png";
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <button onClick={onBack} className="back-btn">← Back</button>
        <div className="chat-friend-info">
          <img 
            src={friendProfile.profileImage || "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"} 
            alt={friendProfile.username}
            className="chat-friend-avatar"
          />
          <h3>{friendProfile.username}</h3>
        </div>
        <div className="chat-status">
          {messages.some(msg => 
            msg.senderId !== auth.currentUser.uid && !msg.read
          ) && <span className="new-messages-indicator">New messages</span>}
        </div>
      </div>

      <div className="chat-messages">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`chat-message ${msg.senderId === auth.currentUser.uid ? 'sent' : 'received'}`}
          >
            <div className="message-user-info">
              <img 
                src={getSenderProfileImage(msg.senderId)} 
                alt={msg.senderName}
                className="message-profile-img"
              />
              <span className="message-username">
                {msg.senderId === auth.currentUser.uid ? auth.currentUser.displayName : msg.senderName}
              </span>
            </div>
            
            {msg.type === 'image' ? (
              <div className="message-image-container">
                <img 
                  src={getOptimizedImageSrc(msg.imageData || msg.imageUrl)} 
                  alt="Shared content" 
                  className="message-image"
                  onClick={() => {
                    if (msg.imageData) {
                      const newWindow = window.open();
                      newWindow.document.write(`<img src="${msg.imageData}" style="max-width: 100%;" />`);
                    } else if (msg.imageUrl) {
                      window.open(msg.imageUrl, '_blank');
                    }
                  }}
                />
              </div>
            ) : (
              <div className={`message-text ${msg.senderId === auth.currentUser.uid ? 'sent-text' : 'received-text'}`}>
                {msg.text}
                {msg.senderId === auth.currentUser.uid && (
                  <span className="message-status">
                    {msg.read ? '✓✓' : '✓'}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          style={{ display: 'none' }}
        />
        <button 
          onClick={triggerFileInput} 
          disabled={uploading}
          className="attach-btn"
          title="Attach image (20MB max)"
        >
          {uploading ? '📤' : '📎'}
        </button>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          disabled={uploading}
        />
        <button 
          onClick={handleSend} 
          disabled={uploading || !newMessage.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default Chat;