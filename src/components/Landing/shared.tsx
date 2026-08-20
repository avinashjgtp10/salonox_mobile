import React, { useEffect, useRef, useState, useCallback, useMemo, useId } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { getCountryCallingCode, type Country } from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';

/* ---------------------------------- Icon set (inline SVG, zero deps) ---------------------------------- */

export const Icon = {
  Calendar: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  Users: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Card: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2.5" />
      <path d="M2 10h20" />
    </svg>
  ),
  Megaphone: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11v3a1 1 0 0 0 1 1h2l3.5 4.5V5.5L6 10H4a1 1 0 0 0-1 1Z" />
      <path d="M14 7a5 5 0 0 1 0 10M18 4a9 9 0 0 1 0 16" />
    </svg>
  ),
  Bar: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21V9M9 21V3M15 21v-7M21 21v-4" />
    </svg>
  ),
  Bell: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  ),
  Globe: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z" />
    </svg>
  ),
  Layers: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  ),
  Phone: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <path d="M11 18h2" />
    </svg>
  ),
  Spark: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </svg>
  ),
  Arrow: () => (
    <svg className="icon-arrow" viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  Play: () => (
    <svg viewBox="0 0 24 24"><path d="M5 3l16 9-16 9V3Z" /></svg>
  ),
  Star: () => (
    <svg viewBox="0 0 24 24"><path d="M12 2l3.1 6.7 7.4.7-5.6 5 1.7 7.3L12 17.9 5.4 21.7l1.7-7.3-5.6-5 7.4-.7L12 2Z" /></svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  Chevron: () => (
    <svg className="chev" viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  Twitter: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 3a10.9 10.9 0 0 1-3.1.9 5.4 5.4 0 0 0 2.4-3 10.8 10.8 0 0 1-3.4 1.3 5.4 5.4 0 0 0-9.2 4.9A15.3 15.3 0 0 1 1.6 1.6a5.4 5.4 0 0 0 1.7 7.2A5.3 5.3 0 0 1 .9 8v.1a5.4 5.4 0 0 0 4.3 5.3 5.4 5.4 0 0 1-2.4.1 5.4 5.4 0 0 0 5 3.8A10.9 10.9 0 0 1 0 19.5a15.3 15.3 0 0 0 8.3 2.4c10 0 15.4-8.3 15.4-15.4v-.7A11 11 0 0 0 23 3Z" />
    </svg>
  ),
  Instagram: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <path d="M17.5 6.5h.01" />
    </svg>
  ),
  Linkedin: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="3" />
      <path d="M7 10v7M7 7v.01M12 17v-4.5a2.5 2.5 0 0 1 5 0V17M12 11v6" />
    </svg>
  ),
  Facebook: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9h3V5h-3a4 4 0 0 0-4 4v2H7v4h3v7h4v-7h3l1-4h-4V9a1 1 0 0 1 1-1Z" />
    </svg>
  ),
  WhatsApp: () => (
    <FaWhatsapp className="icon-whatsapp" aria-hidden="true" focusable="false" />
  ),
  Sync: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 1-15.5 6.5L3 16M3 12a9 9 0 0 1 15.5-6.5L21 8" />
      <path d="M3 16v4h4M21 8V4h-4" />
    </svg>
  ),
  Report: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2h6l4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
      <path d="M9 9h2M9 13h6M9 17h6" />
    </svg>
  ),
  Mail: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2.5" />
      <path d="m3 6 8.5 7a1 1 0 0 0 1 0L21 6" />
    </svg>
  ),
  Location: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
  Building: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M3 7l9-4 9 4M4 21V7M20 21V7" />
      <path d="M9 21v-4h6v4M9 11h1m4 0h1M9 15h1m4 0h1" />
    </svg>
  ),
  Cloud: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </svg>
  ),
  Receipt: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M8 10h8M8 14h5" />
    </svg>
  ),
  MessageCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  TrendingUp: () => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 7 13.5 15.5 8.5 10.5 2 17" />
      <path d="M16 7h6v6" />
    </svg>
  ),
};

/* ---------------------------------- Static content ---------------------------------- */

