import React from 'react';
import {
  Icon,
  Reveal,
  SectionArtwork,
  SectionTransition,
  TESTIMONIALS,
} from '../shared';


const Reviews: React.FC = () => (
  <section id="testimonials" className="testimonials">
    <SectionTransition from="dark" />
    <SectionArtwork variant="reviews" />
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
);

export default React.memo(Reviews);
