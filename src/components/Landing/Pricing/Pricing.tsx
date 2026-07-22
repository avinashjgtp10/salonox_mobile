import React from 'react';
import {
  DEMO_EMAIL,
  Icon,
  PROFESSIONAL_PLAN_BENEFITS,
  PROFESSIONAL_PLAN_FEATURES,
  Reveal,
  SectionArtwork,
  SectionTransition,
} from '../shared';

type PricingProps = {
  scrollToSection: (id: string) => (event: React.MouseEvent<HTMLElement>) => void;
};

const Pricing: React.FC<PricingProps> = ({ scrollToSection }) => (
  <section id="pricing" className="pricing">
    <SectionTransition from="dark" />
    <SectionArtwork variant="pricing" />
    <div className="container">
      <Reveal>
        <div className="section-head">
          <span className="eyebrow"><span className="dot" /> Pricing</span>
          <h2>One complete solution. Everything included.</h2>
          <p>Premium salon management without confusing tiers, feature limits, or hidden add-ons.</p>
        </div>
      </Reveal>

      <div className="pricing-grid">
        <Reveal>
          <article className="professional-price-card">
            <span className="professional-price-glow professional-price-glow--one" aria-hidden="true" />
            <span className="professional-price-glow professional-price-glow--two" aria-hidden="true" />

            <div className="professional-price-header">
              <div className="professional-price-intro">
                <span className="professional-price-badge"><span aria-hidden="true">⭐</span> Everything Included</span>
                <div className="professional-price-name">SalonOX Professional</div>
                <p>Everything you need to manage and grow your salon in one powerful platform.</p>
              </div>

              <div className="professional-price-value" aria-label="Twelve thousand rupees per salon per year">
                <span className="professional-price-amount">₹12,000</span>
                <span className="professional-price-period">Per Salon / Year</span>
              </div>
            </div>

            <div className="professional-feature-panel">
              <div className="professional-feature-heading">
                <span>Complete feature access</span>
                <strong>Built to run your entire salon</strong>
              </div>
              <ul className="professional-feature-list">
                {PROFESSIONAL_PLAN_FEATURES.map((feature) => (
                  <li key={feature}>
                    <span className="professional-feature-check" aria-hidden="true"><Icon.Check /></span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="professional-price-action">
              <a href="#book-demo" className="btn btn-primary btn-block" onClick={scrollToSection('book-demo')}>
                Book a Free Demo <Icon.Arrow />
              </a>
              <div className="professional-plan-benefits" aria-label="Included onboarding benefits">
                {PROFESSIONAL_PLAN_BENEFITS.map((benefit) => (
                  <span key={benefit}><Icon.Check /> {benefit}</span>
                ))}
              </div>
            </div>

            <div className="professional-enterprise-note">
              <span className="professional-enterprise-icon" aria-hidden="true"><Icon.Building /></span>
              <p>
                <strong>Need a custom enterprise solution for multiple branches?</strong>
                <a href={`mailto:${DEMO_EMAIL}?subject=SalonOX%20Enterprise%20Pricing`}>Contact our sales team for custom pricing.</a>
              </p>
            </div>
          </article>
        </Reveal>
      </div>
    </div>
  </section>
);

export default React.memo(Pricing);
