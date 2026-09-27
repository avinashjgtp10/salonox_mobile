import { useEffect, type ReactNode } from "react";
import { BRAND_NAME, SITE } from "../marketing/seo.config";

// Per-salon public pages (/book, /menu) are not marketing content for
// SalonOX, so they are kept out of the index. Set client-side: crawlers that
// render JS (Google, Bing) see it, and robots.txt deliberately still allows
// them so that the tag can be read.
function useNoIndex() {
  useEffect(() => {
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const created = !meta;
    const previous = meta?.getAttribute("content") ?? null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "noindex,follow");
    return () => {
      if (!meta) return;
      if (created) meta.remove();
      else if (previous !== null) meta.setAttribute("content", previous);
    };
  }, []);
}

export default function PublicPageShell({ children }: { children: ReactNode }) {
  useNoIndex();
  return (
    <>
      {children}
      <div style={{ textAlign: "center", padding: "16px 12px", fontSize: 12, color: "#6b7280" }}>
        <a href={SITE.origin} style={{ color: "inherit", textDecoration: "none" }}>
          {`Powered by ${BRAND_NAME}`}
        </a>
      </div>
    </>
  );
}
