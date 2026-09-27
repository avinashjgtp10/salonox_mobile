import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { MarketingApp } from "./MarketingApp";
import { buildHeadTags, buildNotFoundHeadTags } from "./head";
import { APP_ROUTE_PREFIXES, BRAND_NAME, ICONS, iconLinksHtml, MARKETING_ROUTES, ROBOTS_DISALLOW_PREFIXES } from "./seo.config";

// Build-time only: consumed by scripts/prerender.mjs, never shipped to browsers.
export const routes = MARKETING_ROUTES;
export const renderHead = buildHeadTags;
export const renderNotFoundHead = buildNotFoundHeadTags;
export const appRoutePrefixes = APP_ROUTE_PREFIXES;
export const brand = BRAND_NAME;
export const icons = ICONS;
export const iconLinks = iconLinksHtml();
export const robotsDisallow = ROBOTS_DISALLOW_PREFIXES;

export function render(url: string): string {
  return renderToString(
    <StaticRouter location={url}>
      <MarketingApp />
    </StaticRouter>,
  );
}

// Any path that is not a marketing or app route renders the 404 page.
export const renderNotFound = () => render("/404");
