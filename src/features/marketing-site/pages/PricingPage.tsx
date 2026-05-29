import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar/Navbar'
import Footer from '../components/Footer'
import SEO from '../components/SEO'
import { plans, currencySymbol, type Currency } from '../config/pricing.config'
import { coreKeywords, faqSchema, organizationSchema, softwareSchema } from '../config/seo.config'
import '../styles/pricing.scss'
import '../styles/global.scss'

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.sx-reveal')
    const observer = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); observer.unobserve(e.target) } }), { threshold: 0.1 })
    els.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

const faqItems = [
  { q: 'Is there a free trial?', a: 'Yes — every plan comes with a 14-day free trial. No credit card required. You get full access to all features during your trial.' },
  { q: 'Can I change my plan later?', a: 'Absolutely. You can upgrade or downgrade your plan at any time from your account settings. Changes take effect immediately.' },
  { q: 'What happens after the trial ends?', a: "You'll be asked to choose a plan to continue. If you don't, your account is paused — your data is never deleted." },
  { q: 'Do you support multiple locations?', a: 'Yes. Multi-location support is available on the Elite plan. Each branch has its own settings, staff, and calendar — managed from one dashboard.' },
  { q: 'Is GST billing included?', a: 'Yes. All plans include fully GST-compliant invoicing with GSTIN fields, HSN/SAC codes, and export-ready GSTR summaries.' },
  { q: 'What payment methods do you accept?', a: 'We accept UPI, all major credit and debit cards, and net banking for Indian accounts. International cards accepted for USD and EUR plans.' },
]

