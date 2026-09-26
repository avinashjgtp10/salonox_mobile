import { MARKETING_ROUTES, SITE, type MarketingRoute } from "./seo.config";

// Everything here builds absolute URLs from SITE.origin — never from the
// request host — so canonical / og:url / og:image are identical wherever the
// page is served from (www, apex, dev, qa).
export const absoluteUrl = (p: string) => (/^https?:\/\//.test(p) ? p : `${SITE.origin}${p}`);

export function routeFor(pathname: string): MarketingRoute | undefined {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return MARKETING_ROUTES.find((r) => r.path === normalized);
}

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

interface HeadEntry {
  tag: "meta" | "link";
  attrs: Record<string, string>;
}

function headEntries(route: MarketingRoute): HeadEntry[] {
  const url = absoluteUrl(route.path);
  const image = absoluteUrl(route.ogImage ?? SITE.ogImage);
  const meta = (key: "name" | "property", value: string, content: string): HeadEntry => ({
    tag: "meta",
    attrs: { [key]: value, content },
  });
  return [
    meta("name", "description", route.description),
    meta("name", "robots", route.indexable ? "index,follow" : "noindex,follow"),
    { tag: "link", attrs: { rel: "canonical", href: url } },
    meta("property", "og:type", "website"),
    meta("property", "og:site_name", SITE.name),
    meta("property", "og:title", route.title),
    meta("property", "og:description", route.description),
    meta("property", "og:url", url),
    meta("property", "og:image", image),
    meta("property", "og:image:width", "1200"),
    meta("property", "og:image:height", "630"),
    meta("property", "og:image:alt", `${SITE.name} — ${route.title}`),
    meta("property", "og:locale", "en_IN"),
    meta("name", "twitter:card", "summary_large_image"),
    meta("name", "twitter:title", route.title),
    meta("name", "twitter:description", route.description),
    meta("name", "twitter:image", image),
  ];
}

/** Head markup injected at prerender time (build). */
export function buildHeadTags(route: MarketingRoute): string {
  const lines = headEntries(route).map(
    (e) =>
      `<${e.tag} ${Object.entries(e.attrs)
        .map(([k, v]) => `${k}="${esc(v)}"`)
        .join(" ")} />`,
  );
  return [`<title>${esc(route.title)}</title>`, ...lines].join("\n    ");
}

/** Keeps the head in sync on client-side navigation between marketing routes. */
export function applyHeadToDocument(route: MarketingRoute): void {
  document.title = route.title;
  for (const { tag, attrs } of headEntries(route)) {
    const [idKey, idVal] = Object.entries(attrs)[0];
    let el = document.head.querySelector<HTMLElement>(`${tag}[${idKey}="${idVal}"]`);
    if (!el) {
      el = document.createElement(tag);
      el.setAttribute(idKey, idVal);
      document.head.appendChild(el);
    }
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  }
}
