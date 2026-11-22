import AsyncStorage from "@react-native-async-storage/async-storage";

import type { DashboardFetchResult } from "@/middleware/dashboard/dashboard.thunk";

const KEY_PREFIX = "salonox.dashboard.snapshot";
// A snapshot is a starting picture, not data to keep. Past this it is dropped
// rather than shown, so a phone opened after a long break never puts stale
// revenue on screen even for a moment.
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type DashboardSnapshot = { cachedAt: number; data: DashboardFetchResult };

// Keyed per salon so switching branch never shows the other branch's figures.
const keyFor = (salonId: string | null | undefined) => `${KEY_PREFIX}.${salonId ?? "default"}`;

export const dashboardCache = {
  async get(salonId: string | null | undefined): Promise<DashboardSnapshot | null> {
    try {
      const raw = await AsyncStorage.getItem(keyFor(salonId));
      if (!raw) return null;

      const snapshot = JSON.parse(raw) as DashboardSnapshot;
      if (!snapshot?.data || typeof snapshot.cachedAt !== "number") return null;
      if (Date.now() - snapshot.cachedAt > MAX_AGE_MS) return null;

      return snapshot;
    } catch {
      return null;
    }
  },

  async set(salonId: string | null | undefined, data: DashboardFetchResult) {
    try {
      await AsyncStorage.setItem(keyFor(salonId), JSON.stringify({ cachedAt: Date.now(), data }));
    } catch {
      // A snapshot that cannot be written only costs the next launch its head start.
    }
  },

  /** Called on sign-out: the next account must not inherit these figures. */
  async clear() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const ours = keys.filter((key) => key.startsWith(KEY_PREFIX));
      if (ours.length > 0) await AsyncStorage.multiRemove(ours);
    } catch {
    }
  },
};