export default function PricingPage() {
  const navigate = useNavigate()
  const [currency, setCurrency] = useState<Currency>('INR')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  useScrollReveal()
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const sym = currencySymbol[currency]

  return (
    <div className="pp-root">
      <SEO
        title="SalonOx Pricing | Salon Management Software Plans"
        description="Compare SalonOx pricing for salon billing, appointments, staff, CRM, POS, reports and WhatsApp marketing. Start a 14-day free trial."
        path="/pricing"
        keywords={coreKeywords}
        jsonLd={[softwareSchema, organizationSchema, faqSchema(faqItems.map(item => ({ question: item.q, answer: item.a })))]}
      />
      <Navbar />
      <section className="pp-hero">
        <div className="pp-hero-grid" />
        <div className="sx-section pp-hero-inner">
          <div className="sx-eyebrow" style={{ justifyContent: 'center' }}>Pricing</div>
          <h1 className="pp-hero-h1">Simple, honest pricing.<br /><span>Start free for 14 days.</span></h1>
          <p className="pp-hero-sub">No hidden fees. No contracts. Cancel anytime. Every plan includes a 14-day free trial with full access.</p>
          <div className="pp-currency-wrap">
            <div className="pp-currency-toggle">
              {(['INR', 'USD', 'EUR'] as Currency[]).map(c => (
                <button key={c} className={`pp-currency-btn${currency === c ? ' pp-currency-btn--active' : ''}`} onClick={() => setCurrency(c)}>
                  {c === 'INR' ? '🇮🇳 INR' : c === 'USD' ? '🌍 USD' : '🇪🇺 EUR'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pp-plans sx-reveal">
        <div className="sx-section">
          <div className="pp-plans-grid">
            {plans.map(plan => (
              <div key={plan.id} className={`pp-plan-card${plan.highlighted ? ' pp-plan-card--pop' : ''}`}>
                {plan.highlighted && <div className="pp-plan-badge">Most Popular</div>}
                <div className="pp-plan-name">{plan.name}</div>
                <div className="pp-plan-price-row"><span className="pp-plan-sym">{sym}</span><span className="pp-plan-amount">{plan.price[currency].toLocaleString()}</span></div>
                <div className="pp-plan-period">{plan.period}</div>
                <div className="pp-plan-trial">{plan.trial}</div>
                <p className="pp-plan-desc">{plan.desc}</p>
                <div className="pp-plan-divider" />
                <ul className="pp-plan-features">
                  {plan.features.map(f => <li key={f}><span className="pp-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg></span>{f}</li>)}
                </ul>
                <button className={plan.highlighted ? 'sx-btn-primary' : 'sx-btn-outline'} style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }} onClick={() => plan.id === 'elite' ? navigate('/contact-sales') : navigate('/register')}>
                  {plan.cta} →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pp-compare sx-reveal">
        <div className="sx-section">
          <div className="sx-eyebrow" style={{ justifyContent: 'center' }}>Compare plans</div>
          <h2 className="pp-compare-h2">Everything side by side</h2>
          <div className="pp-table-wrap">
            <div className="pp-table">
              <div className="pp-table-head">
                <div className="pp-th pp-th--feature">Feature</div>
                {plans.map(p => <div key={p.id} className={`pp-th${p.highlighted ? ' pp-th--pop' : ''}`}>{p.highlighted && <span className="pp-th-badge">Popular</span>}{p.name}</div>)}
              </div>
              {[
                { label: 'Staff members', vals: ['2','5','Unlimited','Unlimited'] },
                { label: 'Appointments / month', vals: ['100','Unlimited','Unlimited','Unlimited'] },
                { label: 'Scheduler', vals: ['✓','✓','✓','✓'] },
                { label: 'Online booking page', vals: ['—','✓','✓','✓'] },
                { label: 'Client management', vals: ['✓','✓','✓','✓'] },
                { label: 'UPI / Card / Cash', vals: ['✓','✓','✓','✓'] },
                { label: 'GST billing', vals: ['✓','✓','✓','✓'] },
                { label: 'WhatsApp reminders', vals: ['50/mo','200/mo','500/mo','Unlimited'] },
                { label: 'Loyalty program', vals: ['—','✓','✓','✓'] },
                { label: 'Inventory', vals: ['—','✓','✓','✓'] },
                { label: 'Reports & analytics', vals: ['—','✓','✓','✓'] },
                { label: 'WhatsApp Marketing', vals: ['—','—','500/mo','Unlimited'] },
                { label: 'SalonBot AI', vals: ['—','—','✓','✓'] },
                { label: 'Loyalty tiers', vals: ['—','—','✓','✓'] },
                { label: 'eWallet', vals: ['—','—','✓','✓'] },
                { label: 'Roles & permissions', vals: ['—','—','✓','✓'] },
                { label: 'Payroll & commissions', vals: ['—','—','✓','✓'] },
                { label: 'Reserve with Google', vals: ['—','—','✓','✓'] },
                { label: 'Multi-location', vals: ['—','—','—','✓'] },
                { label: 'Dedicated manager', vals: ['—','—','—','✓'] },
                { label: 'Custom integrations', vals: ['—','—','—','✓'] },
                { label: 'Priority support', vals: ['—','—','—','✓'] },
              ].map((row, i) => (
                <div key={row.label} className={`pp-table-row${i % 2 === 0 ? ' pp-table-row--alt' : ''}`}>
                  <div className="pp-td pp-td--label">{row.label}</div>
                  {row.vals.map((v, j) => <div key={j} className={`pp-td${plans[j]?.highlighted ? ' pp-td--pop' : ''}`}><span className={v === '✓' ? 'pp-yes' : v === '—' ? 'pp-no' : 'pp-val'}>{v}</span></div>)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pp-faq sx-reveal">
        <div className="sx-section">
          <div className="sx-eyebrow" style={{ justifyContent: 'center' }}>FAQ</div>
          <h2 className="pp-faq-h2">Frequently asked questions</h2>
          <div className="pp-faq-list">
            {faqItems.map((item, i) => (
              <div key={i} className={`pp-faq-item${openFaq === i ? ' pp-faq-item--open' : ''}`}>
                <button className="pp-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  {item.q}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                </button>
                <div className={`pp-faq-a${openFaq === i ? ' pp-faq-a--open' : ''}`}><p>{item.a}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pp-cta sx-reveal">
        <div className="sx-section pp-cta-inner">
          <h2 className="pp-cta-h2">Still not sure which plan?</h2>
          <p className="pp-cta-sub">Talk to our team — we'll help you find the right fit for your business size and goals.</p>
          <div className="pp-cta-actions">
            <button className="sx-btn-outline" style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }} onClick={() => navigate('/contact-sales')}>Talk to sales</button>
            <button className="sx-btn-primary" onClick={() => navigate('/register')}>Start free trial →</button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
