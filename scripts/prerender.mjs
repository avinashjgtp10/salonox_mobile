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

  const out = path.join(dist, fileNameFor(route.path));
  fs.writeFileSync(out, html);
  console.log(`prerendered ${route.path.padEnd(10)} -> ${path.basename(out)} (${(html.length / 1024).toFixed(1)} kB)`);
}

fs.rmSync(templatePath);
