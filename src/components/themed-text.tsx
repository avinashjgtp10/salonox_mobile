import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { DashboardTypography as Type, Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'linkPrimary' && { color: theme.primary },
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontFamily: Type.fontFamilies.body,
    fontSize: Type.fontSizes.md,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: Type.lineHeights.md,
  },
  smallBold: {
    fontFamily: Type.fontFamilies.body,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: Type.lineHeights.md,
  },
  default: {
    fontFamily: Type.fontFamilies.body,
    fontSize: Type.fontSizes.base,
    fontWeight: '500',
    letterSpacing: 0,
    lineHeight: Type.lineHeights.base,
  },
  title: {
    fontFamily: Type.fontFamilies.display,
    fontSize: Type.fontSizes.xxl,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: Type.lineHeights.xxl,
  },
  subtitle: {
    fontFamily: Type.fontFamilies.body,
    fontSize: Type.fontSizes.xl,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: Type.lineHeights.xl,
  },
  link: {
    fontFamily: Type.fontFamilies.body,
    fontSize: Type.fontSizes.md,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: Type.lineHeights.md,
  },
  linkPrimary: {
    fontFamily: Type.fontFamilies.body,
    fontSize: Type.fontSizes.md,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: Type.lineHeights.md,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
