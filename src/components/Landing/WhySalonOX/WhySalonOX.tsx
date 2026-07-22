import React from 'react';
import {
  Icon,
  Reveal,
  SectionArtwork,
  SectionTransition,
  WHY_FEATURE_DETAILS,
  type WhyFeature,
} from '../shared';

type WhySalonOXProps = {
  onSelectFeature: (feature: WhyFeature) => void;
};

const WhySalonOX: React.FC<WhySalonOXProps> = ({ onSelectFeature }) => (
  <section id="why-salonox" className="why-section">
    <SectionTransition from="dark" />
    <SectionArtwork variant="why" />
    <div className="container">
      <Reveal>
        <div className="section-head">
          <span className="eyebrow"><span className="dot" /> Why SalonOX</span>
          <h2>Built for the way modern salons operate</h2>
          <p>Every feature is designed around real salon workflows — so your team is productive from day one, not after weeks of training.</p>
        </div>
      </Reveal>

      <div className="why-grid">
        {WHY_FEATURE_DETAILS.map((item, i) => {
          const Cmp = Icon[item.icon];
          return (
            <Reveal key={item.title} delay={(i % 3) as 0 | 1 | 2}>
              <button
                type="button"
                className="why-card"
                aria-haspopup="dialog"
                aria-label={`Open ${item.title} feature details`}
                onClick={() => onSelectFeature(item)}
              >
                <div className="why-card-top">
                  <span className="why-icon"><Cmp /></span>
                  {item.tag && <span className="why-tag">{item.tag}</span>}
                </div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
                <span className="why-arrow">→</span>
              </button>
            </Reveal>
          );
        })}
      </div>
    </div>
  </section>
);

export default React.memo(WhySalonOX);
