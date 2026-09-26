import React from 'react';
import {
  HERO_FEATURE_CARDS,
  HERO_TRUST_ITEMS,
  Icon,
  Reveal,
} from '../shared';

type HeroProps = {
  heroRef: React.RefObject<HTMLElement>;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
  scrollToSection: (id: string) => (event: React.MouseEvent<HTMLElement>) => void;
  openVideoModal: (event: React.MouseEvent<HTMLElement>) => void;
};

const Hero: React.FC<HeroProps> = ({ heroRef, onPointerMove, onPointerLeave, scrollToSection, openVideoModal }) => (
  <>
    <header
      id="top"
      ref={heroRef}
      className="hero hero-premium hero-with-photo"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
    <div className="hero-photo" aria-hidden="true">
      <img
        src="/screenshots/salonox-salon-hero.webp"
        srcSet="/screenshots/salonox-salon-hero-836.webp 836w, /screenshots/salonox-salon-hero.webp 1672w"
        sizes="100vw"
        alt=""
        width="1672"
        height="939"
        loading="eager"
        fetchPriority="high"
      />
    </div>
    <div className="hero-premium-atmosphere" aria-hidden="true">
      <span className="hero-atmosphere-ambient" />

      <svg className="hero-svg-ribbon hero-svg-ribbon--left-back" viewBox="0 0 1400 760" preserveAspectRatio="none">
        <defs>
          <linearGradient id="heroRibbonLeftBack" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#059669" stopOpacity="0" />
            <stop offset="0.3" stopColor="#10b981" stopOpacity="0.34" />
            <stop offset="0.7" stopColor="#34d399" stopOpacity="0.12" />
            <stop offset="1" stopColor="#059669" stopOpacity="0" />
          </linearGradient>
          <filter id="heroRibbonLeftBackBlur" x="-30%" y="-50%" width="180%" height="220%">
            <feGaussianBlur stdDeviation="24" />
          </filter>
        </defs>
        <path d="M-260 790 C-15 430 230 810 520 625 C770 466 875 570 1110 492" fill="none" stroke="url(#heroRibbonLeftBack)" strokeWidth="150" strokeLinecap="round" filter="url(#heroRibbonLeftBackBlur)" />
      </svg>

      <svg className="hero-svg-ribbon hero-svg-ribbon--left-front" viewBox="0 0 1400 760" preserveAspectRatio="none">
        <defs>
          <linearGradient id="heroRibbonLeftFront" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#10b981" stopOpacity="0" />
            <stop offset="0.38" stopColor="#059669" stopOpacity="0.32" />
            <stop offset="0.72" stopColor="#34d399" stopOpacity="0.1" />
            <stop offset="1" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
          <filter id="heroRibbonLeftFrontBlur" x="-30%" y="-50%" width="180%" height="220%">
            <feGaussianBlur stdDeviation="13" />
          </filter>
        </defs>
        <path d="M-210 835 C70 505 260 875 555 650 C735 512 900 615 1055 540" fill="none" stroke="url(#heroRibbonLeftFront)" strokeWidth="72" strokeLinecap="round" filter="url(#heroRibbonLeftFrontBlur)" />
      </svg>

      <svg className="hero-svg-ribbon hero-svg-ribbon--right-back" viewBox="0 0 1400 760" preserveAspectRatio="none">
        <defs>
          <linearGradient id="heroRibbonRightBack" x1="1" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#059669" stopOpacity="0" />
            <stop offset="0.3" stopColor="#10b981" stopOpacity="0.34" />
            <stop offset="0.7" stopColor="#34d399" stopOpacity="0.12" />
            <stop offset="1" stopColor="#059669" stopOpacity="0" />
          </linearGradient>
          <filter id="heroRibbonRightBackBlur" x="-50%" y="-50%" width="180%" height="220%">
            <feGaussianBlur stdDeviation="24" />
          </filter>
        </defs>
        <path d="M1660 790 C1415 430 1170 810 880 625 C630 466 525 570 290 492" fill="none" stroke="url(#heroRibbonRightBack)" strokeWidth="150" strokeLinecap="round" filter="url(#heroRibbonRightBackBlur)" />
      </svg>

      <svg className="hero-svg-ribbon hero-svg-ribbon--right-front" viewBox="0 0 1400 760" preserveAspectRatio="none">
        <defs>
          <linearGradient id="heroRibbonRightFront" x1="1" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#10b981" stopOpacity="0" />
            <stop offset="0.38" stopColor="#059669" stopOpacity="0.32" />
            <stop offset="0.72" stopColor="#34d399" stopOpacity="0.1" />
            <stop offset="1" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
          <filter id="heroRibbonRightFrontBlur" x="-50%" y="-50%" width="180%" height="220%">
            <feGaussianBlur stdDeviation="13" />
          </filter>
        </defs>
        <path d="M1610 835 C1330 505 1140 875 845 650 C665 512 500 615 345 540" fill="none" stroke="url(#heroRibbonRightFront)" strokeWidth="72" strokeLinecap="round" filter="url(#heroRibbonRightFrontBlur)" />
      </svg>

      <span className="hero-atmosphere-glow hero-atmosphere-glow--left" />
      <span className="hero-atmosphere-glow hero-atmosphere-glow--center" />
      <span className="hero-atmosphere-glow hero-atmosphere-glow--right" />
      <span className="hero-atmosphere-beam hero-atmosphere-beam--left" />
      <span className="hero-atmosphere-beam hero-atmosphere-beam--right" />
      <span className="hero-atmosphere-panel hero-atmosphere-panel--left" />
      <span className="hero-atmosphere-panel hero-atmosphere-panel--right" />
      <svg className="hero-atmosphere-grain" width="100%" height="100%" preserveAspectRatio="none">
        <filter id="heroGrainNoise">
          <feTurbulence type="fractalNoise" baseFrequency="0.78" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#heroGrainNoise)" opacity="0.18" />
      </svg>
    </div>

    <div className="container hero-premium-shell">
      <div className="hero-premium-copy">
        <span className="hero-premium-badge hero-premium-enter hero-premium-enter--1">
          <span aria-hidden="true">✨</span> All-in-One Salon Management Software
        </span>
        <h1 className="hero-premium-enter hero-premium-enter--2">
          Run Your Salon Smarter,<br />
          Faster &amp; <span>More Profitably</span>
        </h1>
        <p className="hero-premium-description hero-premium-enter hero-premium-enter--3">
          Manage appointments, staff, billing, inventory, clients, marketing and reports — all from one powerful salon management platform.
        </p>

        <div className="hero-premium-actions hero-premium-enter hero-premium-enter--4">
          <a href="#book-demo" className="btn btn-primary" onClick={scrollToSection('book-demo')}>
            Book a Free Demo <Icon.Arrow />
          </a>
          <a
            href="#demo-video"
            className="btn btn-ghost hero-premium-watch"
            onClick={openVideoModal}
            aria-haspopup="dialog"
          >
            <Icon.Play /> Watch Demo
          </a>
        </div>

        <ul className="hero-premium-trust hero-premium-enter hero-premium-enter--5" aria-label="SalonOX benefits">
          {HERO_TRUST_ITEMS.map((item) => (
            <li key={item}><span aria-hidden="true"><Icon.Check /></span>{item}</li>
          ))}
        </ul>
      </div>

      <div className="hero-premium-stage">
        <svg className="hero-premium-connectors" viewBox="0 0 1200 690" aria-hidden="true">
          <path d="M130 125 C230 125 205 245 320 245" />
          <path d="M120 335 C220 335 210 410 320 410" />
          <path d="M155 565 C235 565 230 505 330 505" />
          <path d="M1070 130 C965 130 995 250 880 250" />
          <path d="M1080 350 C985 350 990 415 880 415" />
          <path d="M1045 570 C965 570 970 510 870 510" />
        </svg>

        <div className="hero-dashboard-wrap">
          <div className="hero-dashboard-frame">
            <img
              src="/screenshots/dashboard.webp"
              alt="SalonOX dashboard showing revenue, appointments, active clients, and salon performance analytics"
              width="1024"
              height="596"
              loading="eager"
              fetchPriority="high"
            />
          </div>
        </div>

        <ul className="hero-feature-cards" aria-label="SalonOX platform features">
          {HERO_FEATURE_CARDS.map((feature, index) => {
            const FeatureIcon = Icon[feature.icon];
            return (
              <li className={`hero-feature-card hero-feature-card--${index + 1}`} key={feature.label}>
                <span className="hero-feature-card-surface">
                  <span className="hero-feature-card-icon" aria-hidden="true"><FeatureIcon /></span>
                  <strong>{feature.label}</strong>
                </span>
              </li>
            );
          })}
        </ul>

      </div>
    </div>
    </header>

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
  </>
);

export default React.memo(Hero);
