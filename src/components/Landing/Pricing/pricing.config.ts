export const BILLING_PERIODS = {
  monthly: { label: 'Monthly', months: 1, billed: 'Billed monthly', charge: 'billed every month' },
  quarterly: { label: 'Quarterly', months: 3, billed: 'Billed quarterly', charge: 'billed every 3 months' },
  yearly: { label: 'Yearly', months: 12, billed: 'Billed yearly', charge: 'billed annually' },
} as const;

export type BillingPeriod = keyof typeof BILLING_PERIODS;

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  cta: string;
  badge: string;
  featured: boolean;
  premium: boolean;
  // Total before GST in INR for each period. Null means pricing is not yet published.
  // Edit only these totals; monthly equivalents and savings are derived below.
  prices: Record<BillingPeriod, number | null>;
  features: readonly string[];
}

export const GST_RATE = 0.18;
export const BILLING_NOTE = `Prices exclude ${GST_RATE * 100}% GST`;

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2,
});

export const formatPrice = (amount: number) => currency.format(amount);

export function getPlanPricing(plan: PricingPlan, period: BillingPeriod) {
  const billingAmount = plan.prices[period];
  if (billingAmount === null || !Number.isFinite(billingAmount) || billingAmount < 0) return null;

  const months = BILLING_PERIODS[period].months;
  const monthly = plan.prices.monthly;
  const baseline = monthly !== null && Number.isFinite(monthly) ? monthly * months : 0;
  const savingsAmount = period !== 'monthly' && baseline > 0
    ? Math.max(0, baseline - billingAmount)
    : 0;
  // Round down so a badge never overstates the discount.
  const savingsPercent = savingsAmount > 0
    ? Math.floor((savingsAmount * 1000) / baseline) / 10
    : 0;
  const gstAmount = Math.round(billingAmount * GST_RATE * 100) / 100;
  const totalWithGst = Math.round((billingAmount + gstAmount) * 100) / 100;

  return { billingAmount, monthlyEquivalent: billingAmount / months, savingsPercent, savingsAmount,
    monthlyComparison: baseline > 0 ? baseline : null, gstAmount, totalWithGst };
}

export const PRICING_PLANS: readonly PricingPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    prices: { monthly: 799, quarterly: 2399, yearly: 9499 },
    description: 'Essential salon management for businesses getting started.',
    cta: 'Start with Basic',
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
    id: 'advance',
    name: 'Advance',
    prices: { monthly: 1199, quarterly: 3599, yearly: 14199 },
    description: 'Complete salon management for businesses that need more operational control.',
    cta: 'Start with Advance',
    badge: 'Most Popular',
    featured: true,
    premium: false,
    features: [
      'Everything in Basic',
      'Full Dashboard access',
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
    id: 'growth',
    name: 'Growth',
    prices: { monthly: 1999, quarterly: 5899, yearly: 23599 },
    description: 'Advanced growth tools for businesses focused on marketing and multiple branches.',
    cta: 'Start with Growth',
    badge: 'Premium',
    featured: false,
    premium: true,
    features: [
      'Everything in Advance',
      'Web Building',
      'Google SEO',
      'Meta Marketing',
      'Multi-Branch Handling',
      'Advanced Reports',
      'Consultation',
    ],
  },
] as const;

