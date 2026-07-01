import { useState, useRef, useEffect } from 'react'

function App() {
  const [ingesting, setIngesting] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState(false);
  
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef(null);
  
  // Chat Management State
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  // Modal State
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert',
    onConfirm: null
  });

  const showModal = (title, message, type = 'alert', onConfirm = null) => {
    setModalConfig({ isOpen: true, title, message, type, onConfirm });
  };

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };


  
  // Multi-Session Chat State
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem('knowledgeVaultSessions');
    if (saved) return JSON.parse(saved);
    return [{ 
      id: Date.now(), 
      title: 'New Chat', 
      pinned: false,
      messages: [{ role: 'ai', text: 'Knowledge Vault initialized. Ask me anything about your PDF.' }] 
    }];
  });
  const [activeSessionId, setActiveSessionId] = useState(() => sessions[0]?.id || Date.now());
  
  const [chatInput, setChatInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  
  const chatEndRef = useRef(null);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('knowledgeVaultSessions', JSON.stringify(sessions));
  }, [sessions]);

  // Auto-scroll to bottom when active chat changes
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  const createNewChat = () => {
    const newSession = {
      id: Date.now(),
      title: `Chat ${sessions.length + 1}`,
      pinned: false,
      messages: [] // Start completely empty so the welcome screen shows!
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  // --- Chat Management Functions ---
  const togglePin = (e, id) => {
    e.stopPropagation();
    setSessions(prev => prev.map(s => s.id === id ? { ...s, pinned: !s.pinned } : s));
  };

  const deleteChat = (e, id) => {
    e.stopPropagation();
    showModal('Delete Chat', 'Are you sure you want to delete this chat?', 'confirm', () => {
      setSessions(prev => {
        const updated = prev.filter(s => s.id !== id);
        if (updated.length === 0) {
          // If all chats deleted, create a fresh one
          return [{ id: Date.now(), title: 'New Chat', pinned: false, messages: [] }];
        }
        if (activeSessionId === id) {
          setActiveSessionId(updated[0].id);
        }
        return updated;
      });
    });
  };

  const startRename = (e, id, currentTitle) => {
    e.stopPropagation();
    setEditingChatId(id);
    setEditTitle(currentTitle);
  };

  const saveRename = (e, id) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      setSessions(prev => prev.map(s => s.id === id ? { ...s, title: editTitle.trim() } : s));
    }
    setEditingChatId(null);
  };

  const handleRenameKeyDown = (e, id) => {
    if (e.key === 'Enter') saveRename(e, id);
    if (e.key === 'Escape') setEditingChatId(null);
  };

  const shareChat = async (e, id) => {
    e.stopPropagation();
    const session = sessions.find(s => s.id === id);
    if (!session) return;
    
    let chatText = `# ${session.title}\n\n`;
    session.messages.forEach(msg => {
      chatText += `**${msg.role === 'ai' ? 'Knowledge Vault' : 'You'}**:\n${msg.text}\n\n`;
    });

    try {
      await navigator.clipboard.writeText(chatText);
      showModal('Success', 'Chat copied to clipboard! You can paste it anywhere to share.');
    } catch (err) {
      showModal('Error', 'Failed to copy. Your browser might block clipboard access.');
    }
  };
  // ---------------------------------

  const handleIngest = async () => {
    setIngesting(true);
    setIngestSuccess(false);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/ingest', { method: 'POST' });
      if (response.ok) {
        setIngestSuccess(true);
      } else {
        const data = await response.json();
        showModal('Error', data.detail);
      }
    } catch (err) {
      showModal('Connection Error', 'Failed to connect to backend server. Make sure FastAPI is running!');
    }
    setIngesting(false);
  };

  const handleScanPage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/scan-page', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (response.ok) {
        showModal('Scan Success', data.message);
      } else {
        showModal('Error', data.detail);
      }
    } catch (err) {
      showModal('Connection Error', 'Failed to connect to backend server for OCR scan.');
    }
    setScanning(false);
    
    // Reset input so you can scan the same file again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const userQuestion = chatInput.trim();
    setChatInput('');
    setIsAsking(true);

    // Add user message to active session
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        // Auto-generate a title based on the first question if it's still named "New Chat" or "Chat X"
        const newTitle = s.messages.length === 1 ? userQuestion.substring(0, 20) + "..." : s.title;
        return { ...s, title: newTitle, messages: [...s.messages, { role: 'user', text: userQuestion }] };
      }
      return s;
    }));
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userQuestion })
      });
      const data = await response.json();
      
      // Add AI response to active session
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return { ...s, messages: [...s.messages, { role: 'ai', text: response.ok ? data.answer : `Error: ${data.detail}` }] };
        }
        return s;
      }));
    } catch (err) {
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return { ...s, messages: [...s.messages, { role: 'ai', text: "Network error connecting to AI Backend." }] };
        }
        return s;
      }));
    }
    setIsAsking(false);
  };

  return (
    <>
      {/* Left Panel: Sidebar & Vault */}
      <div className="glass-panel sidebar-panel">
        <div className="vault-header">
          <div className="vault-icon">🏛️</div>
          <h1 className="vault-title">Knowledge Vault</h1>
          
          <button 
            className="neon-button" 
            onClick={handleIngest}
            disabled={ingesting || scanning}
            style={{ marginBottom: '10px' }}
          >
            {ingesting ? 'Syncing...' : (ingestSuccess ? 'Vault Synced ✓' : '📄 Sync Syllabus PDF')}
          </button>
          
          <input 
            type="file" 
            accept="image/*" 
            style={{ display: 'none' }} 
            ref={fileInputRef}
            onChange={handleScanPage}
          />
          <button 
            className="neon-button" 
            onClick={() => fileInputRef.current?.click()}
            disabled={ingesting || scanning}
            style={{ background: scanning ? 'transparent' : 'rgba(255,255,255,0.05)' }}
          >
            {scanning ? 'Scanning...' : '📸 Scan Physical Page'}
          </button>
        </div>

        <button className="new-chat-btn" onClick={createNewChat}>
          + New Chat
        </button>

        <div className="history-list">
          {[...sessions].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)).map(session => (
            <div 
              key={session.id} 
              className={`history-item ${session.id === activeSessionId ? 'active' : ''} ${session.pinned ? 'pinned' : ''}`}
              onClick={() => setActiveSessionId(session.id)}
            >
              <div className="history-item-content">
                <span className="chat-icon">{session.pinned ? '📌' : '💬'}</span>
                {editingChatId === session.id ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => handleRenameKeyDown(e, session.id)}
                    onBlur={(e) => saveRename(e, session.id)}
                    autoFocus
                    className="rename-input"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="chat-title">{session.title}</span>
                )}
              </div>
              
              <div className="chat-actions">
                <button title="Share Chat" onClick={(e) => shareChat(e, session.id)}>📤</button>
                <button title={session.pinned ? "Unpin Chat" : "Pin Chat"} onClick={(e) => togglePin(e, session.id)}>
                  {session.pinned ? '📍' : '📌'}
                </button>
                <button title="Rename Chat" onClick={(e) => startRename(e, session.id, session.title)}>✏️</button>
                <button title="Delete Chat" className="delete-btn" onClick={(e) => deleteChat(e, session.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel: The Chat */}
      <div className="glass-panel chat-panel">
        <div className="chat-history-view">
          {(!activeSession?.messages || activeSession.messages.length === 0) ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏛️</div>
              <h2>Welcome to Knowledge Vault</h2>
              <p>Ask a question about your synced syllabus or scan a physical page to begin.</p>
            </div>
          ) : (
            activeSession.messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role === 'ai' ? 'msg-ai' : 'msg-user'}`}>
                {msg.text}
              </div>
            ))
          )}
          
          {isAsking && (
            <div className="message msg-ai">
              <div className="loader" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        
        <form className="chat-input-container" onSubmit={handleAsk}>
          <input 
            type="text" 
            className="chat-input"
            placeholder="Ask a question about your syllabus..." 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={isAsking}
          />
          <button type="submit" className="send-button" disabled={isAsking || !chatInput.trim()}>
            SEND
          </button>
        </form>
      </div>

      {/* Custom Modal Overlay */}
      {modalConfig.isOpen && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <h3 className="modal-title">{modalConfig.title}</h3>
            <p className="modal-message">{modalConfig.message}</p>
            <div className="modal-buttons">
              {modalConfig.type === 'confirm' && (
                <button className="neon-button secondary" onClick={closeModal} style={{ borderColor: 'var(--text-muted)', color: 'var(--text-muted)' }}>
                  Cancel
                </button>
              )}
              <button 
                className="neon-button" 
                onClick={() => {
                  if (modalConfig.onConfirm) modalConfig.onConfirm();
                  closeModal();
                }}
              >
                {modalConfig.type === 'confirm' ? 'Confirm' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default App
