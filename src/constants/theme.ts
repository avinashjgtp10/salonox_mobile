
import '@/global.css';

import { Platform } from 'react-native';
import { AppFonts } from '@/theme/typography';

export type AppColorScheme = 'light' | 'dark';

export const Colors = {
  light: {
    primary: '#b45a92',
    primaryDark: '#943f76',
    onPrimary: '#FFFFFF',
    secondary: '#2c242d',
    accentGold: '#d7a83e',
    accentGoldDark: '#a97813',
    background: '#fbf9fa',
    backgroundSecondary: '#f7f1f5',
    card: '#FFFFFF',
    text: '#393339',
    heading: '#19151b',
    textSecondary: '#746d73',
    hint: '#999197',
    placeholder: '#aaa3a8',
    border: '#e2dde0',
    divider: 'rgba(25, 21, 27, 0.08)',
    focusBorder: '#b45a92',
    selection: '#b45a92',
    shadow: '#251f27',
    backgroundElement: '#f5eff3',
    backgroundSelected: '#f8edf4',
    success: '#10b981',
    warning: '#f5a623',
    error: '#ef4444',
    info: '#0ea5e9',
  },
  dark: {
    primary: '#d17ab3',
    primaryDark: '#bb649f',
    onPrimary: '#FFFFFF',
    secondary: '#d8c6d1',
    accentGold: '#fbbf24',
    accentGoldDark: '#d97706',
    background: '#151217',
    backgroundSecondary: '#1d1920',
    card: '#231f25',
    text: '#ddd5da',
    heading: '#fffafd',
    textSecondary: '#b0a6ad',
    hint: '#857b82',
    placeholder: '#716970',
    border: '#3c353b',
    divider: 'rgba(241, 245, 249, 0.08)',
    focusBorder: '#d17ab3',
    selection: '#d17ab3',
    shadow: '#000000',
    backgroundElement: '#2d272d',
    backgroundSelected: '#422f3d',
    success: '#34d399',
    warning: '#f59e0b',
    error: '#f87171',
    info: '#38bdf8',
  },
} as const;

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
    accentBlue: scheme === 'dark' ? '#4f8ff7' : '#2f80ed',
    accentBlueSoft: scheme === 'dark' ? 'rgba(79, 143, 247, 0.18)' : 'rgba(47, 128, 237, 0.10)',
    accentSky: scheme === 'dark' ? '#38bdf8' : '#0ea5e9',
    accentSkySoft: scheme === 'dark' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(14, 165, 233, 0.10)',
    accentIndigo: scheme === 'dark' ? '#818cf8' : '#6366f1',
    accentIndigoSoft: scheme === 'dark' ? 'rgba(129, 140, 248, 0.18)' : 'rgba(99, 102, 241, 0.10)',
    accentGreen: scheme === 'dark' ? '#34d399' : '#10b981',
    accentGreenSoft: scheme === 'dark' ? 'rgba(52, 211, 153, 0.18)' : 'rgba(16, 185, 129, 0.10)',
    dashboardTopBar: scheme === 'dark' ? '#171318' : '#2b242c',
    dashboardTopBarMuted: scheme === 'dark' ? 'rgba(203, 213, 225, 0.72)' : 'rgba(255, 255, 255, 0.72)',
    dashboardTopBarSubtle: scheme === 'dark' ? 'rgba(148, 163, 184, 0.16)' : 'rgba(255, 255, 255, 0.14)',
    dashboardSurface: scheme === 'dark' ? '#151217' : '#fbf9fa',
    dashboardCard: scheme === 'dark' ? '#231f25' : '#ffffff',
    dashboardCardMuted: scheme === 'dark' ? '#2d272d' : '#f7f1f5',
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
    errorBorder: scheme === 'dark' ? 'rgba(248, 113, 113, 0.35)' : 'rgba(239, 68, 68, 0.28)',
    successBorder: scheme === 'dark' ? 'rgba(52, 211, 153, 0.35)' : 'rgba(16, 185, 129, 0.28)',
  } as const;
}

export type ThemeColors = ReturnType<typeof getDashboardColors>;

export const DashboardColors = getDashboardColors('light');

export const DashboardTypography = {
  fontFamilies: {
    display: AppFonts.regular,
    body: AppFonts.regular,
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
  xxxl: 32,
  xxxxl: 40,
} as const;

export const DashboardRadius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 8,
  xxl: 8,
  full: 999,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: AppFonts.regular,
    serif: AppFonts.regular,
    rounded: AppFonts.regular,
    mono: 'ui-monospace',
  },
  default: {
    sans: AppFonts.regular,
    serif: AppFonts.regular,
    rounded: AppFonts.regular,
    mono: 'monospace',
  },
  web: {
    sans: AppFonts.regular,
    serif: AppFonts.regular,
    rounded: AppFonts.regular,
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
