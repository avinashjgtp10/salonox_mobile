export type Currency = 'INR' | 'USD' | 'EUR'

export interface Plan {
  id: string
  name: string
  price: { INR: number; USD: number; EUR: number }
  period: string
  desc: string
  features: string[]
  cta: string
  highlighted: boolean
  trial: string
}

export const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: { INR: 899, USD: 10, EUR: 9 },
    period: 'per month',
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
  },
  {
    id: 'grow',
    name: 'Grow',
    price: { INR: 1499, USD: 18, EUR: 16 },
    period: 'per month',
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
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    price: { INR: 2499, USD: 29, EUR: 27 },
    period: 'per month',
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
  },
  {
    id: 'elite',
    name: 'Elite',
    price: { INR: 5499, USD: 65, EUR: 60 },
    period: 'per month',
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
  },
]

export const currencySymbol: Record<Currency, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
}