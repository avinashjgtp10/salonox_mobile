import { buildCanonical } from '../components/SEO'

export const coreKeywords = [
  'salon management software',
  'salon billing software',
  'salon appointment software',
  'salon POS software',
  'salon CRM software',
  'salon software india',
]

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'SalonOx',
  url: 'https://www.salonox.com',
  logo: 'https://www.salonox.com/logo.png',
  sameAs: ['https://www.salonox.com'],
}

export const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'SalonOx',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, Android, iOS',
  url: 'https://www.salonox.com',
  description: 'SalonOx is salon management software for billing, appointments, staff, reports, client CRM and WhatsApp marketing.',
  offers: {
    '@type': 'Offer',
    price: '899',
    priceCurrency: 'INR',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '500',
  },
}

export const homepageFaqs = [
  {
    question: 'What is SalonOx?',
    answer: 'SalonOx is salon management software for appointments, billing, staff scheduling, reports, client CRM and WhatsApp marketing.',
  },
  {
    question: 'Does SalonOx support GST billing for salons in India?',
    answer: 'Yes. SalonOx supports GST-ready invoices, line items, discounts and payment tracking for Indian salons and beauty businesses.',
  },
  {
    question: 'Can I manage WhatsApp marketing from SalonOx?',
    answer: 'Yes. SalonOx includes bulk WhatsApp marketing, reminders and campaign tracking to help salons re-engage clients.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes. Salons can start with a 14-day free trial without a credit card.',
  },
]

