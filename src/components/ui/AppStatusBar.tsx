import { StatusBar } from "expo-status-bar";
import { useIsFocused } from "@react-navigation/native";

import { useAppTheme } from "@/theme/ThemeProvider";

export function AppStatusBar({ backgroundColor }: { backgroundColor?: string }) {
  const { colors, scheme } = useAppTheme();
  const focused = useIsFocused();

  return focused ? <StatusBar backgroundColor={backgroundColor ?? colors.bg} style={scheme === "dark" ? "light" : "dark"} /> : null;
}
