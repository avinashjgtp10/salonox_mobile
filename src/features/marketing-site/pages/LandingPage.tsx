import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar/Navbar'
import Footer from '../components/Footer'
import { beautyTypes, wellnessTypes, fitnessTypes } from '../config/businessTypes.config'
import { featureGroups } from '../config/features.config'
import '../styles/landing.scss'
import '../styles/global.scss'
import FeatureCarousel from '../components/FeatureCarousel'
import { useAppSelector } from '../../../hooks/useAppRedux'
import WhatsAppBubble from '../components/WhatsAppBubble'

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.sx-reveal')
    const observer = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); observer.unobserve(e.target) } }), { threshold: 0.12 })
    els.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

function DashboardMockup() {
  return (
    <div className="lp-dash">
      <div className="lp-dash-bar">
        <span className="lp-dash-dot" style={{ background: '#ef4444' }} />
        <span className="lp-dash-dot" style={{ background: '#f59e0b' }} />
        <span className="lp-dash-dot" style={{ background: 'var(--sx-accent)' }} />
        <span className="lp-dash-title">salonox — dashboard</span>
      </div>
      <div className="lp-dash-body">
        <div className="lp-dash-sidebar">
          {['M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 3h2m2 0h2m-3-3v2m0 2v2','M3 4h18v2H3zm0 7h18v2H3zm0 7h18v2H3z','M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 3a4 4 0 100 8 4 4 0 000-8z','M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6','M22 12h-4l-3 9L9 3l-3 9H2'].map((d, i) => (
            <div key={i} className={`lp-dash-icon${i === 0 ? ' active' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke={i === 0 ? 'var(--sx-accent)' : 'var(--sx-text-muted)'} strokeWidth="1.75"><path d={d} /></svg>
            </div>
          ))}
        </div>
        <div className="lp-dash-content">
          <div className="lp-dash-topbar">
            <span className="lp-dash-brand">salonox</span>
            <span className="lp-dash-date">Today · Live</span>
          </div>
          <div className="lp-kpi-row">
            {[{ l: 'Revenue', v: '$9,840', c: '+12.5%', col: 'var(--sx-green)' },{ l: 'Bookings', v: '185', c: '+8.2%', col: 'var(--sx-blue)' },{ l: 'Clients', v: '1,240', c: '+5.1%', col: 'var(--sx-purple)' }].map(k => (
              <div key={k.l} className="lp-kpi">
                <div className="lp-kpi-lbl">{k.l}</div>
                <div className="lp-kpi-val">{k.v}</div>
                <div className="lp-kpi-chg" style={{ color: k.col }}>↑ {k.c}</div>
              </div>
            ))}
          </div>
          <div className="lp-chart-wrap">
            <div className="lp-chart-lbl">Revenue this week</div>
            <div className="lp-bars">
              {[42,64,54,80,90,100,70].map((h, i) => <div key={i} className="lp-bar" style={{ height: `${h}%`, background: i === 5 ? 'var(--sx-accent)' : 'var(--sx-accent-muted)', opacity: i === 5 ? 1 : 0.6 }} />)}
            </div>
          </div>
          <div className="lp-appt-list">
            {[{ name: 'Priya Sharma', svc: 'Hair Color · 9:00 AM', status: 'Confirmed', col: 'var(--sx-green)' },{ name: 'Rahul Mehta', svc: 'Beard Trim · 10:00 AM', status: 'In Chair', col: 'var(--sx-blue)' },{ name: 'Sneha Patel', svc: 'Facial · 11:00 AM', status: 'Upcoming', col: 'var(--sx-amber)' }].map(a => (
              <div key={a.name} className="lp-appt">
                <div><div className="lp-appt-name">{a.name}</div><div className="lp-appt-svc">{a.svc}</div></div>
                <span className="lp-appt-badge" style={{ color: a.col, background: `color-mix(in srgb, ${a.col} 12%, transparent)` }}>{a.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const { accessToken } = useAppSelector((state) => state.auth)
  const dest = accessToken ? '/dashboard' : '/register'
  useScrollReveal()
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div className="lp-root">
      <Navbar />

      <section className="lp-hero">
        <div className="lp-hero-bg" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1600&q=80)' }} />
        <div className="lp-hero-overlay" />
        <div className="lp-hero-grid" />
        <div className="sx-section lp-hero-inner">
          <div className="lp-hero-text sx-animate-fade-up">
            <div className="lp-hero-badge"><span className="lp-badge-dot" />Now with SalonBot AI — your 24/7 business assistant</div>
            <h1 className="lp-hero-h1">Every Booking.<br />Every Client.<br /><em>One Platform.</em></h1>
            <p className="lp-hero-sub">The all-in-one platform for beauty, wellness &amp; fitness businesses. Appointments, staff, payments, WhatsApp marketing — all powered by AI.</p>
            <div className="lp-hero-ctas">
  <button
    className="sx-btn-primary"
    onClick={() => navigate(dest)}
  >
    Start free trial →
  </button>

  <button
    className="sx-btn-outline"
    onClick={() => navigate('')}
  >
    ▶ Watch 2 min demo
  </button>

  <a
    href="tel:+918010765945"
    className="sx-btn-outline"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      textDecoration: 'none',
    }}
  >
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.77a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>

    Call: 80107 65945
  </a>
</div>
            <p className="lp-hero-note">Free 14-day trial · No credit card · Setup in under 10 mins</p>
          </div>
          <div className="lp-hero-mockup sx-animate-float"><DashboardMockup /></div>
        </div>
      </section>

      <section className="lp-proof">
        <div className="sx-section lp-proof-inner">
          {[{ val: '500+', lbl: 'Businesses active' },{ val: '$2M+', lbl: 'Processed monthly' },{ val: '100K+', lbl: 'Appointments booked' },{ val: '4.9 ★', lbl: 'Average rating' },{ val: '14 day', lbl: 'Free trial' }].map((s, i) => (
            <div key={s.lbl} className="lp-proof-stat">
              {i > 0 && <div className="lp-proof-div" />}
              <div className="lp-proof-val">{s.val}</div>
              <div className="lp-proof-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>
      </section>

      <FeatureCarousel />

      <section className="lp-features sx-reveal">
        <div className="sx-section">
          <div className="sx-eyebrow">Everything you need</div>
          <h2 className="lp-section-h2">Built for every part<br />of your business</h2>
          <p className="lp-section-sub">From the first booking to the final payment — SalonOx handles it all, intelligently.</p>
          <div className="lp-feat-grid">
            {featureGroups.map(group => (
              <div key={group.label} className="lp-feat-col">
                <div className="lp-feat-col-title">{group.label}</div>
                {group.features.map(ft => (
                  <button key={ft.slug} className="lp-feat-item" onClick={() => navigate(`/features/${ft.slug}`)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polyline points="9 18 15 12 9 6" /></svg>
                    {ft.name}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-biz sx-reveal">
        <div className="sx-section">
          <div className="sx-eyebrow">Business types</div>
          <h2 className="lp-section-h2">Built for every beauty,<br />wellness &amp; fitness business</h2>
          <p className="lp-section-sub">One platform, tailored to your industry. Click your business type to see exactly how SalonOx works for you.</p>
          <div className="lp-biz-cats">
            {[{ label: 'Beauty', color: '#ec4899', types: beautyTypes },{ label: 'Wellness', color: 'var(--sx-green)', types: wellnessTypes },{ label: 'Fitness', color: 'var(--sx-blue)', types: fitnessTypes }].map(cat => (
              <div key={cat.label} className="lp-biz-cat">
                <div className="lp-biz-cat-lbl" style={{ color: cat.color }}>{cat.label}</div>
                <div className="lp-biz-pills">
                  {cat.types.map(bt => <button key={bt.slug} className="lp-biz-pill" onClick={() => navigate(`/business/${bt.slug}`)}>{bt.name}</button>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-deep lp-deep--dark sx-reveal">
        <div className="sx-section lp-deep-inner">
          <div className="lp-deep-text">
            <div className="sx-eyebrow">Scheduler</div>
            <h2 className="lp-deep-h2">Your entire day,<br />organised by AI.</h2>
            <p className="lp-deep-body">The SalonOx Scheduler shows every staff member's schedule side-by-side. Book, reschedule, and manage walk-ins without ever losing track. The AI fills your gaps automatically.</p>
            <ul className="lp-bullets"><li>Day, Week, Month and List views</li><li>Drag to reschedule · Click to change status</li><li>Staff columns with colour-coded bookings</li><li>AI fills underbooked slots automatically</li></ul>
            <button className="sx-btn-primary" onClick={() => navigate('/features/scheduler')}>Explore Scheduler →</button>
          </div>
          <div className="lp-deep-visual sx-animate-float">
            <img src="https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&q=80" alt="Scheduler" className="lp-deep-img" />
            <div className="lp-deep-img-overlay" />
          </div>
        </div>
      </section>

      <section className="lp-deep sx-reveal">
        <div className="sx-section lp-deep-inner lp-deep-inner--reverse">
          <div className="lp-deep-text">
            <div className="sx-eyebrow">WhatsApp Marketing</div>
            <h2 className="lp-deep-h2">Reach clients where<br />they already are.</h2>
            <p className="lp-deep-body">Run AI-powered WhatsApp campaigns that reach the right clients with the right message at the right time. Track delivery, opens, and replies — all in one dashboard.</p>
            <ul className="lp-bullets"><li>Target by visit history, tier, or location</li><li>AI writes your campaign copy in seconds</li><li>Track delivery, read rates, and revenue impact</li><li>WhatsApp Business API — fully compliant</li></ul>
            <button className="sx-btn-primary" onClick={() => navigate('/features/whatsapp-marketing')}>Explore WhatsApp Marketing →</button>
          </div>
          <div className="lp-deep-visual sx-animate-float">
            <img src="https://images.unsplash.com/photo-1611746872915-64382b5c76da?w=800&q=80" alt="WhatsApp Marketing" className="lp-deep-img" />
            <div className="lp-deep-img-overlay" />
          </div>
        </div>
      </section>

      <section className="lp-deep lp-deep--dark sx-reveal">
        <div className="sx-section lp-deep-inner">
          <div className="lp-deep-text">
            <div className="sx-eyebrow">SalonBot AI</div>
            <h2 className="lp-deep-h2">Your AI assistant,<br />always on.</h2>
            <p className="lp-deep-body">SalonBot answers client questions, handles bookings via WhatsApp, and gives you daily business insights — 24/7, without any manual effort from your team.</p>
            <ul className="lp-bullets"><li>Handles FAQs, bookings, and availability via WhatsApp</li><li>Daily plain-language business summaries</li><li>Learns your business data over time</li><li>Routes complex queries to your team instantly</li></ul>
            <button className="sx-btn-primary" onClick={() => navigate('/features/salonbot-ai')}>Meet SalonBot →</button>
          </div>
          <div className="lp-deep-visual sx-animate-float">
            <img src="https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80" alt="SalonBot AI" className="lp-deep-img" />
            <div className="lp-deep-img-overlay" />
          </div>
        </div>
      </section>

      <section className="lp-deep sx-reveal">
        <div className="sx-section lp-deep-inner lp-deep-inner--reverse">
          <div className="lp-deep-text">
            <div className="sx-eyebrow">Reports &amp; Analytics</div>
            <h2 className="lp-deep-h2">Data that drives<br />decisions.</h2>
            <p className="lp-deep-body">Visual dashboards covering revenue, services, staff performance, and client behaviour. AI highlights what matters most and delivers a weekly summary straight to your inbox.</p>
            <ul className="lp-bullets"><li>Revenue, bookings, and staff performance at a glance</li><li>AI identifies trends and growth opportunities</li><li>Forecasts next month's revenue</li><li>Export reports for your accountant in one click</li></ul>
            <button className="sx-btn-primary" onClick={() => navigate('/features/reports-analytics')}>Explore Reports →</button>
          </div>
          <div className="lp-deep-visual sx-animate-float">
            <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80" alt="Reports" className="lp-deep-img" />
            <div className="lp-deep-img-overlay" />
          </div>
        </div>
      </section>

      <section className="lp-deep lp-deep--dark sx-reveal">
        <div className="sx-section lp-deep-inner">
          <div className="lp-deep-text">
            <div className="sx-eyebrow">Loyalty Program</div>
            <h2 className="lp-deep-h2">Turn first-time clients<br />into lifelong fans.</h2>
            <p className="lp-deep-body">Reward clients automatically with every visit. Points, tiers, and personalised milestone messages — all managed by AI so you never have to lift a finger.</p>
            <ul className="lp-bullets"><li>Silver, Gold, Platinum tiers — fully automated</li><li>AI nudges clients near their next reward</li><li>Digital — no stamps, no cards</li><li>See revenue impact of loyalty vs non-loyalty clients</li></ul>
            <button className="sx-btn-primary" onClick={() => navigate('/features/loyalty-program')}>Explore Loyalty →</button>
          </div>
          <div className="lp-deep-visual sx-animate-float">
            <img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80" alt="Loyalty" className="lp-deep-img" />
            <div className="lp-deep-img-overlay" />
          </div>
        </div>
      </section>

      <section className="lp-multiloc sx-reveal">
        <div className="sx-section lp-multiloc-inner">
          <div className="lp-multiloc-text">
            <div className="sx-eyebrow">Multi-location</div>
            <h2 className="lp-multiloc-h2">One business.<br />Many locations.<br />One dashboard.</h2>
            <p className="lp-multiloc-sub">Add each branch to SalonOx and manage them all from one login. Each location operates independently — but you see everything from the top.</p>
            <ul className="lp-multiloc-bullets">
              {['Unified revenue and booking reports across all branches','Staff who work across locations managed in one place','AI benchmarks locations and flags underperformers early','Clients book any branch from the same booking page'].map(b => (
                <li key={b}><span className="lp-multiloc-check"><svg viewBox="0 0 24 24" fill="none" stroke="var(--sx-green)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg></span>{b}</li>
              ))}
            </ul>
            <button className="sx-btn-primary" onClick={() => navigate('/features/multi-location')}>Go Multi-Location →</button>
          </div>
          <div className="lp-multiloc-stats">
            {[{ val: '50+', lbl: 'Chains on SalonOx' },{ val: '99.9%', lbl: 'Uptime guarantee' },{ val: '1', lbl: 'Login for all branches' },{ val: '24/7', lbl: 'AI monitoring' }].map(s => (
              <div key={s.lbl} className="lp-multiloc-stat"><div className="lp-multiloc-stat-val">{s.val}</div><div className="lp-multiloc-stat-lbl">{s.lbl}</div></div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-pricing-preview sx-reveal">
  <div className="sx-section">
    <div className="sx-eyebrow" style={{ justifyContent: 'center' }}>Pricing</div>
    <h2 className="lp-section-h2" style={{ textAlign: 'center' }}>Simple, honest pricing</h2>
    <p className="lp-section-sub" style={{ textAlign: 'center', margin: '0 auto 12px' }}>Start free for 14 days. No credit card required.</p>

    {/* New user offer note */}
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: 'color-mix(in srgb, var(--sx-green) 10%, transparent)',
        border: '1px solid color-mix(in srgb, var(--sx-green) 25%, transparent)',
        borderRadius: 999,
        padding: '8px 20px',
        fontSize: 13,
        color: 'var(--sx-green)',
        fontWeight: 500,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        Special offer available for new users
      </div>
    </div>

    <div
      className="lp-pricing-grid"
      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 720, margin: '0 auto' }}
    >
      {/* Quarterly */}
      <div className="lp-price-card">
        <div className="lp-price-name">Quarterly</div>
        <div className="lp-price-amt">₹2,997</div>
        <div className="lp-price-period">per quarter</div>
        <div style={{ fontSize: 11, color: 'var(--sx-text-muted)', marginBottom: 20 }}>
          ₹999 / month · billed every 3 months
        </div>
        <button
          className="sx-btn-outline"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => navigate(dest)}
        >
          Start free trial →
        </button>
      </div>

      {/* Annual */}
      <div className="lp-price-card lp-price-card--pop">
        <div className="lp-price-badge">Best Value</div>
        <div className="lp-price-name">Annual</div>
        <div className="lp-price-amt">₹10,788</div>
        <div className="lp-price-period">per year</div>
        <div style={{ fontSize: 11, color: 'var(--sx-text-muted)', marginBottom: 20 }}>
          ₹899 / month · billed annually · save 10%
        </div>
        <button
          className="sx-btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => navigate(dest)}
        >
          Start free trial →
        </button>
      </div>
    </div>

    <div style={{ textAlign: 'center', marginTop: 32 }}>
      <button className="sx-btn-outline" onClick={() => navigate('/pricing')}>
        See full features &amp; plan details →
      </button>
    </div>
  </div>
</section>

      <section className="lp-testi sx-reveal">
        <div className="sx-section">
          <div className="sx-eyebrow" style={{ justifyContent: 'center' }}>What businesses say</div>
          <h2 className="lp-section-h2" style={{ textAlign: 'center', marginBottom: 48 }}>Trusted by 500+ businesses</h2>
          <div className="lp-testi-grid">
            {[{ quote: 'SalonOx completely transformed how we run our salon. The AI scheduling alone saves us 2 hours every day.', name: 'Priya Kapoor', role: 'Owner, Luxe Hair Studio · Mumbai', avatar: 'PK', color: '#ec4899' },{ quote: 'The WhatsApp campaigns brought back 40 lapsed clients in the first month. I was genuinely shocked.', name: 'Raj Sharma', role: 'Owner, The Barber Co · Delhi', avatar: 'RS', color: 'var(--sx-blue)' },{ quote: 'Managing 3 locations used to be a nightmare. Now I do everything from one screen. Game changer.', name: 'Meera Joshi', role: 'Director, Serenity Spas · Bangalore', avatar: 'MJ', color: 'var(--sx-green)' }].map(t => (
              <div key={t.name} className="lp-testi-card">
                <div className="lp-testi-stars">★★★★★</div>
                <p className="lp-testi-text">"{t.quote}"</p>
                <div className="lp-testi-author">
                  <div className="lp-testi-avatar" style={{ background: t.color }}>{t.avatar}</div>
                  <div><div className="lp-testi-name">{t.name}</div><div className="lp-testi-role">{t.role}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-cta sx-reveal">
        <div className="lp-cta-bg" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1600&q=80)' }} />
        <div className="lp-cta-overlay" />
        <div className="sx-section lp-cta-inner">
          <div className="lp-cta-badge">Ready to grow?</div>
          <h2 className="lp-cta-h2">Run your business smarter.<br />Start today.</h2>
          <p className="lp-cta-sub">Join 500+ businesses already using SalonOx every day. Free 14-day trial, no credit card required.</p>
          <div className="lp-cta-actions">
            <button className="sx-btn-primary" onClick={() => navigate(dest)}>Start free trial →</button>
            <button className="sx-btn-outline" style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }} onClick={() => navigate('/contact-sales')}>Talk to sales</button>
          </div>
        </div>
      </section>
      <WhatsAppBubble />

      <Footer />
    </div>
  )
}