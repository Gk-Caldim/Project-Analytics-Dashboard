import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bot, Send, X, Minus, Maximize2, Sparkles, MessageSquare, MessageCircle, ArrowRight } from 'lucide-react';
import API from '../../utils/api';
import './AgentChat.css';

const AgentChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const { activeProjectName } = useSelector(state => state.nav);
  const navigate = useNavigate();
  const location = useLocation();
  
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      type: 'ai', 
      text: 'Hello! I am your Project Assistant. How can I help you today?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Don't show the agent on the login page
  if (location.pathname === '/login') {
    return null;
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
    setIsMinimized(false);
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      text: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([...messages, userMessage]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);

    try {
      const response = await API.post('/agent/chat', {
        message: currentInput,
        context: {
          activeProject: activeProjectName,
          page: window.location.pathname
        },
        chat_history: messages.slice(-5).map(m => ({ role: m.type, content: m.text }))
      });

      const aiResponse = {
        id: messages.length + 2,
        type: 'ai',
        text: response.data.response,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiResponse]);

      // Check for actions (e.g., Navigate)
      if (response.data.action && response.data.action.type === 'NAVIGATE') {
        const target = response.data.action.target;
        setTimeout(() => {
          navigate(target);
        }, 1500); // Small delay to let user read the message
      }
    } catch (error) {
      console.error('Agent API Error:', error);
      const errorMessage = {
        id: messages.length + 2,
        type: 'ai',
        text: 'Sorry, I encountered an error. Please try again later.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const quickActions = [
    "Summarize Dashboard",
    "Project Status",
    "Missing Updates",
    "Export Report"
  ];

  if (!isOpen) {
    return (
      <div className="agent-chat-container">
        <button className="agent-bubble pulse-animation" onClick={toggleChat} title="Assistant">
          <MessageCircle size={28} />
        </button>
      </div>
    );
  }

  return (
    <div className="agent-chat-container">
      {!isMinimized && (
        <div className="agent-window">
          {/* Header */}
          <div className="agent-header">
            <div className="agent-header-info">
              <div className="agent-avatar-small">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="agent-title">Project Assistant</div>
                <div className="agent-status">Always active</div>
              </div>
            </div>
            <div className="agent-controls">
              <button 
                className="agent-control-btn" 
                onClick={() => setIsMinimized(true)}
              >
                <Minus size={18} />
              </button>
              <button 
                className="agent-control-btn" 
                onClick={toggleChat}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="agent-body">
            {messages.map((msg) => (
              <div key={msg.id} className={`message message-${msg.type}`}>
                {msg.text}
                <div className="message-time">{msg.time}</div>
              </div>
            ))}
            {isTyping && (
              <div className="message message-ai typing">
                <span></span><span></span><span></span>
              </div>
            )}
            
            {!isTyping && messages.length < 3 && (
              <div className="agent-quick-actions">
                {quickActions.map((action, index) => (
                  <button 
                    key={index} 
                    className="quick-action-btn"
                    onClick={() => {
                      setInput(action);
                    }}
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form className="agent-input-container" onSubmit={handleSend}>
            <div className="agent-input-wrapper">
              <textarea
                className="agent-input"
                placeholder="Ask me anything..."
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button 
                type="submit" 
                className="agent-send-btn"
                disabled={!input.trim() || isTyping}
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>
      )}

      {isMinimized ? (
        <button className="agent-bubble pulse-animation" onClick={() => setIsMinimized(false)}>
          <MessageCircle size={28} />
        </button>
      ) : null}
    </div>
  );
};

export default AgentChat;
