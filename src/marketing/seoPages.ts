import type { JsonLdKind, MarketingRoute } from "./seo.config";

// Config-driven SEO landing pages. To add a page, add ONE entry:
//   - a business type  -> VERTICALS
//   - a city           -> CITIES
// Each becomes a prerendered page rendered by SeoLandingPage.tsx.
//
// Every page starts as a draft (indexable: false). A draft is NOT built at all,
// so its URL returns a real 404 in production and it never reaches the sitemap.
// Enable pages one at a time: replace the TODO copy, then set `indexable: true`
// on that VERTICALS / CITIES entry. An enabled page is emitted with
// index,follow, listed in sitemap.xml and gets its structured data.
//
// To preview drafts while writing copy, build with SEO_INCLUDE_DRAFTS=1
// (npm run build). They are then emitted with noindex,follow and no structured
// data, and still left out of the sitemap.

const INDEXABLE_BY_DEFAULT = false;

// Injected by vite.config.ts from the SEO_INCLUDE_DRAFTS environment variable;
// undefined when this file is evaluated outside a Vite build.
declare const __SEO_INCLUDE_DRAFTS__: boolean | undefined;
const INCLUDE_DRAFTS = typeof __SEO_INCLUDE_DRAFTS__ !== "undefined" && __SEO_INCLUDE_DRAFTS__;

export interface SeoPage {
  slug: string;
  h1: string;
  title: string;
  description: string;
  /** Singular, used in the WhatsApp message ("my salon"). */
  audienceSingular: string;
  city?: string;
  /** "plans" shows the INR plans from PLANS; "todo" shows a placeholder. */
  pricing: "plans" | "todo";
  intro: string;
  painPoints: { title: string; body: string }[];
  features: { title: string; body: string }[];
  faqs: { q: string; a: string }[];
  indexable: boolean;
}

const todo = (what: string) => `TODO: ${what}`;

interface Vertical {
  slug: string;
  h1: string;
  titleKeyword: string;
  audience: string;
  audienceSingular: string;
  /** Set true once the copy is written. Defaults to INDEXABLE_BY_DEFAULT. */
  indexable?: boolean;
}

const VERTICALS: Vertical[] = [
  { slug: "salon-software", h1: "Salon Software for Billing, Appointments & Staff", titleKeyword: "Salon Management Software", audience: "salons", audienceSingular: "salon" },
  { slug: "spa-software", h1: "Spa Software for Bookings, Packages & Therapist Scheduling", titleKeyword: "Spa Management Software", audience: "spas", audienceSingular: "spa" },
  { slug: "beauty-clinic-software", h1: "Beauty Clinic Software for Appointments, Records & Billing", titleKeyword: "Beauty Clinic Software", audience: "beauty clinics", audienceSingular: "beauty clinic" },
  { slug: "salon-billing-software", h1: "Salon Billing Software with GST Invoicing & Quick Sale", titleKeyword: "Salon Billing Software", audience: "salons", audienceSingular: "salon" },
];

interface City {
  slug: string;
  city: string;
  /** Prices are only shown for INR markets; other markets show a TODO. */
  pricing: "plans" | "todo";
  /** Set true once the copy is written. Defaults to INDEXABLE_BY_DEFAULT. */
  indexable?: boolean;
}

const CITIES: City[] = [
  { slug: "pune", city: "Pune", pricing: "plans" },
  { slug: "mumbai", city: "Mumbai", pricing: "plans" },
  { slug: "nashik", city: "Nashik", pricing: "plans" },
  // TODO: AED pricing not decided yet, so the page shows a placeholder.
  { slug: "dubai", city: "Dubai", pricing: "todo" },
];

function body(brand: string, audience: string, place: string) {
  return {
    intro: todo(`intro paragraph for ${audience}${place}`),
    painPoints: [1, 2, 3].map((n) => ({
      title: todo(`pain point ${n} for ${audience}${place}`),
      body: todo(`one or two sentences on pain point ${n}`),
    })),
    features: [1, 2, 3, 4, 5, 6].map((n) => ({
      title: todo(`feature ${n} headline`),
      body: todo(`one or two sentences on how ${brand} handles feature ${n} for ${audience}${place}`),
    })),
    faqs: [1, 2, 3, 4].map((n) => ({
      q: todo(`FAQ ${n} question for ${audience}${place}`),
      a: todo(`FAQ ${n} answer`),
    })),
  };
}

function verticalPages(brand: string): SeoPage[] {
  return VERTICALS.map((v) => ({
  slug: v.slug,
  h1: v.h1,
  title: `${v.titleKeyword} for India | ${brand}`,
  description: todo(`meta description (about 150 characters) for ${v.titleKeyword.toLowerCase()}`),
  audienceSingular: v.audienceSingular,
  pricing: "plans",
  indexable: v.indexable ?? INDEXABLE_BY_DEFAULT,
  ...body(brand, v.audience, ""),
}));
}

function cityPages(brand: string): SeoPage[] {
  return CITIES.map((c) => ({
  slug: `salon-software-${c.slug}`,
  h1: `Salon Software in ${c.city}: Billing, Appointments & WhatsApp Marketing`,
  title: `Salon Management Software in ${c.city} | ${brand}`,
  description: todo(`meta description (about 150 characters) for salon software in ${c.city}`),
  audienceSingular: "salon",
  city: c.city,
  pricing: c.pricing,
  indexable: c.indexable ?? INDEXABLE_BY_DEFAULT,
  ...body(brand, "salons", ` in ${c.city}`),
}));
}

/** All configured pages (drafts included). The brand is passed in from seo.config.ts. */
export const buildSeoPages = (brand: string): SeoPage[] => [...verticalPages(brand), ...cityPages(brand)];

// Only enabled pages become routes (and so files); drafts appear only in preview builds.
export const buildSeoPageRoutes = (pages: SeoPage[]): MarketingRoute[] => pages.filter((p) => p.indexable || INCLUDE_DRAFTS).map((p) => {
  const jsonLd: JsonLdKind[] = ["organization", ...(p.pricing === "plans" ? (["software"] as const) : []), "faq"];
  return { path: `/${p.slug}`, title: p.title, description: p.description, indexable: p.indexable, jsonLd, faqs: p.faqs };
});
