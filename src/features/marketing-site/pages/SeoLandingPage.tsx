import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar/Navbar'
import Footer from '../components/Footer'
import SEO from '../components/SEO'
import { coreKeywords, faqSchema, organizationSchema, seoLandingPages, softwareSchema } from '../config/seo.config'
import '../styles/featurePage.scss'
import '../styles/seoLanding.scss'
import '../styles/global.scss'

export default function SeoLandingPage({ slug }: { slug: string }) {
  const navigate = useNavigate()
  const data = seoLandingPages.find(page => page.slug === slug)

  useEffect(() => { window.scrollTo(0, 0) }, [slug])

  if (!data) {
    return (
      <div className="fp-root">
        <Navbar />
        <div style={{ padding: '160px 0', textAlign: 'center' }}>
          <h1 style={{ color: 'var(--sx-text-primary)' }}>Page not found</h1>
          <button className="sx-btn-primary" onClick={() => navigate('/')}>Go Home</button>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="fp-root">
      <SEO
        title={data.title}
        description={data.description}
        path={`/${data.slug}`}
        keywords={[data.keyword, ...coreKeywords]}
        jsonLd={[softwareSchema, organizationSchema, faqSchema(data.faqs)]}
      />
      <Navbar />

      <section className="sl-hero">
        <div className="sx-section sl-hero-inner">
          <div className="sl-hero-copy">
            <div className="fp-group-badge">{data.eyebrow}</div>
            <h1 className="fp-hero-h1">{data.h1}</h1>
            <p className="fp-hero-sub">{data.intro}</p>
            <div className="fp-hero-ctas">
              <button className="sx-btn-primary" onClick={() => navigate('/register')}>Start Free Trial</button>
              <button className="sx-btn-outline" onClick={() => navigate('/contact-sales')}>Book Demo</button>
            </div>
            <p className="fp-hero-note">14-day free trial · No credit card required · Built for salons in India</p>
          </div>
          <div className="sl-hero-media">
            <img src={data.image} alt={`${data.keyword} dashboard in SalonOx`} loading="eager" decoding="async" />
          </div>
        </div>
      </section>

      <section className="fp-bullets">
        <div className="sx-section">
          <div className="sx-eyebrow">Why salons choose SalonOx</div>
          <h2 className="fp-bullets-h2">Everything your front desk needs</h2>
          <div className="fp-bullets-grid">
            {data.bullets.map(item => (
              <div key={item} className="fp-bullet-card">
                <div className="fp-bullet-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg></div>
                <p className="fp-bullet-text">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sl-suite">
        <div className="sx-section">
          <div className="sx-eyebrow">Complete salon management software</div>
          <h2 className="fp-intro-h2">Billing, appointments, staff, CRM and marketing work together</h2>
          <div className="sl-suite-grid">
            {['Salon billing software', 'Salon appointment software', 'Salon POS software', 'Salon CRM software', 'Bulk WhatsApp marketing', 'Reports & analytics'].map(item => (
              <button key={item} className="sl-suite-item" onClick={() => navigate('/')}>{item}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="sl-faq">
        <div className="sx-section">
          <div className="sx-eyebrow">FAQ</div>
          <h2 className="fp-related-h2">Questions about {data.eyebrow.toLowerCase()}</h2>
          <div className="sl-faq-list">
            {data.faqs.map(item => (
              <div key={item.question} className="sl-faq-item">
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="fp-banner">
        <div className="fp-banner-bg" style={{ backgroundImage: `url(${data.image})` }} />
        <div className="fp-banner-overlay" />
        <div className="sx-section fp-banner-inner">
          <h2 className="fp-banner-h2">Ready to run your salon on SalonOx?</h2>
          <p className="fp-banner-sub">Start free, book a demo, or compare pricing before you decide.</p>
          <div className="fp-banner-ctas">
            <button className="sx-btn-primary" onClick={() => navigate('/register')}>Start Free Trial</button>
            <button className="sx-btn-outline" style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }} onClick={() => navigate('/contact-sales')}>Book Demo</button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

