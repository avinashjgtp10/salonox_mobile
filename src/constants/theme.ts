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
    primary: '#2f80ed',
    primaryDark: '#1c64d1',
    onPrimary: '#FFFFFF',
    secondary: '#0ea5e9',
    accentGold: '#f5a623',
    accentGoldDark: '#c9820f',
    background: '#eef4fb',
    backgroundSecondary: '#e4edf9',
    card: '#FFFFFF',
    text: '#4b5b6e',
    heading: '#1c2a3a',
    textSecondary: '#7488a0',
    hint: '#9badc2',
    placeholder: '#b7c6d9',
    border: '#ccdcee',
    divider: 'rgba(28, 42, 58, 0.06)',
    focusBorder: '#2f80ed',
    selection: '#2f80ed',
    shadow: '#0f2942',
    backgroundElement: '#e4edf9',
    backgroundSelected: '#dbe8fa',
    success: '#10b981',
    warning: '#f5a623',
    error: '#ef4444',
    info: '#0ea5e9',
  },
  dark: {
    primary: '#4f8ff7',
    primaryDark: '#3b7ce0',
    onPrimary: '#FFFFFF',
    secondary: '#38bdf8',
    accentGold: '#fbbf24',
    accentGoldDark: '#d97706',
    background: '#0b1220',
    backgroundSecondary: '#111a2e',
    card: '#141d33',
    text: '#cbd5e1',
    heading: '#f1f5f9',
    textSecondary: '#8b99b3',
    hint: '#64748b',
    placeholder: '#4b5b73',
    border: '#233047',
    divider: 'rgba(241, 245, 249, 0.08)',
    focusBorder: '#4f8ff7',
    selection: '#4f8ff7',
    shadow: '#000000',
    backgroundElement: '#1a2540',
    backgroundSelected: '#22304d',
    success: '#34d399',
    warning: '#f59e0b',
    error: '#f87171',
    info: '#38bdf8',
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
    successBg: scheme === 'dark' ? 'rgba(52, 211, 153, 0.16)' : 'rgba(16, 185, 129, 0.10)',
    warning: palette.warning,
    warningBg: scheme === 'dark' ? 'rgba(245, 158, 11, 0.16)' : 'rgba(245, 166, 35, 0.12)',
    error: palette.error,
    errorBg: scheme === 'dark' ? 'rgba(248, 113, 113, 0.16)' : 'rgba(239, 68, 68, 0.10)',
    info: palette.info,
    infoBg: scheme === 'dark' ? 'rgba(56, 189, 248, 0.16)' : 'rgba(14, 165, 233, 0.10)',
    purple: scheme === 'dark' ? '#818cf8' : '#6366f1',
    purpleBg: scheme === 'dark' ? 'rgba(129, 140, 248, 0.16)' : 'rgba(99, 102, 241, 0.10)',
    // Fixed 4-accent vocabulary shared by icon badges, chart bars, and
    // category chips (Dashboard stat tiles, Quick Sale catalog) — same
    // hues regardless of scheme so category meaning stays recognizable, but
    // the soft tint needs more alpha on a dark card to stay visible.
    accentBlue: scheme === 'dark' ? '#4f8ff7' : '#2f80ed',
    accentBlueSoft: scheme === 'dark' ? 'rgba(79, 143, 247, 0.18)' : 'rgba(47, 128, 237, 0.10)',
    accentSky: scheme === 'dark' ? '#38bdf8' : '#0ea5e9',
    accentSkySoft: scheme === 'dark' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(14, 165, 233, 0.10)',
    accentIndigo: scheme === 'dark' ? '#818cf8' : '#6366f1',
    accentIndigoSoft: scheme === 'dark' ? 'rgba(129, 140, 248, 0.18)' : 'rgba(99, 102, 241, 0.10)',
    accentGreen: scheme === 'dark' ? '#34d399' : '#10b981',
    accentGreenSoft: scheme === 'dark' ? 'rgba(52, 211, 153, 0.18)' : 'rgba(16, 185, 129, 0.10)',
    dashboardTopBar: scheme === 'dark' ? '#101826' : '#183453',
    dashboardTopBarMuted: scheme === 'dark' ? 'rgba(203, 213, 225, 0.72)' : 'rgba(255, 255, 255, 0.72)',
    dashboardTopBarSubtle: scheme === 'dark' ? 'rgba(148, 163, 184, 0.16)' : 'rgba(255, 255, 255, 0.14)',
    dashboardSurface: scheme === 'dark' ? '#0f172a' : '#f4f7fb',
    dashboardCard: scheme === 'dark' ? '#172033' : '#ffffff',
    dashboardCardMuted: scheme === 'dark' ? '#202a3f' : '#edf3fa',
    dashboardRevenueAccent: scheme === 'dark' ? '#22c55e' : '#0f9f6e',
    dashboardRevenueBg: scheme === 'dark' ? 'rgba(34, 197, 94, 0.16)' : '#e9f8ef',
    dashboardAppointmentAccent: scheme === 'dark' ? '#38bdf8' : '#1686d9',
    dashboardAppointmentBg: scheme === 'dark' ? 'rgba(56, 189, 248, 0.16)' : '#e8f4ff',
    dashboardClientAccent: scheme === 'dark' ? '#a78bfa' : '#7057d8',
    dashboardClientBg: scheme === 'dark' ? 'rgba(167, 139, 250, 0.16)' : '#f0edff',
    dashboardWarningAccent: scheme === 'dark' ? '#fbbf24' : '#d88908',
    dashboardWarningBg: scheme === 'dark' ? 'rgba(251, 191, 36, 0.16)' : '#fff6df',
    dashboardDangerAccent: scheme === 'dark' ? '#fb7185' : '#d84b62',
    dashboardDangerBg: scheme === 'dark' ? 'rgba(251, 113, 133, 0.16)' : '#fff0f3',
    appointmentBackground: scheme === 'dark' ? '#111216' : '#ffffff',
    appointmentSurface: scheme === 'dark' ? '#191a20' : '#ffffff',
    appointmentSurfaceMuted: scheme === 'dark' ? '#23242b' : '#fbf8fa',
    appointmentText: scheme === 'dark' ? '#f7f3f6' : '#17131a',
    appointmentTextSecondary: scheme === 'dark' ? '#bdb5bc' : '#686168',
    appointmentMuted: scheme === 'dark' ? '#89818a' : '#999297',
    appointmentPlaceholder: scheme === 'dark' ? '#777079' : '#aaa4a9',
    appointmentAccent: scheme === 'dark' ? '#d17ab3' : '#b45a92',
    appointmentAccentDark: scheme === 'dark' ? '#bb649f' : '#993f78',
    appointmentAccentSoft: scheme === 'dark' ? 'rgba(209, 122, 179, 0.16)' : '#faf2f7',
    appointmentBorder: scheme === 'dark' ? '#3b3940' : '#ded9dd',
    appointmentDivider: scheme === 'dark' ? '#2d2b31' : '#eee9ec',
    appointmentDisabled: scheme === 'dark' ? '#46464c' : '#dedede',
    // Borders for inline error/success message containers.
    errorBorder: scheme === 'dark' ? 'rgba(248, 113, 113, 0.35)' : 'rgba(239, 68, 68, 0.28)',
    successBorder: scheme === 'dark' ? 'rgba(52, 211, 153, 0.35)' : 'rgba(16, 185, 129, 0.28)',
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
