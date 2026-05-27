export type Currency = 'INR' | 'USD' | 'EUR'
export type BillingCycle = 'quarterly' | 'annual'

export interface Plan {
  id: string
  name: string
  priceQuarterly: { INR: number; USD: number; EUR: number }
  priceAnnual:    { INR: number; USD: number; EUR: number }
  monthlyEquiv:   { INR: number; USD: number; EUR: number }
  monthlyEquivAnnual: { INR: number; USD: number; EUR: number }
  desc: string
  features: string[]
  cta: string
  highlighted: boolean
  trial: string
  newUserOffer: boolean
}

export const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceQuarterly:     { INR: 2997,  USD: 33,  EUR: 30  },
    priceAnnual:        { INR: 10788, USD: 119, EUR: 109 },
    monthlyEquiv:       { INR: 999,   USD: 11,  EUR: 10  },
    monthlyEquivAnnual: { INR: 899,   USD: 10,  EUR: 9   },
    desc: 'Perfect for solo professionals just getting started.',
    features: [
      'Up to 2 staff members',
      '100 appointments/month',
      'Basic calendar & scheduling',
      'Client management',
      'UPI / Cash / Card payments',
      'WhatsApp reminders (50/mo)',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
    trial: '14-day free trial',
    newUserOffer: true,
  },
  {
    id: 'grow',
    name: 'Grow',
    priceQuarterly:     { INR: 4497,  USD: 54,  EUR: 48  },
    priceAnnual:        { INR: 16188, USD: 194, EUR: 174 },
    monthlyEquiv:       { INR: 1499,  USD: 18,  EUR: 16  },
    monthlyEquivAnnual: { INR: 1349,  USD: 16,  EUR: 14  },
    desc: 'For growing teams ready to automate and scale.',
    features: [
      'Up to 5 staff members',
      'Unlimited appointments',
      'Online booking page',
      'Loyalty program',
      'WhatsApp reminders (200/mo)',
      'Reports & analytics',
      'GST billing',
      'Inventory management',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
    trial: '14-day free trial',
    newUserOffer: true,
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    priceQuarterly:     { INR: 7497,  USD: 87,  EUR: 81  },
    priceAnnual:        { INR: 26988, USD: 314, EUR: 290 },
    monthlyEquiv:       { INR: 2499,  USD: 29,  EUR: 27  },
    monthlyEquivAnnual: { INR: 2249,  USD: 26,  EUR: 24  },
    desc: 'Full power — AI, marketing, and advanced tools.',
    features: [
      'Unlimited staff',
      'Everything in Grow',
      'WhatsApp Marketing (500/mo)',
      'SalonBot AI assistant',
      'Loyalty tiers (Silver/Gold/Platinum)',
      'Reserve with Google',
      'eWallet',
      'Roles & permissions',
      'Payroll & commissions',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
    trial: '14-day free trial',
    newUserOffer: true,
  },
  {
    id: 'elite',
    name: 'Elite',
    priceQuarterly:     { INR: 16497, USD: 195, EUR: 180 },
    priceAnnual:        { INR: 59388, USD: 702, EUR: 648 },
    monthlyEquiv:       { INR: 5499,  USD: 65,  EUR: 60  },
    monthlyEquivAnnual: { INR: 4949,  USD: 58,  EUR: 54  },
    desc: 'For chains, franchises, and enterprise businesses.',
    features: [
      'Everything in Ultimate',
      'Multi-location management',
      'Unlimited WhatsApp campaigns',
      'Dedicated account manager',
      'Custom integrations',
      'Priority support (1hr SLA)',
      'Data export & API access',
      'Team training included',
    ],
    cta: 'Contact Sales',
    highlighted: false,
    trial: '14-day free trial',
    newUserOffer: true,
  },
]

export const currencySymbol: Record<Currency, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
}

export function getPlanPrice(plan: Plan, currency: Currency, cycle: BillingCycle): number {
  if (cycle === 'annual') return plan.priceAnnual[currency]
  return plan.priceQuarterly[currency]
}

export function getCycleLabel(cycle: BillingCycle): string {
  if (cycle === 'annual') return 'per year'
  return 'per quarter'
}

export function getMonthlyEquiv(plan: Plan, currency: Currency, cycle: BillingCycle): number {
  if (cycle === 'annual') return plan.monthlyEquivAnnual[currency]
  return plan.monthlyEquiv[currency]
}