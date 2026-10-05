import { Appearance, Platform, StyleSheet, View } from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import * as SystemUI from "expo-system-ui";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { getDashboardColors, type AppColorScheme, type ThemeColors } from "@/constants/theme";
import { themeStorage } from "@/services/themeStorage";

export type ThemeMode = "light" | "dark" | "system";

type ThemeContextValue = {
  colors: ThemeColors;
  isHydrated: boolean;
  mode: ThemeMode;
  scheme: AppColorScheme;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [systemScheme, setSystemScheme] = useState<AppColorScheme>(
    () => Appearance.getColorScheme() ?? "light",
  );
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    themeStorage
      .getThemeMode()
      .then((storedMode) => {
        if (!cancelled && storedMode) {
          setModeState(storedMode);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsHydrated(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme ?? "light");
    });

    return () => subscription.remove();
  }, []);

  const scheme: AppColorScheme = mode === "system" ? systemScheme : mode;
  const colors = useMemo(() => getDashboardColors(scheme), [scheme]);

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setStyle(scheme === "dark" ? "light" : "dark");
      NavigationBar.setBackgroundColorAsync(colors.bg).catch(() => {});
    }

    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [colors.bg, scheme]);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    void themeStorage.setThemeMode(nextMode);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ colors, isHydrated, mode, scheme, setMode }),
    [colors, isHydrated, mode, scheme, setMode],
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
