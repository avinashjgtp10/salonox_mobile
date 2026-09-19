import { useEffect } from "react";

const LINK_ID = "pb-display-font";
const HREF =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&display=swap";

/**
 * Loads the display serif used by the public booking pages.
 *
 * Injected here rather than in index.html for two reasons: the dashboard — the
 * other 99% of the app — never uses this face and shouldn't pay for the
 * request, and the stylesheet falls back to Georgia, so nothing on the page
 * waits for it. The link is left in place on unmount: it's cached after the
 * first load, and removing it would re-flash the fallback when the customer
 * moves between the booking and manage screens.
 */
export function useDisplayFont(): void {
  useEffect(() => {
    if (document.getElementById(LINK_ID)) return;
    const link = document.createElement("link");
    link.id = LINK_ID;
    link.rel = "stylesheet";
    link.href = HREF;
    document.head.appendChild(link);
  }, []);
}
