import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { MarketingApp } from "./MarketingApp";
import { buildHeadTags } from "./head";
import { MARKETING_ROUTES } from "./seo.config";

// Build-time only: consumed by scripts/prerender.mjs, never shipped to browsers.
export const routes = MARKETING_ROUTES;
export const renderHead = buildHeadTags;

export function render(url: string): string {
  return renderToString(
    <StaticRouter location={url}>
      <MarketingApp />
    </StaticRouter>,
  );
}
