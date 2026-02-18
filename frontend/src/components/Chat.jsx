import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import IconRenderer, { LoLSuggestions } from './IconRenderer';


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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [suggestionCoords, setSuggestionCoords] = useState({ top: 0, left: 0 });
  const [activeVideo, setActiveVideo] = useState(null);

  const messagesEndRef = useRef(null);

  const chatMessagesRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();


  if (!selectedFriend) {
    return (
      <div className="chat-container">
        <div className="chat-header">
          <button onClick={onBack} className="back-btn">← Back</button>
          <div className="chat-friend-info">
          </div>
        </div>
        <div className="chat-messages">
          <div className="no-chat-selected">
          </div>
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

    return () => {
      chatMessages.removeEventListener('wheel', handleWheel);
    };
  }, []);

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

    const socialPreview = getSocialPreview(newMessage);

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    await addDoc(messagesRef, {
      text: newMessage,
      senderId: auth.currentUser.uid,
      senderName: auth.currentUser.displayName,
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
      top: spanTop - scrollTop - 5, // Adjusted for positioning above input
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
          <h3
            className="friend-username-clickable"
            onClick={() => navigate(`/profile/${selectedFriend.id}`)}
            style={{ cursor: 'pointer' }}
            title="View Profile"
          >
            {friendProfile?.username}
          </h3>
        </div>
      </div>

      <div
        ref={chatMessagesRef}
        className="chat-messages"
        onWheel={(e) => {
          const element = e.currentTarget;
          const isAtTop = element.scrollTop === 0;
          const isAtBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 1;

          if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
            e.stopPropagation();
          }
        }}
      >
        {messages.map((msg) => {
          const isOwnMessage = msg.senderId === auth.currentUser.uid;
          const isDeleting = deletingMessageId === msg.id;

          return (
            <div
              key={msg.id}
              className={`chat-message ${isOwnMessage ? 'sent' : 'received'} ${editingMessageId === msg.id ? 'editing' : ''
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
                      className={`message-text ${isOwnMessage ? 'sent-text' : 'received-text'
                        }`}
                    >
                      <IconRenderer text={msg.text} />
                      {msg.socialPreview && (
                        <div
                          className={`yt-preview-container ${msg.socialPreview.isIcon ? 'icon-preview' : ''}`}
                          onClick={() => handleOpenVideo(msg.socialPreview)}
                          title="Watch Video"
                        >
                          <img
                            src={msg.socialPreview.thumbnail}
                            alt="Social Preview"
                            className={`yt-thumbnail ${msg.socialPreview.isIcon ? 'social-icon' : ''}`}
                          />
                          <div className="yt-play-overlay">
                            <span className="watch-hint">Click to Watch</span>
                            <img
                              src="/project-icons/Profile icons/play.png"
                              alt="Play"
                              className="play-icon"
                              onError={(e) => {
                                e.target.src = 'https://cdn-icons-png.flaticon.com/512/0/375.png';
                              }}
                            />
                          </div>
                        </div>


                      )}

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

        <div className="chat-input-wrapper" style={{ flex: 1, position: 'relative' }}>
          {showSuggestions && (
            <div
              className="chat-suggestions-wrapper"
              style={{
                position: 'absolute',
                bottom: '100%',
                left: suggestionCoords.left,
                zIndex: 5001
              }}
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
            rows={1}
            className="chat-input-textarea"
          />
        </div>


        <button
          onClick={handleSend}
          disabled={uploading || !newMessage.trim()}
          className="send-btn"
        >
          Send
        </button>
      </div>

      {activeVideo && createPortal(
        <div className="video-lightbox-overlay" onClick={handleCloseVideo}>
          <div
            className={`video-lightbox-content ${activeVideo.type === 'youtube' ? 'landscape' : 'portrait'}`}
            data-platform={activeVideo.type}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="video-lightbox-close" onClick={handleCloseVideo}>×</button>
            <div className="video-cropper">
              {activeVideo.type === 'youtube' && (
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              )}
              {activeVideo.type === 'tiktok' && (
                <iframe
                  src={`https://www.tiktok.com/embed/v2/${activeVideo.id}`}
                  style={{ width: '100%', height: '100%', border: 'none' }}
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
                <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <p>Twitter/X embeds require external script. <a href={`https://x.com/i/status/${activeVideo.id}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)' }}>Open in new tab</a></p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}


    </div>

  );
}

export default Chat;