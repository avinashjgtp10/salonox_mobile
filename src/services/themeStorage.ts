import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ThemeMode } from "@/theme/ThemeProvider";

const THEME_MODE_KEY = "salonox.themeMode";
const VALID_MODES: ThemeMode[] = ["light", "dark", "system"];

export const themeStorage = {
  async getThemeMode(): Promise<ThemeMode | null> {
    const stored = await AsyncStorage.getItem(THEME_MODE_KEY);

    return VALID_MODES.includes(stored as ThemeMode) ? (stored as ThemeMode) : null;
  },

  async setThemeMode(mode: ThemeMode) {
    await AsyncStorage.setItem(THEME_MODE_KEY, mode);
  },
};
