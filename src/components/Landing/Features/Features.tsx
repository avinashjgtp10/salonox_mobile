import React from 'react';
import {
  FEATURES,
  FeatureMiniPreview,
  Icon,
  Reveal,
  SectionArtwork,
  SectionTransition,
} from '../shared';


const Features: React.FC = () => (
  <section id="features" className="features">
    <SectionTransition from="dark" />
    <SectionArtwork variant="features" />
    <img
      className="features-atmosphere features-atmosphere--left"
      src="/screenshots/salonox-salon-hero.png"
      alt=""
      width="1672"
      height="939"
      loading="lazy"
      aria-hidden="true"
    />
    <img
      className="features-atmosphere features-atmosphere--right"
      src="/screenshots/salonox-salon-hero.png"
      alt=""
      width="1672"
      height="939"
      loading="lazy"
      aria-hidden="true"
    />
    <svg className="features-connectors" viewBox="0 0 1440 1040" preserveAspectRatio="none" aria-hidden="true">
      <path d="M-40 260 C150 120 205 350 350 236 S575 130 700 264" />
      <path d="M1480 210 C1285 100 1240 330 1090 235 S870 140 760 270" />
      <path d="M-60 760 C150 590 285 865 475 700 S720 610 860 745" />
      <path d="M1500 820 C1300 625 1190 870 1020 710 S810 620 660 770" />
    </svg>
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
            <Reveal key={feature.title} className="feature-reveal">
              <article className={`feature-card feature-card--${i + 1}`} tabIndex={0}>
                <div className="feature-card-copy">
                  <span className="feature-icon"><Cmp /></span>
                  <h3>{feature.title}</h3>
                  <p>{feature.desc}</p>
                </div>
                <FeatureMiniPreview index={i} />
              </article>
            </Reveal>
          );
        })}
      </div>
    </div>
  </section>
);

export default React.memo(Features);