export type Feature = { icon: keyof typeof Icon; title: string; desc: string };
export type WhyFeature = Feature & {
  tag?: string;
  modalTitle: string;
  modalDesc: string;
  benefits: string[];
  metric: string;
  metricLabel: string;
};
export type DemoForm = { name: string; email: string; phone: string; salon: string; city: string; locations: string; agreed: boolean };
export const DEMO_PHONE_DEFAULT_COUNTRY: Country = 'IN';
// Allows international letters/marks (accents, Devanagari, Arabic, etc.), spaces,
// hyphens, apostrophes, and periods — covers city names like "Mumbai", "Saint-Étienne", "St. Louis".
export const CITY_NAME_REGEX = /^[\p{L}\p{M}][\p{L}\p{M}\s'.-]*$/u;
// Deliberately permissive (no TLD length/character-class enforcement) — catches missing
// "@", missing domain, and stray whitespace without rejecting valid-but-unusual addresses.
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const countryDisplayNames = typeof Intl.DisplayNames === 'function'
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null;
export const countryName = (country: Country) => countryDisplayNames?.of(country) || country;

export const FEATURES: Feature[] = [
  { icon: 'Calendar', title: 'Effortless scheduling', desc: 'Manage every chair, room, and stylist from one drag-and-drop calendar built for busy floors.' },
  { icon: 'Card', title: 'Integrated payments', desc: 'Take deposits, tips, and checkout in seconds with built-in point of sale.' },
  { icon: 'Users', title: 'Client intelligence', desc: 'See visit history, preferences, and spend the moment a client walks in.' },
  { icon: 'Bar', title: 'Powerful reports', desc: 'Track performance, revenue, and staff productivity with real-time insights.' },
  { icon: 'Layers', title: 'Inventory management', desc: 'Track stock, get low-stock alerts, and never run out of what you need.' },
  { icon: 'Shield', title: 'Secure & dependable', desc: 'Your data is protected with enterprise-grade security and 24×7 support.' },
];

export const WHY_SALONOX: { icon: keyof typeof Icon; title: string; desc: string; tag?: string }[] = [
  { icon: 'Building', title: 'Multi-Branch Ready', desc: 'Manage unlimited branches from a single dashboard. Each branch gets its own staff, schedule, and reports — all under one roof.', tag: 'Enterprise' },
  { icon: 'Cloud', title: 'Cloud Based', desc: 'Access your salon data from anywhere, on any device. No installations, no downtime — always up-to-date and always available.', tag: 'SaaS' },
  { icon: 'Receipt', title: 'GST Billing', desc: 'Generate GST-compliant invoices automatically. Handle taxes, discounts, and split payments with zero manual effort.', tag: 'India Ready' },
  { icon: 'MessageCircle', title: 'WhatsApp Marketing', desc: 'Send appointment reminders, promotional offers, and feedback requests directly on WhatsApp for maximum open rates.', tag: 'Marketing' },
  { icon: 'TrendingUp', title: 'Real-Time Analytics', desc: 'Track revenue, bookings, staff performance, and client retention live. Make data-driven decisions with instant insights.', tag: 'Analytics' },
  { icon: 'Shield', title: 'Secure & Scalable', desc: 'Bank-grade encryption, role-based access controls, and automatic backups keep your business data safe as you grow.', tag: 'Security' },
];

void WHY_SALONOX;

export const WHY_FEATURE_DETAILS: WhyFeature[] = [
  {
    icon: 'Building',
    title: 'Multi-Branch Ready',
    desc: 'Manage unlimited branches from a single dashboard. Each branch gets its own staff, schedule, and reports under one roof.',
    tag: 'Enterprise',
    modalTitle: 'Run every branch without switching systems',
    modalDesc: 'SalonOX gives owners and area managers one command center for all locations while keeping branch operations cleanly separated.',
    metric: '12+',
    metricLabel: 'branches managed from one login',
    benefits: [
      'Separate calendars, staff, services, and pricing per branch',
      'Company-wide reporting with branch-level drilldowns',
      'Centralized roles for owners, managers, and front desk staff',
      'Fast branch switching without logging out',
      'Consistent client experience across every location',
    ],
  },
  {
    icon: 'Cloud',
    title: 'Cloud Based',
    desc: 'Access your salon data from anywhere, on any device. No installations, no downtime, always up-to-date and available.',
    tag: 'SaaS',
    modalTitle: 'Your salon data, live on every device',
    modalDesc: 'Work from reception, home, or between branches with a secure cloud workspace that stays synced automatically.',
    metric: '24/7',
    metricLabel: 'access from browser, tablet, or phone',
    benefits: [
      'No local installs or manual updates',
      'Real-time syncing across all staff devices',
      'Secure access from anywhere with an internet connection',
      'Automatic backups reduce operational risk',
      'Built for fast onboarding and low maintenance',
    ],
  },
  {
    icon: 'Receipt',
    title: 'GST Billing',
    desc: 'Generate GST-compliant invoices automatically. Handle taxes, discounts, and split payments with zero manual effort.',
    tag: 'India Ready',
    modalTitle: 'GST-ready billing built for salon checkout',
    modalDesc: 'Create compliant invoices, apply taxes and discounts, and complete checkout without spreadsheets or manual calculations.',
    metric: '0',
    metricLabel: 'manual tax calculations at checkout',
    benefits: [
      'GST-compliant invoice generation',
      'Discounts, taxes, tips, and split payments in one flow',
      'Printable and shareable receipts for clients',
      'Daily sales visibility for owners and accountants',
      'Cleaner checkout experience for walk-ins and appointments',
    ],
  },
  {
    icon: 'MessageCircle',
    title: 'WhatsApp Marketing',
    desc: 'Send appointment reminders, promotional offers, and feedback requests directly on WhatsApp for maximum open rates.',
    tag: 'Marketing',
    modalTitle: 'Turn WhatsApp into a salon growth channel',
    modalDesc: 'Reach clients where they already respond with reminders, offers, win-back campaigns, and feedback requests.',
    metric: '3x',
    metricLabel: 'higher engagement than generic email blasts',
    benefits: [
      'Automated appointment reminders and confirmations',
      'Promotional campaigns for slow days and seasonal offers',
      'Client feedback requests after visits',
      'Win-back messages for inactive clients',
      'Campaign history tied to client profiles',
    ],
  },
  {
    icon: 'TrendingUp',
    title: 'Real-Time Analytics',
    desc: 'Track revenue, bookings, staff performance, and client retention live. Make data-driven decisions with instant insights.',
    tag: 'Analytics',
    modalTitle: 'Know what is happening before the day ends',
    modalDesc: 'SalonOX analytics surface live revenue, appointments, utilization, and retention insights so owners can act quickly.',
    metric: 'Live',
    metricLabel: 'revenue, bookings, and staff performance',
    benefits: [
      'Live dashboards for daily revenue and bookings',
      'Staff performance and utilization tracking',
      'Client retention and repeat-visit insights',
      'Branch comparisons for growing salon groups',
      'Export-ready reports for weekly reviews',
    ],
  },
  {
    icon: 'Shield',
    title: 'Secure & Scalable',
    desc: 'Bank-grade encryption, role-based access controls, and automatic backups keep your business data safe as you grow.',
    tag: 'Security',
    modalTitle: 'Security that scales with your salon brand',
    modalDesc: 'Protect client records, staff access, payments, and business reporting with controls designed for growing staff.',
    metric: 'RBAC',
    metricLabel: 'role-based controls for every staff member',
    benefits: [
      'Role-based permissions for owners, managers, and staff',
      'Encrypted data handling for sensitive client records',
      'Automatic backups and recovery-minded operations',
      'Scales from single location to salon groups',
      'Access controls that keep staff focused and accountable',
    ],
  },
];

export const MULTI_BRANCH_FEATURES: Feature[] = [
  { icon: 'Layers', title: 'Centralized Management', desc: 'Control schedules, services, and pricing for every branch from one unified dashboard — no more juggling logins.' },
  { icon: 'Bar', title: 'Branch Analytics', desc: 'Compare revenue, bookings, and utilization across locations with real-time, side-by-side reporting.' },
  { icon: 'Users', title: 'Staff Control', desc: 'Assign, schedule, and track staff per branch while keeping permissions and payroll centrally governed.' },
  { icon: 'Sync', title: 'Inventory Sync', desc: 'Keep retail stock and product levels synced across every branch, with automatic low-stock alerts.' },
  { icon: 'Report', title: 'Consolidated Reporting', desc: 'Generate branch-level or company-wide reports in one click, ready to export and share.' },
  { icon: 'Shield', title: 'Role-Based Access', desc: 'Granular permissions ensure managers, staff, and admins only see and touch what they need to.' },
];

export const SHOWCASE = [
  {
    icon: 'Bar' as keyof typeof Icon,
    title: 'Real-Time Dashboard',
    desc: 'Get a complete overview of your salon\'s performance at a glance — track total revenue, appointments, active clients, and daily earnings with live charts and actionable insights.',
    image: '/screenshots/dashboard.png',
  },
  {
    icon: 'Card' as keyof typeof Icon,
    title: 'Quick Sale & Billing',
    desc: 'Process walk-in and booked clients in seconds. Search clients, add services, products, memberships, apply discounts, and accept Cash, Card, UPI, or Gift Card — all from one screen.',
    image: '/screenshots/billing.png',
  },
  {
    icon: 'Report' as keyof typeof Icon,
    title: 'Reports & Analytics',
    desc: 'Dive deep into revenue trends, compare targets vs. actuals, and discover your top-performing services. Filter by date range and export reports instantly for smarter business decisions.',
    image: '/screenshots/reports.png',
  },
  {
    icon: 'Calendar' as keyof typeof Icon,
    title: 'Appointment Calendar',
    desc: 'See every stylist\'s schedule at a glance with a color-coded, drag-and-drop calendar. Manage walk-ins, block time, and switch between day, week, and staff views effortlessly.',
    image: '/screenshots/appointments.png',
  },
];

export const TESTIMONIALS = [
  { name: 'Emma Carter', role: 'Owner, Velvet Studio', quote: 'Bookings have never been smoother. Our no-show rate dropped by half within the first month.', initials: 'EC' },
  { name: 'Olivia Bennett', role: 'Founder, Bloom & Co.', quote: 'The reporting alone paid for the subscription. We finally know which services actually drive revenue.', initials: 'OB' },
  { name: 'Sophia Reed', role: 'Director, Lumière Salon', quote: 'Clients love the booking page and our front desk loves how little they have to manage manually.', initials: 'SR' },
  { name: 'Mia Brooks', role: 'Owner, The Glow Room', quote: 'The multi-branch dashboard is a game-changer. Managing three locations has become incredibly easy.', initials: 'MB' },
  { name: 'Isabella Hayes', role: 'Founder, Maison Hair', quote: 'Customer retention improved significantly thanks to the marketing automation features.', initials: 'IH' },
  { name: 'Chloe Foster', role: 'Owner, Studio Luxe', quote: 'SalonOX has made managing appointments, staff, and daily operations effortless. The booking experience is smooth, and our clients love how simple everything has become.', initials: 'CF' },
];

export const DEMO_EMAIL = 'support@salonox.com';
export const DEMO_SUBMIT_URL = `https://formsubmit.co/ajax/${DEMO_EMAIL}`;
export const WHATSAPP_DEMO_URL = 'https://wa.me/919503302647?text=Hi%20SalonOX%20Team,%20I%20am%20interested%20in%20SalonOX.%20Please%20share%20more%20details%20and%20schedule%20a%20demo.';
export const OFFICE_MAP_URL = 'https://www.google.com/maps/search/?api=1&query=123+MG+Road%2C+Koregaon+Park%2C+Pune%2C+Maharashtra+411001%2C+India';
export const OFFICE_MAP_EMBED_URL = 'https://www.google.com/maps?q=18.16244,74.5814658&z=16&output=embed&hl=en';
export const DEMO_VIDEO_EMBED_URL = 'https://www.youtube.com/embed/nbyWMKwCYtA?autoplay=1&rel=0';

export type TermsSection = {
  title: string;
  body: string;
  bullets?: string[];
  email?: string;
};

export const TERMS_SECTIONS: TermsSection[] = [
  {
    title: 'Acceptance of Terms',
    body: 'By creating an account, accessing, or using SalonOX, you agree to these Terms & Conditions. These terms apply to the SalonOX web application, related features, support services, and connected tools made available as part of the SalonOX platform. If you use SalonOX on behalf of a salon, spa, clinic, or other business, you confirm that you have authority to accept these terms for that business.',
  },
  {
    title: 'Definitions',
    body: '"SalonOX" means the cloud-based salon and spa management software, including modules for appointments, clients, staff, services, inventory, marketing, billing, reporting, and integrations. "Customer" means the business or person subscribing to SalonOX. "User" means any owner, manager, employee, contractor, or invited person who accesses the Customer account. "Customer Data" means information entered, uploaded, imported, generated, or stored in SalonOX by or for the Customer.',
  },
  {
    title: 'Eligibility',
    body: 'SalonOX is intended for lawful commercial use by salons, spas, wellness providers, and similar service businesses. You must be legally able to enter into a binding agreement and must provide accurate registration and billing information. SalonOX may refuse access where required to comply with law, security requirements, payment controls, or platform integrity standards.',
  },
  {
    title: 'User Accounts',
    body: 'Customers are responsible for all activity under their SalonOX account and for assigning appropriate access permissions to their Users. Account credentials must be kept confidential and may not be shared outside the authorized staff. You agree to promptly update account information and notify SalonOX if you suspect unauthorized access, credential misuse, or a security incident involving your account.',
  },
  {
    title: 'Subscription & Payments',
    body: 'SalonOX is offered on a subscription basis unless otherwise stated in a written order, invoice, or commercial agreement. Fees, billing cycles, plan limits, taxes, and included features are presented during purchase or renewal. You authorize SalonOX and its payment processors to charge applicable fees using the payment method provided. Late, failed, disputed, or incomplete payments may result in reminders, access limits, suspension, or termination.',
  },
  {
    title: 'Free Trial (if applicable)',
    body: 'SalonOX may offer a free trial or promotional access at its discretion. Trial availability, duration, included features, and conversion terms may vary by campaign, plan, or region. At the end of a trial, continued use may require an active paid subscription. SalonOX may modify, withdraw, or decline trial access where necessary to prevent misuse or ensure fair use of the platform.',
  },
  {
    title: 'License to Use the Software',
    body: 'Subject to these terms and payment of applicable fees, SalonOX grants the Customer a limited, non-exclusive, non-transferable, revocable license to access and use the software for internal salon or spa business operations. This license does not permit resale, sublicensing, copying, reverse engineering, source-code extraction, automated scraping, or use of SalonOX to build a competing product.',
  },
  {
    title: 'Acceptable Use Policy',
    body: 'You agree not to use SalonOX in a way that harms SalonOX, other customers, end clients, third-party providers, or the reliability and security of the platform.',
    bullets: [
      'Do not violate applicable laws, regulations, privacy obligations, or third-party rights.',
      'Do not send unlawful, misleading, abusive, unsolicited, or non-compliant communications.',
      'Do not upload malicious code, interfere with service operation, or test vulnerabilities without written permission.',
      'Do not bypass plan limits, payment requirements, authentication, or access controls.',
      'Do not store content that is illegal, discriminatory, defamatory, exploitative, or unrelated to legitimate business use.',
    ],
  },
  {
    title: 'User Responsibilities',
    body: 'Customers are responsible for configuring SalonOX accurately, including business details, services, pricing, taxes, staff schedules, cancellation rules, customer records, messages, and payment settings. Customers must obtain any consents required to collect client information, send reminders or marketing messages, process payments, and use third-party integrations. Users must verify business records, appointment details, bills, and reports before relying on them for operational, tax, accounting, or compliance purposes.',
  },
  {
    title: 'Data & Privacy',
    body: 'Customer Data remains the responsibility of the Customer. SalonOX uses Customer Data to provide, secure, support, maintain, and improve the software, process transactions, operate integrations, and comply with lawful obligations. SalonOX will handle personal information in accordance with reasonable security measures and applicable privacy requirements. Customers are responsible for the accuracy, legality, consent basis, retention needs, and permitted use of client and staff data entered into SalonOX.',
  },
  {
    title: 'Intellectual Property',
    body: 'SalonOX and its software, interface, design, workflows, code, databases, documentation, trademarks, logos, content, analytics models, and related materials are owned by SalonOX or its licensors. These terms do not transfer any ownership rights to Customers or Users. Customer Data remains owned by the Customer or its lawful owners, subject to the rights granted to SalonOX to operate and support the platform.',
  },
  {
    title: 'Third-Party Services',
    body: 'SalonOX may connect with third-party services such as WhatsApp, SMS providers, payment gateways, email providers, maps, analytics tools, cloud infrastructure, and other business applications. Third-party services are governed by their own terms, policies, fees, message limits, delivery rules, and availability. SalonOX is not responsible for failures, delays, data handling, policy enforcement, pricing changes, account restrictions, or service interruptions caused by third-party providers.',
  },
  {
    title: 'Service Availability',
    body: 'SalonOX aims to provide a reliable cloud service, but availability may be affected by maintenance, updates, internet connectivity, hosting providers, third-party systems, security events, force majeure events, or factors outside SalonOX control. SalonOX may perform scheduled or emergency maintenance and may temporarily limit features to protect security, performance, legal compliance, or platform stability.',
  },
  {
    title: 'Updates & Changes',
    body: 'SalonOX may improve, modify, add, or remove features, interfaces, workflows, plan inclusions, integrations, and technical requirements from time to time. Updates may be released automatically because SalonOX is a cloud-based SaaS product. SalonOX will try to avoid unnecessary disruption, but changes may be required for security, compliance, product quality, scalability, or business reasons.',
  },
  {
    title: 'Cancellation & Termination',
    body: 'Customers may cancel their subscription according to the cancellation options available in SalonOX or by contacting support. Cancellation may stop future renewals but does not automatically refund fees already charged. SalonOX may suspend or terminate access for non-payment, security risk, unlawful use, material breach of these terms, misuse of the platform, or activity that may harm SalonOX, other customers, end clients, or third-party providers.',
  },
  {
    title: 'Refund Policy',
    body: 'Unless required by applicable law or expressly stated in a written agreement, subscription fees, setup fees, usage charges, communication credits, payment processing charges, and renewal fees are non-refundable. If SalonOX approves a refund as a courtesy or exception, that approval does not create an obligation to provide similar refunds in the future. Any approved refund may exclude taxes, third-party charges, gateway fees, or consumed usage.',
  },
  {
    title: 'Limitation of Liability',
    body: 'To the maximum extent permitted by law, SalonOX will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, including loss of profits, revenue, goodwill, data, business opportunity, or customer relationships. SalonOX total liability for claims relating to the software or these terms will be limited to the subscription fees paid by the Customer for SalonOX during the three months immediately before the event giving rise to the claim.',
  },
  {
    title: 'Disclaimer of Warranties',
    body: 'SalonOX is provided on an "as is" and "as available" basis. SalonOX does not warrant that the software will be uninterrupted, error-free, fully secure, compatible with every device or browser, or suitable for every business requirement. SalonOX does not provide legal, tax, accounting, medical, employment, financial, or regulatory advice. Customers should independently review outputs, reports, automated reminders, invoices, and compliance decisions before acting on them.',
  },
  {
    title: 'Indemnification',
    body: 'You agree to defend, indemnify, and hold SalonOX, its officers, employees, contractors, affiliates, and service providers harmless from claims, losses, liabilities, damages, costs, and expenses arising from your use of SalonOX, Customer Data, breach of these terms, violation of law, misuse of third-party services, infringement of third-party rights, or communications sent through your account.',
  },
  {
    title: 'Governing Law (India)',
    body: 'These terms are governed by the laws of India, without regard to conflict-of-law principles. The parties agree to first attempt to resolve disputes in good faith through written communication. Subject to applicable law and any mandatory jurisdiction requirements, disputes relating to these terms or SalonOX may be brought before competent courts or forums in India.',
  },
  {
    title: 'Changes to these Terms',
    body: 'SalonOX may update these Terms & Conditions from time to time. When changes are material, SalonOX may provide notice through the platform, email, invoice notes, or another reasonable method. Continued access to or use of SalonOX after updated terms become effective means you accept the revised terms. If you do not agree to the revised terms, you should stop using SalonOX and cancel your subscription where applicable.',
  },
  {
    title: 'Contact Us',
    body: 'For questions about these Terms & Conditions or your SalonOX subscription, contact the SalonOX support team at',
    email: 'support@salonox@gmail.com',
  },
];

export const PROFESSIONAL_PLAN_FEATURES = [
  'Unlimited Appointments',
  'Calendar Management',
  'Staff Management',
  'Client Management',
  'Services Management',
  'Billing & Checkout',
  'Product & Inventory Management',
  'Expense Management',
  'Reports & Analytics',
  'Memberships & Packages',
  'Coupons & Discounts',
  'WhatsApp Notifications',
  'Online Booking',
  'Multi-Branch Support',
  'Marketing Campaigns',
  'Attendance Management',
  'Dashboard & Revenue Analytics',
  'Secure Cloud Backup',
  'Free Updates',
  'Free Customer Support',
];

export const HOW_SHOWCASE = [
  {
    ...SHOWCASE[0],
    label: 'Step 01 · See everything',
    bullets: ['Live revenue and KPI tracking', 'Today\'s appointments at a glance', 'Active clients and performance signals', 'Smart insights for better decisions'],
    theme: 'overview',
    cta: 'Explore Dashboard',
  },
  {
    ...SHOWCASE[2],
    label: 'Step 02 · Understand growth',
    bullets: ['Advanced reports and filters', 'Sales, staff and service performance', 'Client retention and revenue trends', 'Export and share reports instantly'],
    theme: 'analytics',
    cta: 'Explore Reports',
  },
  {
    ...SHOWCASE[3],
    title: 'Smart Calendar',
    label: 'Step 03 · Run the day',
    bullets: ['Easy appointment scheduling', 'Staff and room management', 'Automated confirmations and reminders', 'Reduce no-shows and save time'],
    theme: 'calendar',
    cta: 'Manage Appointments',
  },
];

export const PROFESSIONAL_PLAN_BENEFITS = ['Free Onboarding', 'Free Setup Assistance', 'Free Product Training'];

export const HERO_FEATURE_CARDS: Array<{ icon: keyof typeof Icon; label: string }> = [
  { icon: 'Calendar', label: 'Appointments' },
  { icon: 'Users', label: 'Clients' },
  { icon: 'Bar', label: 'Reports' },
  { icon: 'Building', label: 'Staff' },
  { icon: 'Card', label: 'Billing' },
  { icon: 'Layers', label: 'Inventory' },
];

export const HERO_TRUST_ITEMS = ['No Hidden Charges', 'Free Setup', '24×7 Support', 'Secure Cloud Platform'];

/* ---------------------------------- Scroll reveal hook ---------------------------------- */

export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

/* ---------------------------------- Hero revenue chart (inline SVG, zero deps) ---------------------------------- */

type RevenuePoint = { day: string; value: number };

const HERO_REVENUE_DATA: RevenuePoint[] = [
  { day: 'Mon', value: 28400 },
  { day: 'Tue', value: 33800 },
  { day: 'Wed', value: 31200 },
  { day: 'Thu', value: 42600 },
  { day: 'Fri', value: 39900 },
  { day: 'Sat', value: 47800 },
  { day: 'Sun', value: 24860 },
];

const CHART_W = 300;
const CHART_H = 150;
const CHART_PAD = { left: 34, right: 8, top: 12, bottom: 24 };
const CHART_Y_MAX = 60000;
const CHART_Y_TICKS = [0, 20000, 40000, 60000];

function scaleRevenueX(i: number, count: number) {
  const innerW = CHART_W - CHART_PAD.left - CHART_PAD.right;
  return CHART_PAD.left + (i * innerW) / (count - 1);
}

function scaleRevenueY(value: number) {
  const innerH = CHART_H - CHART_PAD.top - CHART_PAD.bottom;
  return CHART_H - CHART_PAD.bottom - (value / CHART_Y_MAX) * innerH;
}

function buildSmoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x},${p2.y}`;
  }
  return d;
}

const HeroRevenueChart: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const points = HERO_REVENUE_DATA.map((d, i) => ({
    ...d,
    x: scaleRevenueX(i, HERO_REVENUE_DATA.length),
    y: scaleRevenueY(d.value),
  }));

  const linePath = buildSmoothPath(points);
  const baseline = CHART_H - CHART_PAD.bottom;
  const areaPath = `${linePath} L ${points[points.length - 1].x},${baseline} L ${points[0].x},${baseline} Z`;

  return (
    <div className="revenue-dash">
      <div className="revenue-dash-head">
        <div className="revenue-dash-heading">
          <span className="revenue-dash-label">Weekly Revenue</span>
          <strong className="revenue-dash-value">₹2,48,560</strong>
        </div>
        <span className="revenue-dash-badge">
          <Icon.TrendingUp />
          +18.4% vs last week
        </span>
      </div>

      <div className="revenue-chart-wrap">
        <svg
          className="revenue-chart-svg"
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Weekly revenue trend from Monday to Sunday"
        >
          <defs>
            <linearGradient id="revenueAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="revenueLineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>

          {CHART_Y_TICKS.map((tick) => (
            <line
              key={tick}
              className="revenue-grid-line"
              x1={CHART_PAD.left}
              x2={CHART_W - CHART_PAD.right}
              y1={scaleRevenueY(tick)}
              y2={scaleRevenueY(tick)}
            />
          ))}

          <path className="revenue-area" d={areaPath} />
          <path className="revenue-line" d={linePath} />

          {CHART_Y_TICKS.map((tick) => (
            <text
              key={tick}
              className="revenue-axis-label revenue-axis-y"
              x={CHART_PAD.left - 6}
              y={scaleRevenueY(tick)}
            >
              {tick === 0 ? '₹0' : `₹${tick / 1000}K`}
            </text>
          ))}

          {points.map((p) => (
            <text key={p.day} className="revenue-axis-label revenue-axis-x" x={p.x} y={CHART_H - 6}>
              {p.day}
            </text>
          ))}

          {points.map((p, i) => (
            <g
              key={p.day}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
              onFocus={() => setActiveIndex(i)}
              onBlur={() => setActiveIndex(null)}
              tabIndex={0}
              role="img"
              aria-label={`${p.day}: ₹${p.value.toLocaleString('en-IN')}`}
            >
              <circle className="revenue-hit" cx={p.x} cy={p.y} r={11} />
              <circle className={`revenue-dot${activeIndex === i ? ' is-active' : ''}`} cx={p.x} cy={p.y} r={activeIndex === i ? 5 : 3} />
              {activeIndex === i && (
                <g className="revenue-tooltip" transform={`translate(${p.x}, ${p.y})`}>
                  <rect x={-28} y={-34} width={56} height={20} rx={6} />
                  <text x={0} y={-20} textAnchor="middle">₹{(p.value / 1000).toFixed(1)}K</text>
                </g>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

// Retained as a reusable chart preview for future feature-detail surfaces.
// This reference remains tree-shakeable in production until the component is rendered again.
void HeroRevenueChart;

export const Reveal: React.FC<{ children: React.ReactNode; delay?: 0 | 1 | 2 | 3 | 4; className?: string }> = ({
  children,
  delay = 0,
  className = '',
}) => {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const delayClass = delay > 0 ? `reveal-delay-${delay}` : '';

  return (
    <div ref={ref} className={`reveal ${delayClass} ${visible ? 'is-visible' : ''} ${className}`}>
      {children}
    </div>
  );
};

export const ShowcaseMetric: React.FC<{ value: number; prefix?: string; suffix?: string }> = ({ value, prefix = '', suffix = '' }) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let animationFrame = 0;

    if (typeof IntersectionObserver === 'undefined') {
      animationFrame = window.requestAnimationFrame(() => setDisplayValue(value));
      return () => window.cancelAnimationFrame(animationFrame);
    }

    const run = () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setDisplayValue(value);
        return;
      }

      const startedAt = window.performance.now();
      const animate = (now: number) => {
        const progress = Math.min((now - startedAt) / 900, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.round(value * eased));
        if (progress < 1) animationFrame = window.requestAnimationFrame(animate);
      };
      animationFrame = window.requestAnimationFrame(animate);
    };

    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return;
      observer.disconnect();
      run();
    }, { threshold: 0.55 });

    observer.observe(node);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(animationFrame);
    };
  }, [value]);

  return <span ref={ref}>{prefix}{displayValue}{suffix}</span>;
};

export const ShowcaseFloatingWidgets: React.FC<{ theme: string }> = ({ theme }) => {
  if (theme === 'overview') {
    return (
      <div className="showcase-widgets" aria-hidden="true">
        <span className="showcase-float showcase-float--a"><em>Revenue today</em><strong><ShowcaseMetric value={245} prefix="₹" suffix="k" /></strong><i className="showcase-trend">+18.6%</i></span>
        <span className="showcase-float showcase-float--b"><span className="showcase-float-icon"><Icon.Calendar /></span><span><em>Next appointment</em><strong>10:30 AM</strong></span></span>
        <span className="showcase-float showcase-float--c showcase-float--success"><span className="showcase-float-check"><Icon.Check /></span><span><em>Payment received</em><strong>₹2,850</strong></span></span>
        <span className="showcase-float showcase-float--d"><span className="showcase-float-icon"><Icon.Users /></span><span><em>Active clients</em><strong><ShowcaseMetric value={64} /></strong></span></span>
      </div>
    );
  }

  if (theme === 'analytics') {
    return (
      <div className="showcase-widgets" aria-hidden="true">
        <span className="showcase-float showcase-float--a"><em>Revenue growth</em><strong><ShowcaseMetric value={28} prefix="+" suffix="%" /></strong><span className="showcase-mini-bars"><i /><i /><i /><i /></span></span>
        <span className="showcase-float showcase-float--b"><span className="showcase-ring"><ShowcaseMetric value={86} suffix="%" /></span><span><em>Client retention</em><strong>Excellent</strong></span></span>
        <span className="showcase-float showcase-float--c"><span className="showcase-float-icon"><Icon.Report /></span><span><em>Top service</em><strong>Hair Color</strong></span></span>
        <span className="showcase-float showcase-float--d"><em>Average order value</em><strong>₹1,248</strong><i className="showcase-trend">+8.6%</i></span>
      </div>
    );
  }

  if (theme === 'calendar') {
    return (
      <div className="showcase-widgets" aria-hidden="true">
        <span className="showcase-float showcase-float--a"><span className="showcase-float-icon"><Icon.Calendar /></span><span><em>New booking</em><strong>Hair Spa · 2:00 PM</strong></span></span>
        <span className="showcase-float showcase-float--b"><span className="showcase-float-icon"><Icon.Bell /></span><span><em>Reminder scheduled</em><strong>15 min before</strong></span></span>
        <span className="showcase-float showcase-float--c showcase-float--success"><span className="showcase-float-check"><Icon.Check /></span><span><em>WhatsApp notification</em><strong>Delivered</strong></span></span>
        <span className="showcase-float showcase-float--d"><span className="showcase-float-icon"><Icon.Users /></span><span><em>Staff availability</em><strong>4 available</strong></span></span>
        <span className="showcase-float showcase-float--e showcase-float--success"><span className="showcase-float-check"><Icon.Check /></span><span><em>Client check-in</em><strong>Completed</strong></span></span>
      </div>
    );
  }

  return (
    <div className="showcase-widgets" aria-hidden="true">
      <span className="showcase-float showcase-float--a"><em>Checkout total</em><strong>₹3,420</strong><i className="showcase-trend">GST ready</i></span>
      <span className="showcase-float showcase-float--b"><span className="showcase-float-icon"><Icon.Card /></span><span><em>Payment method</em><strong>UPI</strong></span></span>
      <span className="showcase-float showcase-float--c showcase-float--success"><span className="showcase-float-check"><Icon.Check /></span><span><em>Invoice generated</em><strong>#SOX-2841</strong></span></span>
    </div>
  );
};

export const FeatureMiniPreview: React.FC<{ index: number }> = ({ index }) => {
  if (index === 0) {
    return (
      <div className="feature-preview feature-preview--calendar" aria-hidden="true">
        <div className="feature-preview-toolbar"><span>May 2026</span><span><i>Day</i><i className="is-active">Week</i><i>Month</i></span></div>
        <div className="feature-calendar-grid">
          <span /><b>Mon<br /><small>20</small></b><b>Tue<br /><small>21</small></b><b>Wed<br /><small>22</small></b><b>Thu<br /><small>23</small></b>
          <em>10:00</em><i className="appointment appointment--blue">Hair Cut<small>Neha</small></i><span /><i className="appointment appointment--purple">Hair Color<small>Aisha</small></i><span />
          <em>11:00</em><span /><i className="appointment appointment--green">Facial<small>Priya</small></i><span /><i className="appointment appointment--amber">Beard Trim<small>Rohit</small></i>
          <span className="feature-current-time" />
        </div>
        <span className="feature-float-card feature-float-card--appointment"><span className="feature-avatar">PP</span><span><em>Next Appointment</em><strong>11:30 AM</strong><small>Priya Patel</small></span><i className="feature-notification-dot" /></span>
      </div>
    );
  }

  if (index === 1) {
    return (
      <div className="feature-preview feature-preview--payments" aria-hidden="true">
        <div className="feature-pos-terminal"><span className="feature-pos-screen"><Icon.Card /><small>Tap or scan</small></span><i /><i /><i /></div>
        <div className="feature-receipt"><strong>New Sale</strong><span>Hair Cut <b>₹800</b></span><span>Hair Spa <b>₹1,200</b></span><span>Product <b>₹450</b></span><span>Discount <b>-₹150</b></span><em>Total <b>₹2,300</b></em><button type="button" tabIndex={-1}>Charge ₹2,300</button></div>
        <span className="feature-qr" />
        <span className="feature-float-card feature-float-card--payment"><span className="feature-success-check"><Icon.Check /></span><span><em>Charge Completed</em><strong>₹2,300</strong><small>Visa ···· 4242</small></span></span>
      </div>
    );
  }

  if (index === 2) {
    return (
      <div className="feature-preview feature-preview--client" aria-hidden="true">
        <div className="feature-client-profile">
          <div className="feature-client-head"><span className="feature-avatar feature-avatar--large">NS</span><span><strong>Neha Sharma</strong><small>+91 98765 43210</small></span><i>VIP</i></div>
          <div className="feature-client-tabs"><b>Overview</b><span>History</span><span>Preferences</span></div>
          <div className="feature-client-stats"><span><small>Total visits</small><strong>24</strong></span><span><small>Total spent</small><strong>₹24,750</strong></span><span><small>Loyalty points</small><strong>1,280</strong></span></div>
          <div className="feature-visit-history"><span>12 May · Hair Color</span><b>₹2,450</b></div>
        </div>
        <span className="feature-float-card feature-float-card--favorite"><span className="feature-float-icon"><Icon.Star /></span><span><em>Favorite Service</em><strong>Keratin Treatment</strong><small>Membership active</small></span></span>
      </div>
    );
  }

  if (index === 3) {
    return (
      <div className="feature-preview feature-preview--reports" aria-hidden="true">
        <div className="feature-report-panel">
          <span><small>Revenue Overview</small><strong>₹5,24,750</strong><em>+18.6% vs last month</em></span>
          <svg viewBox="0 0 360 135" preserveAspectRatio="none"><path className="feature-report-area" d="M0 118 C35 112 42 62 78 82 C112 100 128 45 162 70 C196 92 211 37 242 63 C278 91 294 26 330 52 C345 61 352 44 360 33 L360 135 L0 135Z" /><path className="feature-report-line" d="M0 118 C35 112 42 62 78 82 C112 100 128 45 162 70 C196 92 211 37 242 63 C278 91 294 26 330 52 C345 61 352 44 360 33" /></svg>
          <div className="feature-report-axis"><span>01 May</span><span>08 May</span><span>15 May</span><span>22 May</span><span>29 May</span></div>
        </div>
        <span className="feature-float-card feature-float-card--growth"><em>Growth</em><strong><ShowcaseMetric value={18} prefix="+" suffix=".6%" /></strong><small>Strong upward trend</small></span>
      </div>
    );
  }

  if (index === 4) {
    return (
      <div className="feature-preview feature-preview--inventory" aria-hidden="true">
        <div className="feature-inventory-list">
          <span><i className="product-thumb product-thumb--one" /><b>Shampoo</b><em>In Stock</em><strong>120</strong></span>
          <span><i className="product-thumb product-thumb--two" /><b>Hair Color</b><em className="is-low">Low Stock</em><strong>18</strong></span>
          <span><i className="product-thumb product-thumb--three" /><b>Conditioner</b><em>In Stock</em><strong>75</strong></span>
          <span><i className="product-thumb product-thumb--four" /><b>Hair Serum</b><em>In Stock</em><strong>60</strong></span>
        </div>
        <span className="feature-float-card feature-float-card--stock"><span className="feature-alert-icon"><Icon.Bell /></span><span><em>Low Stock Alert</em><strong>Hair Color is running low</strong><small>18 units remaining</small></span></span>
      </div>
    );
  }

  return (
    <div className="feature-preview feature-preview--security" aria-hidden="true">
      <div className="feature-security-list"><span><Icon.Check /> Secure Cloud Platform</span><span><Icon.Check /> Daily Data Backups</span><span><Icon.Check /> Encrypted Database</span><span><Icon.Check /> Role-Based Access</span></div>
      <div className="feature-shield"><span><Icon.Shield /></span><i /><i /></div>
      <span className="feature-float-card feature-float-card--support"><span className="feature-float-icon"><Icon.MessageCircle /></span><span><em>Customer Care</em><strong>24×7 Support</strong><small>We’re always here to help</small></span></span>
    </div>
  );
};

export const FeatureProductPreview: React.FC<{ feature: WhyFeature }> = ({ feature }) => {
  if (feature.title === 'GST Billing') {
    return (
      <div className="product-preview product-preview--billing">
        <div className="preview-window-top">
          <span><i /><i /><i /></span>
          <strong>SalonOX Billing</strong>
          <em>GST ready</em>
        </div>
        <div className="invoice-preview">
          <div className="invoice-head">
            <div>
              <span>Invoice</span>
              <strong>#SOX-2048</strong>
            </div>
            <b>Paid</b>
          </div>
          <div className="invoice-client">
            <span>Client</span>
            <strong>Aarohi Mehta</strong>
          </div>
          <div className="invoice-lines">
            <p><span>Hair spa + styling</span><strong>₹2,400</strong></p>
            <p><span>Keratin serum</span><strong>₹650</strong></p>
            <p><span>Member discount</span><strong>-₹250</strong></p>
          </div>
          <div className="tax-grid">
            <span>CGST 9% <strong>₹252</strong></span>
            <span>SGST 9% <strong>₹252</strong></span>
          </div>
          <div className="invoice-total">
            <span>Total payable</span>
            <strong>₹3,304</strong>
          </div>
        </div>
      </div>
    );
  }

  if (feature.title === 'Multi-Branch Ready') {
    return (
      <div className="product-preview product-preview--branch">
        <div className="preview-window-top">
          <span><i /><i /><i /></span>
          <strong>Branch Command</strong>
          <em>Live</em>
        </div>
        <div className="branch-preview-layout">
          <aside>
            {['Downtown', 'Mall Plaza', 'Studio Lux'].map((branch, index) => (
              <span className={index === 0 ? 'is-active' : ''} key={branch}>{branch}</span>
            ))}
          </aside>
          <main>
            <div className="preview-metric-row">
              <div><span>Bookings</span><strong>384</strong></div>
              <div><span>Revenue</span><strong>₹8.7L</strong></div>
            </div>
            <div className="preview-chart">
              <i /><i /><i /><i /><i /><i />
            </div>
            <div className="branch-mini-table">
              <p><span>Top branch</span><strong>Downtown</strong></p>
              <p><span>Utilization</span><strong>86%</strong></p>
              <p><span>Staff active</span><strong>42</strong></p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (feature.title === 'Cloud Based') {
    return (
      <div className="product-preview product-preview--cloud">
        <div className="cloud-device cloud-device--desktop">
          <div className="preview-window-top">
            <span><i /><i /><i /></span>
            <strong>SalonOX Cloud</strong>
          </div>
          <div className="cloud-dashboard">
            <div className="cloud-sidebar" />
            <div className="cloud-content">
              <span />
              <div><i /><i /><i /></div>
              <p />
              <p />
            </div>
          </div>
        </div>
        <div className="cloud-device cloud-device--tablet">
          <span>Today</span>
          <strong>32</strong>
          <em>synced bookings</em>
        </div>
        <div className="cloud-device cloud-device--phone">
          <span />
          <i />
          <i />
          <strong>Live</strong>
        </div>
      </div>
    );
  }

  if (feature.title === 'WhatsApp Marketing') {
    return (
      <div className="product-preview product-preview--whatsapp">
        <div className="campaign-panel">
          <div className="preview-window-top">
            <span><i /><i /><i /></span>
            <strong>Campaigns</strong>
            <em>WhatsApp</em>
          </div>
          <div className="campaign-card">
            <span>Reminder sequence</span>
            <strong>Tomorrow appointments</strong>
            <div className="campaign-progress"><i /></div>
            <p>1,248 clients reached</p>
          </div>
        </div>
        <div className="whatsapp-phone">
          <div className="phone-top">SalonOX</div>
          <p className="message message-in">Hi Riya, your spa booking is tomorrow at 4:30 PM.</p>
          <p className="message message-out">Confirm</p>
          <p className="message message-in">Thank you. See you at Glow Room.</p>
        </div>
      </div>
    );
  }

  if (feature.title === 'Real-Time Analytics') {
    return (
      <div className="product-preview product-preview--analytics">
        <div className="preview-window-top">
          <span><i /><i /><i /></span>
          <strong>Analytics</strong>
          <em>Live data</em>
        </div>
        <div className="analytics-grid">
          <div><span>Revenue</span><strong>₹4.8L</strong></div>
          <div><span>Retention</span><strong>74%</strong></div>
          <div className="analytics-chart"><i /><i /><i /><i /><i /></div>
          <div className="analytics-list">
            <p><span>Color services</span><strong>+18%</strong></p>
            <p><span>Memberships</span><strong>+11%</strong></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="product-preview product-preview--security">
      <div className="security-panel">
        <span className="security-shield"><Icon.Shield /></span>
        <strong>Secure workspace</strong>
        <p>Owner, manager, front desk, and stylist permissions stay separated.</p>
        <div className="security-roles">
          <span>Owner</span>
          <span>Manager</span>
          <span>Stylist</span>
        </div>
      </div>
    </div>
  );
};

export const TermsContent: React.FC = () => (
  <main className="terms-page" id="top">
    <section className="terms-hero">
      <div className="container terms-hero-grid">
        <div className="terms-hero-copy">
          <span className="eyebrow"><span className="dot" /> Legal</span>
          <h1>Terms & Conditions</h1>
          <p>
            Commercial terms for salons, spas, and staff using SalonOX cloud management software.
          </p>
        </div>
        <div className="terms-effective">
          <span>Effective Date</span>
          <strong>01 June 2026</strong>
        </div>
      </div>
    </section>

    <section className="terms-content">
      <div className="container">
        <div className="terms-layout">
          <aside className="terms-summary" aria-label="Terms summary">
            <span>SalonOX SaaS Agreement</span>
            <p>
              These terms cover account access, subscriptions, data handling, third-party services,
              acceptable use, cancellations, and support.
            </p>
            <a href={`mailto:${DEMO_EMAIL}`}>{DEMO_EMAIL}</a>
          </aside>

          <div className="terms-sections">
            {TERMS_SECTIONS.map((section, index) => (
              <article className="terms-section" key={section.title}>
                <span className="terms-section-number">{String(index + 1).padStart(2, '0')}</span>
                <h2>{section.title}</h2>
                <p>
                  {section.body}
                  {section.email && (
                    <>
                      {' '}
                      <a href={`mailto:${section.email}`}>{section.email}</a>.
                    </>
                  )}
                </p>
                {section.bullets && (
                  <ul>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  </main>
);

export const PRIVACY_SECTIONS: TermsSection[] = [
  {
    title: 'Introduction',
    body: 'This Privacy Policy explains how SalonOX collects, uses, stores, shares, and protects the information of customers, staff members, and end clients when they use our cloud-based Salon & Spa Management Software (SaaS). SalonOX is designed for salons, spas, clinics, and multi-branch service businesses and supports appointment scheduling, billing, inventory, CRM, marketing, memberships, staff management, and multi-location operations. By using SalonOX, you acknowledge that your information may be processed as described in this Privacy Policy.',
  },
  {
    title: 'Information We Collect',
    body: 'SalonOX collects information that is necessary to create and manage accounts, deliver services, support operations, improve reliability, and meet legal obligations.',
    bullets: [
      'Personal Information: name, email address, phone number, business name, business address, tax details, and contact details for salon owners, managers, staff, or authorized representatives.',
      'Usage Information: appointment data, service history, billing records, purchase and refund activity, inventory movements, CRM notes, membership status, support tickets, communications, and platform activity logs.',
      'Cookies & Tracking Technologies: browser cookies, session identifiers, device information, IP addresses, analytics signals, and similar technologies used to maintain secure sessions, remember preferences, and understand feature usage.',
    ],
  },
  {
    title: 'How We Use Your Information',
    body: 'SalonOX uses information to provide the platform and related services, service your account, process transactions, support multi-branch workflows, manage staff permissions, send service reminders, deliver customer communications, improve product quality, secure the platform, and comply with legal or contractual requirements.',
  },
  {
    title: 'How We Share Your Information',
    body: 'SalonOX may share information with trusted service providers, integration partners, and payment processors only where necessary to operate the platform and fulfill the services you request. We do not sell personal information for profit. We may share information when required by law, to protect the rights and safety of our customers or users, or as part of a legitimate business transfer such as a merger, asset sale, or restructuring.',
  },
  {
    title: 'Data Security',
    body: 'SalonOX uses reasonable administrative, technical, and physical safeguards to reduce risk and protect information against unauthorized access, disclosure, alteration, or destruction. These controls may include encryption in transit, role-based access permissions, secure authentication, monitoring, and backup practices. No system can guarantee absolute security, so you should also protect your login credentials and report suspected misuse promptly.',
  },
  {
    title: 'Data Retention',
    body: 'SalonOX retains personal and business information for as long as needed to provide services, maintain account history, comply with legal obligations, resolve disputes, enforce agreements, and support legitimate business operations. When information is no longer required, SalonOX will delete or anonymize it in accordance with applicable standards and internal retention practices.',
  },
  {
    title: 'Your Privacy Rights',
    body: 'Depending on your location and applicable law, you may have the right to access, correct, update, delete, or restrict certain personal information, and to object to or limit certain processing activities. You may also request a copy of the personal information SalonOX holds about you. To exercise these rights, contact us at support@salonox.com and we will respond in line with applicable legal requirements.',
  },
  {
    title: 'Third-Party Services',
    body: 'SalonOX may rely on third-party services to deliver functionality and support your business. These may include:',
    bullets: [
      'WhatsApp services for customer communications, reminders, and marketing messages.',
      'Payment gateways for secure card, wallet, or bank transfers and billing processing.',
      'Email services for sending transactional and marketing emails.',
      'Analytics providers for product usage insights, reliability monitoring, and service improvements.',
    ],
  },
  {
    title: 'Cookies Policy',
    body: 'SalonOX uses cookies and similar technologies to keep your account secure, remember preferences, support performance, and analyze product usage. You may control or disable cookies through your browser settings, although some features of SalonOX may not function properly if cookies are disabled.',
  },
  {
    title: "Children's Privacy",
    body: 'SalonOX is not intended for children under the age of 13, and we do not knowingly collect personal information from children without appropriate consent from a parent or guardian. If you believe a child has provided personal information to SalonOX without the required authorization, please contact us so we can take appropriate action.',
  },
  {
    title: 'Changes to this Privacy Policy',
    body: 'SalonOX may update this Privacy Policy from time to time to reflect product changes, legal requirements, or security practices. When changes are material, we may notify you through the platform, email, or another reasonable method. Continued use of SalonOX after the updated policy becomes effective means you accept the revised terms.',
  },
  {
    title: 'Contact Us',
    body: 'If you have questions, requests, or concerns about this Privacy Policy or how SalonOX handles your information, please contact us at',
    email: DEMO_EMAIL,
  },
];

export const PrivacyContent: React.FC = () => (
  <main className="terms-page" id="top">
    <section className="terms-hero">
      <div className="container terms-hero-grid">
        <div className="terms-hero-copy">
          <span className="eyebrow"><span className="dot" /> Legal</span>
          <h1>Privacy Policy</h1>
          <p>
            How SalonOX collects, uses, protects, and shares information across our salon and spa management platform.
          </p>
        </div>
        <div className="terms-effective">
          <span>Effective Date</span>
          <strong>01 June 2026</strong>
        </div>
      </div>
    </section>

    <section className="terms-content">
      <div className="container">
        <div className="terms-layout">
          <aside className="terms-summary" aria-label="Privacy policy summary">
            <span>SalonOX Privacy Notice</span>
            <p>
              This notice explains the categories of information SalonOX collects, how the platform uses that information,
              and the choices available to customers and end users.
            </p>
            <a href={`mailto:${DEMO_EMAIL}`}>{DEMO_EMAIL}</a>
          </aside>

          <div className="terms-sections">
            {PRIVACY_SECTIONS.map((section, index) => (
              <article className="terms-section" key={section.title}>
                <span className="terms-section-number">{String(index + 1).padStart(2, '0')}</span>
                <h2>{section.title}</h2>
                <p>
                  {section.body}
                  {section.email && (
                    <>
                      {' '}
                      <a href={`mailto:${section.email}`}>{section.email}</a>.
                    </>
                  )}
                </p>
                {section.bullets && (
                  <ul>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  </main>
);

export const ABOUT_OFFERS = [
  'Appointments',
  'Billing',
  'CRM',
  'Inventory',
  'Marketing',
  'Memberships',
  'Staff Management',
  'Multi-Branch',
  'Analytics',
];

export const WHY_CHOOSE = [
  {
    title: 'Built for real salon staff',
    desc: 'SalonOX brings scheduling, checkout, client history, and operations into one elegant workspace so your staff can move faster with less friction.',
  },
  {
    title: 'Flexible for every growth stage',
    desc: 'Whether you run one boutique salon or a growing chain, SalonOX adapts to your workflow with powerful modules and branch-ready controls.',
  },
  {
    title: 'Reliable and secure',
    desc: 'From secure access to consistent uptime, SalonOX is designed to help you run confidently while protecting sensitive customer and business data.',
  },
];

export type AboutContentProps = {
  onNavigateToBookDemo: (event: React.MouseEvent<HTMLElement>) => void;
};

export const AboutContent: React.FC<AboutContentProps> = ({ onNavigateToBookDemo }) => (
  <main className="about-page" id="top">
    <section className="about-hero">
      <div className="container about-hero-grid">
        <div className="about-hero-copy">
          <span className="eyebrow"><span className="dot" /> About SalonOX</span>
          <h1>Modern salon software built for beauty businesses that want to grow with clarity.</h1>
          <p>
            SalonOX is a cloud-based Salon & Spa Management Software designed to help owners, managers, and staff manage appointments, billing, inventory, CRM, memberships, staff workflows, and multi-branch operations from one place.
          </p>
          <div className="about-hero-actions">
            <a href="#book-demo" className="btn btn-primary" onClick={onNavigateToBookDemo}>
              Book Demo <Icon.Arrow />
            </a>
            <a href="#book-demo" className="btn btn-ghost" onClick={onNavigateToBookDemo}>
              Contact Us
            </a>
          </div>
        </div>
        <div className="about-hero-card">
          <span className="about-hero-card__kicker">Trusted by modern staff</span>
          <h2>From first consultation to repeat bookings, SalonOX keeps every detail connected.</h2>
          <p>We simplify daily operations so salon and spa businesses can deliver exceptional service and make smarter decisions with real-time visibility.</p>
        </div>
      </div>
    </section>

    <section className="about-content">
      <div className="container about-stack">
        <article className="about-card">
          <h2>Who We Are</h2>
          <p>
            SalonOX was created for businesses that need a premium operating system for salons and spas. Our platform combines elegant design with practical workflows so staff can focus on client experience instead of manual admin.
          </p>
        </article>

        <article className="about-card">
          <h2>Our Mission</h2>
          <p>
            We help salon and spa businesses run smarter by bringing appointments, payments, customer insight, marketing, and staff collaboration into one secure and intuitive platform.
          </p>
        </article>

        <article className="about-card about-card--wide">
          <h2>What We Offer</h2>
          <div className="about-offers-grid">
            {ABOUT_OFFERS.map((item) => (
              <div className="about-offer-pill" key={item}>{item}</div>
            ))}
          </div>
        </article>

        <article className="about-card">
          <h2>Why Choose SalonOX</h2>
          <div className="about-why-grid">
            {WHY_CHOOSE.map((item) => (
              <div className="about-why-card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="about-card">
          <h2>Our Vision</h2>
          <p>
            We believe every salon and spa deserves technology that feels effortless, scalable, and beautifully designed. Our vision is to make modern business operations simple so staff can spend more time creating memorable client experiences.
          </p>
        </article>
      </div>
    </section>

    <section className="about-cta">
      <div className="container about-cta-card">
        <div>
          <span className="eyebrow"><span className="dot" /> Ready to grow</span>
          <h2>See how SalonOX can simplify your salon operations.</h2>
          <p>Book a live demo or reach out to our team for a tailored walkthrough of the platform.</p>
        </div>
        <div className="about-hero-actions">
          <a href="#book-demo" className="btn btn-primary" onClick={onNavigateToBookDemo}>
            Book Demo <Icon.Arrow />
          </a>
          <a href="#book-demo" className="btn btn-ghost" onClick={onNavigateToBookDemo}>
            Contact Us
          </a>
        </div>
      </div>
    </section>
  </main>
);

/* ---------------------------------- Searchable country select (Book Demo phone field) ---------------------------------- */

export type CountrySelectOption = { value?: Country; label: string; divider?: boolean };

export type CountrySelectSearchProps = {
  value?: Country;
  onChange: (value?: Country) => void;
  options: CountrySelectOption[];
  disabled?: boolean;
  readOnly?: boolean;
  'aria-label'?: string;
};

export const CountrySelectSearch: React.FC<CountrySelectSearchProps> = ({
  value,
  onChange,
  options,
  disabled,
  readOnly,
  'aria-label': ariaLabel,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const listboxId = useId();

  const countryOptions = useMemo(
    () => options.filter((option): option is CountrySelectOption & { value: Country } => !option.divider && !!option.value),
    [options]
  );

  const selected = useMemo(
    () => countryOptions.find((option) => option.value === value),
    [countryOptions, value]
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\+/, '');
    if (!q) return countryOptions;

    // Ranks exact/prefix matches (e.g. typing "+91" surfaces India before
    // Bolivia's "+591", which merely contains "91") above plain substring hits.
    const ranked = countryOptions
      .map((option) => {
        const label = option.label.toLowerCase();
        const callingCode = getCountryCallingCode(option.value);
        let rank = -1;
        if (label === q || callingCode === q) rank = 0;
        else if (label.startsWith(q) || callingCode.startsWith(q)) rank = 1;
        else if (label.includes(q) || option.value.toLowerCase().includes(q) || callingCode.includes(q)) rank = 2;
        return { option, rank };
      })
      .filter((entry) => entry.rank !== -1);

    ranked.sort((a, b) => a.rank - b.rank);
    return ranked.map((entry) => entry.option);
  }, [countryOptions, query]);

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const openDropdown = useCallback(() => {
    setQuery('');
    setActiveIndex(0);
    setOpen(true);
  }, []);

  const commitSelection = useCallback(
    (country?: Country) => {
      onChange(country);
      setOpen(false);
    },
    [onChange]
  );

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    setActiveIndex(0);
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || readOnly) return;
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openDropdown();
    }
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const option = filteredOptions[activeIndex];
      if (option) commitSelection(option.value);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  };

  const SelectedFlag = selected ? flags[selected.value] : undefined;
  const selectedCallingCode = selected ? getCountryCallingCode(selected.value) : '';

  return (
    <div className={`country-select-search${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="country-select-trigger"
        disabled={disabled || readOnly}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ? `${ariaLabel}${selected ? `, ${selected.label}` : ''}` : 'Select country'}
        onClick={() => (open ? setOpen(false) : openDropdown())}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="country-select-flag" aria-hidden="true">
          {SelectedFlag && <SelectedFlag title={selected?.label || ''} />}
        </span>
        {selectedCallingCode && <span className="country-select-code">+{selectedCallingCode}</span>}
        <span className="country-select-chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="country-select-popover">
          <div className="country-select-search-box">
            <input
              ref={searchRef}
              type="text"
              inputMode="search"
              autoComplete="off"
              placeholder="Search country or code"
              value={query}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              role="combobox"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-autocomplete="list"
            />
          </div>
          <ul className="country-select-list" role="listbox" id={listboxId} ref={listRef} aria-label="Countries">
            {filteredOptions.length === 0 && (
              <li className="country-select-empty">No countries found</li>
            )}
            {filteredOptions.map((option, index) => {
              const OptionFlag = flags[option.value];
              const optionCallingCode = getCountryCallingCode(option.value);
              const isActive = index === activeIndex;
              const isSelected = option.value === value;

              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  data-active={isActive}
                  className={`country-select-option${isActive ? ' is-active' : ''}${isSelected ? ' is-selected' : ''}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => commitSelection(option.value)}
                >
                  <span className="country-select-option-flag" aria-hidden="true">
                    {OptionFlag && <OptionFlag title={option.label} />}
                  </span>
                  <span className="country-select-option-name">{option.label}</span>
                  <span className="country-select-option-code">+{optionCallingCode}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

/* ---------------------------------- Component ---------------------------------- */

export const LANDING_SECTION_IDS = [
  'top',
  'why-salonox',
  'features',
  'multi-branch',
  'how',
  'pricing',
  'testimonials',
  'book-demo',
] as const;

export const NAV_SCROLL_DURATION = 820;

export type SectionArtworkVariant = 'why' | 'features' | 'dashboard' | 'workflow' | 'reviews' | 'pricing' | 'contact';

export const SectionArtwork: React.FC<{ variant: SectionArtworkVariant }> = ({ variant }) => {
  const artworkId = useId().replace(/:/g, '');
  const strokeId = `${artworkId}-stroke`;
  const softId = `${artworkId}-soft`;
  const blurId = `${artworkId}-blur`;

  return (
    <div className={`section-artwork section-artwork--${variant}`} aria-hidden="true">
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" focusable="false">
        <defs>
          <linearGradient id={strokeId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#059669" stopOpacity="0" />
            <stop offset="0.28" stopColor="#10b981" stopOpacity="0.72" />
            <stop offset="0.68" stopColor="#34d399" stopOpacity="0.38" />
            <stop offset="1" stopColor="#059669" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={softId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#34d399" stopOpacity="0.34" />
            <stop offset="0.55" stopColor="#10b981" stopOpacity="0.12" />
            <stop offset="1" stopColor="#059669" stopOpacity="0" />
          </linearGradient>
          <filter id={blurId} x="-35%" y="-45%" width="170%" height="190%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>

        {variant === 'why' && (
          <g className="section-artwork-mesh" fill="none" stroke={`url(#${strokeId})`} strokeLinecap="round">
            <path d="M-180 760 C120 330 300 780 590 440 C790 205 1010 480 1580 105" strokeWidth="56" filter={`url(#${blurId})`} />
            <path d="M-140 835 C150 455 390 840 655 520 C900 225 1100 535 1530 275" strokeWidth="18" />
            <path d="M-90 675 C230 270 410 700 720 370 C930 145 1190 400 1510 120" strokeWidth="7" opacity="0.72" />
            <path d="M120 950 C330 545 610 845 820 570 C1040 282 1230 615 1520 410" strokeWidth="4" opacity="0.5" strokeDasharray="3 18" />
          </g>
        )}

        {variant === 'features' && (
          <g className="section-artwork-dashboard">
            <g fill={`url(#${softId})`} stroke="#10b981" strokeOpacity="0.28">
              <rect x="-90" y="105" width="390" height="230" rx="28" />
              <rect x="1170" y="520" width="360" height="230" rx="28" />
              <rect x="1040" y="80" width="235" height="135" rx="22" opacity="0.46" />
            </g>
            <g fill="none" stroke={`url(#${strokeId})`} strokeLinecap="round">
              <path d="M-20 275 L62 222 L126 248 L205 168 L276 194" strokeWidth="8" />
              <path d="M1195 682 C1240 610 1292 655 1330 592 C1375 518 1425 574 1500 480" strokeWidth="9" />
              <path d="M1058 174 H1238" strokeWidth="5" opacity="0.55" />
            </g>
            <g fill="#10b981" opacity="0.2">
              <rect x="9" y="286" width="28" height="30" rx="6" />
              <rect x="49" y="261" width="28" height="55" rx="6" />
              <rect x="89" y="275" width="28" height="41" rx="6" />
              <rect x="129" y="235" width="28" height="81" rx="6" />
              <rect x="1212" y="644" width="30" height="72" rx="7" />
              <rect x="1256" y="612" width="30" height="104" rx="7" />
              <rect x="1300" y="660" width="30" height="56" rx="7" />
            </g>
          </g>
        )}

        {variant === 'dashboard' && (
          <g className="section-artwork-analytics" fill="none">
            <g stroke="#34d399" strokeOpacity="0.13" strokeWidth="1">
              <path d="M0 190 H1440 M0 300 H1440 M0 410 H1440 M0 520 H1440 M0 630 H1440" />
              <path d="M160 80 V780 M360 80 V780 M560 80 V780 M760 80 V780 M960 80 V780 M1160 80 V780 M1360 80 V780" />
            </g>
            <path d="M-40 660 C130 620 180 430 355 515 C520 595 600 285 790 405 C975 522 1080 200 1485 290" stroke={`url(#${strokeId})`} strokeWidth="42" opacity="0.38" filter={`url(#${blurId})`} />
            <path d="M-40 660 C130 620 180 430 355 515 C520 595 600 285 790 405 C975 522 1080 200 1485 290" stroke={`url(#${strokeId})`} strokeWidth="7" />
            <g fill="#34d399" fillOpacity="0.38" stroke="#10b981" strokeWidth="3">
              <circle cx="355" cy="515" r="10" /><circle cx="790" cy="405" r="10" /><circle cx="1110" cy="326" r="10" />
            </g>
          </g>
        )}

        {variant === 'workflow' && (
          <g className="section-artwork-workflow" fill="none">
            <path d="M-80 225 C220 90 340 390 610 245 S1040 75 1510 250" stroke={`url(#${strokeId})`} strokeWidth="10" strokeDasharray="2 18" strokeLinecap="round" />
            <path d="M-120 720 C200 520 420 795 700 600 S1120 440 1530 675" stroke={`url(#${strokeId})`} strokeWidth="34" opacity="0.32" filter={`url(#${blurId})`} />
            <g fill="#ffffff" stroke="#10b981" strokeOpacity="0.4" strokeWidth="3">
              <rect x="168" y="150" width="52" height="52" rx="15" />
              <rect x="584" y="219" width="52" height="52" rx="15" />
              <rect x="1050" y="100" width="52" height="52" rx="15" />
              <rect x="1270" y="560" width="52" height="52" rx="15" />
            </g>
          </g>
        )}

        {variant === 'reviews' && (
          <g className="section-artwork-rings" fill="none" stroke={`url(#${strokeId})`}>
            <circle cx="80" cy="760" r="250" strokeWidth="3" opacity="0.5" />
            <circle cx="80" cy="760" r="190" strokeWidth="12" opacity="0.24" />
            <circle cx="1365" cy="155" r="230" strokeWidth="4" opacity="0.48" strokeDasharray="5 16" />
            <circle cx="1365" cy="155" r="165" strokeWidth="24" opacity="0.16" filter={`url(#${blurId})`} />
            <path d="M-40 480 C230 330 380 625 650 470 S1060 335 1480 500" strokeWidth="4" opacity="0.3" strokeDasharray="2 20" strokeLinecap="round" />
          </g>
        )}

        {variant === 'pricing' && (
          <g className="section-artwork-curves" fill="none" stroke={`url(#${strokeId})`} strokeLinecap="round">
            <path d="M-180 810 C180 370 390 880 700 520 C980 195 1170 630 1600 210" strokeWidth="80" opacity="0.24" filter={`url(#${blurId})`} />
            <path d="M-140 835 C180 465 425 860 730 545 C1005 260 1230 650 1550 350" strokeWidth="13" opacity="0.68" />
            <path d="M-90 755 C245 335 500 780 790 445 C1030 168 1270 525 1510 215" strokeWidth="5" opacity="0.48" />
            <path d="M100 930 C365 585 610 865 860 610 C1095 370 1280 670 1500 500" strokeWidth="3" opacity="0.4" strokeDasharray="3 19" />
          </g>
        )}

        {variant === 'contact' && (
          <g className="section-artwork-waves" fill="none" stroke={`url(#${strokeId})`} strokeLinecap="round">
            <path d="M-160 690 C130 430 325 805 610 570 C840 380 1085 690 1600 330" strokeWidth="100" opacity="0.25" filter={`url(#${blurId})`} />
            <path d="M-120 735 C150 495 340 825 635 600 C890 405 1125 710 1540 430" strokeWidth="16" opacity="0.68" />
            <path d="M-80 625 C205 390 405 755 690 515 C930 315 1180 625 1500 340" strokeWidth="6" opacity="0.48" />
            <path d="M15 820 C270 600 470 850 740 650 C990 465 1220 730 1480 570" strokeWidth="4" opacity="0.38" strokeDasharray="3 20" />
          </g>
        )}
      </svg>
    </div>
  );
};

export type SectionTransitionTone = 'light' | 'soft' | 'dark';

export const SectionTransition: React.FC<{ from: SectionTransitionTone }> = ({ from }) => (
  <div className={`section-transition section-transition--from-${from}`} aria-hidden="true">
    <svg viewBox="0 0 1440 96" preserveAspectRatio="none" focusable="false">
      <path className="section-transition-surface" d="M0 0H1440V25C1225 74 1050 11 817 42C578 74 352 91 0 38V0Z" />
      <path className="section-transition-ribbon" d="M-40 45C224 5 353 87 623 50C874 16 1084 75 1480 20" />
      <path className="section-transition-dots" d="M20 61C260 22 421 91 663 58C901 26 1120 81 1420 39" />
    </svg>
  </div>
);

