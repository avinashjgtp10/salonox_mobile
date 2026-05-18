import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { features } from '../config/features.config'
import '../styles/carousel.scss'

const TOP_8_SLUGS = ['scheduler','whatsapp-marketing','salonbot-ai','reports-analytics','online-booking','loyalty-program','staff-shifts','client-management']
const carouselFeatures = TOP_8_SLUGS.map(slug => features.find(f => f.slug === slug)!).filter(Boolean)
const CARD_THEMES = [
  { bg: 'linear-gradient(145deg,#141128,#0d0a1a)', border: 'rgba(255,255,255,0.08)', text: '#f0ede8', sub: 'rgba(240,237,232,0.5)', badge: 'rgba(255,255,255,0.08)', badgeText: 'rgba(255,255,255,0.5)', btn: '#ffffff', btnText: '#090909' },
  { bg: 'linear-gradient(145deg,#f8f7ff,#eeeeff)', border: 'rgba(100,80,255,0.15)', text: '#1a1a2e', sub: 'rgba(26,26,46,0.55)', badge: 'rgba(100,80,255,0.08)', badgeText: '#5040ff', btn: '#5040ff', btnText: '#ffffff' },
  { bg: 'linear-gradient(145deg,#e8f8f5,#d4f3ed)', border: 'rgba(16,185,129,0.2)', text: '#0d2b27', sub: 'rgba(13,43,39,0.55)', badge: 'rgba(16,185,129,0.1)', badgeText: '#059669', btn: '#059669', btnText: '#ffffff' },
  { bg: 'linear-gradient(145deg,#141128,#0d0a1a)', border: 'rgba(255,255,255,0.08)', text: '#f0ede8', sub: 'rgba(240,237,232,0.5)', badge: 'rgba(255,255,255,0.08)', badgeText: 'rgba(255,255,255,0.5)', btn: '#ffffff', btnText: '#090909' },
  { bg: 'linear-gradient(145deg,#f8f7ff,#eeeeff)', border: 'rgba(100,80,255,0.15)', text: '#1a1a2e', sub: 'rgba(26,26,46,0.55)', badge: 'rgba(100,80,255,0.08)', badgeText: '#5040ff', btn: '#5040ff', btnText: '#ffffff' },
  { bg: 'linear-gradient(145deg,#e8f8f5,#d4f3ed)', border: 'rgba(16,185,129,0.2)', text: '#0d2b27', sub: 'rgba(13,43,39,0.55)', badge: 'rgba(16,185,129,0.1)', badgeText: '#059669', btn: '#059669', btnText: '#ffffff' },
  { bg: 'linear-gradient(145deg,#141128,#0d0a1a)', border: 'rgba(255,255,255,0.08)', text: '#f0ede8', sub: 'rgba(240,237,232,0.5)', badge: 'rgba(255,255,255,0.08)', badgeText: 'rgba(255,255,255,0.5)', btn: '#ffffff', btnText: '#090909' },
  { bg: 'linear-gradient(145deg,#f8f7ff,#eeeeff)', border: 'rgba(100,80,255,0.15)', text: '#1a1a2e', sub: 'rgba(26,26,46,0.55)', badge: 'rgba(100,80,255,0.08)', badgeText: '#5040ff', btn: '#5040ff', btnText: '#ffffff' },
]

