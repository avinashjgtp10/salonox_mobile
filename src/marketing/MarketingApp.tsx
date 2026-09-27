import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import LandingPage from "../features/marketing-site/pages/landing";
import { applyHeadToDocument, routeFor } from "./head";
import { NotFoundPage } from "./NotFoundPage";
import { SeoLandingPage } from "./SeoLandingPage";
import { isAppPath, MARKETING_ROUTES, seoPageFor } from "./seo.config";

// This tree only knows the marketing routes. An app link (login, register,
// dashboard...) is handed to a real page load, which serves the full SPA shell
// and boots the app as usual; any other unknown path is the 404 page. (The chat bot and call button
// are dashboard-only in the app, so nothing else needs mounting here.)
function LeaveToApp() {
  useEffect(() => {
    window.location.reload();
  }, []);
  return null;
}

export function MarketingApp() {
  const { pathname } = useLocation();

  // Set statically in marketing.html; re-applied per route because the landing
  // page removes it when it unmounts (e.g. navigating on to an SEO page).
  useEffect(() => {
    [document.documentElement, document.body, document.getElementById("root")].forEach((n) =>
      n?.classList.add("landing-page-active"),
    );
  }, [pathname]);

  useEffect(() => {
    const route = routeFor(pathname);
    if (route) applyHeadToDocument(route);
  }, [pathname]);

  return (
    <Routes>
      {MARKETING_ROUTES.map((r) => {
        const seoPage = seoPageFor(r.path);
        return <Route key={r.path} path={r.path} element={seoPage ? <SeoLandingPage page={seoPage} /> : <LandingPage />} />;
      })}
      <Route path="*" element={isAppPath(pathname) ? <LeaveToApp /> : <NotFoundPage />} />
    </Routes>
  );
}
