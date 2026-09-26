import { absoluteUrl, ORGANIZATION, PLAN_CURRENCY, PLANS, SITE, type JsonLdKind, type MarketingRoute } from "./seo.config";

const ORG_ID = `${SITE.origin}/#organization`;

function organization() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: ORGANIZATION.name,
    url: `${SITE.origin}/`,
    logo: absoluteUrl(ORGANIZATION.logo),
    email: ORGANIZATION.email,
    sameAs: ORGANIZATION.sameAs,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "sales",
        telephone: ORGANIZATION.telephone,
        email: ORGANIZATION.email,
        areaServed: ORGANIZATION.areaServed,
      },
    ],
  };
}

function software(route: MarketingRoute) {
  const prices = PLANS.map((p) => p.price);
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE.name,
    description: route.description,
    url: absoluteUrl(route.path),
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    publisher: { "@id": ORG_ID },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: PLAN_CURRENCY,
      lowPrice: String(Math.min(...prices)),
      highPrice: String(Math.max(...prices)),
      offerCount: PLANS.length,
      offers: PLANS.map((p) => ({
        "@type": "Offer",
        name: p.name,
        description: p.description,
        price: String(p.price),
        priceCurrency: PLAN_CURRENCY,
        url: `${absoluteUrl(route.path)}#pricing`,
      })),
    },
  };
}

function faq(route: MarketingRoute) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: (route.faqs ?? []).map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

const builders: Record<JsonLdKind, (route: MarketingRoute) => object> = {
  organization: () => organization(),
  software,
  faq,
};

/** Structured data objects for a route. Pages that are not indexable emit none. */
export function jsonLdFor(route: MarketingRoute): object[] {
  if (!route.indexable) return [];
  return (route.jsonLd ?? []).filter((k) => k !== "faq" || (route.faqs?.length ?? 0) > 0).map((k) => builders[k](route));
}

// "<" is escaped so no field can ever close the script element early.
export const serializeJsonLd = (obj: object) => JSON.stringify(obj).replace(/</g, "\\u003c");
