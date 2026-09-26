// Single source of truth for the public marketing site's SEO surface.
// Pure data, no imports: it is consumed by the Vite build (sitemap/robots
// generation, and later the prerender step) as well as by the app itself.

export const SITE = {
  // Canonical host. Every canonical URL, sitemap <loc> and og:url is built
  // from this — never from the request host.
  origin: "https://www.salonox.com",
  name: "SalonOX",
  // One-line swap point for the default social preview image. Path is
  // relative to the site root (i.e. a file under public/).
  ogImage: "/og/salonox-og.png",
} as const;

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
}

export const MARKETING_ROUTES: MarketingRoute[] = [
  {
    path: "/",
    title: "Salon Management Software | Billing, Staff & Marketing",
    description:
      "SalonOx is salon management software for billing, appointments, staff, reports, customer management and bulk WhatsApp marketing.",
    indexable: true,
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
  },
];

// Authenticated app, auth/onboarding flow and private-token pages. Matched as
// path prefixes by robots.txt (so "/oauth" also covers "/oauth-success").
// Public per-salon pages (/book, /menu) are intentionally NOT listed.
export const ROBOTS_DISALLOW_PREFIXES = [
  "/api/",
  "/uploads/",
  "/dashboard",
  "/super-admin",
  "/branch-owner",
  "/reports",
  "/login",
  "/register",
  "/forgot-password",
  "/oauth",
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
];
