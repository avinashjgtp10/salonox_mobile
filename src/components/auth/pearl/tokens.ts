/**
 * SalonOX "Pearl" theme tokens for the sign-in flow.
 * Values come from the clickable prototype (docs/prototype/salonox-prototype.html).
 * Fonts: the app's <Text>/<TextInput> map `fontWeight` to the loaded Manrope files,
 * so styles here only set weights, never font families.
 */
import { Platform, type TextStyle, type ViewStyle } from "react-native";

export const pearl = {
  ink: "#3B3950",
  ink2: "#615E78",
  muted: "#8A889C",
  placeholder: "#A3A1B3",

  accent: "#7E78B0",
  accentDeep: "#5D5890",
  accentLight: "#A7A2D0",
  accentTint: "#CFCBE8",
  accentWash: "#EEECF6",

  bgTop: "#F8F7F4",
  bgMid: "#F1F0F7",
  bgBottom: "#F4F2EC",
  white: "#FFFFFF",
  // Prototype :root --glass / --glass-s / --edge
  glass: "rgba(255,255,255,0.52)",
  glassStrong: "rgba(255,255,255,0.72)",
  glassBorder: "rgba(255,255,255,0.75)",
  field: "rgba(255,255,255,0.78)",
  fieldFocus: "rgba(255,255,255,0.9)",
  fieldBorder: "rgba(120,118,150,0.22)",
  divider: "rgba(120,118,150,0.18)",

  sheenLavender: "#D9D6F0",
  sheenSky: "#D6E8F4",
  sheenChampagne: "#EFE2D4",
  sheenBlush: "#F6E2EA",

  success: "#2E9E7A",
  successText: "#1F7D5F",
  successBg: "rgba(46,158,122,0.10)",
  successBorder: "rgba(46,158,122,0.30)",
  warning: "#C98A1B",
  warningText: "#7E560D",
  warningBg: "rgba(201,138,27,0.10)",
  warningBorder: "rgba(201,138,27,0.30)",
  danger: "#C8475A",
  dangerText: "#B23A4D",
  dangerBg: "rgba(200,71,90,0.09)",
  dangerBorder: "rgba(200,71,90,0.28)",
  dangerField: "rgba(255,242,244,0.92)",
  dangerFieldBorder: "rgba(200,71,90,0.7)",
  infoBg: "rgba(214,196,240,0.30)",
} as const;

export const pearlGradients = {
  primary: ["#B3AEDA", "#8D87BF", "#6B669F"] as const,
  background: [pearl.bgTop, pearl.bgMid, pearl.bgBottom] as const,
  hero: ["#A9A4D2", "#8580B6", "#6A6597", "#5A5684"] as const,
};

export const pearlType = {
  h1: { fontSize: 26, lineHeight: 32, fontWeight: "800", letterSpacing: -0.6, color: pearl.ink },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: "800", letterSpacing: -0.5, color: pearl.ink },
  h3: { fontSize: 17, lineHeight: 22, fontWeight: "700", letterSpacing: -0.2, color: pearl.ink },
  body: { fontSize: 14, lineHeight: 20, fontWeight: "500", color: pearl.ink2 },
  bodyStrong: { fontSize: 14.5, lineHeight: 20, fontWeight: "700", color: pearl.ink },
  small: { fontSize: 12.5, lineHeight: 18, fontWeight: "500", color: pearl.muted },
  label: { fontSize: 12.5, lineHeight: 16, fontWeight: "600", color: pearl.ink2 },
  link: { fontSize: 13, fontWeight: "600", color: pearl.accentDeep },
  button: { fontSize: 15, fontWeight: "700", color: pearl.white },
  input: { fontSize: 14.5, fontWeight: "600", color: pearl.ink },
  error: { fontSize: 12, lineHeight: 17, fontWeight: "600", color: pearl.dangerText },
  slogan: { fontSize: 13, lineHeight: 19, fontWeight: "600", color: pearl.ink2, textAlign: "center" },
} satisfies Record<string, TextStyle>;

export const pearlSpace = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const pearlRadius = { field: 16, card: 28, panel: 22, tile: 20 } as const;

export const pearlShadow = {
  card: Platform.select<ViewStyle>({
    ios: { shadowColor: "#46446E", shadowOpacity: 0.1, shadowRadius: 15, shadowOffset: { width: 0, height: 10 } },
    // No elevation on Android: it draws a visible pale box behind translucent glass surfaces.
    default: {},
  }) as ViewStyle,
  button: Platform.select<ViewStyle>({
    ios: { shadowColor: "#5D5890", shadowOpacity: 0.32, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
    android: { elevation: 6, shadowColor: "#5D5890" },
    default: {},
  }) as ViewStyle,
};

/** Soft tinted backgrounds for icon tiles, avatars and status pills. */
export const pearlTones = {
  lavender: { bg: "rgba(230,227,243,0.75)", fg: "#5D5890", avatar: ["#CFCBE8", "#7E78B0"] },
  lilac: { bg: "rgba(214,196,240,0.6)", fg: "#6A4F98", avatar: ["#C9B5EC", "#8466B8"] },
  sky: { bg: "rgba(217,231,241,0.85)", fg: "#4F7896", avatar: ["#BCD6E8", "#7099BA"] },
  success: { bg: "rgba(46,158,122,0.12)", fg: "#1F7D5F", avatar: ["#8FD3BA", "#2E9E7A"] },
  warning: { bg: "rgba(201,138,27,0.14)", fg: "#94640F", avatar: ["#F1CE85", "#C98A1B"] },
  danger: { bg: "rgba(200,71,90,0.12)", fg: "#A8384A", avatar: ["#EDA2AD", "#C8475A"] },
  neutral: { bg: "rgba(138,136,156,0.14)", fg: "#6A6880", avatar: ["#CFCDDB", "#8A889C"] },
} as const satisfies Record<string, { bg: string; fg: string; avatar: readonly [string, string] }>;
export type PearlTone = keyof typeof pearlTones;
