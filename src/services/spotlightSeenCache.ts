import AsyncStorage from "@react-native-async-storage/async-storage";

const SEEN_KEY = "salonox.spotlight.firstSeen";

// How long an announcement stays on the dashboard after the owner first sees
// it. Purely a display lifetime — it does not mark the feature explored, so
// the full write-up remains available on the web app afterwards.
export const SPOTLIGHT_VISIBLE_MS = 60 * 60 * 1000;

export type SpotlightSeenMap = Record<string, number>;

export const spotlightSeenCache = {
  async get(): Promise<SpotlightSeenMap> {
    try {
      const raw = await AsyncStorage.getItem(SEEN_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return {};
      }

      // Drop anything non-numeric so one corrupt entry can't make every card
      // look permanently expired (or permanently fresh).
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).filter(
          (entry): entry is [string, number] => typeof entry[1] === "number",
        ),
      );
    } catch {
      return {};
    }
  },

  async set(value: SpotlightSeenMap) {
    try {
      await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(value));
    } catch {
      // Best-effort only. If this fails the card simply restarts its hour on
      // the next launch, which is preferable to hiding it outright.
    }
  },
};
