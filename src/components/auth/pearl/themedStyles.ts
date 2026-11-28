import { StyleSheet } from "react-native";

import { pearl } from "./tokens";
import { dimPearl } from "./usePearlPalette";

export type PearlPalette = typeof pearl | typeof dimPearl;

// Which palette module-level stylesheets should resolve against. ThemeProvider
// sets this while it renders, so every screen below it reads the right one.
let active: PearlPalette = pearl;

export const activePearlPalette = () => active;

export const setActivePearlPalette = (scheme: "light" | "dark") => {
  active = scheme === "dark" ? dimPearl : pearl;
};

/**
 * A StyleSheet that follows the theme without the screen having to.
 *
 * `StyleSheet.create` runs once at module load, so a screen built from the
 * static `pearl` palette keeps light-mode cards, fields and borders forever —
 * which is why Dim mode showed white surfaces on a dark background. This takes
 * the same style object as a function of the palette and hands back a proxy:
 * `styles.card` is resolved when it is read, against whichever palette is
 * active, and each palette's sheet is built once and cached.
 *
 * Call sites are unchanged — `styles.card` still works — so a screen moves
 * over by wrapping its stylesheet and swapping `pearl.` for `p.`.
 */
// Same constraint React Native puts on StyleSheet.create, so style literals
// keep their precise types (fontWeight: "800" stays "800", not string).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function themedStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(create: (p: PearlPalette) => T): T {
  const cache = new Map<PearlPalette, T>();

  return new Proxy({} as T, {
    get(_target, key) {
      let sheet = cache.get(active);
      if (!sheet) {
        sheet = StyleSheet.create(create(active) as never) as unknown as T;
        cache.set(active, sheet);
      }
      return sheet[key as keyof T];
    },
    // Keeps Object.keys / spreading working on the proxy.
    ownKeys() {
      let sheet = cache.get(active);
      if (!sheet) {
        sheet = StyleSheet.create(create(active) as never) as unknown as T;
        cache.set(active, sheet);
      }
      return Reflect.ownKeys(sheet);
    },
    getOwnPropertyDescriptor() {
      return { configurable: true, enumerable: true };
    },
  });
}

/**
 * The same idea for a plain token object — `const c = { card: pearl.glass }`
 * — which screens build at module load and read as `c.card`. Reads resolve
 * against the active palette, so call sites need no change.
 */
export function themedTokens<T extends Record<string, string>>(create: (p: PearlPalette) => T): T {
  const cache = new Map<PearlPalette, T>();
  const build = () => {
    let built = cache.get(active);
    if (!built) {
      built = create(active);
      cache.set(active, built);
    }
    return built;
  };

  return new Proxy({} as T, {
    get: (_t, key) => build()[key as keyof T],
    ownKeys: () => Reflect.ownKeys(build()),
    getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true }),
  });
}
