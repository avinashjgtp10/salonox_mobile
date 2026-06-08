import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar/Navbar'
import Footer from '../components/Footer'
import SEO from '../components/SEO'
import { features } from '../config/features.config'
import { coreKeywords, organizationSchema, softwareSchema } from '../config/seo.config'
import '../styles/featurePage.scss'
import '../styles/global.scss'

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.sx-reveal')
    const observer = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); observer.unobserve(e.target) } }), { threshold: 0.1 })
    els.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

const groupColors: Record<string, string> = {
  'Run Your Business': 'var(--sx-accent)', 'Grow Your Business': 'var(--sx-green)',
  'Simplify Payments': 'var(--sx-blue)', 'Elevate Client Experience': 'var(--sx-pink)', 'Build Your Brand': 'var(--sx-purple)',
}

export default function FeaturePage({ slug }: { slug: string }) {
  const navigate = useNavigate()
  useScrollReveal()
  const data = features.find(f => f.slug === slug)
  useEffect(() => { window.scrollTo(0, 0) }, [slug])

  if (!data) return (
    <div className="fp-root"><Navbar />
      <div style={{ padding: '200px 0', textAlign: 'center' }}>
        <h1 style={{ color: 'var(--sx-text-primary)' }}>Page not found</h1>
        <button className="sx-btn-primary" onClick={() => navigate('/')}>Go Home</button>
      </div>
      <Footer />
    </div>
  )

  const accentColor = groupColors[data.group] || 'var(--sx-accent)'
  const related = features.filter(f => f.group === data.group && f.slug !== slug).slice(0, 3)

  return (
    <div className="fp-root">
      <SEO
        title={`${data.name} | Salon Management Software | SalonOx`}
        description={data.subheadline}
        path={`/features/${data.slug}`}
        keywords={[data.name, ...coreKeywords]}
        jsonLd={[softwareSchema, organizationSchema]}
      />
      <Navbar />
      <section className="fp-hero">
        <div className="fp-hero-bg" style={{ backgroundImage: `url(${data.heroImage})` }} />
        <div className="fp-hero-overlay" /><div className="fp-hero-grid" />
        <div className="sx-section fp-hero-inner">
          <div className="fp-hero-content sx-animate-fade-up">
            <div className="fp-group-badge" style={{ color: accentColor, background: `color-mix(in srgb, ${accentColor} 10%, transparent)`, borderColor: `color-mix(in srgb, ${accentColor} 25%, transparent)` }}>{data.group}</div>
            <h1 className="fp-hero-h1">{data.headline}</h1>
            <p className="fp-hero-sub">{data.subheadline}</p>
            <div className="fp-hero-ctas">
              <button className="sx-btn-primary" onClick={() => navigate('/register')}>{data.cta} →</button>
              <button className="sx-btn-outline" onClick={() => navigate('/pricing')}>{data.ctaSecondary}</button>
            </div>
            <p className="fp-hero-note">Free 14-day trial · No credit card required</p>
          </div>
        </div>
      </section>

      <section className="fp-intro sx-reveal">
        <div className="sx-section fp-intro-inner">
          <div className="fp-intro-text">
            <div className="sx-eyebrow">Overview</div>
            <h2 className="fp-intro-h2">{data.name} — how it works</h2>
            <p className="fp-intro-body">{data.intro}</p>
          </div>
          <div className="fp-intro-visual sx-animate-float"><img src={data.heroImage} alt={data.name} className="fp-intro-img" /></div>
        </div>
      </section>

      <section className="fp-bullets sx-reveal">
        <div className="sx-section">
          <div className="sx-eyebrow">What's included</div>
          <h2 className="fp-bullets-h2">Everything inside {data.name}</h2>
          <div className="fp-bullets-grid">
            {data.bullets.map((b, i) => (
              <div key={i} className="fp-bullet-card">
                <div className="fp-bullet-icon" style={{ color: accentColor, background: `color-mix(in srgb, ${accentColor} 10%, transparent)`, borderColor: `color-mix(in srgb, ${accentColor} 20%, transparent)` }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <p className="fp-bullet-text">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="fp-ai sx-reveal">
        <div className="sx-section">
          <div className="fp-ai-card" style={{ borderColor: `color-mix(in srgb, ${accentColor} 25%, transparent)` }}>
            <div className="fp-ai-header">
              <div className="fp-ai-icon" style={{ background: `color-mix(in srgb, ${accentColor} 12%, transparent)` }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.75"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/><path d="M12 8v4l3 3"/></svg>
              </div>
              <span className="fp-ai-label" style={{ color: accentColor }}>AI Intelligence</span>
            </div>
            <p className="fp-ai-text">{data.aiInsight}</p>
          </div>
        </div>
      </section>

      <section className="fp-works-with sx-reveal">
        <div className="sx-section">
          <div className="sx-eyebrow">Works with</div>
          <h2 className="fp-ww-h2">{data.name} works seamlessly<br />with the rest of SalonOx</h2>
          <div className="fp-ww-grid">
            {features.filter(f => f.slug !== slug).slice(0, 6).map(f => (
              <button key={f.slug} className="fp-ww-card" onClick={() => navigate(`/features/${f.slug}`)}>
                <div className="fp-ww-dot" style={{ background: groupColors[f.group] || 'var(--sx-accent)' }} />
                <div className="fp-ww-name">{f.name}</div>
                <div className="fp-ww-group">{f.group}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="fp-banner sx-reveal">
        <div className="fp-banner-bg" style={{ backgroundImage: `url(${data.heroImage})` }} />
        <div className="fp-banner-overlay" />
        <div className="sx-section fp-banner-inner">
          <h2 className="fp-banner-h2">Ready to unlock {data.name}?</h2>
          <p className="fp-banner-sub">Start your free 14-day trial today. No credit card required.</p>
          <div className="fp-banner-ctas">
            <button className="sx-btn-primary" onClick={() => navigate('/register')}>{data.cta} →</button>
            <button className="sx-btn-outline" style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }} onClick={() => navigate('/pricing')}>View Pricing</button>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="fp-related sx-reveal">
          <div className="sx-section">
            <div className="sx-eyebrow">Related features</div>
            <h2 className="fp-related-h2">More features in {data.group}</h2>
            <div className="fp-related-grid">
              {related.map(r => (
                <button key={r.slug} className="fp-related-card" onClick={() => navigate(`/features/${r.slug}`)}>
                  <div className="fp-related-img" style={{ backgroundImage: `url(${r.heroImage})` }} />
                  <div className="fp-related-body">
                    <div className="fp-related-name">{r.name}</div>
                    <div className="fp-related-sub">{r.headline}</div>
                    <div className="fp-related-link" style={{ color: accentColor }}>Learn more →</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
      <Footer />
    </div>
  )
}
