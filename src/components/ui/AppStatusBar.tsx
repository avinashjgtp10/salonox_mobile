import { StatusBar } from "expo-status-bar";
import { useIsFocused } from "@react-navigation/native";

import { useAppTheme } from "@/theme/ThemeProvider";

/**
 * Status bar icon style only. The bar itself stays transparent so each
 * screen's own background (the Pearl gradient) runs behind it — under
 * edge-to-edge a `backgroundColor` is ignored and logs a warning.
 */
export function AppStatusBar() {
  const { scheme } = useAppTheme();
  const focused = useIsFocused();

  return focused ? <StatusBar style={scheme === "dark" ? "light" : "dark"} /> : null;
}
