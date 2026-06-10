import { useNavigate } from 'react-router-dom'
import logo from '../../../assets/salonox_logo_black.svg'

const footerLinks = {
  Product: [
    { label: 'Scheduler',          path: '/features/scheduler' },
    { label: 'Online Booking',     path: '/features/online-booking' },
    { label: 'WhatsApp Marketing', path: '/features/whatsapp-marketing' },
    { label: 'SalonBot AI',        path: '/features/salonbot-ai' },
    { label: 'Reports',            path: '/features/reports-analytics' },
    { label: 'Multi-location',     path: '/features/multi-location' },
  ],
  'Business Types': [
    { label: 'Salon',     path: '/business/salon' },
    { label: 'Barber',    path: '/business/barber' },
    { label: 'Spa',       path: '/business/spa' },
    { label: 'Yoga',      path: '/business/yoga' },
    { label: 'Gym',       path: '/business/gym' },
    { label: 'All Types', path: '/' },
  ],
  Company: [
    { label: 'Pricing',       path: '/pricing' },
    { label: 'Contact Sales', path: '/contact-sales' },
    { label: 'Support',       path: '/support' },
  ],
}

export default function Footer() {
  const navigate = useNavigate()
  return (
    <footer style={{ background: 'var(--sx-bg-0)', borderTop: '1px solid var(--sx-border)', padding: '64px 0 32px' }}>
      <div className="sx-section">
        {/* className replaces inline gridTemplateColumns so media queries work */}
        <div className="sx-footer-grid">
          <div className="sx-footer-brand">
            <img
              src={logo}
              alt="SalonOx salon management software"
              width="116"
              height="28"
              style={{ height: 28, width: 'auto', marginBottom: 16, filter: 'var(--sx-logo-filter)', display: 'block' }}
            />
            <p style={{ fontSize: 13.5, fontWeight: 300, color: 'var(--sx-text-muted)', lineHeight: 1.7, maxWidth: 260, marginBottom: 20 }}>
              The all-in-one platform for beauty, wellness &amp; fitness businesses. Powered by AI.
            </p>
            <button onClick={() => navigate('/register')} style={{ display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 16px', fontSize: 12, background: 'var(--sx-accent)', color: 'var(--sx-accent-text)', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
              Start free trial
            </button>
          </div>

          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--sx-text-faint)', marginBottom: 16 }}>{heading}</div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                {links.map(l => (
                  <button key={l.label} onClick={() => navigate(l.path)} style={{ background: 'none', border: 'none', padding: 0, fontSize: 13.5, fontWeight: 300, color: 'var(--sx-text-muted)', cursor: 'pointer', textAlign: 'left' as const, fontFamily: 'inherit' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--sx-text-primary)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--sx-text-muted)')}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="sx-footer-bottom">
          <span style={{ fontSize: 12, color: 'var(--sx-text-faint)' }}>
            {`© ${new Date().getFullYear()} SalonOx. All rights reserved.`}
          </span>
          <div className="sx-footer-legal">
            {[
              { label: 'Privacy Policy',   path: '/privacy' },
              { label: 'Terms of Service', path: '/terms' },
              { label: 'Cookie Policy',    path: '/cookie-policy' },
            ].map(l => (
              <button
                key={l.label}
                onClick={() => navigate(l.path)}
                style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--sx-text-faint)', cursor: 'pointer', fontFamily: 'inherit' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--sx-text-primary)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--sx-text-faint)')}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}