export default function FeatureCarousel() {
  const navigate = useNavigate()
  const [active, setActive] = useState(0)
  const [modal, setModal] = useState<typeof carouselFeatures[0] | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const total = carouselFeatures.length

  useEffect(() => {
    if (modal) { if (intervalRef.current) clearInterval(intervalRef.current); return }
    intervalRef.current = setInterval(() => setActive(prev => (prev + 1) % total), 2500)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [modal, total])

  const getCardStyle = (index: number) => {
    const offset = ((index - active + total) % total)
    const normalizedOffset = offset > total / 2 ? offset - total : offset
    const absOffset = Math.abs(normalizedOffset)
    const isFront = normalizedOffset === 0
    const spacing = 320
    return {
      transform: `translateX(${normalizedOffset * spacing}px) rotateY(${isFront ? 0 : normalizedOffset > 0 ? -45 : 45}deg) scale(${isFront ? 1 : absOffset === 1 ? 0.82 : 0.68})`,
      opacity: absOffset <= 2 ? (isFront ? 1 : absOffset === 1 ? 0.6 : 0.25) : 0,
      zIndex: isFront ? 10 : absOffset === 1 ? 5 : 1,
      filter: isFront ? 'none' : `blur(${absOffset * 0.5}px)`,
      pointerEvents: (absOffset <= 2 ? 'auto' : 'none') as React.CSSProperties['pointerEvents'],
      transition: 'transform 0.7s cubic-bezier(0.4,0,0.2,1), opacity 0.7s ease, filter 0.7s ease',
      cursor: 'pointer',
    }
  }

  const openModal = (index: number) => {
    const offset = ((index - active + total) % total)
    const normalizedOffset = offset > total / 2 ? offset - total : offset
    if (normalizedOffset === 0) setModal(carouselFeatures[index])
    else setActive(index)
  }

  return (
    <>
      <section className="fc-root">
        <div className="fc-bg" /><div className="fc-bg-glow" />
        <div className="fc-edge-l" /><div className="fc-edge-r" />
        <div className="fc-header">
          <div className="sx-eyebrow" style={{ justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>Core Features</div>
          <h2 className="fc-title">Everything your business needs</h2>
          <p className="fc-sub">Click the front card to explore the feature</p>
        </div>
        <div className="fc-stage">
          <div className="fc-track">
            {carouselFeatures.map((feature, i) => {
              const t = CARD_THEMES[i % CARD_THEMES.length]
              const isLight = t.text !== '#f0ede8'
              return (
                <div key={feature.slug} className="fc-card" style={{ background: t.bg, border: `1px solid ${t.border}`, ...getCardStyle(i) }} onClick={() => openModal(i)}>
                  <div className="fc-card-img" style={{ backgroundImage: `url(${feature.heroImage})` }} />
                  <div className="fc-card-img-overlay" style={{ background: isLight ? 'linear-gradient(to bottom, transparent 0%, rgba(248,247,255,0.97) 55%)' : 'linear-gradient(to bottom, transparent 0%, rgba(13,10,26,0.97) 55%)' }} />
                  <div className="fc-card-body">
                    <div className="fc-card-badge" style={{ background: t.badge, color: t.badgeText }}>{feature.group}</div>
                    <h3 className="fc-card-name" style={{ color: t.text }}>{feature.name}</h3>
                    <p className="fc-card-sub" style={{ color: t.sub }}>{feature.subheadline}</p>
                    <button className="fc-card-btn" style={{ background: t.btn, color: t.btnText }}>Explore →</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="fc-nav">
          <button className="fc-nav-btn" onClick={() => setActive(prev => (prev - 1 + total) % total)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div className="fc-dots">
            {carouselFeatures.map((_, i) => <button key={i} className={`fc-dot${i === active ? ' fc-dot--active' : ''}`} onClick={() => setActive(i)} />)}
          </div>
          <button className="fc-nav-btn" onClick={() => setActive(prev => (prev + 1) % total)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      </section>

      {modal && (
        <div className="fc-modal-overlay" onClick={() => setModal(null)}>
          <div className="fc-modal" onClick={e => e.stopPropagation()}>
            <div className="fc-modal-img" style={{ backgroundImage: `url(${modal.heroImage})` }}>
              <div className="fc-modal-img-overlay" />
              <button className="fc-modal-close" onClick={() => setModal(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
              <div className="fc-modal-img-content">
                <div className="fc-modal-group">{modal.group}</div>
                <h2 className="fc-modal-headline">{modal.headline}</h2>
              </div>
            </div>
            <div className="fc-modal-body">
              <p className="fc-modal-intro">{modal.intro}</p>
              <ul className="fc-modal-bullets">
                {modal.bullets.map((b, i) => <li key={i}><span className="fc-modal-check">✓</span>{b}</li>)}
              </ul>
              <div className="fc-modal-ai">
                <div className="fc-modal-ai-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>
                  AI Intelligence
                </div>
                <p className="fc-modal-ai-text">{modal.aiInsight}</p>
              </div>
              <div className="fc-modal-actions">
                <button className="sx-btn-primary" onClick={() => { setModal(null); navigate(`/features/${modal.slug}`) }}>{modal.cta} →</button>
                <button className="sx-btn-outline" onClick={() => navigate('/pricing')}>View pricing</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}