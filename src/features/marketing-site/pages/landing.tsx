import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../styles/landing.scss';


/* ============================================================================
   SalonOX — Premium Salon & Spa SaaS Landing Page
   Self-contained: no ThemeProvider, no Context API, no Redux, no extra files.
   ============================================================================ */

/* ---------------------------------- Icon set (inline SVG, zero deps) ---------------------------------- */

const Icon = {
  Calendar: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  Users: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Card: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2.5" />
      <path d="M2 10h20" />
    </svg>
  ),
  Megaphone: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11v3a1 1 0 0 0 1 1h2l3.5 4.5V5.5L6 10H4a1 1 0 0 0-1 1Z" />
      <path d="M14 7a5 5 0 0 1 0 10M18 4a9 9 0 0 1 0 16" />
    </svg>
  ),
  Bar: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21V9M9 21V3M15 21v-7M21 21v-4" />
    </svg>
  ),
  Bell: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  ),
  Globe: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z" />
    </svg>
  ),
  Layers: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  ),
  Phone: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <path d="M11 18h2" />
    </svg>
  ),
  Spark: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </svg>
  ),
  Arrow: () => (
    <svg className="icon-arrow" viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  Play: () => (
    <svg viewBox="0 0 24 24"><path d="M5 3l16 9-16 9V3Z" /></svg>
  ),
  Star: () => (
    <svg viewBox="0 0 24 24"><path d="M12 2l3.1 6.7 7.4.7-5.6 5 1.7 7.3L12 17.9 5.4 21.7l1.7-7.3-5.6-5 7.4-.7L12 2Z" /></svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  Chevron: () => (
    <svg className="chev" viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  Twitter: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 3a10.9 10.9 0 0 1-3.1.9 5.4 5.4 0 0 0 2.4-3 10.8 10.8 0 0 1-3.4 1.3 5.4 5.4 0 0 0-9.2 4.9A15.3 15.3 0 0 1 1.6 1.6a5.4 5.4 0 0 0 1.7 7.2A5.3 5.3 0 0 1 .9 8v.1a5.4 5.4 0 0 0 4.3 5.3 5.4 5.4 0 0 1-2.4.1 5.4 5.4 0 0 0 5 3.8A10.9 10.9 0 0 1 0 19.5a15.3 15.3 0 0 0 8.3 2.4c10 0 15.4-8.3 15.4-15.4v-.7A11 11 0 0 0 23 3Z" />
    </svg>
  ),
  Instagram: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <path d="M17.5 6.5h.01" />
    </svg>
  ),
  Linkedin: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="3" />
      <path d="M7 10v7M7 7v.01M12 17v-4.5a2.5 2.5 0 0 1 5 0V17M12 11v6" />
    </svg>
  ),
  Facebook: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9h3V5h-3a4 4 0 0 0-4 4v2H7v4h3v7h4v-7h3l1-4h-4V9a1 1 0 0 1 1-1Z" />
    </svg>
  ),
  Sync: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 1-15.5 6.5L3 16M3 12a9 9 0 0 1 15.5-6.5L21 8" />
      <path d="M3 16v4h4M21 8V4h-4" />
    </svg>
  ),
  Report: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2h6l4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
      <path d="M9 9h2M9 13h6M9 17h6" />
    </svg>
  ),
  Mail: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2.5" />
      <path d="m3 6 8.5 7a1 1 0 0 0 1 0L21 6" />
    </svg>
  ),
};

/* ---------------------------------- Static content ---------------------------------- */

type MegaLink = { icon: keyof typeof Icon; title: string; desc: string };
type Feature = { icon: keyof typeof Icon; title: string; desc: string };
type Branch = { name: string; bookings: string; revenue: string };
type DemoForm = { name: string; email: string; salon: string; locations: string };

const MEGA_COLUMN_A: MegaLink[] = [
  { icon: 'Calendar', title: 'Smart Scheduling', desc: 'Drag-and-drop calendar with conflict-free bookings.' },
  { icon: 'Users', title: 'Client Management', desc: 'Full client profiles, history, and preferences.' },
  { icon: 'Card', title: 'Payments & POS', desc: 'Accept cards, wallets, and split payments in person.' },
];

