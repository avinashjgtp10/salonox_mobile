import { useState } from 'react'
import '../styles/components.scss'

interface FAQItem { q: string; a: string }

const defaultFaqs: FAQItem[] = [
  { q: 'What is SalonOx?', a: 'SalonOx is an all-in-one business management platform for beauty, wellness, and fitness businesses. It combines scheduling, payments, staff management, WhatsApp marketing, and AI into one system.' },
  { q: 'Is there a free trial?', a: 'Yes — every plan includes a 14-day free trial with full access to all features. No credit card required to start.' },
  { q: 'Does SalonOx work for multi-location businesses?', a: 'Yes. The Elite plan supports unlimited locations, all managed from one dashboard with unified reporting and staff management.' },
  { q: 'How does WhatsApp Marketing work?', a: 'SalonOx connects to the official WhatsApp Business API. You can send automated reminders, run targeted campaigns, and manage replies — all from your dashboard.' },
  { q: 'Is SalonOx GST-compliant?', a: 'Yes. SalonOx generates fully GST-compliant invoices automatically with GSTIN fields, HSN/SAC codes, and export-ready GSTR summaries.' },
  { q: 'Can I import my existing client data?', a: 'Yes. Our team handles data migration for you. We support imports from Excel, CSV, Fresha, Vagaro, and most other platforms at no extra cost.' },
  { q: 'What is SalonBot?', a: "SalonBot is SalonOx's AI assistant. It handles client questions via WhatsApp, manages bookings, and gives you daily business insights — 24/7, automatically." },
  { q: 'How long does setup take?', a: 'Most businesses are fully set up within 10 minutes. Our onboarding team will guide you through every step on a free setup call.' },
]

export default function FAQAccordion({ faqs = defaultFaqs, title = 'Frequently asked questions' }: { faqs?: FAQItem[]; title?: string }) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <section className="faq-root">
      <div className="sx-section">
        <div className="sx-eyebrow" style={{ justifyContent: 'center' }}>FAQ</div>
        <h2 className="faq-title">{title}</h2>
        <div className="faq-list">
          {faqs.map((item, i) => (
            <div key={i} className={`faq-item${open === i ? ' faq-item--open' : ''}`}>
              <button className="faq-q" onClick={() => setOpen(open === i ? null : i)}>
                <span>{item.q}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="faq-chevron"><polyline points="6 9 12 15 18 9" /></svg>
              </button>
              <div className={`faq-a${open === i ? ' faq-a--open' : ''}`}><p>{item.a}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}