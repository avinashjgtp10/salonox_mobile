import { useMemo } from "react";

import { usePearlPalette } from "./usePearlPalette";

export type PearlPalette = ReturnType<typeof usePearlPalette>;

/**
 * Builds a screen's StyleSheet from the active palette instead of the static
 * light one, and rebuilds it when the theme changes.
 *
 * Styles created at module load freeze the light-mode colours into every
 * surface, which is why Dim mode showed white cards and fields on a dark
 * background. A screen moves to this by turning
 *
 *   const styles = themedStyles((p) => ({ card: { backgroundColor: p.glass } }));
 *
 * into a factory that takes the palette, then calling this at the top of the
 * component.
 */
export const useThemedStyles = <T>(create: (p: PearlPalette) => T): T => {
  const palette = usePearlPalette();
  return useMemo(() => create(palette), [create, palette]);
};
