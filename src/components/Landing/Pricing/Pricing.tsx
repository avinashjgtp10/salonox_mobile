import React from 'react';
import { Link } from 'react-router-dom';
import {
  Icon,
  Reveal,
  SectionArtwork,
  SectionTransition,
} from '../shared';

const PURCHASE_PLANS = [
  {
    name: 'Basic',
    price: '₹8,000',
    description: 'For businesses looking for essential management features to get started.',
    cta: 'Buy Basic',
    badge: '',
    featured: false,
    premium: false,
    features: [
      'Mobile App',
      'Dashboard',
      'Quick Sale',
      'Calendar',
      'Services',
      'Products',
      'Limited Reports',
    ],
  },
  {
    name: 'Advance',
    price: '₹12,000',
    description: 'For businesses that need complete salon management functionality.',
    cta: 'Buy Advance',
    badge: '',
    featured: true,
    premium: false,
    features: [
      'Mobile App',
      'All Basic Plan features',
      'Full Dashboard access',
      'Quick Sale',
      'Calendar',
      'Services',
      'Products',
      'Memberships',
      'Packages',
      'Full Reports',
      'Staff Management',
      'Client Management',
      'Inventory Management',
      'Payroll',
      'Enquiry',
      'Cash Management',
      'Settings',
    ],
  },
  {
    name: 'Pro',
    price: '₹15,000',
    description: 'For growing businesses that need advanced digital and multi-branch capabilities.',
    cta: 'Buy Pro',
    badge: '',
    featured: false,
    premium: true,
    features: [
      'Mobile App',
      'Everything in Advance Plan',
      'Web Building',
      'Google SEO',
      'Meta Marketing',
      'Multi-Branch Handling',
      'Advanced Reports',
      'Consultation',
    ],
  },
] as const;

const Pricing: React.FC = () => (
  <section id="pricing" className="pricing">
    <SectionTransition from="dark" />
    <SectionArtwork variant="pricing" />
    <div className="container">
      <Reveal>
        <div className="section-head">
          <span className="eyebrow"><span className="dot" /> Pricing</span>
          <h2>Purchase plans built for every salon stage.</h2>
          <p>Choose the SalonOX plan that fits how your salon runs today and where it grows tomorrow.</p>
        </div>
      </Reveal>

      <div className="pricing-grid">
        {PURCHASE_PLANS.map((plan, index) => (
          <Reveal delay={index as 0 | 1 | 2} key={plan.name}>
            <article
              className={[
                'purchase-plan-card',
                plan.featured ? 'purchase-plan-card--recommended' : '',
                plan.premium ? 'purchase-plan-card--premium' : '',
              ].filter(Boolean).join(' ')}
              aria-labelledby={`purchase-plan-${plan.name.toLowerCase()}`}
            >
              {plan.badge && <span className="purchase-plan-badge">{plan.badge}</span>}
              <div className="purchase-plan-header">
                <h3 id={`purchase-plan-${plan.name.toLowerCase()}`}>{plan.name}</h3>
                <div className="purchase-plan-price">{plan.price}</div>
                <p>{plan.description}</p>
              </div>

              <ul className="purchase-plan-features">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <span className="purchase-plan-check" aria-hidden="true"><Icon.Check /></span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link to="/register" className="btn btn-primary btn-block purchase-plan-cta">
                {plan.cta} <Icon.Arrow />
              </Link>
            </article>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

export default React.memo(Pricing);
