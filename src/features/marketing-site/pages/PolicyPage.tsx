import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar/Navbar'
import Footer from '../components/Footer'
import '../styles/global.scss'
import WhatsAppBubble from '../components/WhatsAppBubble'

type PolicyType = 'privacy' | 'terms' | 'cookie'

interface Props { type: PolicyType }

export default function PolicyPage({ type }: Props) {
  const navigate = useNavigate()
  useEffect(() => { window.scrollTo(0, 0) }, [])

  const isPrivacy = type === 'privacy'
  const isCookie  = type === 'cookie'

  const title    = isPrivacy ? 'Privacy Policy' : isCookie ? 'Cookie Policy' : 'Terms of Service'
  const eyebrow  = isPrivacy ? 'Legal · Privacy' : isCookie ? 'Legal · Cookie Policy' : 'Legal · Terms'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--sx-bg-0)', paddingTop: 64 }}>
      <Navbar />
      <div className="sx-section" style={{ paddingTop: 80, paddingBottom: 100 }}>
        <div style={{ maxWidth: 720 }}>

          <p style={{ fontSize: 12, color: 'var(--sx-text-faint)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            {eyebrow}
          </p>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: 'var(--sx-text-primary)', lineHeight: 1.1, marginBottom: 16 }}>
            {title}
          </h1>
          <p style={{ color: 'var(--sx-text-muted)', fontSize: 13, marginBottom: 56 }}>
            Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>

          {isPrivacy  && <PrivacyContent />}
          {isCookie   && <CookieContent />}
          {!isPrivacy && !isCookie && <TermsContent />}

          <div style={{ marginTop: 64, padding: 24, background: 'var(--sx-bg-1)', borderRadius: 16, border: '1px solid var(--sx-border)' }}>
            <p style={{ fontSize: 13, color: 'var(--sx-text-secondary)', lineHeight: 1.7 }}>
              Questions? Email us at{' '}
              <a href="mailto:salonox@support.com" style={{ color: 'var(--sx-accent)', textDecoration: 'underline' }}>
                salonox@support.com
              </a>
              . We typically respond within 1 business day.
            </p>
          </div>

          <div style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Privacy Policy',   path: '/privacy' },
              { label: 'Terms of Service', path: '/terms' },
              { label: 'Cookie Policy',    path: '/cookie-policy' },
            ].filter(l => l.label !== title).map(l => (
              <button key={l.label} onClick={() => navigate(l.path)}
                style={{ background: 'none', border: '1px solid var(--sx-border)', borderRadius: 999, padding: '6px 16px', fontSize: 12, color: 'var(--sx-text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
                {l.label} →
              </button>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--sx-text-primary)', marginBottom: 16 }}>
        {title}
      </h2>
      <div style={{ fontSize: 14, color: 'var(--sx-text-secondary)', lineHeight: 1.85 }}>
        {children}
      </div>
    </div>
  )
}

function PrivacyContent() {
  return (
    <>
      <Section title="1. Information We Collect">
        <p>We collect information you provide when registering for SalonOx, including your name, business name, email address, phone number, and billing details. We also collect usage data such as features accessed, appointment volumes, and device information to improve the platform.</p>
      </Section>
      <Section title="2. How We Use Your Information">
        <p>We use your data to operate and improve SalonOx, send you product updates and billing communications, provide customer support, and (where you have opted in) send marketing messages via WhatsApp or email. We do not sell your data to third parties.</p>
      </Section>
      <Section title="3. Data Sharing">
        <p>We share data with trusted service providers (payment processors, cloud infrastructure, analytics) who process it only on our behalf. We may disclose data if required by law or to protect the rights and safety of SalonOx and its users.</p>
      </Section>
      <Section title="4. Client Data You Collect">
        <p>As a SalonOx business user, you collect and manage your own clients' data within the platform. You are the data controller for that data. We act as a data processor on your behalf and store it securely in accordance with this policy.</p>
      </Section>
      <Section title="5. Data Retention">
        <p>We retain your account data for as long as your subscription is active, plus 90 days after cancellation during which you may export your data. After that period, data is permanently deleted from our systems.</p>
      </Section>
      <Section title="6. Security">
        <p>We use industry-standard encryption (TLS in transit, AES-256 at rest), access controls, and regular security audits. No method of transmission over the internet is 100% secure, but we take every reasonable precaution.</p>
      </Section>
      <Section title="7. Your Rights">
        <p>You may request access to, correction of, or deletion of your personal data at any time by emailing <a href="mailto:salonox@support.com" style={{ color: 'var(--sx-accent)' }}>salonox@support.com</a>. We will respond within 30 days.</p>
      </Section>
      <Section title="8. Cookies">
        <p>We use essential cookies to keep you logged in and remember your preferences. We do not use advertising or tracking cookies. You can disable cookies in your browser settings, though some features may not work correctly.</p>
      </Section>
      <Section title="9. Changes to This Policy">
        <p>We may update this policy from time to time. We will notify you of material changes via email or in-app notification at least 14 days before they take effect.</p>
      </Section>
    </>
  )
}

function TermsContent() {
  return (
    <>
      <Section title="1. Acceptance of Terms">
        <p>By creating a SalonOx account or using our services, you agree to these Terms of Service. If you do not agree, please do not use SalonOx. These terms apply to all users, including business owners, staff members, and administrators.</p>
      </Section>
      <Section title="2. Your Account">
        <p>You are responsible for maintaining the security of your account credentials and for all activity under your account. You must provide accurate information during registration and keep it up to date. You must be at least 18 years old to use SalonOx.</p>
      </Section>
      <Section title="3. Subscription & Billing">
        <p>SalonOx is offered on a monthly subscription basis. You will be billed on the same date each month. All prices are in INR and exclusive of applicable taxes (GST). You may cancel your subscription at any time; access continues until the end of the current billing period.</p>
      </Section>
      <Section title="4. Free Trial">
        <p>New accounts receive a 14-day free trial with full access to all features on your selected plan. No credit card is required to start. At the end of the trial, you must add a payment method to continue using SalonOx.</p>
      </Section>
      <Section title="5. Acceptable Use">
        <p>You agree not to use SalonOx to send unsolicited communications, violate any applicable law, infringe the intellectual property rights of others, or interfere with the operation of the platform. We reserve the right to suspend accounts that violate this policy.</p>
      </Section>
      <Section title="6. Your Data">
        <p>You retain full ownership of all data you and your clients input into SalonOx. We do not claim any rights over it. You may export your data at any time from the Settings panel.</p>
      </Section>
      <Section title="7. Service Availability">
        <p>We target 99.9% uptime and maintain a live status page. Planned maintenance is communicated in advance. We are not liable for downtime caused by factors outside our reasonable control.</p>
      </Section>
      <Section title="8. Limitation of Liability">
        <p>To the maximum extent permitted by law, SalonOx's liability for any claim is limited to the amount you paid us in the 3 months preceding the claim. We are not liable for indirect, incidental, or consequential damages.</p>
      </Section>
      <Section title="9. Termination">
        <p>Either party may terminate the agreement at any time. We may suspend or terminate your account immediately if you breach these terms. Upon termination, we will delete your data after a 90-day grace period.</p>
      </Section>
      <Section title="10. Governing Law">
        <p>These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of Maharashtra.</p>
      </Section>
    </>
  )
}

function CookieContent() {
  return (
    <>
      <Section title="1. What Are Cookies">
        <p>Cookies are small text files placed on your device when you visit SalonOx. They help us keep you logged in, remember your preferences, and understand how the platform is used.</p>
      </Section>
      <Section title="2. Cookies We Use">
        <p>We use only essential and functional cookies — nothing for advertising or cross-site tracking. Essential cookies keep you authenticated and maintain your session. Functional cookies remember your theme preference (light/dark) and language settings.</p>
      </Section>
      <Section title="3. Third-Party Cookies">
        <p>Some features rely on third-party services such as payment processors and analytics tools that may set their own cookies. These are governed by the respective third party's privacy policy, not ours.</p>
      </Section>
      <Section title="4. Managing Cookies">
        <p>You can disable cookies through your browser settings at any time. Note that disabling essential cookies will prevent you from staying logged in to SalonOx. Most browsers allow you to view, delete, and block cookies on a per-site basis.</p>
      </Section>
      <Section title="5. Updates">
        <p>We may update this Cookie Policy as our use of cookies changes. Material changes will be communicated via in-app notification or email before taking effect.</p>
      </Section>
      <WhatsAppBubble />
    </>
  )
}