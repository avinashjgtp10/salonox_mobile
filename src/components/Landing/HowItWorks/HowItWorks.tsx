import React from 'react';
import {
  HOW_SHOWCASE,
  Icon,
  Reveal,
  SectionArtwork,
  SectionTransition,
  ShowcaseFloatingWidgets,
} from '../shared';

type HowItWorksProps = {
  scrollToSection: (id: string) => (event: React.MouseEvent<HTMLElement>) => void;
};

const HowItWorks: React.FC<HowItWorksProps> = ({ scrollToSection }) => (
  <section id="how" className="how">
    <SectionTransition from="dark" />
    <SectionArtwork variant="workflow" />
    <div className="container">
      <Reveal>
        <div className="section-head">
          <span className="eyebrow"><span className="dot" /> How It Works</span>
          <h2>See SalonOX in Action</h2>
          <p>From dashboard to checkout — everything your salon needs, beautifully designed and ready to use from day one.</p>
        </div>
      </Reveal>

      <div className="showcase-stories">
        {HOW_SHOWCASE.map((item) => {
          const Cmp = Icon[item.icon];
          return (
            <Reveal key={item.title} delay={0} className="showcase-story-reveal">
              <article className={`showcase-story showcase-story--${item.theme}`}>
                <div className="showcase-story-visual">
                  <img
                    src="/screenshots/salonox-salon-hero.png"
                    alt=""
                    className="showcase-salon-photo"
                    width="1672"
                    height="939"
                    loading="lazy"
                  />
                  <svg className="showcase-story-ribbons" viewBox="0 0 760 580" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M-80 470 C120 245 220 560 420 340 C555 192 665 360 840 150" />
                    <path d="M-60 535 C135 330 275 590 465 405 C605 270 710 405 830 255" />
                  </svg>
                  <svg className="showcase-story-connectors" viewBox="0 0 760 580" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M110 115 C190 115 170 205 250 205" />
                    <path d="M650 105 C570 105 595 210 520 210" />
                    <path d="M665 485 C580 485 602 405 520 405" />
                    <path d="M105 485 C190 485 168 405 250 405" />
                    <path d="M110 300 C185 300 178 330 250 330" />
                  </svg>
                  <div className="browser-mock">
                    <div className="browser-header">
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                    </div>
                    <img src={item.image} alt={item.title} className="showcase-img" loading="lazy" />
                  </div>
                  <ShowcaseFloatingWidgets theme={item.theme} />
                </div>

                <div className="showcase-story-content">
                  <span className="showcase-step"><span><Cmp /></span>{item.label}</span>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                  <ul>
                    {item.bullets.map((bullet) => (
                      <li key={bullet}><span><Icon.Check /></span>{bullet}</li>
                    ))}
                  </ul>
                  <a href="#book-demo" className="btn btn-ghost showcase-story-cta" onClick={scrollToSection('book-demo')}>
                    {item.cta} <Icon.Arrow />
                  </a>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </div>
  </section>
);

export default React.memo(HowItWorks);
