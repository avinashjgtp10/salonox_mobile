import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './SalonOxBot.scss';

interface Message {
  role: 'user' | 'bot';
  text: string;
  source?: 'predefined' | 'groq' | 'error';
  category?: string;
  id?: string;
  chips?: string[];
}

const CATEGORY_CHIPS: Record<string, string[]> = {
  'Booking':      ['Create appointment', 'Cancel booking', 'Appointment statuses', 'No show', 'Week view'],
  'Billing':      ['Process payment', 'Apply discount', 'Refund', 'Quick sale', 'Split payment'],
  'Clients':      ['Add client', 'Block client', 'Import clients', 'Search client', 'Merge duplicates'],
  'Staff':        ['Add staff', 'Set working hours', 'Staff commission', 'Payroll', 'Repeating shifts'],
  'WhatsApp':     ['Setup WhatsApp', 'Create template', 'Launch campaign', 'Pause campaign', 'Quality rating'],
  'Catalog':      ['Add service', 'Add product', 'Gift cards', 'Memberships', 'Update price'],
  'Reports':      ['Revenue report', 'Top services', 'Staff performance', 'Export report', 'Payments report'],
  'Account':      ['Business profile', 'Reset password', 'Multiple branches', 'Add-ons', 'Join business'],
  'Edge Cases':   ['Staff not appearing', 'OTP not received', 'Page not loading', 'Sale stuck draft'],
};

const INITIAL_MESSAGES: Message[] = [
  {
    role: 'bot',
    text: "Hi! I'm your SalonOx Assistant. How can I help you today?",
    chips: ['Create appointment', 'Process payment', 'Add staff', 'Revenue report'],
  },
];

export default function SalonOxBot() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Drag state
  const [winPos, setWinPos] = useState<{ x: number; y: number } | null>(null);
  const [fabPos, setFabPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingWin, setIsDraggingWin] = useState(false);
  const winRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const fabDragMoved = useRef(false);

  useEffect(() => {
    if (!isDashboard) {
      setOpen(false);
      setWinPos(null);
      setFabPos(null);
    }
  }, [isDashboard]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isDashboard) return null;

  const reset = () => {
    setMessages(INITIAL_MESSAGES);
    setInput('');
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setInput('');

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const res = await fetch('/api/v1/bot/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      });

      const data = await res.json();

      const chips = data.source === 'predefined' && data.category
        ? (CATEGORY_CHIPS[data.category] || [])
            .filter((c: string) => c.toLowerCase() !== text.toLowerCase())
            .slice(0, 3)
        : [];

      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: data.answer,
          source: data.source,
          category: data.category,
          id: data.id,
          chips,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: 'Something went wrong. Please try again.', source: 'error' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategory = (cat: string) => {
    const chips = CATEGORY_CHIPS[cat] || [];
    setMessages((prev) => [
      ...prev,
      { role: 'bot', text: `Here are common ${cat} questions:`, chips },
    ]);
  };

  // Drag the chat window via its header
  const onHeaderMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;

    const rect = winRef.current!.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = rect.left;
    const origY = rect.top;

    setIsDraggingWin(true);

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const newX = Math.max(0, Math.min(window.innerWidth - rect.width, origX + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - rect.height, origY + dy));
      setWinPos({ x: newX, y: newY });
    };

    const onUp = () => {
      setIsDraggingWin(false);
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    e.preventDefault();
  };

  // Drag the FAB button; treat as click if mouse didn't move
  const onFabMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = fabRef.current!.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = rect.left;
    const origY = rect.top;
    fabDragMoved.current = false;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!fabDragMoved.current && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      fabDragMoved.current = true;
      const newX = Math.max(0, Math.min(window.innerWidth - rect.width, origX + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - rect.height, origY + dy));
      setFabPos({ x: newX, y: newY });
    };

    const onUp = () => {
      if (!fabDragMoved.current) setOpen((o) => !o);
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const winStyle: React.CSSProperties = winPos
    ? { top: winPos.y, left: winPos.x, bottom: 'auto', right: 'auto' }
    : {};

  const fabStyle: React.CSSProperties = fabPos
    ? { top: fabPos.y, left: fabPos.x, bottom: 'auto', right: 'auto' }
    : {};

  return (
    <>
      {/* Floating Button */}
      <button
        ref={fabRef}
        className={`sbot-fab ${open ? 'sbot-fab--open' : ''} ${fabPos ? 'sbot-fab--dragged' : ''}`}
        style={fabStyle}
        onMouseDown={onFabMouseDown}
        aria-label="Toggle SalonOx Assistant"
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
        )}
      </button>

      {/* Chat Window */}
      {open && (
        <div ref={winRef} className="sbot-window" style={winStyle}>

          {/* Header — drag handle */}
          <div
            className={`sbot-header ${isDraggingWin ? 'sbot-header--dragging' : ''}`}
            onMouseDown={onHeaderMouseDown}
          >
            <div className="sbot-avatar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
            </div>
            <div className="sbot-header-info">
              <div className="sbot-name">SalonOx Assistant</div>
              <div className="sbot-status">
                <span className="sbot-dot" />
                Online
              </div>
            </div>
            <button className="sbot-refresh" onClick={reset} title="Clear chat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
          </div>

          {/* Category Bar */}
          <div className="sbot-catbar">
            {Object.keys(CATEGORY_CHIPS).map((cat) => (
              <button key={cat} className="sbot-catbtn" onClick={() => handleCategory(cat)}>
                {cat}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="sbot-msgs">
            {messages.map((msg, i) => (
              <div key={i} className={`sbot-msg sbot-msg--${msg.role}`}>
                {msg.role === 'bot' && (
                  <div className="sbot-av">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                  </div>
                )}
                <div className="sbot-bub">
                  {msg.text && (
                    <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{msg.text}</p>
                  )}
                  {msg.chips && msg.chips.length > 0 && (
                    <div className="sbot-chips">
                      {msg.chips.map((chip) => (
                        <button key={chip} className="sbot-chip" onClick={() => sendMessage(chip)}>
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="sbot-msg sbot-msg--bot">
                <div className="sbot-av">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                </div>
                <div className="sbot-bub">
                  <div className="sbot-typing">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="sbot-input-row">
            <input
              className="sbot-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
              placeholder="Ask anything..."
              disabled={loading}
              autoFocus
            />
            <button className="sbot-send" onClick={() => sendMessage(input)} disabled={loading || !input.trim()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
            </button>
          </div>

        </div>
      )}
    </>
  );
}
