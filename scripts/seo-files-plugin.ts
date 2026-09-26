import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { MARKETING_ROUTES, ROBOTS_DISALLOW_PREFIXES, SITE } from "../src/marketing/seo.config";

export function buildSitemapXml(): string {
  const urls = MARKETING_ROUTES.filter((r) => r.indexable)
    .map((r) => `  <url><loc>${SITE.origin}${r.path}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function buildRobotsTxt(): string {
  const disallow = ROBOTS_DISALLOW_PREFIXES.map((p) => `Disallow: ${p}`).join("\n");
  return `User-agent: *\nAllow: /\n${disallow}\n\nSitemap: ${SITE.origin}/sitemap.xml\n`;
}

// Emits sitemap.xml and robots.txt into the build output, derived from
// src/marketing/seo.config.ts so they can never drift from the real routes.
export function seoFilesPlugin(): Plugin {
  let outDir = "";
  let isSsrBuild = false;
  return {
    name: "salonox-seo-files",
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
      isSsrBuild = Boolean(config.build.ssr);
    },
    closeBundle() {
      if (isSsrBuild) return;
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, "sitemap.xml"), buildSitemapXml());
      fs.writeFileSync(path.join(outDir, "robots.txt"), buildRobotsTxt());
    },
  };
}
