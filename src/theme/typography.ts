import type { TextStyle } from "react-native";

export const AppFonts = {
  regular: "Manrope_400Regular",
  medium: "Manrope_500Medium",
  semibold: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
  extrabold: "Manrope_800ExtraBold",
  black: "Manrope_800ExtraBold",
} as const;

export function fontForWeight(weight: TextStyle["fontWeight"] = "400") {
  if (weight === "bold") return AppFonts.bold;
  const numeric = Number(weight);
  if (numeric >= 900) return AppFonts.black;
  if (numeric >= 800) return AppFonts.extrabold;
  if (numeric >= 700) return AppFonts.bold;
  if (numeric >= 600) return AppFonts.semibold;
  if (numeric >= 500) return AppFonts.medium;
  return AppFonts.regular;
}

export function resolveFontStyle(style: TextStyle): TextStyle {
  const family = style.fontFamily;
  const usesAppFont = !family || family.startsWith("Manrope_") ||
    ["serif", "sans-serif", "normal", "system-ui", "ui-serif", "ui-rounded"].includes(family);
  if (!usesAppFont) return {};
  return {
    fontFamily: fontForWeight(style.fontWeight),
    fontWeight: "normal",
  };
}
