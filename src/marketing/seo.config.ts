// Single source of truth for the public marketing site's SEO surface.
// Pure data (plus seoPages.ts, which is data too): it is consumed by the Vite
// build (sitemap/robots generation, the prerender step) as well as the app.

import { SEO_PAGE_ROUTES } from "./seoPages";

export const SITE = {
  // Canonical host. Every canonical URL, sitemap <loc> and og:url is built
  // from this — never from the request host.
  origin: "https://www.salonox.com",
  name: "SalonOX",
  // One-line swap point for the default social preview image. Path is
  // relative to the site root (i.e. a file under public/).
  ogImage: "/og/salonox-og.png",
} as const;

// Social profiles: the footer links and the Organization JSON-LD sameAs both
// read this, so they cannot drift. Add a profile here only once it is real.
export const SOCIAL = {
  instagram: "https://www.instagram.com/salonox_crm",
} as const;

// Facts for Organization structured data. Only real, already-public details.
export const ORGANIZATION = {
  name: "SalonOX",
  logo: "/salonox-mark.jpg",
  email: "support@salonox.com",
  telephone: "+919503302647",
  sameAs: [SOCIAL.instagram],
  areaServed: ["IN", "AE"],
} as const;

// Plan prices shown in the landing page's pricing section AS PRERENDERED
// (Pricing.tsx builds its fallback plans from this list) and emitted in the
// SoftwareApplication JSON-LD offers, so the two cannot disagree. Crawlers only
// ever see these values: after load the page swaps to the live catalog from
// GET /salon-plans/definitions (Super Admin -> Plans & Subscriptions).
// KEEP THESE IN SYNC WITH THAT API PRICING whenever plans change.
// All plans are billed per year: the page shows PLAN_PERIOD.label next to every
// price and the JSON-LD offers carry the same period (priceSpecification), and
// the build fails if either side is missing.
export const PLAN_PERIOD = { label: "/year", duration: "P1Y", unitCode: "ANN", unitText: "year" } as const;
export const PLANS = [
  { tier: "basic", name: "Basic", price: 8000, description: "For business looking for essential management features to get started." },
  { tier: "advance", name: "Advance", price: 12000, description: "For business that need complete salon management functionality." },
  { tier: "pro", name: "Growth", price: 15000, description: "For growing business that need advanced digital and multi-branch capabilities." },
] as const;
export const PLAN_CURRENCY = "INR";

// Absolute URL from the canonical origin (never from the request host).
export const absoluteUrl = (p: string) => (/^https?:\/\//.test(p) ? p : `${SITE.origin}${p}`);

export interface MarketingRoute {
  /** Absolute path, no trailing slash except for the root "/". */
  path: string;
  title: string;
  description: string;
  /**
   * false → emitted with <meta name="robots" content="noindex,follow"> and
   * left out of sitemap.xml. Flip to true once the page has real copy.
   */
  indexable: boolean;
  /** Overrides SITE.ogImage for this page only. */
  ogImage?: string;
  /** Structured data blocks to emit. Only emitted when the page is indexable. */
  jsonLd?: JsonLdKind[];
  /** Visible FAQ entries (required for the "faq" block; must match what the page shows). */
  faqs?: { q: string; a: string }[];
}

export type JsonLdKind = "organization" | "software" | "faq";

const CORE_ROUTES: MarketingRoute[] = [
  {
    path: "/",
    title: "Salon Management Software | Billing, Staff & Marketing",
    description:
      "SalonOx is salon management software for billing, appointments, staff, reports, customer management and bulk WhatsApp marketing.",
    indexable: true,
    jsonLd: ["organization", "software"],
  },
  {
    path: "/terms",
    title: "Terms of Service | SalonOX",
    description: "The terms that apply to using SalonOX salon management software.",
    indexable: true,
  },
  {
    path: "/privacy",
    title: "Privacy Policy | SalonOX",
    description: "How SalonOX collects, uses and protects your salon and customer data.",
    indexable: true,
  },
  {
    path: "/about",
    title: "About SalonOX | Salon Management Software",
    description:
      "SalonOX helps salons, spas and beauty clinics run billing, appointments, staff and WhatsApp marketing from one place.",
    indexable: true,
    jsonLd: ["organization"],
  },
];

// Core pages plus the config-driven SEO landing pages (see seoPages.ts).
export const MARKETING_ROUTES: MarketingRoute[] = [...CORE_ROUTES, ...SEO_PAGE_ROUTES];

// Top-level path prefixes owned by the SPA: auth, onboarding, dashboards and
// the public per-salon pages. nginx falls back to the SPA shell ONLY for
// these; any other unknown path is a real 404. Matched on whole segments
// ("/oauth" does not cover "/oauth-success", which is why both are listed).
// nginx.conf must list the same set — scripts/prerender.mjs fails the build if
// it does not.
export const APP_ROUTE_PREFIXES = [
  "/dashboard",
  "/super-admin",
  "/branch-owner",
  "/reports",
  "/login",
  "/register",
  "/forgot-password",
  "/oauth",
  "/oauth-success",
  "/accept-invite",
  "/join-business",
  "/business-name",
  "/business-location",
  "/venue-location",
  "/team-size",
  "/team-setup",
  "/service-type",
  "/recommendation-source",
  "/send-request",
  "/request-success",
  "/setup-complete",
  "/feedback",
  "/book",
  "/menu",
];

export const isAppPath = (pathname: string) =>
  APP_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

// Public per-salon pages: served by the SPA but deliberately NOT blocked in
// robots.txt, so their noindex tag can be read (see PublicPageShell).
const ROBOTS_ALLOWED_APP_PREFIXES = ["/book", "/menu"];

export const ROBOTS_DISALLOW_PREFIXES = [
  "/api/",
  "/uploads/",
  ...APP_ROUTE_PREFIXES.filter((p) => !ROBOTS_ALLOWED_APP_PREFIXES.includes(p)),
];

// Served (with a real 404 status) for every path that is neither a file, a
// prerendered marketing page nor an app route.
export const NOT_FOUND_PAGE = {
  title: "Page not found | SalonOX",
  description: "The page you are looking for does not exist or has moved.",
} as const;
