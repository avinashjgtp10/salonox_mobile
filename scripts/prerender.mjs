// Build step: renders each marketing route to static HTML.
//   1. `vite build` produced dist/marketing.html (template + hashed assets)
//   2. `vite build --ssr` produced dist-ssr/entry-server.js
// This script fills the template per route and writes dist/<name>.html.
// "/" is written as home.html so it can never overwrite dist/index.html,
// which stays the generic SPA shell for every app route.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Render with the production React build (same markup as ships, no dev-only warnings).
process.env.NODE_ENV = "production";

const dist = path.resolve("dist");
const templatePath = path.join(dist, "marketing.html");
const template = fs.readFileSync(templatePath, "utf8");
const server = await import(pathToFileURL(path.resolve("dist-ssr/entry-server.js")).href);

const fileNameFor = (routePath) => (routePath === "/" ? "home.html" : `${routePath.slice(1)}.html`);

// Structured data must parse, and every price it advertises must be visible in
// the same rendered page (Google treats a mismatch as misleading markup).
function assertStructuredData(route, html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  for (const raw of blocks) {
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      throw new Error(`prerender: ${route.path} has JSON-LD that does not parse: ${e.message}`);
    }
    if (data["@type"] !== "SoftwareApplication") continue;
    const offers = data.offers?.offers ?? [];
    const annual = offers.filter((o) => o.priceSpecification?.billingDuration === "P1Y").length;
    if (annual && [...html.matchAll(/>\/year</g)].length < annual) {
      throw new Error(`prerender: ${route.path} JSON-LD says ${annual} offer(s) are billed per year but the page does not show "/year" next to each price`);
    }
    for (const offer of offers) {
      if (offer.priceCurrency !== "INR") continue;
      const visible = `₹${Number(offer.price).toLocaleString("en-IN")}`;
      if (!html.includes(visible)) {
        throw new Error(`prerender: ${route.path} JSON-LD offer "${offer.name}" ${visible} is not visible on the page`);
      }
    }
  }
  return blocks.length;
}

for (const marker of ["<!--app-head-->", "<!--app-html-->"]) {
  if (!template.includes(marker)) throw new Error(`prerender: marketing.html is missing ${marker}`);
}

for (const route of server.routes) {
  const html = template
    .replace("<!--app-head-->", () => server.renderHead(route))
    .replace("<!--app-html-->", () => server.render(route.path));

  // Fail the build rather than ship a page crawlers would see empty.
  if (!/<h1[\s>]/.test(html)) throw new Error(`prerender: ${route.path} has no <h1>`);
  if (!html.includes(`<title>${route.title.replace(/&/g, "&amp;")}</title>`)) {
    throw new Error(`prerender: ${route.path} is missing its <title>`);
  }
  if (!html.includes('rel="canonical"')) throw new Error(`prerender: ${route.path} has no canonical`);

  assertStructuredData(route, html);

  const out = path.join(dist, fileNameFor(route.path));
  fs.writeFileSync(out, html);
  console.log(`prerendered ${route.path.padEnd(10)} -> ${path.basename(out)} (${(html.length / 1024).toFixed(1)} kB)`);
}

// nginx must fall back to the SPA shell for exactly the app route prefixes in
// seo.config.ts; a mismatch would 404 real app pages (or serve the shell for
// junk URLs), so fail the build instead of shipping it.
const nginxConf = fs.readFileSync(path.resolve("nginx.conf"), "utf8");
const appLocation = nginxConf.match(/location\s+~\s+\^\/\(([^)]*)\)\(\/\|\$\)/);
if (!appLocation) throw new Error("prerender: nginx.conf has no app-route location regex");
const inNginx = new Set(appLocation[1].split("|"));
const inConfig = new Set(server.appRoutePrefixes.map((p) => p.slice(1)));
const missing = [...inConfig].filter((p) => !inNginx.has(p));
const extra = [...inNginx].filter((p) => !inConfig.has(p));
if (missing.length || extra.length) {
  throw new Error(`prerender: nginx.conf app routes differ from seo.config.ts (missing in nginx: [${missing}], only in nginx: [${extra}])`);
}

// 404 page: served by nginx (error_page 404) with a real 404 status at any
// unknown URL, so it carries no canonical and is noindex.
const notFound = template
  .replace("<!--app-head-->", () => server.renderNotFoundHead())
  .replace("<!--app-html-->", () => server.renderNotFound());
if (!/<h1[\s>]/.test(notFound)) throw new Error("prerender: 404 page has no <h1>");
fs.writeFileSync(path.join(dist, "404.html"), notFound);
console.log(`prerendered 404        -> 404.html (${(notFound.length / 1024).toFixed(1)} kB)`);

fs.rmSync(templatePath);
