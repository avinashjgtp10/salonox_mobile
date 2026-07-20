/**
 * Design tokens for SalonOX. `Colors.light` / `Colors.dark` are the source of
 * truth; `getDashboardColors(scheme)` derives the flat token set every screen
 * consumes (via `useThemeColors()` from `@/theme/ThemeProvider`, not by
 * importing a static export — colors must react to the active theme mode).
 */

import '@/global.css';

import { Platform } from 'react-native';

export type AppColorScheme = 'light' | 'dark';

export const Colors = {
  light: {
    primary: '#1C1917',
    primaryDark: '#1C1917',
    onPrimary: '#FFFFFF',
    secondary: '#726A63',
    accentGold: '#AFA79D',
    accentGoldDark: '#726A63',
    background: '#FBFAF7',
    backgroundSecondary: '#F2EFE9',
    card: '#FFFFFF',
    text: '#4D463F',
    heading: '#1C1917',
    textSecondary: '#726A63',
    hint: '#8D847A',
    placeholder: '#AFA79D',
    border: '#E7E2D9',
    divider: 'rgba(28, 25, 23, 0.07)',
    focusBorder: '#1C1917',
    selection: '#1C1917',
    shadow: '#141210',
    backgroundElement: '#EFEBE3',
    backgroundSelected: '#E7E2D9',
    success: '#1C1917',
    warning: '#726A63',
    error: '#726A63',
    info: '#1C1917',
  },
  dark: {
    primary: '#D2C6B6',
    primaryDark: '#6F6254',
    onPrimary: '#FFFFFF',
    secondary: '#C2B8AC',
    accentGold: '#D2C6B6',
    accentGoldDark: '#BDAF9E',
    background: '#11100F',
    backgroundSecondary: '#1B1917',
    card: '#201D1A',
    text: '#E1D8CD',
    heading: '#F8F3EA',
    textSecondary: '#B8AEA3',
    hint: '#8D847A',
    placeholder: '#82776E',
    border: '#38332E',
    divider: 'rgba(248, 243, 234, 0.09)',
    focusBorder: '#F8F3EA',
    selection: '#F8F3EA',
    shadow: '#000000',
    backgroundElement: '#2A2622',
    backgroundSelected: '#342F29',
    success: '#8BC7A2',
    warning: '#D7B56D',
    error: '#E08F86',
    info: '#9CB7F4',
  },
} as const;

// Legacy alias — a handful of template/leftover components (e.g. themed-text.tsx's
// `linkPrimary` style) reference the light palette directly and aren't part of the
// themed app surface. Real screens must use `useThemeColors()`, not this.
export const SageGold = Colors.light;

export function getDashboardColors(scheme: AppColorScheme) {
  const palette = Colors[scheme];

  return {
    primary: palette.primary,
    primaryDark: palette.primaryDark,
    onPrimary: palette.onPrimary,
    secondary: palette.secondary,
    gold: palette.accentGold,
    goldDark: palette.accentGoldDark,
    bg: palette.background,
    bg2: palette.backgroundSecondary,
    card: palette.card,
    heading: palette.heading,
    text: palette.text,
    text2: palette.textSecondary,
    hint: palette.hint,
    placeholder: palette.placeholder,
    border: palette.border,
    divider: palette.divider,
    focusBorder: palette.focusBorder,
    selection: palette.selection,
    shadow: palette.shadow,
    backgroundElement: palette.backgroundElement,
    backgroundSelected: palette.backgroundSelected,
    success: palette.success,
    successBg: scheme === 'dark' ? 'rgba(139, 199, 162, 0.16)' : 'rgba(28, 25, 23, 0.08)',
    warning: palette.warning,
    warningBg: scheme === 'dark' ? 'rgba(215, 181, 109, 0.16)' : 'rgba(114, 106, 99, 0.12)',
    error: palette.error,
    errorBg: scheme === 'dark' ? 'rgba(224, 143, 134, 0.16)' : 'rgba(114, 106, 99, 0.12)',
    info: palette.info,
    infoBg: scheme === 'dark' ? 'rgba(156, 183, 244, 0.16)' : 'rgba(28, 25, 23, 0.08)',
    purple: palette.textSecondary,
    purpleBg: palette.backgroundElement,
  } as const;
}

export type ThemeColors = ReturnType<typeof getDashboardColors>;

// Deprecated: static light-only snapshot, kept only until every consumer has
// migrated to `useThemeColors()`. Do not import this in new code.
export const DashboardColors = getDashboardColors('light');

export const DashboardTypography = {
  fontFamilies: {
    display: Platform.select({ ios: 'ui-serif', android: 'serif', default: 'serif' }),
    body: Platform.select({ ios: 'system-ui', android: 'sans-serif', default: 'normal' }),
    mono: Platform.select({ ios: 'ui-monospace', android: 'monospace', default: 'monospace' }),
  },
  fontSizes: {
    xs: 10,
    sm: 11.5,
    md: 12.5,
    base: 13,
    lg: 15,
    xl: 18,
    xxl: 22,
  },
  lineHeights: {
    xs: 14,
    sm: 16,
    md: 18,
    base: 19,
    lg: 22,
    xl: 24,
    xxl: 28,
  },
  fontWeights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export const DashboardSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  // Premium-density additions (hero/section padding, day-strip gaps) — the
  // 4/8/12/16/20/24 progression above is unchanged, these just extend it.
  xxxl: 32,
  xxxxl: 40,
} as const;

export const DashboardRadius = {
  sm: 11,
  md: 14,
  lg: 16,
  xl: 18,
  // Large rounded corners for hero/stat-tile cards, above the existing xl.
  xxl: 22,
  full: 999,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
