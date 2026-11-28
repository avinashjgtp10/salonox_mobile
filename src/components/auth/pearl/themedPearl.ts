import { pearl as lightPearl } from "./tokens";
import { activePearlPalette } from "./themedStyles";

/**
 * `pearl`, but resolved when it is read rather than when the module loads.
 *
 * Screens write the palette straight into JSX — `color={pearl.muted}`,
 * `backgroundColor: pearl.glass` on an inline style — and those reads happen
 * on every render. Importing this instead of the static token object makes
 * them follow the active theme, with no other change to the call site.
 *
 * Module-level stylesheets are a different case: they read once, at import,
 * so they use `themedStyles` instead.
 */
export const pearl = new Proxy(lightPearl, {
  get: (_target, key) => (activePearlPalette() as Record<string | symbol, unknown>)[key],
});
