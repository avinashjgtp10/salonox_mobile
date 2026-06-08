import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar/Navbar'
import Footer from '../components/Footer'
import '../styles/pricing.scss'
import '../styles/global.scss'
import WhatsAppBubble from '../components/WhatsAppBubble'
import {
  plans,
  currencySymbol,
  getPlanPrice,
  getCycleLabel,
  getMonthlyEquiv,
  type Currency,
  type BillingCycle,
} from '../config/pricing.config'

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.sx-reveal')
    const observer = new IntersectionObserver(
      entries =>
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible')
            observer.unobserve(e.target)
          }
        }),
      { threshold: 0.1 },
    )
    els.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

const allFeatures = [
  { category: 'Scheduling', items: ['Unlimited appointments', 'Day / Week / Month / List views', 'Drag to reschedule', 'Staff columns with colour-coded bookings', 'Walk-in management', 'AI fills underbooked slots automatically'] },
  { category: 'Staff & Payroll', items: ['Unlimited staff members', 'Staff shifts & availability', 'Roles & permissions', 'Payroll & commissions', 'Performance reports per staff'] },
  { category: 'Clients & Loyalty', items: ['Client management & profiles', 'Visit history & notes', 'Loyalty program (Silver / Gold / Platinum)', 'eWallet', 'Automated loyalty tier upgrades'] },
  { category: 'Payments & Billing', items: ['UPI / Card / Cash', 'GST-compliant invoicing', 'GSTIN, HSN/SAC codes', 'GSTR export', 'Billing & invoices'] },
  { category: 'Marketing', items: ['WhatsApp reminders (unlimited)', 'WhatsApp Marketing campaigns', 'AI-written campaign copy', 'Target by visit history or tier', 'Delivery & read rate tracking'] },
  { category: 'AI & Automation', items: ['SalonBot AI — 24/7 WhatsApp assistant', 'Daily business summaries', 'AI revenue forecasting', 'Automated client nudges', 'Smart slot filling'] },
  { category: 'Online Presence', items: ['Online booking page', 'Reserve with Google', 'Branded booking page with your logo', 'Upfront payment collection'] },
  { category: 'Reports & Analytics', items: ['Revenue & bookings dashboard', 'Staff performance analytics', 'Client behaviour insights', 'AI trend identification', 'One-click accountant export'] },
  { category: 'Multi-location', items: ['Unlimited locations', 'Unified dashboard across all branches', 'Per-location settings & staff', 'AI benchmarks locations', 'Single login for all branches'] },
  { category: 'Support', items: ['14-day free trial', 'Priority support', 'Dedicated account manager', 'Team training included', 'Data export & API access'] },
]

const faqItems = [
  { q: 'Is there a free trial?', a: 'Yes — 14-day free trial with full access. No credit card required.' },
  { q: 'What is included in both plans?', a: 'Every feature is included in both plans. The only difference is the billing cycle — quarterly or annual.' },
  { q: 'Can I switch between plans?', a: 'Yes. You can switch from quarterly to annual (or vice versa) at any time from your account settings.' },
  { q: 'Is there a special offer for new users?', a: 'Yes — a special offer is available for new users and is applied automatically at checkout. No coupon code needed.' },
  { q: 'Is GST billing included?', a: 'Yes. Full GST-compliant invoicing with GSTIN fields, HSN/SAC codes, and export-ready GSTR summaries.' },
  { q: 'What payment methods do you accept?', a: 'UPI, all major credit and debit cards, and net banking for Indian accounts.' },
  { q: 'What happens after the trial ends?', a: "You'll be asked to choose a plan. If you don't, your account is paused — your data is never deleted." },
]

function formatPrice(amount: number, currency: Currency): string {
  if (currency === 'INR') {
    return amount.toLocaleString('en-IN')
  }
  return amount.toLocaleString('en-US')
}

