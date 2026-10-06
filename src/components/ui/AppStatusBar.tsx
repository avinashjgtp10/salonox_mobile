import { StatusBar } from "expo-status-bar";

import { useAppTheme } from "@/theme/ThemeProvider";

export function AppStatusBar() {
  const { colors, scheme } = useAppTheme();

  return <StatusBar backgroundColor={colors.bg} style={scheme === "dark" ? "light" : "dark"} />;
}
