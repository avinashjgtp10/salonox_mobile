import { StatusBar } from "expo-status-bar";

import { useAppTheme } from "@/theme/ThemeProvider";

// Apps are edge-to-edge by default on the current SDK — the status bar has no
// backgroundColor of its own, the screen underneath shows through it. Only
// the icon/text style needs to track the theme, which this centralizes so no
// screen has to compute it (or hardcode a light-mode-only value) itself.
export function AppStatusBar() {
  const { colors, scheme } = useAppTheme();

  return <StatusBar backgroundColor={colors.bg} style={scheme === "dark" ? "light" : "dark"} />;
}
