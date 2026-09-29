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

// ── Site-wide guards (run over every HTML file in dist) ──────────────────────

const htmlFiles = fs.readdirSync(dist).filter((f) => f.endsWith(".html"));

// 1. Brand spelling: any spelling of the brand in visible text or in alt/aria/
//    title/content attributes must be exactly the configured name. URLs, paths,
//    class names and ids (salonox.com, /salonox-*.webp) are not text, so they
//    are not looked at.
function visibleBrandStrings(html) {
  const noCode = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ");
  const texts = noCode.split(/<[^>]*>/);
  const attrs = [...noCode.matchAll(/\s(?:alt|aria-label|title|content|placeholder)="([^"]*)"/g)].map((m) => m[1]);
  // email addresses (support@salonox.com) are not brand text
  return [...texts, ...attrs].join("\n").replace(/\S*@\S*/g, " ");
}
for (const f of htmlFiles) {
  const bad = new Set();
  for (const m of visibleBrandStrings(fs.readFileSync(path.join(dist, f), "utf8")).matchAll(/\bsalonox\b(?!\.|-|_|\/)/gi)) {
    if (m[0] !== server.brand) bad.add(m[0]);
  }
  // a brand split across elements (Salon<span>OX</span>) only shows up with the tags removed outright
  const joined = fs.readFileSync(path.join(dist, f), "utf8").replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]*>/g, "");
  for (const m of joined.matchAll(/Salon(?:OX|Ox)(?![\w-])/g)) bad.add(m[0]);
  if (bad.size) throw new Error(`prerender: ${f} spells the brand [${[...bad]}] but the official spelling is "${server.brand}"`);
}

// 2. The same favicon <link> block on every page, and the files behind it are real.
for (const f of htmlFiles) {
  if (!fs.readFileSync(path.join(dist, f), "utf8").includes(server.iconLinks)) {
    throw new Error(`prerender: ${f} does not carry the standard favicon links`);
  }
}
const pngSize = (file) => {
  const b = fs.readFileSync(path.join(dist, file));
  if (b.readUInt32BE(0) !== 0x89504e47) throw new Error(`prerender: ${file} is not a PNG`);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};
for (const i of [...server.icons.png, server.icons.appleTouch]) {
  const [w, h] = pngSize(i.href);
  if (w !== i.size || h !== i.size) throw new Error(`prerender: ${i.href} is ${w}x${h}, expected ${i.size}x${i.size}`);
}
const ico = fs.readFileSync(path.join(dist, server.icons.ico));
if (ico.readUInt16LE(0) !== 0 || ico.readUInt16LE(2) !== 1 || ico.readUInt16LE(4) < 3) {
  throw new Error(`prerender: ${server.icons.ico} is not an ICO with at least 3 frames`);
}

// 3. robots.txt must not block any icon URL.
const disallowed = fs.readFileSync(path.join(dist, "robots.txt"), "utf8").split("\n").filter((l) => l.startsWith("Disallow:")).map((l) => l.slice(9).trim());
for (const href of [server.icons.ico, ...server.icons.png.map((i) => i.href), server.icons.appleTouch.href]) {
  const hit = disallowed.find((d) => d && href.startsWith(d));
  if (hit) throw new Error(`prerender: robots.txt disallows ${hit}, which blocks ${href}`);
}
console.log(`guards ok: brand spelling, favicon links and files (${htmlFiles.length} html files), robots`);