const MEGA_COLUMN_B: MegaLink[] = [
  { icon: 'Megaphone', title: 'Marketing Suite', desc: 'Automated campaigns, SMS, and loyalty rewards.' },
  { icon: 'Bar', title: 'Reports & Analytics', desc: 'Real-time revenue and staff performance insights.' },
  { icon: 'Globe', title: 'Online Booking', desc: 'A branded booking page that works on any device.' },
];

const FEATURES: Feature[] = [
  { icon: 'Calendar', title: 'Effortless scheduling', desc: 'Manage every chair, room, and stylist from one drag-and-drop calendar built for busy floors.' },
  { icon: 'Bell', title: 'No-show protection', desc: 'Automated reminders by SMS and email cut no-shows and keep your day full.' },
  { icon: 'Card', title: 'Integrated payments', desc: 'Take deposits, tips, and checkout in seconds with built-in point of sale.' },
  { icon: 'Users', title: 'Client intelligence', desc: 'See visit history, preferences, and spend the moment a client walks in.' },
  { icon: 'Megaphone', title: 'Marketing that works', desc: 'Win back lapsed clients and fill quiet hours with one-click campaigns.' },
  { icon: 'Shield', title: 'Enterprise-grade security', desc: 'Bank-level encryption and role-based access keep every record safe.' },
];

const MULTI_BRANCH_FEATURES: Feature[] = [
  { icon: 'Layers', title: 'Centralized Management', desc: 'Control schedules, services, and pricing for every branch from one unified dashboard — no more juggling logins.' },
  { icon: 'Bar', title: 'Branch Analytics', desc: 'Compare revenue, bookings, and utilization across locations with real-time, side-by-side reporting.' },
  { icon: 'Users', title: 'Staff Control', desc: 'Assign, schedule, and track staff per branch while keeping permissions and payroll centrally governed.' },
  { icon: 'Sync', title: 'Inventory Sync', desc: 'Keep retail stock and product levels synced across every branch, with automatic low-stock alerts.' },
  { icon: 'Report', title: 'Consolidated Reporting', desc: 'Generate branch-level or company-wide reports in one click, ready to export and share.' },
  { icon: 'Shield', title: 'Role-Based Access', desc: 'Granular permissions ensure managers, staff, and admins only see and touch what they need to.' },
];

const STEPS = [
  { num: '01', title: 'Set up your salon', desc: 'Import your services, staff, and price list in minutes with guided onboarding.' },
  { num: '02', title: 'Open online booking', desc: 'Share your branded booking page and start filling your calendar immediately.' },
  { num: '03', title: 'Grow with insight', desc: 'Track revenue, retention, and staff performance from a single dashboard.' },
];

const SHOWCASE = [
  {
    icon: 'Bar' as keyof typeof Icon,
    title: 'Real-Time Dashboard',
    desc: 'Get a complete overview of your salon\'s performance at a glance — track total revenue, appointments, active clients, and daily earnings with live charts and actionable insights.',
    image: '/screenshots/dashboard.png',
  },
  {
    icon: 'Card' as keyof typeof Icon,
    title: 'Quick Sale & Billing',
    desc: 'Process walk-in and booked clients in seconds. Search clients, add services, products, memberships, apply discounts, and accept Cash, Card, UPI, or Gift Card — all from one screen.',
    image: '/screenshots/billing.png',
  },
  {
    icon: 'Report' as keyof typeof Icon,
    title: 'Reports & Analytics',
    desc: 'Dive deep into revenue trends, compare targets vs. actuals, and discover your top-performing services. Filter by date range and export reports instantly for smarter business decisions.',
    image: '/screenshots/reports.png',
  },
  {
    icon: 'Calendar' as keyof typeof Icon,
    title: 'Appointment Calendar',
    desc: 'See every stylist\'s schedule at a glance with a color-coded, drag-and-drop calendar. Manage walk-ins, block time, and switch between day, week, and staff views effortlessly.',
    image: '/screenshots/appointments.png',
  },
];

