import React, { useState, useRef, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc, deleteDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Bot, Send, X, Sparkles, Loader2, Trash2, LogIn, Plus, MessageSquare } from 'lucide-react';
import '../styles/componentsCSS/ai-assistant.css';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_URL || "";

function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [userContext, setUserContext] = useState(null);
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [selectedModel, setSelectedModel] = useState('gemini-3-flash');
  const [highlightModelSelect, setHighlightModelSelect] = useState(false);
  const [confirmPopup, setConfirmPopup] = useState({ show: false, message: '', onConfirm: null });
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const MODELS = [
    { id: 'gemini-3-flash', name: 'Gemini 3 Flash' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'gemini-2-flash', name: 'Gemini 2 Flash' }
  ];

  useEffect(() => {
    let unsubscribeChats = null;

    const unsubscribeAuth = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const ctx = {};
            if (data.riotAccount) {
              const { gameName, tagLine, region } = data.riotAccount;
              if (gameName && tagLine) ctx.riotId = `${gameName}#${tagLine}`;
              if (region) ctx.region = region;
            }
            if (data.rankedData && data.rankedData.length > 0) {
              const solo = data.rankedData.find(q => q.queueType === 'RANKED_SOLO_5x5');
              const flex = data.rankedData.find(q => q.queueType === 'RANKED_FLEX_SR');
              const primary = solo || flex;
              if (primary) {
                ctx.rank = `${primary.tier} ${primary.rank || ''} (${primary.leaguePoints || 0} LP)`.trim();
              }
            }
            if (Object.keys(ctx).length > 0) setUserContext(ctx);
          }
        } catch (err) {
          console.error('Error fetching context:', err);
        }

        const chatsRef = collection(db, 'users', firebaseUser.uid, 'aiChats');
        const q = query(chatsRef, orderBy('updatedAt', 'desc'));
        unsubscribeChats = onSnapshot(q, (snapshot) => {
          const fetchedChats = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setChats(fetchedChats);
        });
      } else {
        setChats([]);
        setMessages([]);
        setCurrentChatId(null);
        setUserContext(null);
        if (unsubscribeChats) unsubscribeChats();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeChats) unsubscribeChats();
    };
  }, []);

  useEffect(() => {
    if (!user || !currentChatId) return;
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
      setMessages(chat.messages || []);
    }
  }, [currentChatId, chats]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    setError(null);
    setHighlightModelSelect(false);
    const userMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          userContext,
          model: selectedModel
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.isRateLimit) {
          setHighlightModelSelect(true);
        }
        throw new Error(data.error || 'Failed to get response from AI assistant');
      }

      const assistantMessage = { role: 'assistant', content: data.response };
      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      if (user) {
        const chatData = {
          messages: finalMessages,
          updatedAt: serverTimestamp(),
          title: finalMessages[0].content.substring(0, 30) + '...'
        };

        if (currentChatId) {
          await updateDoc(doc(db, 'users', user.uid, 'aiChats', currentChatId), chatData);
        } else {
          const newChatRef = await addDoc(collection(db, 'users', user.uid, 'aiChats'), chatData);
          setCurrentChatId(newChatRef.id);
        }
      }
    } catch (err) {
      console.error('AI chat error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = async () => {
    if (!user || !currentChatId) {
      setMessages([]);
      return;
    }

    setConfirmPopup({
      show: true,
      message: "are you sure you want to clear your chat with the ai bot",
      onConfirm: async () => {
        try {
          const chatToDelete = currentChatId;
          setCurrentChatId(null);
          setMessages([]);
          await updateDoc(doc(db, 'users', user.uid, 'aiChats', chatToDelete), {
            messages: [],
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          console.error('Error clearing AI history:', err);
        }
        setConfirmPopup({ show: false, message: '', onConfirm: null });
      }
    });
  };

  const deleteHistory = async (e, chatId) => {
    e.stopPropagation();
    if (!user || !chatId) return;

    setConfirmPopup({
      show: true,
      message: "Are you sure you want to PERMANENTLY delete this chat?",
      onConfirm: async () => {
        try {
          if (currentChatId === chatId) {
            setCurrentChatId(null);
            setMessages([]);
          }
          await deleteDoc(doc(db, 'users', user.uid, 'aiChats', chatId));
        } catch (err) {
          console.error('Error deleting chat history:', err);
        }
        setConfirmPopup({ show: false, message: '', onConfirm: null });
      }
    });
  };

  const formatMessage = (text) => {
    return text
      .split('\n')
      .map((line, i) => {
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
        line = line.replace(/`(.*?)`/g, '<code>$1</code>');
        if (line.match(/^[\s]*[-•]\s/)) {
          line = '<span class="ai-bullet">•</span>' + line.replace(/^[\s]*[-•]\s/, '');
          return `<div class="ai-bullet-line" key="${i}">${line}</div>`;
        }
        if (line.match(/^[\s]*\d+\.\s/)) {
          return `<div class="ai-numbered-line" key="${i}">${line}</div>`;
        }
        if (line.match(/^#{1,3}\s/)) {
          const content = line.replace(/^#{1,3}\s/, '');
          return `<div class="ai-section-header" key="${i}">${content}</div>`;
        }
        if (line.trim() === '') return `<div class="ai-line-break" key="${i}"></div>`;
        return `<div key="${i}">${line}</div>`;
      })
      .join('');
  };


  return (
    <>
      <button
        className={`ai-trigger-btn ${isOpen ? 'hidden' : ''}`}
        onClick={() => setIsOpen(true)}
        title="RiftHub AI"
      >
        <div className="ai-trigger-glow" />
        <Sparkles size={22} />
        <span className="ai-trigger-label">AI</span>
      </button>

      <div className={`ai-panel glass-panel ${isOpen ? 'open' : ''}`}>
        <div className="ai-panel-header">
          <div className="ai-panel-title-group">
            <div className="ai-panel-icon">
              <Bot size={18} />
            </div>
            <div>
              <h4 className="ai-panel-title">RiftHub AI</h4>
            </div>
          </div>
          <div className="ai-header-actions">
            <select
              className={`ai-model-select ${highlightModelSelect ? 'highlight-pulse' : ''}`}
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                setHighlightModelSelect(false);
              }}
              title="Select AI Model"
            >
              {MODELS.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {user && (
              <button
                onClick={() => {
                  setCurrentChatId(null);
                  setMessages([]);
                }}
                className="ai-new-chat-btn"
                title="New Chat"
              >
                <Plus size={16} />
              </button>
            )}
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="ai-clear-btn"
                title="Clear chat"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="ai-panel-close"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {confirmPopup.show && (
          <div className="ai-confirm-overlay">
            <div className="ai-confirm-modal glass-panel">
              <p className="ai-confirm-message">{confirmPopup.message}</p>
              <div className="ai-confirm-actions">
                <button
                  className="ai-confirm-btn cancel"
                  onClick={() => setConfirmPopup({ show: false, message: '', onConfirm: null })}
                >
                  Cancel
                </button>
                <button
                  className="ai-confirm-btn accept"
                  onClick={() => confirmPopup.onConfirm()}
                >
                  Accept
                </button>
              </div>
            </div>
          </div>
        )}

        {user && chats.length > 0 && (
          <div className="ai-history-bar">
            <select
              value={currentChatId || ''}
              onChange={(e) => {
                const val = e.target.value;
                setCurrentChatId(val || null);
                if (!val) setMessages([]);
              }}
              className="ai-history-select"
              title={chats.find(c => c.id === currentChatId)?.title || (currentChatId ? '' : 'New Conversation')}
            >
              {!currentChatId && <option value="" title="Start a fresh conversation">New Conversation</option>}
              {chats.map(chat => (
                <option
                  key={chat.id}
                  value={chat.id}
                  title={chat.title}
                >
                  {chat.title || 'Chat ' + chat.id.substring(0, 5)}
                </option>
              ))}
            </select>
            {currentChatId && (
              <button
                onClick={(e) => deleteHistory(e, currentChatId)}
                className="ai-history-delete-btn"
                title="Delete this history"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}

        <div className="ai-messages-area">
          {!user ? (
            <div className="ai-welcome">
              <div className="ai-welcome-icon-wrap">
                <LogIn size={28} />
              </div>
              <h3 className="ai-welcome-title">Login Required</h3>
              <p className="ai-welcome-desc">
                Please log in to your RiftHub account to chat with the AI assistant.
              </p>
              <button
                className="ai-login-redirect-btn"
                onClick={() => { setIsOpen(false); navigate('/login'); }}
              >
                Log In
              </button>
            </div>
          ) : (
            <>
              {messages.length === 0 && !isLoading ? (
                <div className="ai-welcome">
                  <div className="ai-welcome-icon-wrap">
                    <Sparkles size={28} />
                  </div>
                  <h3 className="ai-welcome-title">RiftHub Technical Analyst</h3>
                  <p className="ai-welcome-desc">
                    I provide info on Season 2026 game mechanics (v16.5.1).
                    General climb strategies are outside my scope.
                  </p>
                  <div className="ai-user-rank-badge">
                    <span>Patch v16.5.1 Active</span>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => (
                    <div key={i} className={`ai-message ${msg.role}`}>
                      {msg.role === 'assistant' && (
                        <div className="ai-avatar">
                          <Bot size={14} />
                        </div>
                      )}
                      <div className={`ai-message-bubble ${msg.role}`}>
                        {msg.role === 'assistant' ? (
                          <div
                            className="ai-message-text"
                            dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                          />
                        ) : (
                          <div className="ai-message-text">{msg.content}</div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="ai-message assistant">
                      <div className="ai-avatar">
                        <Bot size={14} />
                      </div>
                      <div className="ai-message-bubble assistant">
                        <div className="ai-typing-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="ai-error-msg">
                      <span>{error}</span>
                    </div>
                  )}
                </>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="ai-input-area">
          <div className="ai-input-wrapper">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={user ? "Ask about builds, matchups, strategies..." : "Log in to chat..."}
              className="ai-input"
              disabled={isLoading || !user}
              maxLength={500}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="ai-send-btn"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <div className="ai-input-footer">
            <span>Powered by Gemini AI</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default AiAssistant;
