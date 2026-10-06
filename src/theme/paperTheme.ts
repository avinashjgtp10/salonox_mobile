
import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

import type { AppColorScheme, ThemeColors } from '@/constants/theme';
import { DashboardRadius } from '@/constants/theme';
import { fontForWeight } from '@/theme/typography';

export function buildPaperTheme(scheme: AppColorScheme, colors: ThemeColors): MD3Theme {
  const base = scheme === 'dark' ? MD3DarkTheme : MD3LightTheme;

  return {
    ...base,
    dark: scheme === 'dark',
    fonts: Object.fromEntries(Object.entries(base.fonts).map(([variant, font]) => [
      variant,
      { ...font, fontFamily: fontForWeight(font.fontWeight), fontWeight: 'normal' },
    ])) as MD3Theme['fonts'],
    roundness: DashboardRadius.lg / 2,
    colors: {
      ...base.colors,
      primary: colors.primary,
      onPrimary: colors.onPrimary,
      primaryContainer: colors.backgroundSelected,
      onPrimaryContainer: colors.primaryDark,
      secondary: colors.gold,
      onSecondary: colors.onPrimary,
      secondaryContainer: colors.backgroundElement,
      onSecondaryContainer: colors.goldDark,
      tertiary: colors.info,
      onTertiary: colors.onPrimary,
      tertiaryContainer: colors.infoBg,
      onTertiaryContainer: colors.info,
      error: colors.error,
      onError: colors.onPrimary,
      errorContainer: colors.errorBg,
      onErrorContainer: colors.error,
      background: colors.bg,
      onBackground: colors.text,
      surface: colors.card,
      onSurface: colors.heading,
      surfaceVariant: colors.bg2,
      onSurfaceVariant: colors.text2,
      surfaceDisabled: colors.backgroundElement,
      onSurfaceDisabled: colors.hint,
      outline: colors.border,
      outlineVariant: colors.divider,
      shadow: colors.shadow,
      scrim: 'rgba(0, 0, 0, 0.5)',
      inversePrimary: colors.primaryDark,
      backdrop: 'rgba(0, 0, 0, 0.5)',
      elevation: {
        ...base.colors.elevation,
        level0: 'transparent',
        level1: colors.card,
        level2: colors.card,
        level3: colors.bg2,
        level4: colors.bg2,
        level5: colors.backgroundElement,
      },
    },
  };
}