export function faqSchema(faqs = homepageFaqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

export const seoLandingPages = [
  {
    slug: 'salon-billing-software',
    title: 'Salon Billing Software India | GST Invoices & POS | SalonOx',
    description: 'Salon billing software for GST invoices, POS checkout, discounts, UPI, card, cash and daily sales reports. Start your SalonOx free trial.',
    h1: 'Salon billing software built for fast, accurate checkout',
    eyebrow: 'Salon Billing Software',
    intro: 'Create professional GST-ready invoices, collect payments and track revenue without spreadsheets or manual bill books.',
    keyword: 'salon billing software',
    image: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=900&q=75&auto=format&fit=crop',
    bullets: ['GST-ready invoices and itemised receipts', 'UPI, card, cash and split payment tracking', 'Daily sales, discounts and due amount reporting', 'Client purchase history connected to every bill'],
    faqs: [
      { question: 'Can SalonOx create GST invoices?', answer: 'Yes. SalonOx supports GST-ready billing with tax details, discounts and itemised receipts.' },
      { question: 'Does SalonOx track cash, UPI and card payments?', answer: 'Yes. You can record UPI, card, cash and split payments at checkout.' },
    ],
  },
  {
    slug: 'salon-appointment-software',
    title: 'Salon Appointment Software | Online Booking & Scheduler | SalonOx',
    description: 'Salon appointment software for online booking, staff calendars, reminders, walk-ins and rescheduling. Manage every booking in SalonOx.',
    h1: 'Salon appointment software that keeps every chair booked',
    eyebrow: 'Salon Appointment Software',
    intro: 'Manage walk-ins, online bookings, staff availability and reminders from a clean calendar built for salons.',
    keyword: 'salon appointment software',
    image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=900&q=75&auto=format&fit=crop',
    bullets: ['Day, week and staff calendar views', 'Online booking page for 24/7 appointments', 'WhatsApp reminders to reduce no-shows', 'Drag-and-drop rescheduling for busy front desks'],
    faqs: [
      { question: 'Can clients book appointments online?', answer: 'Yes. SalonOx gives your salon an online booking page that works 24/7.' },
      { question: 'Can I manage staff availability?', answer: 'Yes. Staff schedules, services and availability are connected to the booking calendar.' },
    ],
  },
  {
    slug: 'salon-whatsapp-marketing',
    title: 'Salon WhatsApp Marketing Software | Bulk Campaigns | SalonOx',
    description: 'Run salon WhatsApp marketing campaigns, reminders and reactivation messages from SalonOx. Reach clients with targeted bulk WhatsApp campaigns.',
    h1: 'Salon WhatsApp marketing that brings clients back',
    eyebrow: 'Bulk WhatsApp Marketing',
    intro: 'Create targeted WhatsApp campaigns for offers, reminders, lapsed clients and loyalty updates from the same platform that runs your salon.',
    keyword: 'salon whatsapp marketing',
    image: 'https://plus.unsplash.com/premium_photo-1684761949804-fd8eb9a5b6cc?w=900&q=75&auto=format&fit=crop',
    bullets: ['Bulk WhatsApp campaigns by client segment', 'Automated appointment reminders and follow-ups', 'AI-assisted campaign copy and audience suggestions', 'Delivery, reply and revenue tracking'],
    faqs: [
      { question: 'Can I send bulk WhatsApp messages?', answer: 'Yes. SalonOx supports targeted WhatsApp campaigns for salon clients.' },
      { question: 'Can WhatsApp reminders reduce no-shows?', answer: 'Yes. Automated reminders help clients confirm, cancel or reschedule before their visit.' },
    ],
  },
  {
    slug: 'salon-staff-management',
    title: 'Salon Staff Management Software | Shifts, Payroll & Reports',
    description: 'Manage salon staff shifts, services, commissions, payroll and performance reports with SalonOx staff management software.',
    h1: 'Salon staff management software for better team control',
    eyebrow: 'Salon Staff Management',
    intro: 'Plan shifts, assign services, track performance and manage staff payouts from one connected workspace.',
    keyword: 'salon staff management software',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&q=75&auto=format&fit=crop',
    bullets: ['Repeating shifts and time-off management', 'Service assignment by staff skill', 'Revenue and utilisation reports by team member', 'Payroll, wages and commission tracking'],
    faqs: [
      { question: 'Can I track staff performance?', answer: 'Yes. SalonOx shows bookings, sales and utilisation by staff member.' },
      { question: 'Does SalonOx support commissions?', answer: 'Yes. You can manage wages, commissions and payroll summaries.' },
    ],
  },
  {
    slug: 'salon-pos-software',
    title: 'Salon POS Software India | Billing, Inventory & Payments',
    description: 'Salon POS software for checkout, inventory, services, products, memberships, GST billing and payments. Try SalonOx free.',
    h1: 'Salon POS software for checkout, products and payments',
    eyebrow: 'Salon POS Software',
    intro: 'Run front-desk checkout, sell products, bill services, track inventory and understand daily sales from one salon POS system.',
    keyword: 'salon POS software',
    image: 'https://images.unsplash.com/photo-1642060735155-234ded24d86e?w=900&q=75&auto=format&fit=crop',
    bullets: ['Fast checkout for services, products and memberships', 'Inventory and stock movement visibility', 'UPI, card and cash payment recording', 'Reports for daily sales and top-performing services'],
    faqs: [
      { question: 'Is SalonOx a salon POS system?', answer: 'Yes. SalonOx includes salon POS features for checkout, payments, products and reports.' },
      { question: 'Can I sell retail products?', answer: 'Yes. You can manage products, inventory and sales from SalonOx.' },
    ],
  },
]

export const blogPosts = [
  {
    slug: 'best-salon-management-software-india',
    title: 'Best Salon Management Software in India: What to Look For',
    description: 'A practical guide to choosing salon management software in India for billing, appointments, staff, CRM and WhatsApp marketing.',
    date: '2026-05-26',
    readTime: '6 min read',
  },
  {
    slug: 'salon-billing-software-gst-checklist',
    title: 'Salon Billing Software GST Checklist for Indian Salons',
    description: 'Use this checklist to evaluate salon billing software for GST invoices, POS payments and daily revenue tracking.',
    date: '2026-05-26',
    readTime: '5 min read',
  },
  {
    slug: 'reduce-salon-no-shows-whatsapp-reminders',
    title: 'How WhatsApp Reminders Reduce Salon No-Shows',
    description: 'Learn how appointment reminders, confirmations and rebooking messages improve salon attendance and repeat visits.',
    date: '2026-05-26',
    readTime: '4 min read',
  },
]

export function articleSchema(post: (typeof blogPosts)[number]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: organizationSchema,
    publisher: organizationSchema,
    mainEntityOfPage: buildCanonical(`/blog/${post.slug}`),
  }
}