const TESTIMONIALS = [
  { name: 'Amara Chen', role: 'Owner, The Glow Room', quote: 'Bookings have never been smoother. Our no-show rate dropped by half within the first month.', initials: 'AC' },
  { name: 'Daniel Reyes', role: 'Director, Bloom Spa Co.', quote: 'The reporting alone paid for the subscription. We finally know which services actually drive revenue.', initials: 'DR' },
  { name: 'Priya Nair', role: 'Founder, Studio Lux', quote: 'Clients love the booking page and our front desk loves how little they have to manage manually.', initials: 'PN' },
];

const INITIAL_BRANCHES: Branch[] = [
  { name: 'Downtown', bookings: '128', revenue: '$5,420' },
  { name: 'Uptown', bookings: '94', revenue: '$3,860' },
  { name: 'Mall Plaza', bookings: '156', revenue: '$6,180' },
  { name: 'Riverside', bookings: '83', revenue: '$3,140' },
];

const NEW_BRANCH_NAMES = ['Harbor View', 'Garden District', 'North Park', 'Eastside', 'Old Town', 'West End'];
const DEMO_EMAIL = 'support@salonox.com';
const DEMO_SUBMIT_URL = `https://formsubmit.co/ajax/${DEMO_EMAIL}`;

const PLANS = [
  {
    name: 'Starter', price: '29', desc: 'For independent stylists getting organized.',
    feats: ['1 staff member', 'Online booking page', 'Client profiles', 'Email reminders'],
    featured: false,
  },
  {
    name: 'Growth', price: '79', desc: 'For growing salons with a full team.',
    feats: ['Up to 10 staff', 'SMS + email reminders', 'Marketing automation', 'Payments & POS', 'Performance reports'],
    featured: true,
  },
  {
    name: 'Scale', price: '149', desc: 'For multi-location salon groups.',
    feats: ['Unlimited staff', 'Multi-location dashboard', 'Advanced analytics', 'Priority support', 'Custom roles & permissions'],
    featured: false,
  },
];

/* ---------------------------------- Scroll reveal hook ---------------------------------- */

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

const Reveal: React.FC<{ children: React.ReactNode; delay?: 0 | 1 | 2 | 3 | 4; className?: string }> = ({
  children,
  delay = 0,
  className = '',
}) => {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const delayClass = delay > 0 ? `reveal-delay-${delay}` : '';
  return (
    <div ref={ref} className={`reveal ${delayClass} ${visible ? 'is-visible' : ''} ${className}`}>
      {children}
    </div>
  );
};

/* ---------------------------------- Component ---------------------------------- */

