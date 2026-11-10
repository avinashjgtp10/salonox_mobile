import { useAppTheme } from "@/theme/ThemeProvider";
import { pearl } from "./tokens";

/** Prototype Light / Dim palettes; System uses the resolved device scheme. */
export const dimPearl = {
  ...pearl,
  ink: "#EBEAF0", ink2: "#C2C0CE", muted: "#9997A9", placeholder: "#9997A9",
  accentDeep: "#B1AECE", accentTint: "#36334C", accentWash: "#36334C",
  bgTop: "#1F1D2B", bgMid: "#1E1B33", bgBottom: "#242233",
  glass: "rgba(54,49,81,0.52)", glassStrong: "rgba(54,49,81,0.72)",
  glassBorder: "rgba(255,255,255,0.098)", field: "rgba(54,49,81,0.7)",
  fieldFocus: "rgba(54,49,81,0.9)", fieldBorder: "rgba(120,118,150,0.18)",
  divider: "rgba(120,118,150,0.13)", successText: "#ADEBD7",
  warningText: "#F6D8A2", dangerText: "#E0A3AD",
};
export function usePearlPalette() {
  return useAppTheme().scheme === "dark" ? dimPearl : pearl;
}
