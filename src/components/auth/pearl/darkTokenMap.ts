/**
 * Light-token → dim-token lookup for dark mode.
 *
 * Most of the app's styles are built once, at module load, from the static
 * `pearl` palette — `pearlType.small`, `color: pearl.ink`, and so on. Those
 * values are light-mode values, so in dark mode they paint dark-navy text onto
 * a dark background: the washed-out, barely-readable screens this exists to
 * fix. Rewriting every one of those stylesheets is the proper repair; until
 * then, this maps a light value onto its dim counterpart at render time.
 *
 * Built from the two palettes rather than hand-written, so a palette edit can
 * never leave the mapping behind. Only values that actually differ between the
 * two are listed, and a colour that is in neither palette (an explicit "#fff"
 * on a gradient button, a tone colour) is left exactly as the author wrote it.
 */
import { pearl } from "./tokens";
import { dimPearl } from "./usePearlPalette";

const buildMap = () => {
  const map: Record<string, string> = {};
  for (const [key, light] of Object.entries(pearl)) {
    const dim = (dimPearl as Record<string, unknown>)[key];
    if (typeof light === "string" && typeof dim === "string" && light !== dim) {
      map[light.toLowerCase()] = dim;
    }
  }
  return map;
};

const DARK_TOKENS = buildMap();

/** The dark-mode equivalent of a light palette colour, or the colour unchanged. */
export const toDarkToken = (color: string | undefined) =>
  (typeof color === "string" ? DARK_TOKENS[color.toLowerCase()] : undefined) ?? color;
