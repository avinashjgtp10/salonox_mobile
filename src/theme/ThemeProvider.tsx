import { Platform, StyleSheet, View } from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import * as SystemUI from "expo-system-ui";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type PropsWithChildren,
} from "react";

import { getDashboardColors, type AppColorScheme, type ThemeColors } from "@/constants/theme";

export type ThemeMode = "light" | "dark" | "system";

type ThemeContextValue = {
  colors: ThemeColors;
  isHydrated: boolean;
  mode: ThemeMode;
  scheme: AppColorScheme;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const FORCED_THEME_MODE: ThemeMode = "dark";
const FORCED_COLOR_SCHEME: AppColorScheme = "dark";

export function ThemeProvider({ children }: PropsWithChildren) {
  const mode = FORCED_THEME_MODE;
  const scheme = FORCED_COLOR_SCHEME;
  const colors = useMemo(() => getDashboardColors(FORCED_COLOR_SCHEME), []);

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setStyle(scheme === "dark" ? "light" : "dark");
      NavigationBar.setBackgroundColorAsync(colors.bg).catch(() => {});
    }

    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [colors.bg, scheme]);

  const setMode = useCallback((_nextMode: ThemeMode) => {}, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ colors, isHydrated: true, mode, scheme, setMode }),
    [colors, mode, scheme, setMode],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[styles.fill, { backgroundColor: colors.bg }]}>{children}</View>
    </ThemeContext.Provider>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used within a ThemeProvider.");
  }

  return context;
}

export function useThemeColors(): ThemeColors {
  return useAppTheme().colors;
}
