import React from 'react';
import { Reveal } from '../shared';

const featureItems = [
  'Dashboard Overview',
  'Staff Management',
  'Quick Sale',
  'Clients & Services',
] as const;

const MobileAppMark: React.FC = () => (
  <span className="mobile-app-logo-mark" aria-hidden="true">
    <svg viewBox="0 0 40 40" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <circle cx="28" cy="12" r="4" />
      <circle cx="12" cy="28" r="4" />
      <path d="M15.2 14.4 24.8 25.6M24.8 14.4 15.2 25.6M17 12h6M14.4 24.8 25.6 15.2" />
    </svg>
  </span>
);

const appScreens = [
  {
    src: '/screenshots/mobile-app-quick-sale.jpg',
    alt: 'SalonOX mobile app quick sale screen',
  },
  {
    src: '/screenshots/mobile-app-home.jpg',
    alt: 'SalonOX mobile app home dashboard screen',
  },
  {
    src: '/screenshots/mobile-app-more.jpg',
    alt: 'SalonOX mobile app more tools screen',
  },
  {
    src: '/screenshots/mobile-app-team.jpg',
    alt: 'SalonOX mobile app staff management screen',
  },
] as const;

const MobileApp: React.FC = () => (
  <section id="mobile-app" className="mobile-app-section" aria-labelledby="mobile-app-heading">
    <div className="mobile-app-bg" aria-hidden="true">
      <span className="mobile-app-glow mobile-app-glow--left" />
      <span className="mobile-app-glow mobile-app-glow--right" />
      <span className="mobile-app-ribbon mobile-app-ribbon--one" />
      <span className="mobile-app-ribbon mobile-app-ribbon--two" />
      <svg className="mobile-app-dots mobile-app-dots--top" viewBox="0 0 620 360">
        <path d="M20 250C88 82 250 26 356 96c92 61 72 194 244 164" />
      </svg>
      <svg className="mobile-app-dots mobile-app-dots--bottom" viewBox="0 0 760 360">
        <path d="M20 250c128-190 308-98 404-84 150 22 186-92 316-40" />
      </svg>
    </div>

    <div className="mobile-app-container">
      <Reveal className="mobile-app-copy">
        <div className="mobile-app-brand">
          <MobileAppMark />
          <span>Salon<span>OX</span></span>
        </div>

        <h2 id="mobile-app-heading">
          Mobile App
          <span>Manage Your Salon Anywhere</span>
        </h2>

        <p className="mobile-app-subtitle">
          Everything you need to manage appointments, staff, clients, products and sales — right from your pocket.
        </p>
        <span className="mobile-app-rule" aria-hidden="true" />

        <div className="mobile-app-features">
          {featureItems.map((item) => (
            <div className="mobile-app-feature" key={item}>
              <span aria-hidden="true">✓</span>
              <strong>{item}</strong>
            </div>
          ))}
        </div>

        <div className="mobile-app-store-row mobile-app-download-row" aria-label="App download badges">
          <img src="/badges/google-play-badge.svg" alt="Get it on Google Play" loading="lazy" decoding="async" />
          <img src="/badges/app-store-badge.svg" alt="Download on the App Store" loading="lazy" decoding="async" />
        </div>
      </Reveal>

      <Reveal delay={1} className="mobile-app-visual">
        <div className="mobile-app-phone-pair" aria-label="SalonOX mobile app preview screens">
          {appScreens.map((screen, index) => (
            <figure className={`mobile-app-preview-phone mobile-app-preview-phone--${index + 1}`} key={screen.src}>
              <img src={screen.src} alt={screen.alt} loading="lazy" decoding="async" />
            </figure>
          ))}
        </div>
      </Reveal>
    </div>
  </section>
);

export default React.memo(MobileApp);