export default function PricingPage() {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [currency, setCurrency] = useState<Currency>('INR')
  useScrollReveal()
  useEffect(() => { window.scrollTo(0, 0) }, [])

  const sym = currencySymbol[currency]

  const cycles: BillingCycle[] = ['quarterly', 'annual']

  return (
    <div className="pp-root">
      <Navbar />

      {/* HERO */}
      <section className="pp-hero">
        <div className="pp-hero-grid" />
        <div className="sx-section pp-hero-inner">
          <div className="sx-eyebrow" style={{ justifyContent: 'center' }}>Pricing</div>
          <h1 className="pp-hero-h1">Simple, honest pricing.<br /><span>Start free for 14 days.</span></h1>
          <p className="pp-hero-sub">No hidden fees. No contracts. Cancel anytime. Every plan includes every feature.</p>

          {/* New user offer */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
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

          {/* Currency switcher */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            {(['INR', 'USD', 'EUR'] as Currency[]).map(c => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 999,
                  border: '1px solid var(--sx-border)',
                  background: currency === c ? 'var(--sx-accent)' : 'transparent',
                  color: currency === c ? '#fff' : 'var(--sx-text-secondary)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {currencySymbol[c]} {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section className="pp-plans sx-reveal">
        <div className="sx-section">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 20,
              maxWidth: 720,
              margin: '0 auto 64px',
            }}
            className="lp-pricing-grid"
          >
            {cycles.map(cycle => {
              // Use the Starter plan as the single-plan model (all features included in every plan)
              const plan = plans.find(p => p.id === 'starter')!
              const price = getPlanPrice(plan, currency, cycle)
              const cycleLabel = getCycleLabel(cycle)
              const monthlyEquiv = getMonthlyEquiv(plan, currency, cycle)
              const isAnnual = cycle === 'annual'

              return (
                <div
                  key={cycle}
                  className={`pp-plan-card${isAnnual ? ' pp-plan-card--pop' : ''}`}
                >
                  {isAnnual && <div className="pp-plan-badge">Best Value</div>}
                  <div className="pp-plan-name">
                    {cycle.charAt(0).toUpperCase() + cycle.slice(1)}
                  </div>
                  <div className="pp-plan-price-row">
                    <span className="pp-plan-sym">{sym}</span>
                    <span className="pp-plan-amount">{formatPrice(price, currency)}</span>
                  </div>
                  <div className="pp-plan-period">{cycleLabel}</div>
                  <div className="pp-plan-monthly-equiv">
                    {sym}{formatPrice(monthlyEquiv, currency)} / month
                    {isAnnual ? ' · billed annually · save 10%' : ' · billed every 3 months'}
                  </div>
                  <div className="pp-plan-trial">{plan.trial}</div>
                  <div className="pp-plan-divider" />
                  <p className="pp-plan-desc">All features included. No limits.</p>
                  <button
                    className={isAnnual ? 'sx-btn-primary' : 'sx-btn-outline'}
                    style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }}
                    onClick={() => navigate('/register')}
                  >
                    Start free trial →
                  </button>
                </div>
              )
            })}
          </div>

          {/* Everything included note */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ fontSize: 14, color: 'var(--sx-text-muted)', fontWeight: 300 }}>
              Both plans include <strong style={{ color: 'var(--sx-text-primary)', fontWeight: 600 }}>every feature</strong> — no upsells, no locked tiers.
            </p>
          </div>

          {/* Feature list */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 24,
            }}
            className="pp-features-grid"
          >
            {allFeatures.map(cat => (
              <div
                key={cat.category}
                style={{
                  background: 'var(--sx-bg-card)',
                  border: '1px solid var(--sx-border)',
                  borderRadius: 16,
                  padding: '20px 22px',
                }}
              >
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.1em',
                  color: 'var(--sx-accent)',
                  marginBottom: 14,
                }}>
                  {cat.category}
                </div>
                <ul style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                  {cat.items.map(item => (
                    <li
                      key={item}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        fontSize: 13,
                        color: 'var(--sx-text-secondary)',
                        fontWeight: 300,
                        lineHeight: 1.5,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--sx-green)" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 2 }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="pp-faq sx-reveal">
        <div className="sx-section">
          <div className="sx-eyebrow" style={{ justifyContent: 'center' }}>FAQ</div>
          <h2 className="pp-faq-h2">Frequently asked questions</h2>
          <div className="pp-faq-list">
            {faqItems.map((item, i) => (
              <div key={i} className={`pp-faq-item${openFaq === i ? ' pp-faq-item--open' : ''}`}>
                <button className="pp-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  {item.q}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <div className={`pp-faq-a${openFaq === i ? ' pp-faq-a--open' : ''}`}>
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pp-cta sx-reveal">
        <div className="sx-section pp-cta-inner">
          <h2 className="pp-cta-h2">Still have questions?</h2>
          <p className="pp-cta-sub">Talk to our team — we're happy to help you get started.</p>
          <div className="pp-cta-actions">
            <button className="sx-btn-outline" onClick={() => navigate('/contact-sales')}>Talk to sales</button>
            <button className="sx-btn-primary" onClick={() => navigate('/register')}>Start free trial →</button>
          </div>
        </div>
      </section>

      <WhatsAppBubble />
      <Footer />
    </div>
  )
}