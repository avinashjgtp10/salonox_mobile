import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';
import PhoneInput, { type Country } from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import { isValidPhoneNumber, isPossiblePhoneNumber } from 'libphonenumber-js';
// @ts-ignore
import 'react-phone-number-input/style.css';
// @ts-ignore
import '../styles/landing.scss';


/* ============================================================================
   SalonOX — Premium Salon & Spa SaaS Landing Page
   Self-contained: no ThemeProvider, no Context API, no Redux, no extra files.
   ============================================================================ */

/* ---------------------------------- Icon set (inline SVG, zero deps) ---------------------------------- */

const Icon = {
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

type Feature = { icon: keyof typeof Icon; title: string; desc: string };
type WhyFeature = Feature & {
  tag?: string;
  modalTitle: string;
  modalDesc: string;
  benefits: string[];
  metric: string;
  metricLabel: string;
};
type Branch = { name: string; bookings: string; revenue: string };
type DemoForm = { name: string; email: string; phone: string; salon: string; city: string; locations: string; agreed: boolean };
const DEMO_PHONE_DEFAULT_COUNTRY: Country = 'IN';

const countryDisplayNames = typeof Intl.DisplayNames === 'function'
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null;
const countryName = (country: Country) => countryDisplayNames?.of(country) || country;

const FEATURES: Feature[] = [
  { icon: 'Calendar', title: 'Effortless scheduling', desc: 'Manage every chair, room, and stylist from one drag-and-drop calendar built for busy floors.' },
  { icon: 'Bell', title: 'No-show protection', desc: 'Automated reminders by SMS and email cut no-shows and keep your day full.' },
  { icon: 'Card', title: 'Integrated payments', desc: 'Take deposits, tips, and checkout in seconds with built-in point of sale.' },
  { icon: 'Users', title: 'Client intelligence', desc: 'See visit history, preferences, and spend the moment a client walks in.' },
  { icon: 'Megaphone', title: 'Marketing that works', desc: 'Win back lapsed clients and fill quiet hours with one-click campaigns.' },
  { icon: 'Shield', title: 'Enterprise-grade security', desc: 'Bank-level encryption and role-based access keep every record safe.' },
];

const WHY_SALONOX: { icon: keyof typeof Icon; title: string; desc: string; tag?: string }[] = [
  { icon: 'Building', title: 'Multi-Branch Ready', desc: 'Manage unlimited branches from a single dashboard. Each branch gets its own staff, schedule, and reports — all under one roof.', tag: 'Enterprise' },
  { icon: 'Cloud', title: 'Cloud Based', desc: 'Access your salon data from anywhere, on any device. No installations, no downtime — always up-to-date and always available.', tag: 'SaaS' },
  { icon: 'Receipt', title: 'GST Billing', desc: 'Generate GST-compliant invoices automatically. Handle taxes, discounts, and split payments with zero manual effort.', tag: 'India Ready' },
  { icon: 'MessageCircle', title: 'WhatsApp Marketing', desc: 'Send appointment reminders, promotional offers, and feedback requests directly on WhatsApp for maximum open rates.', tag: 'Marketing' },
  { icon: 'TrendingUp', title: 'Real-Time Analytics', desc: 'Track revenue, bookings, staff performance, and client retention live. Make data-driven decisions with instant insights.', tag: 'Analytics' },
  { icon: 'Shield', title: 'Secure & Scalable', desc: 'Bank-grade encryption, role-based access controls, and automatic backups keep your business data safe as you grow.', tag: 'Security' },
];

void WHY_SALONOX;

const WHY_FEATURE_DETAILS: WhyFeature[] = [
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
      'Centralized roles for owners, managers, and front desk teams',
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
      'Real-time syncing across all team devices',
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
    modalDesc: 'Protect client records, staff access, payments, and business reporting with controls designed for growing teams.',
    metric: 'RBAC',
    metricLabel: 'role-based controls for every team member',
    benefits: [
      'Role-based permissions for owners, managers, and staff',
      'Encrypted data handling for sensitive client records',
      'Automatic backups and recovery-minded operations',
      'Scales from single location to salon groups',
      'Access controls that keep teams focused and accountable',
    ],
  },
];

const MULTI_BRANCH_FEATURES: Feature[] = [
  { icon: 'Layers', title: 'Centralized Management', desc: 'Control schedules, services, and pricing for every branch from one unified dashboard — no more juggling logins.' },
  { icon: 'Bar', title: 'Branch Analytics', desc: 'Compare revenue, bookings, and utilization across locations with real-time, side-by-side reporting.' },
  { icon: 'Users', title: 'Staff Control', desc: 'Assign, schedule, and track staff per branch while keeping permissions and payroll centrally governed.' },
  { icon: 'Sync', title: 'Inventory Sync', desc: 'Keep retail stock and product levels synced across every branch, with automatic low-stock alerts.' },
  { icon: 'Report', title: 'Consolidated Reporting', desc: 'Generate branch-level or company-wide reports in one click, ready to export and share.' },
  { icon: 'Shield', title: 'Role-Based Access', desc: 'Granular permissions ensure managers, staff, and admins only see and touch what they need to.' },
];

