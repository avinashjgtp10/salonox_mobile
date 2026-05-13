import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar/Navbar'
import Footer from '../components/Footer'
import '../styles/support.scss'
import '../styles/global.scss'

const supportCards = [
  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>, title: 'Call Support', desc: 'Speak directly with our support team for urgent issues and hands-on help.', action: 'Call now', color: 'var(--sx-text-primary)', status: null },
  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>, title: 'Support Articles', desc: 'Browse our knowledge base for step-by-step guides and tutorials.', action: 'Browse articles', color: 'var(--sx-blue)', status: null },
  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>, title: 'Feature Requests', desc: 'Have an idea for a new feature? We build what our users ask for.', action: 'Submit idea', color: 'var(--sx-purple)', status: null },
  { icon: null, title: 'System Status', desc: 'All systems operational. 99.9% uptime this month.', action: 'View status page', color: 'var(--sx-green)', status: 'operational' },
]

const popularTopics = ['Getting started','Calendar & scheduling','WhatsApp setup','Billing & payments','Staff management','Multi-location setup','Reports & analytics','Loyalty program','Online booking','Data migration','GST billing','SalonBot AI']

const faqItems = [
  { q: 'What are your support hours?', a: 'Our support team is available Monday–Saturday, 9 AM – 8 PM IST. Enterprise plan clients get 24/7 priority support coverage.' },
  { q: 'How do I migrate data from another software?', a: 'Our team handles migration for you. We support imports from Excel, CSV, Fresha, Vagaro, and most other platforms at no extra cost.' },
  { q: 'How quickly do you respond to tickets?', a: 'Starter & Grow: within 24 hours. Ultimate: within 4 hours. Elite: 1-hour SLA with a dedicated account manager.' },
  { q: 'Do you offer onboarding training?', a: 'Yes — all plans include a guided onboarding call. Elite plans include full team training and ongoing check-ins.' },
  { q: 'Where can I find video tutorials?', a: 'Video tutorials are available in your SalonOx dashboard under Help → Video Guides, and on our YouTube channel.' },
  { q: 'Can I connect my WhatsApp Business account?', a: 'Yes. SalonOx connects to the official WhatsApp Business API. Our team will guide you through verification during onboarding.' },
]

export default function SupportPage() {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div className="sp-root">
      <Navbar />
      <section className="sp-hero">
        <div className="sp-hero-grid" />
        <div className="sx-section sp-hero-inner">
          <div className="sx-eyebrow">Support</div>
          <h1 className="sp-hero-h1">How can we help?</h1>
          <p className="sp-hero-sub">Our team is ready to help you get the most out of SalonOx. Find answers, reach out, or tell us what to build next.</p>
        </div>
      </section>

      <section className="sp-cards">
        <div className="sx-section">
          <div className="sp-cards-grid">
            {supportCards.map(card => (
              <div key={card.title} className="sp-card">
                <div className="sp-card-icon" style={{ background: `color-mix(in srgb, ${card.color} 10%, transparent)`, color: card.color }}>
                  {card.status === 'operational' ? <span className="sp-status-dot" /> : card.icon}
                </div>
                <div className="sp-card-title" style={{ color: card.color }}>{card.title}</div>
                <p className="sp-card-desc">{card.desc}</p>
                <button className="sp-card-action" style={{ color: card.color }}>{card.action} →</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sp-topics">
        <div className="sx-section">
          <div className="sx-eyebrow">Browse by topic</div>
          <h2 className="sp-topics-h2">Popular help topics</h2>
          <div className="sp-topics-grid">
            {popularTopics.map(topic => <button key={topic} className="sp-topic-pill">{topic}</button>)}
          </div>
        </div>
      </section>

      <section className="sp-faq">
        <div className="sx-section">
          <div className="sx-eyebrow">FAQ</div>
          <h2 className="sp-faq-h2">Support FAQ</h2>
          <div className="sp-faq-list">
            {faqItems.map((item, i) => (
              <div key={i} className={`sp-faq-item${openFaq === i ? ' sp-faq-item--open' : ''}`}>
                <button className="sp-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  {item.q}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                </button>
                <div className={`sp-faq-a${openFaq === i ? ' sp-faq-a--open' : ''}`}><p>{item.a}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sp-cta">
        <div className="sx-section sp-cta-inner">
          <h2 className="sp-cta-h2">Still need help?</h2>
          <p className="sp-cta-sub">Our team is always happy to help — reach out anytime and we'll get back to you within 24 hours.</p>
          <div className="sp-cta-actions">
            <button className="sx-btn-primary" onClick={() => navigate('/contact-sales')}>Contact support →</button>
            <button className="sx-btn-outline" onClick={() => navigate('/pricing')}>View pricing</button>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  )
}