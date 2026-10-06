import AsyncStorage from "@react-native-async-storage/async-storage";

const APP_UPDATE_SNOOZE_KEY = "salonox.appUpdate.snooze";

export const APP_UPDATE_SNOOZE_MS = 24 * 60 * 60 * 1000;

type AppUpdateSnooze = {
  until: number;
  version: string;
};

const parseSnooze = (raw: string | null): AppUpdateSnooze | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppUpdateSnooze>;

    if (typeof parsed?.version !== "string" || typeof parsed?.until !== "number") {
      return null;
    }

    return { until: parsed.until, version: parsed.version };
  } catch {
    return null;
  }
};

export const appUpdateStorage = {
  async isSnoozed(version: string) {
    try {
      const snooze = parseSnooze(await AsyncStorage.getItem(APP_UPDATE_SNOOZE_KEY));

      return Boolean(snooze && snooze.version === version && snooze.until > Date.now());
    } catch {
      return false;
    }
  },

  async snooze(version: string) {
    try {
      await AsyncStorage.setItem(
        APP_UPDATE_SNOOZE_KEY,
        JSON.stringify({ until: Date.now() + APP_UPDATE_SNOOZE_MS, version }),
      );
    } catch {
    }
  },

  async clear() {
    try {
      await AsyncStorage.removeItem(APP_UPDATE_SNOOZE_KEY);
    } catch {
    }
  },
};
