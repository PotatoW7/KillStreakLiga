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
    <div className="flex flex-col h-full bg-black/20 overflow-hidden relative">
      <div className="absolute inset-0 bg-primary/2 opacity-20 pointer-events-none" />

      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-white/[0.01] flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary hover:text-black hover:border-primary transition-all group active:scale-90"
          >
            <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
          </button>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />
              <img
                src={friendProfile?.profileImage || 'https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png'}
                alt={friendProfile?.username}
                className="w-12 h-12 rounded-2xl object-cover relative z-10 border border-white/10"
              />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
            </div>
            <div className="space-y-0.5">
              <h3
                className="font-display text-xl font-black text-white uppercase italic tracking-tight hover:text-primary cursor-pointer transition-colors"
                onClick={() => navigate(`/profile/${selectedFriend.id}`)}
              >
                {friendProfile?.username}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] italic">Online</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/5 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest italic">Live Content</span>
          </div>
        </div>
      </div>

      {/* Message Stream */}
      <div
        ref={chatMessagesRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-10"
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
              className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} ${isDeleting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'} transition-all duration-300`}
              onContextMenu={(e) => handleRightClick(e, msg)}
            >
              {showUser && (
                <div className={`flex items-center gap-3 mb-2 px-1 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                  <img
                    src={getSenderProfileImage(msg.senderId)}
                    alt={msg.senderName}
                    className="w-6 h-6 rounded-lg object-cover border border-white/10"
                  />
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] italic">
                    {isOwnMessage ? 'You' : msg.senderName}
                  </span>
                </div>
              )}

              <div className={`relative group max-w-[85%] ${isOwnMessage ? 'pl-10' : 'pr-10'}`}>
                {editingMessageId === msg.id ? (
                  <div className="glass-panel p-4 rounded-2xl border-primary/30 w-full min-w-[300px] flex flex-col gap-3">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-medium text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-all custom-scrollbar"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={handleCancelEdit} className="px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all italic">Cancel</button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={!editText.trim() || editText === msg.text}
                        className="px-4 py-2 rounded-lg bg-primary text-black text-[9px] font-black uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50 italic"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`relative transition-all duration-300 ${isOwnMessage ? 'items-end flex flex-col' : 'items-start flex flex-col'}`}>
                    <div
                      className={`relative z-10 px-5 py-3.5 message-bubble ${isOwnMessage
                        ? 'bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20 rounded-2xl rounded-tr-none text-white'
                        : 'bg-white/5 border-white/10 rounded-2xl rounded-tl-none text-white/90'
                        } border backdrop-blur-md shadow-2xl group-hover:border-primary/30 transition-all`}
                    >
                      <div className="text-sm font-medium leading-relaxed break-words">
                        <IconRenderer text={msg.text} />
                      </div>

                      {msg.socialPreview && (
                        <div
                          className={`mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/40 cursor-pointer group/vid relative ${msg.socialPreview.isIcon ? 'w-24 h-24 flex items-center justify-center' : 'w-full aspect-video'}`}
                          onClick={() => handleOpenVideo(msg.socialPreview)}
                        >
                          <img
                            src={msg.socialPreview.thumbnail}
                            alt="Preview"
                            className={`${msg.socialPreview.isIcon ? 'w-12 h-12 grayscale group-hover/vid:grayscale-0' : 'w-full h-full object-cover group-hover/vid:scale-105'} transition-all duration-700`}
                          />
                          {!msg.socialPreview.isIcon && <div className="absolute inset-0 bg-black/40 group-hover/vid:bg-black/20 transition-all" />}
                          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover/vid:opacity-100 transition-all">
                            <div className="w-12 h-12 rounded-full bg-primary/20 backdrop-blur-md border border-primary/40 flex items-center justify-center text-primary group-hover/vid:scale-110 transition-transform">
                              <span className="text-xl ml-1">▶</span>
                            </div>
                            {!msg.socialPreview.isIcon && <span className="mt-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/60">Play Video</span>}
                          </div>
                        </div>
                      )}

                      {msg.type === 'image' && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-white/10 bg-black/20 group/img relative cursor-pointer" onClick={() => window.open(msg.imageData)}>
                          <img src={msg.imageData} alt="Shared" className="w-full max-h-[300px] object-cover group-hover/img:scale-105 transition-transform duration-700" />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/60 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">View Image</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={`mt-1.5 flex items-center gap-3 text-[8px] font-black uppercase tracking-widest text-white/20 italic ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                      <span>{msg.timestamp ? new Date(msg.timestamp?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just Now'}</span>
                      {msg.edited && <span className="text-primary/40">Edited</span>}
                      {isOwnMessage && <span className={msg.read ? 'text-primary' : 'text-white/10'}>{msg.read ? 'Read ✓✓' : 'Sent ✓'}</span>}
                    </div>

                    {contextMenu === msg.id && isOwnMessage && !isDeleting && (
                      <div className={`absolute top-0 flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200 ${isOwnMessage ? 'right-full mr-3' : 'left-full ml-3'}`}>
                        <button onClick={() => handleEditMessage(msg.id, msg.text)} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-primary hover:border-primary/40 hover:bg-primary/10 transition-all active:scale-90" title="Edit">✏️</button>
                        <button onClick={() => handleDeleteMessage(msg.id)} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-red-500 hover:border-red-500/40 hover:bg-red-500/10 transition-all active:scale-90" title="Delete">🗑️</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Section */}
      <div className="p-6 border-t border-white/5 bg-white/[0.01] relative z-10 flex items-end gap-3">
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
          className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-primary hover:border-primary/50 hover:bg-primary/10 transition-all active:scale-90 shadow-xl disabled:opacity-50"
          title="Upload Image (20MB Max)"
        >
          {uploading ? (
            <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          ) : (
            <span className="text-xl">📎</span>
          )}
        </button>

        <div className="flex-1 relative">
          {showSuggestions && (
            <div
              className="absolute bottom-full left-0 mb-4 z-50 animate-in slide-in-from-bottom-2 duration-200"
              style={{ left: suggestionCoords.left }}
            >
              <LoLSuggestions
                query={suggestionQuery}
                activeIndex={suggestionIndex}
                onSelect={insertSuggestion}
              />
            </div>
          )}
          <div className="relative group">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => handleTextareaChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={uploading}
              placeholder="Type a message..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pr-16 text-xs font-medium text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 focus:bg-white/[0.08] transition-all min-h-[48px] max-h-[120px] custom-scrollbar resize-none"
              rows={1}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
            />
            <button
              onClick={handleSend}
              disabled={uploading || !newMessage.trim()}
              className="absolute right-2 bottom-2 w-10 h-10 rounded-xl bg-primary text-black flex items-center justify-center hover:bg-white transition-all shadow-xl active:scale-90 disabled:opacity-30 group/send"
            >
              <span className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">➤</span>
            </button>
          </div>
        </div>
      </div>

      {activeVideo && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-10 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={handleCloseVideo} />
          <div
            className={`w-full max-w-5xl glass-panel rounded-[2rem] border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden relative z-10 aspect-video flex flex-col animate-in zoom-in-95 duration-500`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 italic">{activeVideo.type.toUpperCase()}</span>
              </div>
              <button
                onClick={handleCloseVideo}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-red-500 border border-white/10 text-white transition-all flex items-center justify-center active:scale-90"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 bg-black">
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
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-10 space-y-6">
                  <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <span className="text-4xl">𝕏</span>
                  </div>
                  <div className="space-y-2">
                    <p className="font-display text-xl font-black text-white uppercase italic">External Link Required</p>
                    <p className="text-[11px] font-bold text-white/20 uppercase tracking-widest max-w-sm">X (Twitter) videos cannot be rendered here. Use the direct link.</p>
                  </div>
                  <a
                    href={`https://x.com/i/status/${activeVideo.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-8 py-3 rounded-xl bg-primary text-black font-black text-xs uppercase tracking-[0.2em] hover:bg-white transition-all italic shadow-xl"
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
    </div>

  );
}

export default Chat;