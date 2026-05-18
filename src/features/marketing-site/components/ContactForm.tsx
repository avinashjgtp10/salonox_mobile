import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/components.scss'

export default function ContactForm({ title = 'Get in touch', sub = 'Fill out the form and our team will get back to you within 24 hours.' }: { title?: string; sub?: string }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', business: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setSubmitted(true) }

  return (
    <div className="cf-root">
      {submitted ? (
        <div className="cf-success">
          <div className="cf-success-icon"><svg viewBox="0 0 24 24" fill="none" stroke="var(--sx-green)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg></div>
          <h3 className="cf-success-h3">Message sent!</h3>
          <p className="cf-success-body">We'll get back to you at <strong>{form.email}</strong> within 24 hours.</p>
          <button className="sx-btn-primary" onClick={() => navigate('/')}>Back to home →</button>
        </div>
      ) : (
        <>
          {title && <h3 className="cf-title">{title}</h3>}
          {sub && <p className="cf-sub">{sub}</p>}
          <form className="cf-form" onSubmit={handleSubmit}>
            <div className="cf-row">
              <div className="cf-group"><label className="cf-label">Full name *</label><input className="cf-input" type="text" name="name" placeholder="Priya Sharma" value={form.name} onChange={handleChange} required /></div>
              <div className="cf-group"><label className="cf-label">Email *</label><input className="cf-input" type="email" name="email" placeholder="priya@salon.com" value={form.email} onChange={handleChange} required /></div>
            </div>
            <div className="cf-row">
              <div className="cf-group"><label className="cf-label">Phone</label><input className="cf-input" type="tel" name="phone" placeholder="+91 98765 43210" value={form.phone} onChange={handleChange} /></div>
              <div className="cf-group"><label className="cf-label">Business name</label><input className="cf-input" type="text" name="business" placeholder="Luxe Hair Studio" value={form.business} onChange={handleChange} /></div>
            </div>
            <div className="cf-group"><label className="cf-label">Message</label><textarea className="cf-textarea" name="message" placeholder="Tell us about your business or question..." value={form.message} onChange={handleChange} rows={4} /></div>
            <button type="submit" className="sx-btn-primary cf-submit">Send message →</button>
            <p className="cf-privacy">We respect your privacy. Your data is never shared.</p>
          </form>
        </>
      )}
    </div>
  )
}