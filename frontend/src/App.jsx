import { useState, useRef, useEffect } from 'react'

function App() {
  const [ingesting, setIngesting] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState(false);
  
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef(null);
  
  // Multi-Session Chat State
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem('knowledgeVaultSessions');
    if (saved) return JSON.parse(saved);
    return [{ 
      id: Date.now(), 
      title: 'New Chat', 
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
      messages: [{ role: 'ai', text: 'New chat started. How can I help you?' }]
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const handleIngest = async () => {
    setIngesting(true);
    setIngestSuccess(false);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/ingest', { method: 'POST' });
      if (response.ok) {
        setIngestSuccess(true);
      } else {
        const data = await response.json();
        alert("Error: " + data.detail);
      }
    } catch (err) {
      alert("Failed to connect to backend server. Make sure FastAPI is running!");
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
        alert("Success! " + data.message);
      } else {
        alert("Error: " + data.detail);
      }
    } catch (err) {
      alert("Failed to connect to backend server for OCR scan.");
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
          <div className="vault-icon">⛩️</div>
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
          {sessions.map(session => (
            <div 
              key={session.id} 
              className={`history-item ${session.id === activeSessionId ? 'active' : ''}`}
              onClick={() => setActiveSessionId(session.id)}
            >
              💬 {session.title}
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel: The Chat */}
      <div className="glass-panel chat-panel">
        <div className="chat-history-view">
          {activeSession?.messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role === 'ai' ? 'msg-ai' : 'msg-user'}`}>
              {msg.text}
            </div>
          ))}
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
    </>
  )
}

export default App
