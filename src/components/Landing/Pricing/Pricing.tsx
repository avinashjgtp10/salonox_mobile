import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../services/api/axios';
import { SALON_PLANS } from '../../../services/api/endpoints';
import { PLAN_PERIOD, PLANS } from '../../../marketing/seo.config';
import {
  Icon,
  Reveal,
  SectionArtwork,
  SectionTransition,
} from '../shared';

interface PurchasePlan {
  name: string;
  price: string;
  description: string;
  cta: string;
  badge: string;
  featured: boolean;
  premium: boolean;
  features: string[];
}

// Fallback — shown if the live catalog fails to load (landing page has no auth
// session to retry with, unlike the dashboard), so a backend hiccup never means
// the pricing section renders blank. It is also what the prerendered page and
// crawlers see. Names/prices/descriptions come from PLANS in
// src/marketing/seo.config.ts (the same list feeds the JSON-LD offers, which
// must match this section); keep that list in sync with the live plans. Drifts
// are cosmetic only — this never determines what a real purchase charges (see
// GET /salon-plans/definitions, the live source of truth fetched on mount).
const FALLBACK_FEATURES: Record<(typeof PLANS)[number]['tier'], string[]> = {
  basic: [
    'Mobile App',
    'Dashboard',
    'Quick Sale',
    'Calendar',
    'Services',
    'Products',
    'Limited Reports',
  ],
  advance: [
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
  pro: [
    'Mobile App',
    'Everything in Advance Plan',
    'Web Building',
    'Google SEO',
    'Meta Marketing',
    'Multi-Branch Handling',
    'Advanced Reports',
    'Consultation',
  ],
};

const FALLBACK_PLANS: PurchasePlan[] = PLANS.map((plan) => ({
  name: plan.name,
  price: `₹${plan.price.toLocaleString('en-IN')}`,
  description: plan.description,
  cta: `Buy ${plan.name}`,
  badge: '',
  featured: plan.tier === 'advance',
  premium: plan.tier === 'pro',
  features: FALLBACK_FEATURES[plan.tier],
}));

const TIER_ORDER = ['basic', 'advance', 'pro'];

interface CatalogEntry {
  tier: 'basic' | 'advance' | 'pro'; // 'pro' tier id, displayed as "Growth"
  name: string;
  tagline: string | null;
  price: string;
  features: string[];
}

function toPurchasePlans(catalog: CatalogEntry[]): PurchasePlan[] {
  const sorted = [...catalog].sort(
    (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier)
  );
  return sorted.map((plan) => ({
    name: plan.name,
    price: `₹${Math.round(parseFloat(plan.price)).toLocaleString('en-IN')}`,
    description: plan.tagline ?? '',
    cta: `Buy ${plan.name}`,
    badge: '',
    featured: plan.tier === 'advance',
    premium: plan.tier === 'pro',
    features: plan.features,
  }));
}

const Pricing: React.FC = () => {
  // Live catalog from Super Admin → Plans & Subscriptions → Pricing Plans
  // (GET /salon-plans/definitions, public — see that route's own comment)
  // — falls back to FALLBACK_PLANS above if the fetch fails, so a backend
  // hiccup never blanks out pricing for a visitor still deciding to sign up.
  const [plans, setPlans] = useState<PurchasePlan[]>(FALLBACK_PLANS);

  useEffect(() => {
    let cancelled = false;
    api.get(SALON_PLANS.DEFINITIONS)
      .then((res) => {
        if (cancelled) return;
        const catalog: CatalogEntry[] = res.data?.data ?? [];
        if (catalog.length > 0) setPlans(toPurchasePlans(catalog));
      })
      .catch(() => {
        // Keep FALLBACK_PLANS — already the initial state, nothing to do.
      });
    return () => { cancelled = true; };
  }, []);

  return (
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
        {plans.map((plan, index) => (
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
                <div className="purchase-plan-price">{plan.price}<span className="purchase-plan-period">{PLAN_PERIOD.label}</span></div>
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
};

export default React.memo(Pricing);
