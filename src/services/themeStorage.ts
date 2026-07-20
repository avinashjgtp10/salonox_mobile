import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ThemeMode } from "@/theme/ThemeProvider";

const THEME_MODE_KEY = "salonox.themeMode";

const VALID_MODES: ThemeMode[] = ["light", "dark", "system"];

export const themeStorage = {
  async getThemeMode(): Promise<ThemeMode | null> {
    const rawMode = await AsyncStorage.getItem(THEME_MODE_KEY);

    if (!rawMode || !VALID_MODES.includes(rawMode as ThemeMode)) {
      return null;
    }

    return rawMode as ThemeMode;
  },

  async setThemeMode(mode: ThemeMode) {
    await AsyncStorage.setItem(THEME_MODE_KEY, mode);
  },
};