const SHOWCASE = [
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

const TESTIMONIALS = [
  { name: 'Shubham Bagal', role: 'Owner, Elite Salon', quote: 'Bookings have never been smoother. Our no-show rate dropped by half within the first month.', initials: 'SB' },
  { name: 'Nishant Zanzane', role: 'Director, Premium Spa Co.', quote: 'The reporting alone paid for the subscription. We finally know which services actually drive revenue.', initials: 'NZ' },
  { name: 'Rutuja Pagale', role: 'Founder, Studio Beauty', quote: 'Clients love the booking page and our front desk loves how little they have to manage manually.', initials: 'RP' },
  { name: 'Shivani Dhumal', role: 'Manager, Glow Wellness', quote: 'The multi-branch dashboard is a game-changer. Managing three locations has become incredibly easy.', initials: 'SD' },
  { name: 'Avinash Jagtap', role: 'Owner, Lakme Salon', quote: 'Customer retention improved significantly thanks to the marketing automation features.', initials: 'AJ' },
];

const INITIAL_BRANCHES: Branch[] = [
  { name: 'Downtown', bookings: '128', revenue: '$5,420' },
  { name: 'Uptown', bookings: '94', revenue: '$3,860' },
  { name: 'Mall Plaza', bookings: '156', revenue: '$6,180' },
  { name: 'Riverside', bookings: '83', revenue: '$3,140' },
];

const NEW_BRANCH_NAMES = ['Harbor View', 'Garden District', 'North Park', 'Eastside', 'Old Town', 'West End'];
const DEMO_EMAIL = 'support@salonox.com';
const DEMO_SUBMIT_URL = `https://formsubmit.co/ajax/${DEMO_EMAIL}`;
const WHATSAPP_DEMO_URL = 'https://wa.me/919503302647?text=Hi%20SalonOX%20Team,%20I%20am%20interested%20in%20SalonOX.%20Please%20share%20more%20details%20and%20schedule%20a%20demo.';

type TermsSection = {
  title: string;
  body: string;
  bullets?: string[];
  email?: string;
};

const TERMS_SECTIONS: TermsSection[] = [
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
    body: 'Customers are responsible for all activity under their SalonOX account and for assigning appropriate access permissions to their Users. Account credentials must be kept confidential and may not be shared outside the authorized team. You agree to promptly update account information and notify SalonOX if you suspect unauthorized access, credential misuse, or a security incident involving your account.',
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

const PLANS = [
  {
    name: 'Starter', price: '29', desc: 'For independent stylists getting organized.',
    feats: ['1 staff member', 'Online booking page', 'Client profiles', 'Email reminders'],
    featured: false,
  },
  {
    name: 'Growth', price: '79', desc: 'For growing salons with a full team.',
    feats: ['Up to 10 staff', 'SMS + email reminders', 'Marketing automation', 'Payments & POS', 'Performance reports'],
    featured: true,
  },
  {
    name: 'Scale', price: '149', desc: 'For multi-location salon groups.',
    feats: ['Unlimited staff', 'Multi-location dashboard', 'Advanced analytics', 'Priority support', 'Custom roles & permissions'],
    featured: false,
  },
];

/* ---------------------------------- Scroll reveal hook ---------------------------------- */

function useReveal<T extends HTMLElement>() {
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

const Reveal: React.FC<{ children: React.ReactNode; delay?: 0 | 1 | 2 | 3 | 4; className?: string }> = ({
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

const FeatureProductPreview: React.FC<{ feature: WhyFeature }> = ({ feature }) => {
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

const TermsContent: React.FC = () => (
  <main className="terms-page" id="top">
    <section className="terms-hero">
      <div className="container terms-hero-grid">
        <div className="terms-hero-copy">
          <span className="eyebrow"><span className="dot" /> Legal</span>
          <h1>Terms & Conditions</h1>
          <p>
            Commercial terms for salons, spas, and teams using SalonOX cloud management software.
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

const PRIVACY_SECTIONS: TermsSection[] = [
  {
    title: 'Introduction',
    body: 'This Privacy Policy explains how SalonOX collects, uses, stores, shares, and protects the information of customers, team members, and end clients when they use our cloud-based Salon & Spa Management Software (SaaS). SalonOX is designed for salons, spas, clinics, and multi-branch service businesses and supports appointment scheduling, billing, inventory, CRM, marketing, memberships, staff management, and multi-location operations. By using SalonOX, you acknowledge that your information may be processed as described in this Privacy Policy.',
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

const PrivacyContent: React.FC = () => (
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

const ABOUT_OFFERS = [
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

const WHY_CHOOSE = [
  {
    title: 'Built for real salon teams',
    desc: 'SalonOX brings scheduling, checkout, client history, and operations into one elegant workspace so your team can move faster with less friction.',
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

type AboutContentProps = {
  onNavigateToBookDemo: (event: React.MouseEvent<HTMLElement>) => void;
};

const AboutContent: React.FC<AboutContentProps> = ({ onNavigateToBookDemo }) => (
  <main className="about-page" id="top">
    <section className="about-hero">
      <div className="container about-hero-grid">
        <div className="about-hero-copy">
          <span className="eyebrow"><span className="dot" /> About SalonOX</span>
          <h1>Modern salon software built for beauty businesses that want to grow with clarity.</h1>
          <p>
            SalonOX is a cloud-based Salon & Spa Management Software designed to help owners, managers, and teams manage appointments, billing, inventory, CRM, memberships, staff workflows, and multi-branch operations from one place.
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
          <span className="about-hero-card__kicker">Trusted by modern teams</span>
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
            SalonOX was created for businesses that need a premium operating system for salons and spas. Our platform combines elegant design with practical workflows so teams can focus on client experience instead of manual admin.
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
            We believe every salon and spa deserves technology that feels effortless, scalable, and beautifully designed. Our vision is to make modern business operations simple so teams can spend more time creating memorable client experiences.
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

/* ---------------------------------- Component ---------------------------------- */

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeBranch, setActiveBranch] = useState(0);
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [selectedWhyFeature, setSelectedWhyFeature] = useState<WhyFeature | null>(null);
  const isTermsPage = location.pathname === '/terms';
  const isPrivacyPage = location.pathname === '/privacy';
  const isAboutPage = location.pathname === '/about';
  const isContentPage = isTermsPage || isPrivacyPage || isAboutPage;

  useEffect(() => {
    const root = document.getElementById('root');
    const pageNodes = [document.documentElement, document.body, root].filter(
      (node): node is HTMLElement => Boolean(node)
    );

    pageNodes.forEach((node) => node.classList.add('landing-page-active'));

    return () => {
      pageNodes.forEach((node) => {
        node.classList.remove('landing-page-active');
        node.style.removeProperty('overflow');
      });
    };
  }, []);

  // The dashboard shell forces `overflow: hidden !important` + `height: 100%`
  // on html/body/#root (src/index.css) so its own panes can own scrolling.
  // That rule is global, so on this page it also clips #root to the viewport
  // and disables window scrolling. Restore natural height/scrolling while
  // this page is mounted, using `important` so it wins over the stylesheet
  // rule, and put everything back on unmount so the dashboard is unaffected.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const targets = [html, body, root].filter((el): el is HTMLElement => !!el);

    const prev = targets.map((el) => ({
      el,
      overflow: el.style.getPropertyValue('overflow'),
      overflowPriority: el.style.getPropertyPriority('overflow'),
      height: el.style.getPropertyValue('height'),
      heightPriority: el.style.getPropertyPriority('height'),
    }));

    html.style.setProperty('overflow', 'auto', 'important');
    body.style.setProperty('overflow', 'auto', 'important');
    body.style.setProperty('height', 'auto', 'important');
    root?.style.setProperty('overflow', 'visible', 'important');
    root?.style.setProperty('height', 'auto', 'important');

    return () => {
      prev.forEach(({ el, overflow, overflowPriority, height, heightPriority }) => {
        if (overflow) el.style.setProperty('overflow', overflow, overflowPriority);
        else el.style.removeProperty('overflow');
        if (height) el.style.setProperty('height', height, heightPriority);
        else el.style.removeProperty('height');
      });
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Locks page scroll behind the mobile drawer / feature modal. Must keep the
  // `important` priority from the effect above — a plain assignment here would
  // drop it, letting the global stylesheet rule silently reclaim scroll lock.
  useEffect(() => {
    document.body.style.setProperty(
      'overflow',
      mobileOpen || selectedWhyFeature ? 'hidden' : 'auto',
      'important'
    );
    if (isContentPage || !location.hash) return;

    window.requestAnimationFrame(() => {
      const id = location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (!el) return;

      const nav = document.querySelector<HTMLElement>('.salonox-landing .nav');
      const navOffset = nav ? nav.offsetHeight + 16 : 88;
      const targetTop = el.getBoundingClientRect().top + window.scrollY - navOffset;

      window.scrollTo({
        top: Math.max(targetTop, 0),
        behavior: 'smooth',
      });
    });
  }, [isContentPage, location.hash]);

  useEffect(() => {
    const root = document.getElementById('root');
    const pageNodes = [document.documentElement, document.body, root].filter(
      (node): node is HTMLElement => Boolean(node)
    );
    const overflow = mobileOpen || selectedWhyFeature ? 'hidden' : 'auto';

    pageNodes.forEach((node) => node.style.setProperty('overflow', overflow, 'important'));

    return () => {
      pageNodes.forEach((node) => node.style.removeProperty('overflow'));
    };
  }, [mobileOpen, selectedWhyFeature]);

  useEffect(() => {
    if (!selectedWhyFeature) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedWhyFeature(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedWhyFeature]);

  const handleAddBranch = useCallback(() => {
    setBranches((prev) => {
      const usedNames = new Set(prev.map((b) => b.name));
      const nextName =
        NEW_BRANCH_NAMES.find((name) => !usedNames.has(name)) || `Branch ${prev.length + 1}`;
      const newBranch: Branch = {
        name: nextName,
        bookings: String(Math.floor(40 + Math.random() * 100)),
        revenue: `$${(1500 + Math.floor(Math.random() * 4500)).toLocaleString()}`,
      };
      const updated = [...prev, newBranch];
      setActiveBranch(updated.length - 1);
      return updated;
    });
  }, []);

  const scrollToId = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    const nav = document.querySelector<HTMLElement>('.salonox-landing .nav');
    const navOffset = nav ? nav.offsetHeight + 16 : 88;
    const targetTop = el.getBoundingClientRect().top + window.scrollY - navOffset;

    window.scrollTo({
      top: Math.max(targetTop, 0),
      behavior: 'smooth',
    });

    window.history.replaceState(null, '', `#${id}`);
  }, []);

  // Below-the-fold lazy images (e.g. the "how it works" showcase screenshots)
  // can still be loading when a nav click fires, growing the page and shifting
  // every section beneath them further down mid-animation. That leaves the
  // target computed at click time stale, so the smooth scroll lands short —
  // it looks like the scroll stopped "halfway" into the section. Re-issuing
  // the scroll once things settle corrects for that. Guarded by id so a
  // second, newer click isn't overridden by a stale correction.
  const pendingScrollId = useRef<string | null>(null);
  const scrollToIdSettled = useCallback(
    (id: string) => {
      pendingScrollId.current = id;
      scrollToId(id);
      window.setTimeout(() => {
        if (pendingScrollId.current === id) scrollToId(id);
      }, 550);
    },
    [scrollToId]
  );

  // Runs once per mount so a navbar link clicked from another route (e.g. the
  // About or Terms pages) lands here, then scrolls to the requested section.
  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    const t = setTimeout(() => scrollToIdSettled(id), 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToSection = useCallback(
    (id: string) => (e: React.MouseEvent<HTMLElement>) => {
      e.preventDefault();

      setMobileOpen(false);
      setSelectedWhyFeature(null);
      document.body.style.overflow = '';

      if (isContentPage) {
        navigate(`/#${id}`);
        return;
      }

      window.requestAnimationFrame(() => scrollToIdSettled(id));
    },
    [isContentPage, navigate, scrollToIdSettled]
  );

  const jumpToSection = useCallback(
    (id: string) => {
      setSelectedWhyFeature(null);
      setMobileOpen(false);

      if (isContentPage) {
        navigate(`/#${id}`);
        return;
      }

      window.requestAnimationFrame(() => scrollToIdSettled(id));
    },
    [isContentPage, navigate, scrollToIdSettled]
  );

  const handleContentRouteClick = useCallback(
    (path: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      setMobileOpen(false);
      setSelectedWhyFeature(null);

      if (location.pathname === path) {
        e.preventDefault();
        window.requestAnimationFrame(() => {
          window.scrollTo({
            top: 0,
            behavior: 'smooth',
          });
        });
        return;
      }

      e.preventDefault();
      navigate(path);

      window.setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }, 80);
    },
    [location.pathname, navigate]
  );

  const handleContactUsClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      setMobileOpen(false);
      setSelectedWhyFeature(null);

      const goToContact = () => {
        const el = document.getElementById('book-demo');
        if (!el) return;

        const nav = document.querySelector<HTMLElement>('.salonox-landing .nav');
        const navOffset = nav ? nav.offsetHeight + 16 : 88;
        const targetTop = el.getBoundingClientRect().top + window.scrollY - navOffset;

        window.scrollTo({
          top: Math.max(targetTop, 0),
          behavior: 'smooth',
        });
        window.history.replaceState(null, '', '/#book-demo');
      };

      if (location.pathname === '/') {
        goToContact();
        return;
      }

      navigate('/');
      window.setTimeout(goToContact, 140);
    },
    [location.pathname, navigate]
  );

  const [demoForm, setDemoForm] = useState<DemoForm>({
    name: '',
    email: '',
    phone: '',
    salon: '',
    city: '',
    locations: '',
    agreed: false,
  });
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [demoError, setDemoError] = useState('');
  const [phoneCountry, setPhoneCountry] = useState<Country | undefined>(DEMO_PHONE_DEFAULT_COUNTRY);
  const [phoneError, setPhoneError] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);

  const handleDemoChange = useCallback(
    (field: keyof Omit<DemoForm, 'phone'>) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target instanceof HTMLInputElement && e.target.type === 'checkbox'
        ? e.target.checked
        : e.target.value;

      setDemoForm((prev) => ({ ...prev, [field]: value }));
      setDemoError('');
    },
    []
  );

  const validatePhone = useCallback((value: string, country: Country | undefined) => {
    if (!value) return 'Mobile number is required.';
    if (!isPossiblePhoneNumber(value)) return 'Enter a complete mobile number.';
    if (!isValidPhoneNumber(value, country)) {
      return `Enter a valid mobile number for ${country ? countryName(country) : 'the selected country'}.`;
    }
    return '';
  }, []);

  // Re-runs off committed state (not handler closures) so a country switch —
  // which renormalizes the stored E.164 value on its own render cycle — always
  // gets validated against the pairing that actually lands, never a stale one.
  useEffect(() => {
    if (!phoneTouched) return;
    setPhoneError(validatePhone(demoForm.phone, phoneCountry));
  }, [demoForm.phone, phoneCountry, phoneTouched, validatePhone]);

  const handlePhoneChange = useCallback((value?: string) => {
    setDemoForm((prev) => ({ ...prev, phone: value || '' }));
    setDemoError('');
  }, []);

  const handlePhoneBlur = useCallback(() => {
    setPhoneTouched(true);
  }, []);

  const handlePhoneCountryChange = useCallback((country?: Country) => {
    setPhoneCountry(country);
  }, []);

  const handleDemoSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const phoneValidationError = validatePhone(demoForm.phone, phoneCountry);
      if (phoneValidationError) {
        setPhoneTouched(true);
        setPhoneError(phoneValidationError);
        return;
      }

      setDemoSubmitting(true);
      setDemoError('');

      try {
        const response = await fetch(DEMO_SUBMIT_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            _subject: `SalonOX demo request from ${demoForm.salon}`,
            _template: 'table',
            _captcha: 'false',
            _replyto: demoForm.email,
            name: demoForm.name,
            work_email: demoForm.email,
            phone_number: demoForm.phone,
            salon_name: demoForm.salon,
            city: demoForm.city,
            locations: demoForm.locations,
          }),
        });

        if (!response.ok) {
          throw new Error('Demo request failed');
        }

        setDemoSubmitted(true);
      } catch {
        setDemoError('We could not send your demo request. Please try again or email support@salonox.com.');
      } finally {
        setDemoSubmitting(false);
      }
    },
    [demoForm, phoneCountry, validatePhone]
  );

  return (
    <div className="salonox-landing">
      {/* ============================== NAVBAR ============================== */}
      <nav className={`nav ${scrolled ? 'nav-scrolled' : ''}`}>
        <div className="container nav-inner">
          <a href="#top" className="nav-logo" onClick={scrollToSection('top')}>
            <span className="logo-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2c2 3 6 4 6 9a6 6 0 0 1-12 0c0-5 4-6 6-9Z" />
              </svg>
            </span>
            <span className="logo-text">
              Salon<span className="accent">OX</span>
            </span>
          </a>

          <ul className="nav-links">
            <li><a className="nav-link" href="#why-salonox" onClick={scrollToSection('why-salonox')}>Why SalonOX</a></li>
            <li><a className="nav-link" href="#features" onClick={scrollToSection('features')}>Features</a></li>
            <li><a className="nav-link" href="#multi-branch" onClick={scrollToSection('multi-branch')}>Multi-Branch</a></li>
            <li><a className="nav-link nav-link-btn" href="#how" onClick={scrollToSection('how')}>How it works</a></li>
            <li><a className="nav-link" href="#pricing" onClick={scrollToSection('pricing')}>Pricing</a></li>
            <li><a className="nav-link" href="#testimonials" onClick={scrollToSection('testimonials')}>Reviews</a></li>
          </ul>

          <div className="nav-actions">
            <Link to="/login" className="btn btn-ghost btn-sm nav-desktop-cta">Log in</Link>
            <a href="#book-demo" className="btn btn-primary btn-sm nav-desktop-cta" onClick={scrollToSection('book-demo')}>Book Demo</a>
            <button
              className={`nav-burger ${mobileOpen ? 'is-open' : ''}`}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </nav>

      {/* ============================== MOBILE DRAWER ============================== */}
      <div className={`mobile-drawer ${mobileOpen ? 'is-open' : ''}`} onClick={() => setMobileOpen(false)}>
        <div className="mobile-drawer-panel" onClick={(e) => e.stopPropagation()}>
          <div className="mobile-drawer-header">
            <a href="#top" className="nav-logo" onClick={scrollToSection('top')}>
              <span className="logo-mark">
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2c2 3 6 4 6 9a6 6 0 0 1-12 0c0-5 4-6 6-9Z" />
                </svg>
              </span>
              <span className="logo-text">
                Salon<span className="accent">OX</span>
              </span>
            </a>
            <button type="button" className="mobile-close" aria-label="Close menu" onClick={() => setMobileOpen(false)}>
              <span />
              <span />
            </button>
          </div>
          <a href="#why-salonox" className="mobile-link" onClick={scrollToSection('why-salonox')}>Why SalonOX</a>
          <a href="#features" className="mobile-link" onClick={scrollToSection('features')}>Features</a>
          <a href="#multi-branch" className="mobile-link" onClick={scrollToSection('multi-branch')}>Multi-Branch</a>
          <a href="#how" className="mobile-link mobile-link-btn" onClick={scrollToSection('how')}>How it works</a>
          <a href="#pricing" className="mobile-link" onClick={scrollToSection('pricing')}>Pricing</a>
          <a href="#testimonials" className="mobile-link" onClick={scrollToSection('testimonials')}>Reviews</a>
          <div className="mobile-cta">
            <Link to="/login" className="btn btn-ghost btn-block" onClick={() => setMobileOpen(false)}>Log in</Link>
            <a href="#book-demo" className="btn btn-primary btn-block" onClick={scrollToSection('book-demo')}>Book Demo</a>
          </div>
        </div>
      </div>

      {isContentPage ? (
        isTermsPage ? <TermsContent /> : isPrivacyPage ? <PrivacyContent /> : <AboutContent onNavigateToBookDemo={scrollToSection('book-demo')} />
      ) : (
        <>
      {/* ============================== HERO ============================== */}
      <header id="top" className="hero">
        <span className="hero-blob hero-blob-1" />
        <span className="hero-blob hero-blob-2" />

        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow"><span className="dot" /> Trusted by 4,000+ salons worldwide</span>
            <h1>
              The Complete <span className="grad">Operating System</span> for Modern Salons
            </h1>
            <p className="hero-sub">
              Manage appointments, customers, staff, billing, memberships, inventory, marketing, and multiple branches from one powerful platform.
            </p>
            <div className="hero-cta-row">
              <a href="#book-demo" className="btn btn-primary" onClick={scrollToSection('book-demo')}>
                Book Demo <Icon.Arrow />
              </a>
              <a href="#how" className="hero-play" onClick={scrollToSection('how')}>
                <span className="play-circle"><Icon.Play /></span>
                Watch 90-sec demo
              </a>
            </div>
            <div className="hero-trust">
              <div className="trust-avatars">
                <span>AC</span>
                <span>DR</span>
                <span>PN</span>
                <span>+</span>
              </div>
              <p className="trust-text"><strong>4.9/5</strong> average rating from 2,300+ reviews</p>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-mock">
              <div className="float-card glass-card float-card-1">
                <span className="float-icon"><Icon.Calendar /></span>
                <span>
                  <span className="float-label">Today's bookings</span>
                  <span className="float-value">38 appointments</span>
                </span>
              </div>

              <div className="mock-frame">
                <div className="mock-topbar">
                  <i /><i /><i />
                </div>
                <div className="mock-body">
                  <HeroRevenueChart />
                  <div className="mock-list">
                    <div className="mock-list-item">
                      <span className="avatar" />
                      <span className="lines"><span className="l1" /><span className="l2" /></span>
                      <span className="status">Confirmed</span>
                    </div>
                    <div className="mock-list-item">
                      <span className="avatar" />
                      <span className="lines"><span className="l1" /><span className="l2" /></span>
                      <span className="status">Confirmed</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="float-card glass-card float-card-2">
                <span className="float-icon"><Icon.Card /></span>
                <span>
                  <span className="float-label">Paid today</span>
                  <span className="float-value">₹4,210</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ============================== LOGO STRIP ============================== */}
      <section className="logo-strip">
        <div className="container">
          <Reveal>
            <p className="logo-strip-label">Powering appointments for modern salons and spas</p>
          </Reveal>
          <Reveal delay={1}>
            <div className="logo-strip-row">
              <span>Lumière</span>
              <span>Bloom & Co.</span>
              <span>The Glow Room</span>
              <span>Studio Lux</span>
              <span>VELVET</span>
              <span>Maison Hair</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================== STATS ============================== */}
      <section className="stats">
        <div className="container">
          <Reveal>
            <div className="stats-grid">
              <div className="stat-cell">
                <div className="stat-num"><span>4,000+</span></div>
                <div className="stat-label">Salons on SalonOX</div>
              </div>
              <div className="stat-cell">
                <div className="stat-num"><span>2.8M</span></div>
                <div className="stat-label">Bookings processed</div>
              </div>
              <div className="stat-cell">
                <div className="stat-num"><span>38%</span></div>
                <div className="stat-label">Fewer no-shows</div>
              </div>
              <div className="stat-cell">
                <div className="stat-num"><span>4.9/5</span></div>
                <div className="stat-label">Average rating</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================== WHY SALONOX ============================== */}
      <section id="why-salonox" className="why-section">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <span className="eyebrow"><span className="dot" /> Why SalonOX</span>
              <h2>Built for the way modern salons operate</h2>
              <p>Every feature is designed around real salon workflows — so your team is productive from day one, not after weeks of training.</p>
            </div>
          </Reveal>

          <div className="why-grid">
            {WHY_FEATURE_DETAILS.map((item, i) => {
              const Cmp = Icon[item.icon];
              return (
                <Reveal key={item.title} delay={(i % 3) as 0 | 1 | 2}>
                  <button
                    type="button"
                    className="why-card"
                    aria-haspopup="dialog"
                    aria-label={`Open ${item.title} feature details`}
                    onClick={() => setSelectedWhyFeature(item)}
                  >
                    <div className="why-card-top">
                      <span className="why-icon"><Cmp /></span>
                      {item.tag && <span className="why-tag">{item.tag}</span>}
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                    <span className="why-arrow">→</span>
                  </button>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================== FEATURES ============================== */}
      <section id="features" className="features">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <span className="eyebrow"><span className="dot" /> Platform</span>
              <h2>Everything your salon needs, in one place</h2>
              <p>Replace a stack of spreadsheets and apps with a single platform built for the way salons actually work.</p>
            </div>
          </Reveal>

          <div className="features-grid">
            {FEATURES.map((feature, i) => {
              const Cmp = Icon[feature.icon];
              return (
                <Reveal key={feature.title} delay={(i % 3) as 0 | 1 | 2}>
                  <div className="feature-card">
                    <span className="feature-icon"><Cmp /></span>
                    <h3>{feature.title}</h3>
                    <p>{feature.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={1}>
            <div className="spotlight-card">
              <div className="spotlight-copy">
                <span className="eyebrow"><span className="dot" /> Multi-location</span>
                <h3>Run every branch from one login</h3>
                <p>
                  Switch between locations in a click. Staff, schedules, and reporting stay separate per
                  branch, while you see the whole business from a single dashboard.
                </p>
                <button type="button" className="btn btn-dark btn-sm spotlight-add" onClick={handleAddBranch}>
                  <Icon.Layers /> Add a new branch
                </button>
              </div>

              <div className="spotlight-panel">
                <div className="branch-pills" aria-label="Branches">
                  {branches.map((branch, i) => (
                    <button
                      key={branch.name}
                      type="button"
                      className={`branch-pill ${activeBranch === i ? 'is-active' : ''}`}
                      onClick={() => setActiveBranch(i)}
                    >
                      {branch.name}
                    </button>
                  ))}
                </div>

                <div className="branch-stat-row">
                  <div className="branch-stat">
                    <span className="branch-stat-label">Today's bookings</span>
                    <span className="branch-stat-value">{branches[activeBranch].bookings}</span>
                  </div>
                  <div className="branch-stat">
                    <span className="branch-stat-label">Today's revenue</span>
                    <span className="branch-stat-value">{branches[activeBranch].revenue}</span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================== MULTI-BRANCH ============================== */}
      <section id="multi-branch" className="mb-section">
        <span className="mb-glow mb-glow-1" />
        <span className="mb-glow mb-glow-2" />
        <div className="container">
          <Reveal>
            <div className="section-head">
              <span className="eyebrow"><span className="dot" /> Multi-Branch</span>
              <h2>One platform. Every branch. Total control.</h2>
              <p>
                Built for salon groups, not just single locations. Run every branch with the same
                tools, oversight, and polish, without adding a single extra login.
              </p>
            </div>
          </Reveal>

          <div className="mb-grid">
            {MULTI_BRANCH_FEATURES.map((feature, i) => {
              const Cmp = Icon[feature.icon];
              return (
                <Reveal key={feature.title} delay={(i % 3) as 0 | 1 | 2}>
                  <div className="mb-card">
                    <span className="mb-card-icon"><Cmp /></span>
                    <h3>{feature.title}</h3>
                    <p>{feature.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================== HOW IT WORKS — SHOWCASE ============================== */}
      <section id="how" className="how">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <span className="eyebrow"><span className="dot" /> How It Works</span>
              <h2>See SalonOX in action</h2>
              <p>From dashboard to checkout — everything your salon needs, beautifully designed and ready to use from day one.</p>
            </div>
          </Reveal>

          <div className="showcase-grid">
            {SHOWCASE.map((item) => {
              const Cmp = Icon[item.icon];
              return (
                <Reveal key={item.title} delay={0}>
                  <div className="showcase-card">
                    <div className="showcase-img-wrap">
                      <div className="browser-mock">
                        <div className="browser-header">
                          <span className="dot" />
                          <span className="dot" />
                          <span className="dot" />
                        </div>
                        <img src={item.image} alt={item.title} className="showcase-img" loading="lazy" />
                      </div>
                      <span className="showcase-badge">
                        <Cmp />
                      </span>
                    </div>
                    <div className="showcase-info">
                      <h3>{item.title}</h3>
                      <p>{item.desc}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================== TESTIMONIALS ============================== */}
      <section id="testimonials" className="testimonials">
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

      {/* ============================== PRICING ============================== */}
      <section id="pricing" className="pricing">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <span className="eyebrow"><span className="dot" /> Pricing</span>
              <h2>Simple plans that scale with you</h2>
              <p>Start free for 14 days. No credit card required. Cancel anytime.</p>
            </div>
          </Reveal>

          <div className="pricing-grid">
            {PLANS.map((plan, i) => (
              <Reveal key={plan.name} delay={i as 0 | 1 | 2}>
                <div className={`price-card ${plan.featured ? 'is-featured' : ''}`}>
                  {plan.featured && <span className="price-badge">Most popular</span>}
                  <div className="price-name">{plan.name}</div>
                  <div className="price-amt">${plan.price}<span>/month</span></div>
                  <p className="price-desc">{plan.desc}</p>
                  <div className="price-feats">
                    {plan.feats.map((f) => (
                      <div className="price-feat" key={f}><Icon.Check /> {f}</div>
                    ))}
                  </div>
                  <a href="#" className={`btn btn-block ${plan.featured ? 'btn-primary' : 'btn-ghost'}`}>
                    Get started
                  </a>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================== BOOK A DEMO ============================== */}
      <section id="book-demo" className="demo-section">
        <div className="container demo-grid">
          <Reveal className="demo-copy">
            <h2>Ready to Grow Your Salon Business?</h2>
            <p>Everything you need to manage and scale your salon operations from one platform.</p>
            <div className="demo-contact">
              <a href={`mailto:${DEMO_EMAIL}`} className="demo-contact-row">
                <span className="demo-contact-icon"><Icon.Mail /></span>
                {DEMO_EMAIL}
              </a>
              <a href="tel:+919503302647" className="demo-contact-row">
                <span className="demo-contact-icon"><Icon.Phone /></span>
                +91 9503302647
              </a>
            </div>
          </Reveal>

          <Reveal delay={1} className="demo-card-wrap">
            <div className="demo-card">
              {demoSubmitted ? (
                <div className="demo-success">
                  <span className="demo-success-icon"><Icon.Check /></span>
                  <h3>Thanks — you're booked in!</h3>
                  <p>A member of our team will reach out within 1 business day to confirm your demo.</p>
                </div>
              ) : (
                <>
                  <h3>Schedule a Free Demo</h3>
                  <p>See SalonOX live in action and ask all your questions.</p>
                  <form className="demo-form" onSubmit={handleDemoSubmit}>
                    <label className="demo-field">
                      <span>Your Name</span>
                      <input
                        type="text"
                        required
                        placeholder="Jordan Lee"
                        value={demoForm.name}
                        onChange={handleDemoChange('name')}
                      />
                    </label>
                    <label className="demo-field">
                      <span>Work Email</span>
                      <input
                        type="email"
                        required
                        placeholder="you@yoursalon.com"
                        value={demoForm.email}
                        onChange={handleDemoChange('email')}
                      />
                    </label>
                    <label className="demo-field">
                      <span>Mobile Number</span>
                      <PhoneInput
                        addInternationalOption={false}
                        defaultCountry={DEMO_PHONE_DEFAULT_COUNTRY}
                        flags={flags}
                        placeholder="9876543210"
                        value={demoForm.phone}
                        onChange={handlePhoneChange}
                        onCountryChange={handlePhoneCountryChange}
                        onBlur={handlePhoneBlur}
                        numberInputProps={{ required: true }}
                        className={phoneTouched && phoneError ? 'PhoneInput--invalid' : ''}
                        aria-invalid={phoneTouched && !!phoneError}
                        aria-describedby={phoneTouched && phoneError ? 'demo-phone-error' : undefined}
                      />
                      {phoneTouched && phoneError && (
                        <span className="demo-field-error" id="demo-phone-error" role="alert">{phoneError}</span>
                      )}
                    </label>
                    <label className="demo-field">
                      <span>Salon Name</span>
                      <input
                        type="text"
                        required
                        placeholder="e.g. The Glow Room"
                        value={demoForm.salon}
                        onChange={handleDemoChange('salon')}
                      />
                    </label>
                    <label className="demo-field">
                      <span>City</span>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Mumbai"
                        value={demoForm.city}
                        onChange={handleDemoChange('city')}
                      />
                    </label>
                    <label className="demo-field">
                      <span>Locations</span>
                      <select required value={demoForm.locations} onChange={handleDemoChange('locations')}>
                        <option value="" disabled>Select locations count</option>
                        <option value="1">1 location</option>
                        <option value="2-5">2–5 locations</option>
                        <option value="6-15">6–15 locations</option>
                        <option value="16+">16+ locations</option>
                      </select>
                    </label>
                    {demoError && <p className="demo-error" role="alert">{demoError}</p>}
                    <button type="submit" className="btn btn-primary btn-block" disabled={demoSubmitting}>
                      {demoSubmitting ? 'Sending...' : 'Schedule Demo'}
                    </button>
                    <label className="demo-consent">
                      <input
                        type="checkbox"
                        required
                        checked={demoForm.agreed}
                        onChange={handleDemoChange('agreed')}
                      />
                      <span>By checking, you agree to receive follow-up emails regarding SalonOX product demos.</span>
                    </label>
                  </form>
                </>
              )}
            </div>
          </Reveal>
        </div>
      </section>
        </>
      )}

      {/* ============================== FOOTER ============================== */}
      <footer className="footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <a href="#top" className="nav-logo" onClick={scrollToSection('top')}>
                <span className="logo-mark">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2c2 3 6 4 6 9a6 6 0 0 1-12 0c0-5 4-6 6-9Z" />
                  </svg>
                </span>
                <span className="logo-text">Salon<span className="accent">OX</span></span>
              </a>
              <p>The all-in-one platform for salons and spas to book, manage, and grow with confidence.</p>
              <div className="footer-social">
                <a href="#" aria-label="Twitter"><Icon.Twitter /></a>
                <a href="https://www.instagram.com/salonox_crm?igsh=eG40bHd4dG9mNnJn" aria-label="Instagram" target="_blank" rel="noopener noreferrer"><Icon.Instagram /></a>
                <a
                  href={WHATSAPP_DEMO_URL}
                  aria-label="WhatsApp"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon.WhatsApp />
                </a>
                <a href="#" aria-label="LinkedIn"><Icon.Linkedin /></a>
                <a href="#" aria-label="Facebook"><Icon.Facebook /></a>
              </div>
            </div>

            <div className="footer-col">
              <h5>Product</h5>
              <ul>
                <li><a href="#features" onClick={scrollToSection('features')}>Scheduling</a></li>
                <li><a href="#features" onClick={scrollToSection('features')}>Payments</a></li>
                <li><a href="#features" onClick={scrollToSection('features')}>Marketing</a></li>
                <li><a href="#pricing" onClick={scrollToSection('pricing')}>Pricing</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h5>Company</h5>
              <ul>
                <li><Link to="/about" onClick={handleContentRouteClick('/about')}>About</Link></li>
                <li><a href="#book-demo" onClick={handleContactUsClick}>Contact Us</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h5>Resources</h5>
              <ul>
                <li><a href="#">Help center</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">API docs</a></li>
                <li><a href="#">Community</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h5>Legal</h5>
              <ul>
                <li><Link to="/terms" onClick={handleContentRouteClick('/terms')}>Terms & Conditions</Link></li>
                <li><Link to="/privacy" onClick={handleContentRouteClick('/privacy')}>Privacy Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} SalonOX. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {selectedWhyFeature && (
        <div className="feature-modal-backdrop" onClick={() => setSelectedWhyFeature(null)}>
          <div
            className="feature-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="why-feature-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="feature-modal-close"
              aria-label="Close feature details"
              onClick={() => setSelectedWhyFeature(null)}
            >
              <span />
              <span />
            </button>

            <div className="feature-modal-visual" aria-hidden="true">
              <div className="feature-modal-visual-card">
                <FeatureProductPreview feature={selectedWhyFeature} />
              </div>
            </div>

            <div className="feature-modal-copy">
              <span className="feature-modal-kicker">{selectedWhyFeature.tag}</span>
              <h3 id="why-feature-modal-title">{selectedWhyFeature.modalTitle}</h3>
              <p>{selectedWhyFeature.modalDesc}</p>

              <ul className="feature-modal-benefits">
                {selectedWhyFeature.benefits.map((benefit) => (
                  <li key={benefit}>
                    <span><Icon.Check /></span>
                    {benefit}
                  </li>
                ))}
              </ul>

              <div className="feature-modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => jumpToSection('how')}>
                  <Icon.Play /> Watch Demo
                </button>
                <button type="button" className="btn btn-primary" onClick={() => jumpToSection('book-demo')}>
                  Book Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <a
        href={WHATSAPP_DEMO_URL}
        className="floating-whatsapp-cta"
        aria-label="Chat with SalonOX on WhatsApp"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="floating-whatsapp-cta__icon" aria-hidden="true">
          <Icon.WhatsApp />
        </span>
      </a>
    </div>
  );
};

export default LandingPage;