const LandingPage: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeBranch, setActiveBranch] = useState(0);
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const navItemRef = useRef<HTMLLIElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const openMega = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMegaOpen(true);
  }, []);

  const scheduleCloseMega = useCallback(() => {
    closeTimer.current = setTimeout(() => setMegaOpen(false), 140);
  }, []);

  const renderMegaIcon = (key: keyof typeof Icon) => {
    const Cmp = Icon[key];
    return <Cmp />;
  };

  const handleAddBranch = useCallback(() => {
    setBranches((prev) => {
      const usedNames = new Set(prev.map((b) => b.name));
      const nextName =
        NEW_BRANCH_NAMES.find((name) => !usedNames.has(name)) || `Branch ${prev.length + 1}`;
      const newBranch: Branch = {
        name: nextName,
        bookings: String(Math.floor(40 + Math.random() * 100)),
        revenue: `$${(1500 + Math.floor(Math.random() * 4500)).toLocaleString()}`,
      };
      const updated = [...prev, newBranch];
      setActiveBranch(updated.length - 1);
      return updated;
    });
  }, []);

  const scrollToSection = useCallback(
    (id: string) => (e: React.MouseEvent<HTMLElement>) => {
      e.preventDefault();

      setMobileOpen(false);
      setMegaOpen(false);
      document.body.style.overflow = '';

      window.requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (!el) return;

        const nav = document.querySelector<HTMLElement>('.salonox-landing .nav');
        const navOffset = nav ? nav.offsetHeight + 16 : 88;
        const targetTop = el.getBoundingClientRect().top + window.scrollY - navOffset;

        window.scrollTo({
          top: Math.max(targetTop, 0),
          behavior: 'smooth',
        });

        window.history.replaceState(null, '', `#${id}`);
      });
    },
    []
  );

  const [demoForm, setDemoForm] = useState<DemoForm>({ name: '', email: '', salon: '', locations: '' });
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [demoError, setDemoError] = useState('');

  const handleDemoChange = useCallback(
    (field: keyof DemoForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setDemoForm((prev) => ({ ...prev, [field]: e.target.value }));
      setDemoError('');
    },
    []
  );

  const handleDemoSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setDemoSubmitting(true);
      setDemoError('');

      try {
        const response = await fetch(DEMO_SUBMIT_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            _subject: `SalonOX demo request from ${demoForm.salon}`,
            _template: 'table',
            _captcha: 'false',
            _replyto: demoForm.email,
            name: demoForm.name,
            work_email: demoForm.email,
            salon_name: demoForm.salon,
            locations: demoForm.locations,
          }),
        });

        if (!response.ok) {
          throw new Error('Demo request failed');
        }

        setDemoSubmitted(true);
      } catch {
        setDemoError('We could not send your demo request. Please try again or email support@salonox.com.');
      } finally {
        setDemoSubmitting(false);
      }
    },
    [demoForm]
  );

  return (
    <div className="salonox-landing">
      {/* ============================== NAVBAR ============================== */}
      <nav className={`nav ${scrolled ? 'nav-scrolled' : ''}`}>
        <div className="container nav-inner">
          <a href="#top" className="nav-logo" onClick={scrollToSection('top')}>
            <span className="logo-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2c2 3 6 4 6 9a6 6 0 0 1-12 0c0-5 4-6 6-9Z" />
              </svg>
            </span>
            <span className="logo-text">
              Salon<span className="accent">OX</span>
            </span>
          </a>

          <ul className="nav-links">
            <li
              ref={navItemRef}
              className={`nav-item-mega ${megaOpen ? 'is-open' : ''}`}
              onMouseEnter={openMega}
              onMouseLeave={scheduleCloseMega}
            >
              <button
                className="nav-link"
                aria-expanded={megaOpen}
                onClick={() => setMegaOpen((v) => !v)}
              >
                Features <Icon.Chevron />
              </button>

              <div className={`mega-menu ${megaOpen ? 'mega-open' : ''}`} onMouseEnter={openMega} onMouseLeave={scheduleCloseMega}>
                <div className="mega-grid">
                  <div className="mega-cols">
                    <div>
                      <div className="mega-col-title">Run your floor</div>
                      {MEGA_COLUMN_A.map((item) => (
                        <a href="#features" className="mega-link" key={item.title} onClick={scrollToSection('features')}>
                          <span className="mega-link-icon">{renderMegaIcon(item.icon)}</span>
                          <span>
                            <span className="mega-link-title">{item.title}</span>
                            <span className="mega-link-desc">{item.desc}</span>
                          </span>
                        </a>
                      ))}
                    </div>
                    <div>
                      <div className="mega-col-title">Grow your business</div>
                      {MEGA_COLUMN_B.map((item) => (
                        <a href="#features" className="mega-link" key={item.title} onClick={scrollToSection('features')}>
                          <span className="mega-link-icon">{renderMegaIcon(item.icon)}</span>
                          <span>
                            <span className="mega-link-title">{item.title}</span>
                            <span className="mega-link-desc">{item.desc}</span>
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>

                  <div className="mega-promo">
                    <div>
                      <div className="mega-promo-tag">New</div>
                      <h4>AI Booking Assistant</h4>
                      <p>Let clients book by chat, around the clock, with zero double-bookings.</p>
                    </div>
                    <a href="#features" className="mega-promo-link" onClick={scrollToSection('features')}>
                      Explore the feature <Icon.Arrow />
                    </a>
                  </div>
                </div>
              </div>
            </li>
            <li><a className="nav-link" href="#multi-branch" onClick={scrollToSection('multi-branch')}>Multi-Branch</a></li>
            <li><a className="nav-link nav-link-btn" href="#how" onClick={scrollToSection('how')}>How it works</a></li>
            <li><a className="nav-link" href="#pricing" onClick={scrollToSection('pricing')}>Pricing</a></li>
            <li><a className="nav-link" href="#testimonials" onClick={scrollToSection('testimonials')}>Reviews</a></li>
          </ul>

          <div className="nav-actions">
            <Link to="/login" className="btn btn-ghost btn-sm">Log in</Link>
            <a href="#book-demo" className="btn btn-primary btn-sm" onClick={scrollToSection('book-demo')}>Book Demo</a>
            <button
              className={`nav-burger ${mobileOpen ? 'is-open' : ''}`}
              aria-label="Toggle menu"
              onClick={() => setMobileOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </nav>

      {/* ============================== MOBILE DRAWER ============================== */}
      <div className={`mobile-drawer ${mobileOpen ? 'is-open' : ''}`} onClick={() => setMobileOpen(false)}>
        <div className="mobile-drawer-panel" onClick={(e) => e.stopPropagation()}>
          <a href="#features" className="mobile-link" onClick={scrollToSection('features')}>Features</a>
          <div className="mobile-sub-title">Run your floor</div>
          {MEGA_COLUMN_A.map((item) => (
            <a href="#features" key={item.title} className="mobile-sub-link" onClick={scrollToSection('features')}>{item.title}</a>
          ))}
          <div className="mobile-sub-title">Grow your business</div>
          {MEGA_COLUMN_B.map((item) => (
            <a href="#features" key={item.title} className="mobile-sub-link" onClick={scrollToSection('features')}>{item.title}</a>
          ))}
          <a href="#multi-branch" className="mobile-link" onClick={scrollToSection('multi-branch')}>Multi-Branch</a>
          <a href="#how" className="mobile-link mobile-link-btn" onClick={scrollToSection('how')}>How it works</a>
          <a href="#pricing" className="mobile-link" onClick={scrollToSection('pricing')}>Pricing</a>
          <a href="#testimonials" className="mobile-link" onClick={scrollToSection('testimonials')}>Reviews</a>
          <div className="mobile-cta">
            <Link to="/login" className="btn btn-ghost btn-block" onClick={() => setMobileOpen(false)}>Log in</Link>
            <a href="#book-demo" className="btn btn-primary btn-block" onClick={scrollToSection('book-demo')}>Book Demo</a>
          </div>
        </div>
      </div>

      {/* ============================== HERO ============================== */}
      <header id="top" className="hero">
        <span className="hero-blob hero-blob-1" />
        <span className="hero-blob hero-blob-2" />

        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow"><span className="dot" /> Trusted by 4,000+ salons worldwide</span>
            <h1>
              Run your salon like a <span className="grad">five-star experience</span>
            </h1>
            <p className="hero-sub">
              SalonOX brings scheduling, payments, client records, and marketing into one beautiful
              platform, so your team spends less time on admin and more time behind the chair.
            </p>
            <div className="hero-cta-row">
              <a href="#book-demo" className="btn btn-primary" onClick={scrollToSection('book-demo')}>
                Book Demo <Icon.Arrow />
              </a>
              <a href="#how" className="hero-play" onClick={scrollToSection('how')}>
                <span className="play-circle"><Icon.Play /></span>
                Watch 90-sec demo
              </a>
            </div>
            <div className="hero-trust">
              <div className="trust-avatars">
                <span>AC</span>
                <span>DR</span>
                <span>PN</span>
                <span>+</span>
              </div>
              <p className="trust-text"><strong>4.9/5</strong> average rating from 2,300+ reviews</p>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-mock">
              <div className="float-card glass-card float-card-1">
                <span className="float-icon"><Icon.Calendar /></span>
                <span>
                  <span className="float-label">Today's bookings</span>
                  <span className="float-value">38 appointments</span>
                </span>
              </div>

              <div className="mock-frame">
                <div className="mock-topbar">
                  <i /><i /><i />
                </div>
                <div className="mock-body">
                  <div className="mock-row">
                    <h5>Weekly revenue</h5>
                    <span className="mock-chip">+18.4%</span>
                  </div>
                  <div className="mock-bars">
                    <i style={{ height: '38%', animationDelay: '0.05s' }} />
                    <i style={{ height: '62%', animationDelay: '0.1s' }} />
                    <i style={{ height: '48%', animationDelay: '0.15s' }} />
                    <i style={{ height: '80%', animationDelay: '0.2s' }} />
                    <i style={{ height: '57%', animationDelay: '0.25s' }} />
                    <i style={{ height: '93%', animationDelay: '0.3s' }} />
                    <i style={{ height: '70%', animationDelay: '0.35s' }} />
                  </div>
                  <div className="mock-list">
                    <div className="mock-list-item">
                      <span className="avatar" />
                      <span className="lines"><span className="l1" /><span className="l2" /></span>
                      <span className="status">Confirmed</span>
                    </div>
                    <div className="mock-list-item">
                      <span className="avatar" />
                      <span className="lines"><span className="l1" /><span className="l2" /></span>
                      <span className="status">Confirmed</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="float-card glass-card float-card-2">
                <span className="float-icon"><Icon.Card /></span>
                <span>
                  <span className="float-label">Paid today</span>
                  <span className="float-value">$4,210</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ============================== LOGO STRIP ============================== */}
      <section className="logo-strip">
        <div className="container">
          <Reveal>
            <p className="logo-strip-label">Powering appointments for modern salons and spas</p>
          </Reveal>
          <Reveal delay={1}>
            <div className="logo-strip-row">
              <span>Lumière</span>
              <span>Bloom & Co.</span>
              <span>The Glow Room</span>
              <span>Studio Lux</span>
              <span>VELVET</span>
              <span>Maison Hair</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================== STATS ============================== */}
      <section className="stats">
        <div className="container">
          <Reveal>
            <div className="stats-grid">
              <div className="stat-cell">
                <div className="stat-num"><span>4,000+</span></div>
                <div className="stat-label">Salons on SalonOX</div>
              </div>
              <div className="stat-cell">
                <div className="stat-num"><span>2.8M</span></div>
                <div className="stat-label">Bookings processed</div>
              </div>
              <div className="stat-cell">
                <div className="stat-num"><span>38%</span></div>
                <div className="stat-label">Fewer no-shows</div>
              </div>
              <div className="stat-cell">
                <div className="stat-num"><span>4.9/5</span></div>
                <div className="stat-label">Average rating</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================== FEATURES ============================== */}
      <section id="features" className="features">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <span className="eyebrow"><span className="dot" /> Platform</span>
              <h2>Everything your salon needs, in one place</h2>
              <p>Replace a stack of spreadsheets and apps with a single platform built for the way salons actually work.</p>
            </div>
          </Reveal>

          <div className="features-grid">
            {FEATURES.map((feature, i) => {
              const Cmp = Icon[feature.icon];
              return (
                <Reveal key={feature.title} delay={(i % 3) as 0 | 1 | 2}>
                  <div className="feature-card">
                    <span className="feature-icon"><Cmp /></span>
                    <h3>{feature.title}</h3>
                    <p>{feature.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={1}>
            <div className="spotlight-card">
              <div className="spotlight-copy">
                <span className="eyebrow"><span className="dot" /> Multi-location</span>
                <h3>Run every branch from one login</h3>
                <p>
                  Switch between locations in a click. Staff, schedules, and reporting stay separate per
                  branch, while you see the whole business from a single dashboard.
                </p>
                <button type="button" className="btn btn-dark btn-sm spotlight-add" onClick={handleAddBranch}>
                  <Icon.Layers /> Add a new branch
                </button>
              </div>

              <div className="spotlight-panel">
                <div className="branch-pills" role="tablist" aria-label="Branches">
                  {branches.map((branch, i) => (
                    <button
                      key={branch.name}
                      type="button"
                      role="tab"
                      aria-selected={activeBranch === i}
                      className={`branch-pill ${activeBranch === i ? 'is-active' : ''}`}
                      onClick={() => setActiveBranch(i)}
                    >
                      {branch.name}
                    </button>
                  ))}
                </div>

                <div className="branch-stat-row">
                  <div className="branch-stat">
                    <span className="branch-stat-label">Today's bookings</span>
                    <span className="branch-stat-value">{branches[activeBranch].bookings}</span>
                  </div>
                  <div className="branch-stat">
                    <span className="branch-stat-label">Today's revenue</span>
                    <span className="branch-stat-value">{branches[activeBranch].revenue}</span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================== MULTI-BRANCH ============================== */}
      <section id="multi-branch" className="mb-section">
        <span className="mb-glow mb-glow-1" />
        <span className="mb-glow mb-glow-2" />
        <div className="container">
          <Reveal>
            <div className="section-head">
              <span className="eyebrow"><span className="dot" /> Multi-Branch</span>
              <h2>One platform. Every branch. Total control.</h2>
              <p>
                Built for salon groups, not just single locations. Run every branch with the same
                tools, oversight, and polish, without adding a single extra login.
              </p>
            </div>
          </Reveal>

          <div className="mb-grid">
            {MULTI_BRANCH_FEATURES.map((feature, i) => {
              const Cmp = Icon[feature.icon];
              return (
                <Reveal key={feature.title} delay={(i % 3) as 0 | 1 | 2}>
                  <div className="mb-card">
                    <span className="mb-card-icon"><Cmp /></span>
                    <h3>{feature.title}</h3>
                    <p>{feature.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================== HOW IT WORKS — SHOWCASE ============================== */}
      <section id="how" className="how">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <span className="eyebrow"><span className="dot" /> How It Works</span>
              <h2>See SalonOX in action</h2>
              <p>From dashboard to checkout — everything your salon needs, beautifully designed and ready to use from day one.</p>
            </div>
          </Reveal>

          <div className="showcase-grid">
            {SHOWCASE.map((item, i) => {
              const Cmp = Icon[item.icon];
              return (
                <Reveal key={item.title} delay={0}>
                  <div className="showcase-card">
                    <div className="showcase-img-wrap">
                      <div className="browser-mock">
                        <div className="browser-header">
                          <span className="dot" />
                          <span className="dot" />
                          <span className="dot" />
                        </div>
                        <img src={item.image} alt={item.title} className="showcase-img" loading="lazy" />
                      </div>
                      <span className="showcase-badge">
                        <Cmp />
                      </span>
                    </div>
                    <div className="showcase-info">
                      <h3>{item.title}</h3>
                      <p>{item.desc}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================== TESTIMONIALS ============================== */}
      <section id="testimonials" className="testimonials">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <span className="eyebrow"><span className="dot" /> Reviews</span>
              <h2>Loved by salon owners everywhere</h2>
              <p>Real results from real teams who switched to SalonOX.</p>
            </div>
          </Reveal>

          <div className="testi-grid">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i as 0 | 1 | 2}>
                <div className="testi-card">
                  <div className="testi-stars">
                    <Icon.Star /><Icon.Star /><Icon.Star /><Icon.Star /><Icon.Star />
                  </div>
                  <p className="testi-quote">&ldquo;{t.quote}&rdquo;</p>
                  <div className="testi-author">
                    <span className="testi-avatar">{t.initials}</span>
                    <span>
                      <div className="testi-name">{t.name}</div>
                      <div className="testi-role">{t.role}</div>
                    </span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================== PRICING ============================== */}
      <section id="pricing" className="pricing">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <span className="eyebrow"><span className="dot" /> Pricing</span>
              <h2>Simple plans that scale with you</h2>
              <p>Start free for 14 days. No credit card required. Cancel anytime.</p>
            </div>
          </Reveal>

          <div className="pricing-grid">
            {PLANS.map((plan, i) => (
              <Reveal key={plan.name} delay={i as 0 | 1 | 2}>
                <div className={`price-card ${plan.featured ? 'is-featured' : ''}`}>
                  {plan.featured && <span className="price-badge">Most popular</span>}
                  <div className="price-name">{plan.name}</div>
                  <div className="price-amt">${plan.price}<span>/month</span></div>
                  <p className="price-desc">{plan.desc}</p>
                  <div className="price-feats">
                    {plan.feats.map((f) => (
                      <div className="price-feat" key={f}><Icon.Check /> {f}</div>
                    ))}
                  </div>
                  <a href="#" className={`btn btn-block ${plan.featured ? 'btn-primary' : 'btn-ghost'}`}>
                    Get started
                  </a>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================== BOOK A DEMO ============================== */}
      <section id="book-demo" className="demo-section">
        <div className="container demo-grid">
          <Reveal className="demo-copy">
            <h2>Ready to Grow Your Salon Business?</h2>
            <p>Everything you need to manage and scale your salon operations from one platform.</p>
            <div className="demo-contact">
              <a href={`mailto:${DEMO_EMAIL}`} className="demo-contact-row">
                <span className="demo-contact-icon"><Icon.Mail /></span>
                {DEMO_EMAIL}
              </a>
              <a href="tel:+919503302647" className="demo-contact-row">
                <span className="demo-contact-icon"><Icon.Phone /></span>
                +91 9503302647
              </a>
            </div>
          </Reveal>

          <Reveal delay={1} className="demo-card-wrap">
            <div className="demo-card">
              {demoSubmitted ? (
                <div className="demo-success">
                  <span className="demo-success-icon"><Icon.Check /></span>
                  <h3>Thanks — you're booked in!</h3>
                  <p>A member of our team will reach out within 1 business day to confirm your demo.</p>
                </div>
              ) : (
                <>
                  <h3>Schedule a Free Demo</h3>
                  <p>See SalonOX live in action and ask all your questions.</p>
                  <form className="demo-form" onSubmit={handleDemoSubmit}>
                    <label className="demo-field">
                      <span>Your Name</span>
                      <input
                        type="text"
                        required
                        placeholder="Jordan Lee"
                        value={demoForm.name}
                        onChange={handleDemoChange('name')}
                      />
                    </label>
                    <label className="demo-field">
                      <span>Work Email</span>
                      <input
                        type="email"
                        required
                        placeholder="you@yoursalon.com"
                        value={demoForm.email}
                        onChange={handleDemoChange('email')}
                      />
                    </label>
                    <label className="demo-field">
                      <span>Salon Name</span>
                      <input
                        type="text"
                        required
                        placeholder="e.g. The Glow Room"
                        value={demoForm.salon}
                        onChange={handleDemoChange('salon')}
                      />
                    </label>
                    <label className="demo-field">
                      <span>Locations</span>
                      <select required value={demoForm.locations} onChange={handleDemoChange('locations')}>
                        <option value="" disabled>Select locations count</option>
                        <option value="1">1 location</option>
                        <option value="2-5">2–5 locations</option>
                        <option value="6-15">6–15 locations</option>
                        <option value="16+">16+ locations</option>
                      </select>
                    </label>
                    {demoError && <p className="demo-error" role="alert">{demoError}</p>}
                    <button type="submit" className="btn btn-primary btn-block" disabled={demoSubmitting}>
                      {demoSubmitting ? 'Sending...' : 'Schedule Demo'}
                    </button>
                    <p className="demo-disclaimer">
                      By clicking, you agree to receive follow-up emails regarding SalonOX product demos.
                    </p>
                  </form>
                </>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================== FOOTER ============================== */}
      <footer className="footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <a href="#top" className="nav-logo" onClick={scrollToSection('top')}>
                <span className="logo-mark">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2c2 3 6 4 6 9a6 6 0 0 1-12 0c0-5 4-6 6-9Z" />
                  </svg>
                </span>
                <span className="logo-text">Salon<span className="accent">OX</span></span>
              </a>
              <p>The all-in-one platform for salons and spas to book, manage, and grow with confidence.</p>
              <div className="footer-social">
                <a href="#" aria-label="Twitter"><Icon.Twitter /></a>
                <a href="#" aria-label="Instagram"><Icon.Instagram /></a>
                <a href="#" aria-label="LinkedIn"><Icon.Linkedin /></a>
                <a href="#" aria-label="Facebook"><Icon.Facebook /></a>
              </div>
            </div>

            <div className="footer-col">
              <h5>Product</h5>
              <ul>
                <li><a href="#features" onClick={scrollToSection('features')}>Scheduling</a></li>
                <li><a href="#features" onClick={scrollToSection('features')}>Payments</a></li>
                <li><a href="#features" onClick={scrollToSection('features')}>Marketing</a></li>
                <li><a href="#pricing" onClick={scrollToSection('pricing')}>Pricing</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h5>Company</h5>
              <ul>
                <li><a href="#">About</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Press</a></li>
                <li><a href="#">Contact</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h5>Resources</h5>
              <ul>
                <li><a href="#">Help center</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">API docs</a></li>
                <li><a href="#">Community</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h5>Legal</h5>
              <ul>
                <li><a href="#">Privacy</a></li>
                <li><a href="#">Terms</a></li>
                <li><a href="#">Security</a></li>
                <li><a href="#">Status</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} SalonOX. All rights reserved.</p>
            <div className="footer-legal">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
