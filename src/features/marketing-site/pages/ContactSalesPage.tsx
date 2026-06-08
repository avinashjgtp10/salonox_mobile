import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar/Navbar'
import Footer from '../components/Footer'
import SEO from '../components/SEO'
import { coreKeywords, organizationSchema } from '../config/seo.config'
import '../styles/contactSales.scss'
import '../styles/global.scss'

const businessTypesList = ['Salon','Barber','Spa','Nail Studio','Brow & Lash','Yoga Studio','Gym','Personal Trainer','Pilates','Aesthetic Clinic','Med Spa','Massage','Chiropractor','Nutritionist','Coaching','Dance Studio','Other']
const teamSizes = ['Just me','2–5 staff','6–10 staff','11–20 staff','21–50 staff','50+ staff']

export default function ContactSalesPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', businessName: '', businessType: '', teamSize: '', locations: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  useEffect(() => { window.scrollTo(0, 0) }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setSubmitted(true) }

  return (
    <div className="cs-root">
      <SEO
        title="Book a SalonOx Demo | Salon Software for India"
        description="Book a SalonOx demo for salon management software covering billing, appointments, staff, reports, CRM and WhatsApp marketing."
        path="/contact-sales"
        keywords={['book salon software demo', ...coreKeywords]}
        jsonLd={organizationSchema}
      />
      <Navbar />
      <section className="cs-hero">
        <div className="cs-hero-grid" />
        <div className="sx-section cs-hero-inner">
          <div className="sx-eyebrow">Contact Sales</div>
          <h1 className="cs-hero-h1">Let's find the right plan<br />for your business.</h1>
          <p className="cs-hero-sub">Tell us about your business and we'll get back to you within 24 hours with a personalised recommendation.</p>
        </div>
      </section>

      <section className="cs-content">
        <div className="sx-section cs-content-inner">
          <div className="cs-form-wrap">
            {submitted ? (
              <div className="cs-success">
                <div className="cs-success-icon"><svg viewBox="0 0 24 24" fill="none" stroke="var(--sx-green)" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg></div>
                <h2 className="cs-success-h2">We'll be in touch soon!</h2>
                <p className="cs-success-body">Thanks for reaching out. Our team will contact you at <strong>{form.email}</strong> within 24 hours.</p>
                <button className="sx-btn-primary" onClick={() => navigate('/')}>Back to home →</button>
              </div>
            ) : (
              <form className="cs-form" onSubmit={handleSubmit}>
                <h2 className="cs-form-title">Tell us about yourself</h2>
                <div className="cs-form-row">
                  <div className="cs-form-group"><label className="cs-label">First name *</label><input className="cs-input" type="text" name="firstName" placeholder="Priya" value={form.firstName} onChange={handleChange} required /></div>
                  <div className="cs-form-group"><label className="cs-label">Last name *</label><input className="cs-input" type="text" name="lastName" placeholder="Sharma" value={form.lastName} onChange={handleChange} required /></div>
                </div>
                <div className="cs-form-row">
                  <div className="cs-form-group"><label className="cs-label">Work email *</label><input className="cs-input" type="email" name="email" placeholder="priya@luxesalon.com" value={form.email} onChange={handleChange} required /></div>
                  <div className="cs-form-group"><label className="cs-label">Phone number</label><input className="cs-input" type="tel" name="phone" placeholder="+91 98765 43210" value={form.phone} onChange={handleChange} /></div>
                </div>
                <div className="cs-form-group"><label className="cs-label">Business name *</label><input className="cs-input" type="text" name="businessName" placeholder="Luxe Hair Studio" value={form.businessName} onChange={handleChange} required /></div>
                <div className="cs-form-row">
                  <div className="cs-form-group"><label className="cs-label">Business type *</label>
                    <select className="cs-select" name="businessType" value={form.businessType} onChange={handleChange} required>
                      <option value="">Select type...</option>
                      {businessTypesList.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="cs-form-group"><label className="cs-label">Team size</label>
                    <select className="cs-select" name="teamSize" value={form.teamSize} onChange={handleChange}>
                      <option value="">Select size...</option>
                      {teamSizes.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="cs-form-group"><label className="cs-label">Number of locations</label><input className="cs-input" type="number" name="locations" placeholder="1" min="1" value={form.locations} onChange={handleChange} /></div>
                <div className="cs-form-group"><label className="cs-label">Anything specific you'd like to know?</label><textarea className="cs-textarea" name="message" placeholder="Tell us about your current setup, challenges, or questions..." value={form.message} onChange={handleChange} rows={4} /></div>
                <button type="submit" className="sx-btn-primary cs-submit">Send message →</button>
                <p className="cs-privacy">By submitting, you agree to our Privacy Policy. We'll never share your data with third parties.</p>
              </form>
            )}
          </div>

          <div className="cs-info">
            <div className="cs-info-card">
              <h3 className="cs-info-title">What happens next?</h3>
              <div className="cs-steps">
                {[{ num: '01', title: 'We review your details', desc: 'Our team reviews your business type and requirements.' },{ num: '02', title: 'We reach out within 24h', desc: 'A product specialist will contact you by email or phone.' },{ num: '03', title: 'Free demo & trial', desc: "We'll walk you through SalonOx live and set up your free trial." }].map(step => (
                  <div key={step.num} className="cs-step">
                    <div className="cs-step-num">{step.num}</div>
                    <div><div className="cs-step-title">{step.title}</div><div className="cs-step-desc">{step.desc}</div></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="cs-info-card">
              <h3 className="cs-info-title">Why SalonOx?</h3>
              <div className="cs-trust-items">
                {[{ icon: '⚡', text: 'Setup in under 10 minutes' },{ icon: '🤖', text: 'AI that learns your business' },{ icon: '📱', text: 'WhatsApp-native communication' },{ icon: '🌍', text: 'Works for all business types' },{ icon: '🔒', text: 'Your data is always secure' },{ icon: '💳', text: 'No long-term contracts' }].map(item => (
                  <div key={item.text} className="cs-trust-item"><span className="cs-trust-icon">{item.icon}</span><span className="cs-trust-text">{item.text}</span></div>
                ))}
              </div>
            </div>
            <div className="cs-info-card cs-info-card--accent">
              <div className="cs-quote-mark">"</div>
              <p className="cs-quote-text">SalonOx paid for itself in the first week. The AI scheduler alone fills gaps we never even noticed.</p>
              <div className="cs-quote-author">
                <div className="cs-quote-avatar">PK</div>
                <div><div className="cs-quote-name">Priya Kapoor</div><div className="cs-quote-role">Owner, Luxe Hair Studio · Mumbai</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  )
}
