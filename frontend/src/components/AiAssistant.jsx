import React, { useState, useRef, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Bot, Send, X, Sparkles, Loader2, Trash2 } from 'lucide-react';
import '../styles/componentsCSS/ai-assistant.css';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_URL || "";

function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('rift_hub_ai_messages');
    return saved ? JSON.parse(saved) : [];
  });
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userContext, setUserContext] = useState(null);
  const [selectedModel, setSelectedModel] = useState('gemini-3-flash');
  const [highlightModelSelect, setHighlightModelSelect] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const MODELS = [
    { id: 'gemini-3-flash', name: 'G3 Flash' },
    { id: 'gemini-2.5-flash', name: 'G2.5 Flash' },
    { id: 'gemini-2.5-pro', name: 'G2.5 Pro' },
    { id: 'gemini-2-flash', name: 'G2 Flash' },
    { id: 'gemini-2-flash-exp', name: 'G2 Exp' },
    { id: 'gemini-2-flash-lite', name: 'G2 Lite' },
    { id: 'gemini-2.5-flash-lite', name: 'G2.5 Lite' },
    { id: 'gemini-3.1-pro', name: 'G3.1 Pro' },
    { id: 'gemini-3.1-flash-lite', name: 'G3.1 Lite' }
  ];

  useEffect(() => {
    localStorage.setItem('rift_hub_ai_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    const fetchContext = async () => {
      if (!auth.currentUser) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
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
        console.error('Error fetching AI user context:', err);
      }
    };

    const unsubscribe = auth.onAuthStateChanged(() => fetchContext());
    return () => unsubscribe();
  }, []);

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
        throw new Error(data.error || 'limit reached switch to different model');
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      console.error('AI chat error:', err);
      const isRate = err.message.includes('limit reached');
      setError(isRate ? 'limit reached switch to different model' : 'Something went wrong. Please try again.');
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

  const clearChat = () => {
    setMessages([]);
    setError(null);
    localStorage.removeItem('rift_hub_ai_messages');
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

  const SUGGESTIONS = [
    "Best build for Jinx?",
    "How to climb out of Gold?",
    "Counter picks for Yasuo mid?",
    "Tips for wave management"
  ];

  return (
    <>
      <button
        className={`ai-trigger-btn ${isOpen ? 'hidden' : ''}`}
        onClick={() => setIsOpen(true)}
        title="AI Champion Advisor"
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
              <span className="ai-panel-subtitle">Champion Advisor</span>
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

        <div className="ai-messages-area">
          {messages.length === 0 && !isLoading && (
            <div className="ai-welcome">
              <div className="ai-welcome-icon-wrap">
                <Sparkles size={28} />
              </div>
              <h3 className="ai-welcome-title">Hey Summoner!</h3>
              <p className="ai-welcome-desc">
                Ask me about builds, matchups, strategies, or anything League of Legends.
              </p>
              {userContext?.rank && (
                <div className="ai-user-rank-badge">
                  <span>Playing as: {userContext.rank}</span>
                </div>
              )}
              <div className="ai-suggestions">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    className="ai-suggestion-chip"
                    onClick={() => {
                      setInputValue(s);
                      setTimeout(() => inputRef.current?.focus(), 50);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

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
              placeholder="Ask about builds, matchups, strategies..."
              className="ai-input"
              disabled={isLoading}
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
