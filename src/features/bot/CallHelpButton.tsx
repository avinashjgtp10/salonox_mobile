import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './CallHelpButton.scss';

const PHONE_NUMBER = '+91 95033 02647';
const PHONE_HREF = 'tel:+919503302647';

const PhoneIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.46.57 3.58a1 1 0 0 1-.25 1.02z" />
  </svg>
);

export default function CallHelpButton() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');
  const [open, setOpen] = useState(false);

  // Drag state — mirrors SalonOxBot's fab/window dragging.
  const [fabPos, setFabPos] = useState<{ x: number; y: number } | null>(null);
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const fabDragMoved = useRef(false);

  useEffect(() => {
    if (!isDashboard) {
      setOpen(false);
      setFabPos(null);
      setPanelPos(null);
    }
  }, [isDashboard]);

  // Applied imperatively (not via the JSX `style` prop) since these positions
  // come from live drag coordinates and can't be expressed as static CSS.
  useEffect(() => {
    const el = fabRef.current;
    if (!el) return;
    if (fabPos) {
      el.style.setProperty('top', `${fabPos.y}px`);
      el.style.setProperty('left', `${fabPos.x}px`);
      el.style.setProperty('bottom', 'auto');
      el.style.setProperty('right', 'auto');
    } else {
      el.style.removeProperty('top');
      el.style.removeProperty('left');
      el.style.removeProperty('bottom');
      el.style.removeProperty('right');
    }
  }, [fabPos]);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    if (panelPos) {
      el.style.setProperty('top', `${panelPos.y}px`);
      el.style.setProperty('left', `${panelPos.x}px`);
      el.style.setProperty('bottom', 'auto');
      el.style.setProperty('right', 'auto');
    } else {
      el.style.removeProperty('top');
      el.style.removeProperty('left');
      el.style.removeProperty('bottom');
      el.style.removeProperty('right');
    }
  }, [panelPos, open]);

  if (!isDashboard) return null;

  // Drag the FAB button; treat as click if mouse didn't move
  const onFabMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = fabRef.current!.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = rect.left;
    const origY = rect.top;
    fabDragMoved.current = false;

    // Snapshot the panel's own position at drag start (only while it's open)
    // so the same drag delta below can be applied to it too — this is what
    // makes the panel follow the icon instead of staying behind.
    const panelRect = open ? panelRef.current?.getBoundingClientRect() ?? null : null;
    const panelOrigX = panelRect?.left ?? 0;
    const panelOrigY = panelRect?.top ?? 0;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!fabDragMoved.current && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      fabDragMoved.current = true;
      const newX = Math.max(0, Math.min(window.innerWidth - rect.width, origX + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - rect.height, origY + dy));
      setFabPos({ x: newX, y: newY });

      if (panelRect) {
        const newPanelX = Math.max(0, Math.min(window.innerWidth - panelRect.width, panelOrigX + dx));
        const newPanelY = Math.max(0, Math.min(window.innerHeight - panelRect.height, panelOrigY + dy));
        setPanelPos({ x: newPanelX, y: newPanelY });
      }
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

  return (
    <>
      <button
        ref={fabRef}
        className={`chelp-fab ${open ? 'chelp-fab--open' : ''} ${fabPos ? 'chelp-fab--dragged' : ''}`}
        onMouseDown={onFabMouseDown}
        aria-label="Need help? Call us"
        title="Call for help"
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <PhoneIcon />
        )}
      </button>

      {open && (
        <div ref={panelRef} className="chelp-panel">
          <div className="chelp-panel-title">Need help?</div>
          <div className="chelp-panel-sub">Our team is just a call away</div>
          <a href={PHONE_HREF} className="chelp-panel-number">{PHONE_NUMBER}</a>
          <a href={PHONE_HREF} className="chelp-panel-call">
            <PhoneIcon size={14} />
            Call Now
          </a>
        </div>
      )}
    </>
  );
}
