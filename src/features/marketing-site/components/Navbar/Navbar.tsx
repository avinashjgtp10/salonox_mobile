import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import MegaMenuBusinessTypes from './MegaMenuBusinessTypes'
import MegaMenuFeatures from './MegaMenuFeatures'
import MegaMenuSupport from './MegaMenuSupport'
import ThemeToggle from '../ThemeToggle'
import { useAppSelector } from '../../../../hooks/useAppRedux'
import '../../styles/navbar.scss'

type ActiveMenu = 'business' | 'features' | 'support' | null

const navLinks = [
  { label: 'Business Types', menu: 'business' as ActiveMenu },
  { label: 'Features',       menu: 'features' as ActiveMenu },
  { label: 'Multi-location', path: '/features/multi-location' },
  { label: 'Pricing',        path: '/pricing' },
  { label: 'Contact Sales',  path: '/contact-sales' },
  { label: 'Support',        menu: 'support' as ActiveMenu },
]

export default function Navbar() {
  const navigate = useNavigate()
  const { accessToken } = useAppSelector((state) => state.auth)
  const [scrolled, setScrolled]             = useState(false)
  const [activeMenu, setActiveMenu]         = useState<ActiveMenu>(null)
  const [mobileOpen, setMobileOpen]         = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null)
  const navRef = useRef<HTMLElement>(null)

  const authDest = (path: string) => accessToken ? '/dashboard' : path

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setActiveMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNavigate = (path: string) => {
    navigate(path)
    setActiveMenu(null)
    setMobileOpen(false)
  }

  return (
    <nav ref={navRef} className={`sx-navbar${scrolled ? ' sx-navbar--scrolled' : ''}`}>
      <div className="sx-brand" onClick={() => handleNavigate('/')}>
        <img src="/src/assets/logo.png" alt="SalonOx" className="sx-brand-logo" />
      </div>

      <ul className="sx-nav-links">
        {navLinks.map(link => (
          <li key={link.label} className="sx-nav-item">
            <button className="sx-nav-link"
              onClick={() => link.path ? handleNavigate(link.path) : setActiveMenu(prev => prev === link.menu ? null : link.menu!)}
              onMouseEnter={() => { if (link.menu) setActiveMenu(link.menu) }}>
              {link.label}
              {link.menu && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ transform: activeMenu === link.menu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              )}
            </button>
            {link.menu === 'business' && activeMenu === 'business' && <MegaMenuBusinessTypes onClose={() => setActiveMenu(null)} />}
            {link.menu === 'features' && activeMenu === 'features' && <MegaMenuFeatures onClose={() => setActiveMenu(null)} />}
            {link.menu === 'support'  && activeMenu === 'support'  && <MegaMenuSupport onClose={() => setActiveMenu(null)} />}
          </li>
        ))}
      </ul>

      <div className="sx-nav-actions">
        <ThemeToggle />
        <button className="sx-btn-ghost" onClick={() => navigate(authDest('/login'))}>Log in</button>
        <button className="sx-btn-nav-primary" onClick={() => navigate(authDest('/register'))}>Start free</button>
      </div>

      <button className={`sx-hamburger${mobileOpen ? ' sx-hamburger--open' : ''}`}
        onClick={() => setMobileOpen(p => !p)} aria-label="Toggle menu">
        <span /><span /><span />
      </button>

      <div className={`sx-mobile-menu${mobileOpen ? ' sx-mobile-menu--open' : ''}`}>
        {navLinks.map(link => (
          <div key={link.label}>
            <button className={`sx-mobile-link${mobileExpanded === link.label ? ' sx-mobile-link--open' : ''}`}
              onClick={() => link.path ? handleNavigate(link.path) : setMobileExpanded(prev => prev === link.label ? null : link.label)}>
              {link.label}
              {link.menu && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>}
            </button>

            {link.menu === 'business' && mobileExpanded === link.label && (
              <div className="sx-mobile-sub">
                {['Salon','Barber','Brow & Lash','Nail','Hair Removal','Makeup','Tanning','Tattoo','Spa','Aesthetic Clinic','Med Spa','Massage','Chiropractor','Nutritionist','Coaching','Physical Therapy','Yoga','Gym','Personal Trainer','Martial Arts','Pilates','Cross Training','Cycling','Dance Studio'].map(name => (
                  <button key={name} className="sx-mobile-sub-link"
                    onClick={() => handleNavigate(`/business/${name.toLowerCase().replace(/ & /g,'-').replace(/ /g,'-')}`)}>
                    {name}
                  </button>
                ))}
              </div>
            )}

            {link.menu === 'features' && mobileExpanded === link.label && (
              <div className="sx-mobile-sub">
                {['Scheduler','Staff & Shifts','Payroll','Roles & Permissions','Reports & Analytics','Online Booking','Reserve with Google','Loyalty Program','Inventory','Multi-location','Billing & Invoices','UPI / Card / Cash','eWallet','GST Billing','Client Management','Loyalty Tiers','WhatsApp Reminders','Online Booking Page','WhatsApp Marketing','SalonBot (AI)'].map(name => (
                  <button key={name} className="sx-mobile-sub-link"
                    onClick={() => handleNavigate(`/features/${name.toLowerCase().replace(/ & /g,'-').replace(/\//g,'-').replace(/ \(/g,'-').replace(/\)/g,'').replace(/ /g,'-')}`)}>
                    {name}
                  </button>
                ))}
              </div>
            )}

            {link.menu === 'support' && mobileExpanded === link.label && (
              <div className="sx-mobile-sub">
                {['Call Support','Support Articles','Feature Requests','System Status'].map(name => (
                  <button key={name} className="sx-mobile-sub-link" onClick={() => handleNavigate('/support')}>{name}</button>
                ))}
              </div>
            )}
          </div>
        ))}
        <div className="sx-mobile-divider" />
        <div className="sx-mobile-actions">
          <button className="sx-btn-outline" style={{ flex: 1, textAlign: 'center' }} onClick={() => { navigate(authDest('/login')); setMobileOpen(false) }}>Log in</button>
          <button className="sx-btn-primary" style={{ flex: 1, textAlign: 'center' }} onClick={() => { navigate(authDest('/register')); setMobileOpen(false) }}>Start free</button>
        </div>
      </div>
    </nav>
  )
}