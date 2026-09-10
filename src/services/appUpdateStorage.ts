import AsyncStorage from "@react-native-async-storage/async-storage";

const APP_UPDATE_SNOOZE_KEY = "salonox.appUpdate.snooze";

// How long "Maybe Later" suppresses an optional update. Long enough that the
// prompt isn't a cold-start nag, short enough that an optional update still
// lands within a normal working week.
export const APP_UPDATE_SNOOZE_MS = 24 * 60 * 60 * 1000;

// The snooze is keyed to the version it was dismissed for, so a newer release
// prompts immediately instead of inheriting the previous version's silence.
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
  // Storage failures must never decide whether the app starts, so every read
  // degrades to "not snoozed" and every write is best-effort.
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
      // Ignored: failing to persist a snooze only means the optional prompt
      // reappears next launch, which is not worth surfacing to the user.
    }
  },

  async clear() {
    try {
      await AsyncStorage.removeItem(APP_UPDATE_SNOOZE_KEY);
    } catch {
      // Ignored — see snooze().
    }
  },
};
