import React, { useState, useEffect, useRef } from 'react';
import { collection, query,orderBy,onSnapshot, addDoc,serverTimestamp,doc,updateDoc,deleteDoc,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

function Chat({ selectedFriend, onBack }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [friendProfile, setFriendProfile] = useState({
    profileImage: null,
    username: '',
  });
  const [senderProfiles, setSenderProfiles] = useState({});
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  if (!selectedFriend) {
    return (
      <div className="chat-container">
        <div className="chat-header">
          <button onClick={onBack} className="back-btn">← Back</button>
          <div className="chat-friend-info">
            <h3>Select a friend to start chatting</h3>
          </div>
        </div>
        <div className="chat-messages">
          <div className="no-chat-selected">
            <p>Please select a friend from the list to start chatting</p>
          </div>
        </div>
      </div>
    );
  }

  const chatId = [auth.currentUser.uid, selectedFriend.id].sort().join('_');

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const markMessagesAsRead = async (msgs) => {
    const unreadMessages = msgs.filter(
      (msg) => msg.senderId !== auth.currentUser.uid && !msg.read
    );

    for (const msg of unreadMessages) {
      const messageRef = doc(db, 'chats', chatId, 'messages', msg.id);
      await updateDoc(messageRef, {
        read: true,
        readAt: serverTimestamp(),
      });
    }
  };

  useEffect(() => {
    if (selectedFriend) {
      setFriendProfile({
        profileImage: selectedFriend.profileImage || null,
        username: selectedFriend.username || 'Unknown User',
      });
    }
  }, [selectedFriend]);

  useEffect(() => {
    const unsubscribeFunctions = [];

    const currentUserRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribeCurrentUser = onSnapshot(currentUserRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setSenderProfiles((prev) => ({
          ...prev,
          [auth.currentUser.uid]: userData.profileImage || null,
        }));
      }
    });
    unsubscribeFunctions.push(unsubscribeCurrentUser);

    const friendRef = doc(db, 'users', selectedFriend.id);
    const unsubscribeFriend = onSnapshot(friendRef, (docSnap) => {
      if (docSnap.exists()) {
        const friendData = docSnap.data();
        setFriendProfile((prev) => ({
          ...prev,
          profileImage: friendData.profileImage || prev.profileImage,
          username: friendData.username || prev.username,
        }));

        setSenderProfiles((prev) => ({
          ...prev,
          [selectedFriend.id]: friendData.profileImage || null,
        }));
      }
    });
    unsubscribeFunctions.push(unsubscribeFriend);

    return () => unsubscribeFunctions.forEach((unsub) => unsub());
  }, [selectedFriend.id]);

  useEffect(() => {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      markMessagesAsRead(msgs);
    });
    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    await addDoc(messagesRef, {
      text: newMessage,
      senderId: auth.currentUser.uid,
      senderName: auth.currentUser.displayName,
      timestamp: serverTimestamp(),
      read: false,
      type: 'text',
    });

    setNewMessage('');
    scrollToBottom();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRightClick = (e, message) => {
    e.preventDefault();
    if (message.senderId !== auth.currentUser.uid) return;
    setContextMenu(message.id);
  };

  const handleDeleteMessage = async (messageId) => {
    if (!messageId) return;
    try {
      setDeletingMessageId(messageId);
      setTimeout(async () => {
        const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
        await deleteDoc(messageRef);
        setContextMenu(null);
        setDeletingMessageId(null);
      }, 300);
    } catch (error) {
      console.error('Error deleting message:', error);
      setDeletingMessageId(null);
    }
  };

  const handleEditMessage = (messageId, messageText) => {
    setEditingMessageId(messageId);
    setEditText(messageText);
    setContextMenu(null);
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId) return;
    const original = messages.find((m) => m.id === editingMessageId);
    if (!editText.trim() || editText === original?.text) {
      setEditingMessageId(null);
      setEditText('');
      return;
    }

    try {
      const messageRef = doc(db, 'chats', chatId, 'messages', editingMessageId);
      await updateDoc(messageRef, {
        text: editText,
        edited: true,
        editedAt: serverTimestamp(),
      });
      setEditingMessageId(null);
      setEditText('');
    } catch (err) {
      console.error('Error editing message:', err);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  const handleImageUpload = async (file) => {
    if (!file) return;

    const validTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
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
        type: 'image',
      });
      scrollToBottom();
    } catch (err) {
      console.error('Error uploading image:', err);
      alert('Error uploading image. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    const handlePaste = (e) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            handleImageUpload(file);
            e.preventDefault();
          }
        }
      }
    };

    const input = inputRef.current;
    if (input) input.addEventListener('paste', handlePaste);
    return () => input?.removeEventListener('paste', handlePaste);
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) handleImageUpload(file);
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  const getSenderProfileImage = (senderId) => {
    if (senderProfiles[senderId]) return senderProfiles[senderId];
    if (senderId === auth.currentUser.uid)
      return (
        auth.currentUser.photoURL ||
        'https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png'
      );
    return 'https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png';
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <button onClick={onBack} className="back-btn">← Back</button>
        <div className="chat-friend-info">
          <img
            src={
              friendProfile?.profileImage ||
              'https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png'
            }
            alt={friendProfile?.username}
            className="chat-friend-avatar"
          />
          <h3>{friendProfile?.username}</h3>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((msg) => {
          const isOwnMessage = msg.senderId === auth.currentUser.uid;
          const isDeleting = deletingMessageId === msg.id;

          return (
            <div
              key={msg.id}
              className={`chat-message ${isOwnMessage ? 'sent' : 'received'} ${
                editingMessageId === msg.id ? 'editing' : ''
              } ${isDeleting ? 'deleting' : ''}`}
              onContextMenu={(e) => handleRightClick(e, msg)}
            >
              <div className="message-user-info">
                <img
                  src={getSenderProfileImage(msg.senderId)}
                  alt={msg.senderName}
                  className="message-profile-img"
                />
                <span className="message-username">
                  {isOwnMessage ? auth.currentUser.displayName : msg.senderName}
                </span>
              </div>

              <div className="message-content-wrapper">
                {msg.type === 'image' ? (
                  <div className="message-bubble-wrapper">
                    <div className="message-image-container">
                      <img
                        src={msg.imageData}
                        alt="Shared content"
                        className="message-image"
                        onClick={() => {
                          const newWindow = window.open();
                          newWindow.document.write(
                            `<img src="${msg.imageData}" style="max-width: 100%;" />`
                          );
                        }}
                      />
                    </div>
                    {contextMenu === msg.id && isOwnMessage && !isDeleting && (
                      <div className="message-context-menu">
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="context-icon-btn delete-icon"
                          title="Delete message"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                ) : editingMessageId === msg.id ? (
                  <div className="message-edit-container">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="message-edit-textarea"
                      rows={3}
                      autoFocus
                    />
                    <div className="message-edit-actions">
                      <button
                        onClick={handleSaveEdit}
                        className="save-edit-btn"
                        disabled={!editText.trim() || editText === msg.text}
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="cancel-edit-btn"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="message-bubble-wrapper">
                    <div
                      className={`message-text ${
                        isOwnMessage ? 'sent-text' : 'received-text'
                      }`}
                    >
                      {msg.text.split('\n').map((line, index) => (
                        <React.Fragment key={index}>
                          {line}
                          {index < msg.text.split('\n').length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </div>
                    {contextMenu === msg.id && isOwnMessage && !isDeleting && (
                      <div className="message-context-menu">
                        <button
                          onClick={() => handleEditMessage(msg.id, msg.text)}
                          className="context-icon-btn edit-icon"
                          title="Edit message"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="context-icon-btn delete-icon"
                          title="Delete message"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="message-meta">
                {msg.edited && <span className="message-edited">(edited)</span>}
                {isOwnMessage && (
                  <span className="message-status">
                    {msg.read ? '✓✓' : '✓'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
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

        <textarea
          ref={inputRef}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={uploading}
          placeholder="Type a message..."
          rows={1}
          className="chat-input-textarea"
        />

        <button
          onClick={handleSend}
          disabled={uploading || !newMessage.trim()}
          className="send-btn"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default Chat;
