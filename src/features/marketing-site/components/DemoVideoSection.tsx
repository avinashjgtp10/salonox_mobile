import { useState } from 'react'
import '../styles/components.scss'

export default function DemoVideoSection({ thumbnailUrl = 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=1200&q=80', title = 'See SalonOx in action', sub = 'Watch how SalonOx manages bookings, staff, payments, and WhatsApp campaigns — all from one dashboard.' }: { thumbnailUrl?: string; title?: string; sub?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <section className="demo-root">
      <div className="sx-section demo-inner">
        <div className="demo-text sx-reveal">
          <div className="sx-eyebrow">Product demo</div>
          <h2 className="demo-heading">{title}</h2>
          <p className="demo-sub">{sub}</p>
          <div className="demo-chips">
            {['⚡ Setup in 10 mins','🤖 AI-powered','📱 WhatsApp-native','💳 No credit card'].map(chip => <span key={chip} className="demo-chip">{chip}</span>)}
          </div>
        </div>
        <div className="demo-video-wrap sx-reveal">
          <div className="demo-thumbnail" style={{ backgroundImage: `url(${thumbnailUrl})` }}>
            <div className="demo-thumb-overlay" />
            <button className="demo-play-btn" onClick={() => setOpen(true)} aria-label="Play demo video">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </button>
            <div className="demo-duration">2:14</div>
          </div>
          <div className="demo-stats-row">
            {[{ val: '2 min', lbl: 'Full walkthrough' },{ val: '500+', lbl: 'Businesses active' },{ val: '4.9★', lbl: 'Average rating' }].map(s => (
              <div key={s.lbl} className="demo-stat"><div className="demo-stat-val">{s.val}</div><div className="demo-stat-lbl">{s.lbl}</div></div>
            ))}
          </div>
        </div>
      </div>
      {open && (
        <div className="demo-modal-overlay" onClick={() => setOpen(false)}>
          <div className="demo-modal-box" onClick={e => e.stopPropagation()}>
            <button className="demo-modal-close" onClick={() => setOpen(false)} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
            <div className="demo-modal-video">
              <div className="demo-modal-placeholder">
                <div className="demo-modal-play"><svg viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg></div>
                <div className="demo-modal-label">SalonOx — Full Product Demo</div>
                <div className="demo-modal-note">Replace this with your actual video embed</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}