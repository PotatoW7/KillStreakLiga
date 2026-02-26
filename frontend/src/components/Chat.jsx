import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase';
import IconRenderer, { LoLSuggestions } from './IconRenderer';

function Chat({ selectedFriend, onBack, isSocialOpen }) {
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [suggestionCoords, setSuggestionCoords] = useState({ top: 0, left: 0 });
  const [activeVideo, setActiveVideo] = useState(null);
  const [activeImagePreview, setActiveImagePreview] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const prevMessageCountRef = useRef(0);

  const messagesEndRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  if (!selectedFriend) {
    return (
      <div className="chat-container">
        <div className="chat-header">
          <button onClick={onBack} className="chat-back-btn">
            <span className="arrow">←</span> Back
          </button>
        </div>
        <div className="chat-messages">
          <div className="no-chat-selected" />
        </div>
      </div>
    );
  }

  const chatId = [auth.currentUser.uid, selectedFriend.id].sort().join('_');

  useEffect(() => {
    const chatMessages = chatMessagesRef.current;
    if (!chatMessages) return;

    const handleWheel = (e) => {
      const { scrollTop, scrollHeight, clientHeight } = chatMessages;
      const isAtTop = scrollTop === 0;
      const isAtBottom = Math.abs(scrollTop + clientHeight - scrollHeight) < 1;

      if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    chatMessages.addEventListener('wheel', handleWheel, { passive: false });
    return () => chatMessages.removeEventListener('wheel', handleWheel);
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const markMessagesAsRead = async (msgs) => {
    if (!isSocialOpen || !selectedFriend) return;

    const unreadMessages = msgs.filter(
      (msg) => msg.senderId !== auth.currentUser.uid && !msg.read
    );

    if (unreadMessages.length === 0) return;

    try {
      const batch = writeBatch(db);
      unreadMessages.forEach(msg => {
        const messageRef = doc(db, 'chats', chatId, 'messages', msg.id);
        batch.update(messageRef, {
          read: true,
          readAt: serverTimestamp(),
        });
      });
      await batch.commit();
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  useEffect(() => {
    if (selectedFriend) {
      setFriendProfile(prev => ({
        ...prev,
        profileImage: selectedFriend.profileImage || null,
        username: selectedFriend.username || 'Unknown User',
      }));
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
          profileImage: friendData.profileImage || null,
          username: friendData.username || 'Unknown User',
        }));

        setSenderProfiles((prev) => ({
          ...prev,
          [selectedFriend.id]: friendData.profileImage || null,
        }));
      }
    });
    unsubscribeFunctions.push(unsubscribeFriend);

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    const unsubscribeMsgs = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      markMessagesAsRead(msgs);
    });
    unsubscribeFunctions.push(unsubscribeMsgs);

    return () => unsubscribeFunctions.forEach((unsub) => unsub());
  }, [selectedFriend.id, chatId, isSocialOpen]);

  useEffect(() => {
    const handleActivity = () => {
      if (messages.length > 0) markMessagesAsRead(messages);
    };

    window.addEventListener('focus', handleActivity);
    document.addEventListener('visibilitychange', handleActivity);

    return () => {
      window.removeEventListener('focus', handleActivity);
      document.removeEventListener('visibilitychange', handleActivity);
    };
  }, [messages, chatId]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    const currentCount = messages.length;
    if (currentCount > prevMessageCountRef.current) {
      // Only scroll when a new message arrives, not on deletion
      scrollToBottom();
    }
    prevMessageCountRef.current = currentCount;
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    const socialPreview = getSocialPreview(newMessage);

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    await addDoc(messagesRef, {
      text: newMessage,
      senderId: auth.currentUser.uid,
      senderName: auth.currentUser.displayName || 'Anonymous',
      timestamp: serverTimestamp(),
      read: false,
      type: 'text',
      socialPreview: socialPreview || null,
    });

    setNewMessage('');
    scrollToBottom();
  };

  const getSocialPreview = (content) => {
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com\/(?:v\/|e(?:mbed)\/|shorts\/|watch\?v=)|youtu\.be\/|youtube-nocookie\.com\/(?:v|e(?:mbed)\/))([a-zA-Z0-9_-]{11})/;
    const tiktokRegex = /(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com\/@[\w.-]+\/video\/(\d+)|vt\.tiktok\.com\/(\w+))/;
    const instagramRegex = /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com\/(?:p|reels|reel)\/([\w-]+))/;
    const xRegex = /(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\/\w+\/status\/(\d+)/;

    const ytMatch = content.match(youtubeRegex);
    if (ytMatch) {
      return { type: 'youtube', id: ytMatch[1], thumbnail: `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg` };
    }

    const ttMatch = content.match(tiktokRegex);
    if (ttMatch) {
      const videoId = ttMatch[1] || ttMatch[2];
      return {
        type: 'tiktok',
        id: videoId,
        thumbnail: 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png',
        isIcon: true
      };
    }

    const igMatch = content.match(instagramRegex);
    if (igMatch) {
      return {
        type: 'instagram',
        id: igMatch[1],
        thumbnail: 'https://cdn-icons-png.flaticon.com/512/174/174855.png',
        isIcon: true
      };
    }

    const xMatch = content.match(xRegex);
    if (xMatch) {
      return { type: 'x', id: xMatch[1], thumbnail: 'https://cdn-icons-png.flaticon.com/512/5968/5968830.png' };
    }

    return null;
  };

  const getCaretCoordinates = (textarea) => {
    const { clientWidth } = textarea;
    const styles = window.getComputedStyle(textarea);

    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordBreak = 'break-word';
    div.style.width = clientWidth + 'px';
    div.style.font = styles.font;
    div.style.padding = styles.padding;
    div.style.border = styles.border;
    div.style.lineHeight = styles.lineHeight;

    const content = textarea.value.substring(0, textarea.selectionStart);
    div.textContent = content;

    const span = document.createElement('span');
    span.textContent = textarea.value.substring(textarea.selectionStart) || '.';
    div.appendChild(span);

    document.body.appendChild(div);
    const { offsetLeft: spanLeft, offsetTop: spanTop } = span;
    const { scrollTop } = textarea;
    document.body.removeChild(div);

    return {
      top: spanTop - scrollTop - 5,
      left: Math.min(spanLeft, clientWidth - 200)
    };
  };

  const handleTextareaChange = (value) => {
    setNewMessage(value);
    const textarea = inputRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const match = textBeforeCursor.match(/:([a-z0-9_']*)$/i);

    if (match) {
      const query = match[1];
      const coords = getCaretCoordinates(textarea);
      setShowSuggestions(true);
      setSuggestionQuery(query);
      setSuggestionIndex(0);
      setSuggestionCoords(coords);
    } else {
      setShowSuggestions(false);
      setSuggestionQuery('');
    }
  };

  const insertSuggestion = (icon) => {
    const textarea = inputRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = newMessage.substring(0, cursorPosition);
    const textAfterCursor = newMessage.substring(cursorPosition);
    const lastColonIndex = textBeforeCursor.lastIndexOf(':');

    const newValue = textBeforeCursor.substring(0, lastColonIndex) + `:${icon.name.toLowerCase().replace(/\s+/g, '_').replace(/['.]/g, '')}: ` + textAfterCursor;

    setNewMessage(newValue);
    setShowSuggestions(false);

    setTimeout(() => {
      textarea.focus();
      const newPos = lastColonIndex + icon.name.length + 3;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex(prev => Math.min(prev + 1, 4));
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex(prev => Math.max(prev - 1, 0));
        return;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const activeItem = document.querySelector('.suggestion-item.active');
        if (activeItem) {
          activeItem.click();
        }
        return;
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleOpenVideo = (preview) => {
    setActiveVideo(preview);
  };

  const handleCloseVideo = () => {
    setActiveVideo(null);
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
        'https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png'
      );
    return 'https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png';
  };



  return (
    <div className="chat-container">
      <div className="chat-bg-overlay" />

      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <button onClick={onBack} className="chat-back-btn">
            <span className="arrow">←</span>
          </button>
          <div className="chat-profile-row">
            <div className="chat-avatar-wrapper">
              <div className="chat-avatar-glow" />
              <img
                src={friendProfile?.profileImage || 'https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png'}
                alt={friendProfile?.username}
                className="chat-friend-avatar"
              />
            </div>
            <div className="chat-header-text">
              <h3
                className="chat-friend-name"
                onClick={() => navigate(`/profile/${selectedFriend.id}`)}
              >
                {friendProfile?.username}
              </h3>
            </div>
          </div>
        </div>

      </div>

      {/* Message Stream */}
      <div
        ref={chatMessagesRef}
        className="chat-messages custom-scrollbar"
        onWheel={(e) => {
          const element = e.currentTarget;
          const isAtTop = element.scrollTop === 0;
          const isAtBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
          if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
            e.stopPropagation();
          }
        }}
      >
        {messages.map((msg, idx) => {
          const isOwnMessage = msg.senderId === auth.currentUser.uid;
          const isDeleting = deletingMessageId === msg.id;
          const showUser = idx === 0 || messages[idx - 1].senderId !== msg.senderId;

          return (
            <div
              key={msg.id}
              className={`message-row ${isOwnMessage ? 'own' : 'other'} ${isDeleting ? 'deleting' : ''}`}
              onContextMenu={(e) => handleRightClick(e, msg)}
            >
              {showUser && (
                <div className="message-user-info">
                  <img
                    src={getSenderProfileImage(msg.senderId)}
                    alt={msg.senderName}
                    className="message-sender-avatar"
                  />
                  <span className="message-sender-name">
                    {isOwnMessage ? 'You' : msg.senderName}
                  </span>
                </div>
              )}

              <div className="message-content-wrapper">
                {editingMessageId === msg.id ? (
                  <div className="chat-edit-panel">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="chat-edit-textarea custom-scrollbar"
                      rows={3}
                      autoFocus
                    />
                    <div className="fl-actions" style={{ justifyContent: 'flex-end' }}>
                      <button onClick={handleCancelEdit} className="fl-cancel-text-btn">Cancel</button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={!editText.trim() || editText === msg.text}
                        className="fl-accept-btn"
                        style={{ height: '32px' }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="message-bubble">
                      <div className="message-text">
                        <IconRenderer text={msg.text} />
                      </div>

                      {msg.socialPreview && (
                        <div
                          className={`message-preview ${msg.socialPreview.isIcon ? 'icon' : 'video'}`}
                          onClick={() => handleOpenVideo(msg.socialPreview)}
                        >
                          <img
                            src={msg.socialPreview.thumbnail}
                            alt="Preview"
                            className="message-preview-thumb"
                          />
                          <div className="message-preview-overlay" />
                          <div className="message-play-btn">
                            <div className="play-icon-box">
                              <span style={{ marginLeft: '4px' }}>▶</span>
                            </div>
                            {!msg.socialPreview.isIcon && <span className="play-btn-text">Play Video</span>}
                          </div>
                        </div>
                      )}

                      {msg.type === 'image' && (
                        <div className="message-image-shared" onClick={() => setActiveImagePreview(msg.imageUrl || msg.imageData)}>
                          <img src={msg.imageUrl || msg.imageData} alt="Shared" className="message-image" />
                          <div className="image-overlay">
                            <span className="view-image-badge">View Image</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="message-meta">
                      <span>{msg.timestamp ? new Date(msg.timestamp?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just Now'}</span>
                      {msg.edited && <span className="edited-label">Edited</span>}
                      {isOwnMessage && <span className={msg.read ? 'status-read' : 'status-sent'}>{msg.read ? 'Read ✓✓' : 'Sent ✓'}</span>}
                    </div>

                    {contextMenu === msg.id && isOwnMessage && !isDeleting && (
                      <div className="chat-context-menu">
                        <button onClick={() => handleEditMessage(msg.id, msg.text)} className="context-btn edit" title="Edit">✏️</button>
                        <button onClick={() => handleDeleteMessage(msg.id)} className="context-btn delete" title="Delete">🗑️</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Section */}
      <div className="chat-footer">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileInputRef.current.click()}
          disabled={uploading}
          className="chat-upload-btn"
          title="Upload Image (20MB Max)"
        >
          {uploading ? (
            <div className="lg-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
          ) : (
            <img
              src="/project-icons/Friends and Chat icons/addimage.png"
              alt="Add"
              className="chat-add-image-icon"
            />
          )}
        </button>

        <div className="chat-input-wrapper">
          {showSuggestions && (
            <div
              className="suggestion-popover"
              style={{ left: suggestionCoords.left }}
            >
              <LoLSuggestions
                query={suggestionQuery}
                activeIndex={suggestionIndex}
                onSelect={insertSuggestion}
              />
            </div>
          )}
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => handleTextareaChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={uploading}
            placeholder="Type a message..."
            className="chat-textarea"
            style={{ overflow: 'hidden' }}
            rows={1}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
          />
          <button
            onClick={handleSend}
            disabled={uploading || !newMessage.trim()}
            className="chat-send-btn"
          >
            <span>➤</span>
          </button>
        </div>
      </div>

      {activeVideo && createPortal(
        <div className="video-modal-overlay">
          <div className="video-modal-backdrop" onClick={handleCloseVideo} />
          <div className="video-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="video-modal-header">
              <div className="video-modal-title">
                <div className="video-type-dot" />
                <span className="video-type-label">{activeVideo.type}</span>
              </div>
              <button onClick={handleCloseVideo} className="video-close-btn">
                ✕
              </button>
            </div>
            <div className="video-iframe-wrapper">
              {activeVideo.type === 'youtube' && (
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1`}
                  title="YouTube Video"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              )}
              {activeVideo.type === 'tiktok' && (
                <iframe
                  src={`https://www.tiktok.com/embed/v2/${activeVideo.id}?rel=0&loop=1`}
                  style={{ width: '100%', height: '600px', border: 'none', borderRadius: '12px' }}
                  allowFullScreen
                ></iframe>
              )}
              {activeVideo.type === 'instagram' && (
                <iframe
                  src={`https://www.instagram.com/p/${activeVideo.id}/embed`}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allowFullScreen
                ></iframe>
              )}
              {activeVideo.type === 'x' && (
                <div className="x-link-fallback">
                  <div className="x-logo-box">𝕏</div>
                  <div className="x-text-info">
                    <p className="x-fallback-title">External Link Required</p>
                    <p className="x-fallback-desc">X (Twitter) videos cannot be rendered here. Use the direct link.</p>
                  </div>
                  <a
                    href={`https://x.com/i/status/${activeVideo.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="x-open-btn"
                  >
                    Open Link
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {activeImagePreview && createPortal(
        <div className="video-modal-overlay" onClick={() => setActiveImagePreview(null)}>
          <div className="video-modal-backdrop" />
          <div className="image-preview-modal-container" style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
            <img src={activeImagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 30px 100px rgba(0, 0, 0, 0.8)' }} />
            <button onClick={() => setActiveImagePreview(null)} className="video-close-btn" style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 110, background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ✕
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default Chat;