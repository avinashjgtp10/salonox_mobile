import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar/Navbar'
import Footer from '../components/Footer'
import { businessTypes } from '../config/businessTypes.config'
import '../styles/businessType.scss'
import '../styles/global.scss'
import WhatsAppBubble from '../components/WhatsAppBubble'

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.sx-reveal')
    const observer = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); observer.unobserve(e.target) } }), { threshold: 0.1 })
    els.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

export default function BusinessTypePage({ slug }: { slug: string }) {
  const navigate = useNavigate()
  useScrollReveal()
  const data = businessTypes.find(b => b.slug === slug)
  useEffect(() => { window.scrollTo(0, 0) }, [slug])

  if (!data) return (
    <div className="bt-root"><Navbar />
      <div style={{ padding: '200px 0', textAlign: 'center' }}>
        <h1 style={{ color: 'var(--sx-text-primary)' }}>Page not found</h1>
        <button className="sx-btn-primary" onClick={() => navigate('/')}>Go Home</button>
      </div>
      <Footer />
    </div>
  )

  const categoryColor = data.category === 'beauty' ? '#ec4899' : data.category === 'wellness' ? 'var(--sx-green)' : 'var(--sx-blue)'
  const related = businessTypes.filter(b => b.category === data.category && b.slug !== slug).slice(0, 6)

  return (
    <div className="bt-root">
      <Navbar />
      <section className="bt-hero">
        <div className="bt-hero-bg" style={{ backgroundImage: `url(${data.heroImage})` }} />
        <div className="bt-hero-overlay" /><div className="bt-hero-grid" />
        <div className="sx-section bt-hero-inner">
          <div className="bt-hero-content sx-animate-fade-up">
            <div className="bt-hero-badge" style={{ color: categoryColor, background: `color-mix(in srgb, ${categoryColor} 10%, transparent)`, borderColor: `color-mix(in srgb, ${categoryColor} 25%, transparent)` }}>
              {data.category.charAt(0).toUpperCase() + data.category.slice(1)}
            </div>
            <h1 className="bt-hero-h1">{data.headline}</h1>
            <p className="bt-hero-sub">{data.subheadline}</p>
            <div className="bt-hero-ctas">
              <button className="sx-btn-primary" onClick={() => navigate('/register')}>{data.cta} →</button>
              <button className="sx-btn-outline" onClick={() => navigate('/pricing')}>{data.ctaSecondary}</button>
            </div>
            <p className="bt-hero-note">Free 14-day trial · No credit card required</p>
          </div>
        </div>
      </section>

      <section className="bt-intro sx-reveal">
        <div className="sx-section bt-intro-inner">
          <div className="bt-intro-text">
            <div className="sx-eyebrow">How it works</div>
            <h2 className="bt-intro-h2">Built specifically for {data.name} businesses</h2>
            <p className="bt-intro-body">{data.intro}</p>
          </div>
          <div className="bt-intro-img-wrap sx-animate-float"><img src={data.heroImage} alt={data.name} className="bt-intro-img" /></div>
        </div>
      </section>

      <section className="bt-bullets sx-reveal">
        <div className="sx-section">
          <div className="sx-eyebrow">Key features</div>
          <h2 className="bt-bullets-h2">Everything a {data.name} business needs</h2>
          <div className="bt-bullets-grid">
            {data.bullets.map((b, i) => (
              <div key={i} className="bt-bullet-card">
                <div className="bt-bullet-num" style={{ color: categoryColor, background: `color-mix(in srgb, ${categoryColor} 10%, transparent)`, borderColor: `color-mix(in srgb, ${categoryColor} 20%, transparent)` }}>{String(i + 1).padStart(2, '0')}</div>
                <p className="bt-bullet-text">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bt-ai sx-reveal">
        <div className="sx-section bt-ai-inner">
          <div className="bt-ai-icon"><svg viewBox="0 0 24 24" fill="none" stroke={categoryColor} strokeWidth="1.5"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="3" fill={categoryColor} fillOpacity="0.15"/></svg></div>
          <div className="bt-ai-content">
            <div className="bt-ai-label" style={{ color: categoryColor }}>AI-Powered Intelligence</div>
            <p className="bt-ai-text">{data.aiInsight}</p>
          </div>
        </div>
      </section>

      <section className="bt-feature-highlights sx-reveal">
        <div className="sx-section">
          <div className="sx-eyebrow">Platform features</div>
          <h2 className="bt-fh-h2">The full SalonOx platform,<br />ready for your {data.name} business</h2>
          <div className="bt-fh-grid">
            {[{ icon: 'M3 4h18v2H3zm0 7h18v2H3zm0 7h18v2H3z', title: 'Smart Scheduler', desc: 'AI-powered calendar with day, week, and month views.', path: '/features/scheduler' },{ icon: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z', title: 'WhatsApp Marketing', desc: 'Automated campaigns that reach clients where they are.', path: '/features/whatsapp-marketing' },{ icon: 'M12 2a10 10 0 100 20A10 10 0 0012 2zm0 6v4l3 3', title: 'SalonBot AI', desc: '24/7 AI assistant for bookings and business insights.', path: '/features/salonbot-ai' },{ icon: 'M22 12h-4l-3 9L9 3l-3 9H2', title: 'Reports & Analytics', desc: 'Visual dashboards with AI-powered insights.', path: '/features/reports-analytics' },{ icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 3a4 4 0 100 8 4 4 0 000-8z', title: 'Client Management', desc: 'Rich client profiles with history and preferences.', path: '/features/client-management' },{ icon: 'M1 4h22v2H1zm0 7h22v2H1zm0 7h22v2H1z', title: 'Loyalty Program', desc: 'Points, tiers, and rewards — fully automated.', path: '/features/loyalty-program' }].map(f => (
              <button key={f.title} className="bt-fh-card" onClick={() => navigate(f.path)}>
                <div className="bt-fh-icon" style={{ background: `color-mix(in srgb, ${categoryColor} 10%, transparent)`, color: categoryColor }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d={f.icon} /></svg></div>
                <div className="bt-fh-title">{f.title}</div>
                <div className="bt-fh-desc">{f.desc}</div>
                <div className="bt-fh-arrow" style={{ color: categoryColor }}>Learn more →</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="bt-img-banner sx-reveal">
        <div className="bt-img-banner-bg" style={{ backgroundImage: `url(${data.heroImage})` }} />
        <div className="bt-img-banner-overlay" />
        <div className="sx-section bt-img-banner-inner">
          <h2 className="bt-img-banner-h2">Ready to grow your {data.name} business?</h2>
          <p className="bt-img-banner-sub">Join 500+ businesses using SalonOx every day. Free 14-day trial — no credit card needed.</p>
          <div className="bt-img-banner-ctas">
            <button className="sx-btn-primary" onClick={() => navigate('/register')}>{data.cta} →</button>
            <button className="sx-btn-outline" style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }} onClick={() => navigate('/pricing')}>View Pricing</button>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="bt-related sx-reveal">
          <div className="sx-section">
            <div className="sx-eyebrow">Explore more</div>
            <h2 className="bt-related-h2">Other {data.category} businesses on SalonOx</h2>
            <div className="bt-related-grid">
              {related.map(r => (
                <button key={r.slug} className="bt-related-card" onClick={() => navigate(`/business/${r.slug}`)}>
                  <div className="bt-related-img" style={{ backgroundImage: `url(${r.heroImage})` }} />
                  <div className="bt-related-body">
                    <div className="bt-related-name">{r.name}</div>
                    <div className="bt-related-sub">{r.headline.split('.')[0]}</div>
                    <div className="bt-related-link" style={{ color: categoryColor }}>Learn more →</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
      <WhatsAppBubble />
      <Footer />
    </div>
  )
}