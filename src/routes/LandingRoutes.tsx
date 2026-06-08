import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { businessTypes } from "../features/marketing-site/config/businessTypes.config";
import { features } from "../features/marketing-site/config/features.config";
import { seoLandingPages } from "../features/marketing-site/config/seo.config";

const LandingPage = lazy(() => import("../features/marketing-site/pages/LandingPage"));
const PricingPage = lazy(() => import("../features/marketing-site/pages/PricingPage"));
const ContactSalesPage = lazy(() => import("../features/marketing-site/pages/ContactSalesPage"));
const SupportPage = lazy(() => import("../features/marketing-site/pages/SupportPage"));
const BusinessTypePage = lazy(() => import("../features/marketing-site/pages/BusinessTypePage"));
const FeaturePage = lazy(() => import("../features/marketing-site/pages/FeaturePage"));
const SeoLandingPage = lazy(() => import("../features/marketing-site/pages/SeoLandingPage"));
const BlogIndexPage = lazy(() => import("../features/marketing-site/pages/BlogPage").then(m => ({ default: m.BlogIndexPage })));
const BlogArticlePage = lazy(() => import("../features/marketing-site/pages/BlogPage").then(m => ({ default: m.BlogArticlePage })));

export const LandingRoutes = (
  <>
    <Route path="/" element={<LandingPage />} />
    <Route path="/pricing" element={<PricingPage />} />
    <Route path="/contact-sales" element={<ContactSalesPage />} />
    <Route path="/support" element={<SupportPage />} />
    <Route path="/blog" element={<BlogIndexPage />} />

    {seoLandingPages.map(page => (
      <Route
        key={page.slug}
        path={`/${page.slug}`}
        element={
          <Suspense fallback={null}>
            <SeoLandingPage slug={page.slug} />
          </Suspense>
        }
      />
    ))}

    <Route
      path="/blog/best-salon-management-software-india"
      element={<BlogArticlePage slug="best-salon-management-software-india" />}
    />
    <Route
      path="/blog/salon-billing-software-gst-checklist"
      element={<BlogArticlePage slug="salon-billing-software-gst-checklist" />}
    />
    <Route
      path="/blog/reduce-salon-no-shows-whatsapp-reminders"
      element={<BlogArticlePage slug="reduce-salon-no-shows-whatsapp-reminders" />}
    />

    {businessTypes.map(bt => (
      <Route
        key={bt.slug}
        path={`/business/${bt.slug}`}
        element={
          <Suspense fallback={null}>
            <BusinessTypePage slug={bt.slug} />
          </Suspense>
        }
      />
    ))}

    {features.map(ft => (
      <Route
        key={ft.slug}
        path={`/features/${ft.slug}`}
        element={
          <Suspense fallback={null}>
            <FeaturePage slug={ft.slug} />
          </Suspense>
        }
      />
    ))}
  </>
);
