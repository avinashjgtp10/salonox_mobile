/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    primary: '#496A5D',
    primaryDark: '#365046',
    secondary: '#6D8F81',
    accentGold: '#C7A86D',
    accentGoldDark: '#B18F54',
    background: '#FAFBFA',
    backgroundSecondary: '#F4F7F5',
    card: '#FFFFFF',
    text: '#445B55',
    heading: '#243B34',
    textSecondary: '#7A8D87',
    placeholder: '#A8B7B1',
    border: '#E3E8E5',
    focusBorder: '#496A5D',
    backgroundElement: '#F4F7F5',
    backgroundSelected: '#E3E8E5',
    success: '#4B8F68',
    warning: '#D8A84F',
    error: '#D65B5B',
    info: '#5B8DEF',
  },
  dark: {
    primary: '#6D8F81',
    primaryDark: '#496A5D',
    secondary: '#A8B7B1',
    accentGold: '#C7A86D',
    accentGoldDark: '#B18F54',
    background: '#243B34',
    backgroundSecondary: '#365046',
    card: '#2C443C',
    text: '#F4F7F5',
    heading: '#FFFFFF',
    textSecondary: '#A8B7B1',
    placeholder: '#A8B7B1',
    border: '#496A5D',
    focusBorder: '#C7A86D',
    backgroundElement: '#365046',
    backgroundSelected: '#496A5D',
    success: '#4B8F68',
    warning: '#D8A84F',
    error: '#D65B5B',
    info: '#5B8DEF',
  },
} as const;

export const SageGold = Colors.light;

export const DashboardColors = {
  primary: SageGold.primary,
  primaryDark: SageGold.primaryDark,
  secondary: SageGold.secondary,
  gold: SageGold.accentGold,
  goldDark: SageGold.accentGoldDark,
  bg: SageGold.background,
  bg2: SageGold.backgroundSecondary,
  card: SageGold.card,
  heading: SageGold.heading,
  text: SageGold.text,
  text2: SageGold.textSecondary,
  placeholder: SageGold.placeholder,
  border: SageGold.border,
  focusBorder: SageGold.focusBorder,
  success: SageGold.success,
  successBg: 'rgba(75, 143, 104, 0.1)',
  warning: SageGold.warning,
  warningBg: 'rgba(216, 168, 79, 0.12)',
  error: SageGold.error,
  errorBg: 'rgba(214, 91, 91, 0.1)',
  info: SageGold.info,
} as const;

export const DashboardTypography = {
  fontSizes: {
    xs: 10,
    sm: 12,
    md: 14,
    base: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
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
} as const;

export const DashboardRadius = {
  sm: 12,
  md: 16,
  lg: 18,
  xl: 22,
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
