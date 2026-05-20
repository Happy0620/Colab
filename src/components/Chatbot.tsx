import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

interface Message {
  role: 'user' | 'model';
  content: string;
}

export default function Chatbot() {
  const { user, token } = useAppContext();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hey! 👋 I am Feasto AI. Ask me anything — restaurants, food recommendations, or what to order tonight!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!user) return null;

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          message: text,
          history: newMessages.slice(1, -1).filter((m: any) => m.role === 'user' || m.role === 'model').map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Sorry, try again later' }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Sorry, I could not get a response.' }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, try again later' }]);
    }
    setLoading(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {/* Chat bubble button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 999,
          width: 58, height: 58, borderRadius: '50%',
          background: 'linear-gradient(135deg, #F88435, #FF6B35)',
          border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(248,132,53,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.2s'
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <i className={`fa-solid ${open ? 'fa-xmark' : 'fa-robot'}`} style={{ color: 'white', fontSize: '1.3rem' }}></i>
      </button>

      {/* Chat window */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 100, right: 28, zIndex: 998,
          width: 360, height: 500, background: 'white', borderRadius: 20,
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', animation: 'slideUp 0.25s ease', fontFamily: 'Poppins, sans-serif'
        }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #F88435, #FF6B35)', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-robot" style={{ color: 'white', fontSize: '1rem' }}></i>
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>Feasto AI</div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.72rem' }}>Your food assistant</div>
            </div>
            <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }}></div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: msg.role === 'user' ? 'linear-gradient(135deg, #F88435, #FF6B35)' : '#F5F5F5',
                  color: msg.role === 'user' ? 'white' : '#333',
                  fontSize: '0.85rem', lineHeight: 1.5
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: '#F5F5F5', borderRadius: '18px 18px 18px 4px', padding: '10px 16px', display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#F88435', animation: `bounce 1s infinite ${i * 0.2}s` }}></div>
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid #F0F0F0', display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask me anything..."
              style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: '2px solid #eee', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit' }}
              onFocus={e => e.target.style.borderColor = '#F88435'}
              onBlur={e => e.target.style.borderColor = '#eee'}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{ width: 40, height: 40, borderRadius: '50%', background: input.trim() ? 'linear-gradient(135deg, #F88435, #FF6B35)' : '#eee', border: 'none', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
            >
              <i className="fa-solid fa-paper-plane" style={{ color: input.trim() ? 'white' : '#bbb', fontSize: '0.85rem' }}></i>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes bounce { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-5px) } }
      `}</style>
    </>
  );
}
