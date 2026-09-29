import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Icon,
  SectionTransition,
} from '../shared';
import { BILLING_NOTE, BILLING_PERIODS, PRICING_PLANS, formatPrice, getPlanPricing } from './pricing.config';
import type { BillingPeriod } from './pricing.config';

const Pricing: React.FC = () => {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const billing = BILLING_PERIODS[billingPeriod];

  return (
    <section id="pricing" className="pricing" aria-labelledby="pricing-heading">
      <SectionTransition from="dark" />
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Pricing</span>
          <h2 id="pricing-heading">Pricing that grows with your salon</h2>
          <p>Choose the plan that fits your salon today and upgrade as your business grows.</p>
        </div>
        <fieldset className="pricing-billing-selector">
          <legend>Choose your billing period</legend>
          <div className="pricing-billing-options">
            {(Object.keys(BILLING_PERIODS) as BillingPeriod[]).map((period) => (
              <label key={period} className="pricing-billing-option">
                <input
                  type="radio"
                  name="salonox-billing-period"
                  value={period}
                  checked={billingPeriod === period}
                  onChange={() => setBillingPeriod(period)}
                  aria-controls="pricing-plans"
                />
                <span>{BILLING_PERIODS[period].label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {BILLING_NOTE && <p className="pricing-billing-note">{BILLING_NOTE}</p>}

        <div id="pricing-plans" className="pricing-grid">
          {PRICING_PLANS.map((plan) => {
            const price = getPlanPricing(plan, billingPeriod);
            return (
              <article
                key={plan.id}
                className={[
                  'purchase-plan-card',
                  plan.featured ? 'purchase-plan-card--recommended' : '',
                  plan.premium ? 'purchase-plan-card--premium' : '',
                ].filter(Boolean).join(' ')}
                aria-labelledby={`purchase-plan-${plan.name.toLowerCase()}`}
              >
                <div className="purchase-plan-header">
                  <div className="purchase-plan-title">
                    <h3 id={`purchase-plan-${plan.name.toLowerCase()}`}>{plan.name}</h3>
                    {plan.badge && <span className="purchase-plan-badge">{plan.badge}</span>}
                  </div>
                  <p>{plan.description}</p>
                </div>
                <div
                  className={`purchase-plan-billing${billingPeriod !== 'monthly' ? ' purchase-plan-billing--comparison' : ''}`}
                  role="status"
                  aria-label={`${plan.name} pricing`}
                  aria-atomic="true"
                >
                  {price ? (
                    <div key={billingPeriod} className="purchase-plan-billing-content">
                      <div className="purchase-plan-price">
                        {formatPrice(price.monthlyEquivalent)}<span> / month</span>
                      </div>
                      <p className="purchase-plan-billing-frequency">{billing.billed}</p>
                      {billingPeriod !== 'monthly' && price.monthlyComparison !== null && (
                        <p className="purchase-plan-comparison">
                          Paying monthly for {billing.months} months: {formatPrice(price.monthlyComparison)} + GST
                        </p>
                      )}
                      {price.savingsAmount > 0 && (
                        <span className="purchase-plan-savings">
                          Save {formatPrice(price.savingsAmount)}
                          {price.savingsPercent > 0 ? ` (${price.savingsPercent}%)` : ''} before GST
                        </span>
                      )}
                    </div>
                  ) : (
                    <div key={billingPeriod} className="purchase-plan-billing-content">
                      <p className="purchase-plan-price-pending">Pricing coming soon</p>
                      <p className="purchase-plan-billing-frequency">{billing.label} pricing for {plan.name} is not yet published.</p>
                    </div>
                  )}
                </div>
                <Link to="/register" className="btn btn-block purchase-plan-cta">
                  {plan.cta} <span aria-hidden="true"><Icon.Arrow /></span>
                </Link>

                <ul className="purchase-plan-features">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className={feature.startsWith('Everything in') ? 'purchase-plan-inherited' : undefined}
                    >
                      <span className="purchase-plan-check" aria-hidden="true"><Icon.Check /></span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default React.memo(Pricing);
