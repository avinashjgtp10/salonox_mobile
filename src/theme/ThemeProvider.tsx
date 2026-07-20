import { Platform, StyleSheet, View, type ColorSchemeName, useColorScheme } from "react-native";
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

const resolveScheme = (mode: ThemeMode, systemScheme: ColorSchemeName): AppColorScheme => {
  if (mode === "system") {
    return systemScheme === "dark" ? "dark" : "light";
  }

  return mode;
};

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const systemScheme = useColorScheme();
  const [isHydrated, setIsHydrated] = useState(false);
  const scheme = resolveScheme(mode, systemScheme);
  const colors = useMemo(() => getDashboardColors(scheme), [scheme]);

  useEffect(() => {
    let isMounted = true;

    themeStorage
      .getThemeMode()
      .then((storedMode) => {
        if (isMounted && storedMode) {
          setModeState(storedMode);
        }
      })
      .catch((error) => {
        if (__DEV__) {
          console.warn("[ThemeProvider] Unable to restore theme preference.", error);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsHydrated(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setStyle(scheme === "dark" ? "light" : "dark");
      NavigationBar.setBackgroundColorAsync(colors.bg).catch(() => {});
    }

    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [colors.bg, scheme]);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    themeStorage.setThemeMode(nextMode).catch((error) => {
      if (__DEV__) {
        console.warn("[ThemeProvider] Unable to save theme preference.", error);
      }
    });
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
