import AsyncStorage from "@react-native-async-storage/async-storage";

const keyFor = (userId: string) => `salonox.userGuide.v1.${encodeURIComponent(userId)}`;
const dismissedThisSession = new Set<string>();

const screenTourKeyFor = (userId: string, tourTitle: string) =>
  `salonox.screenTour.v1.${encodeURIComponent(userId)}.${encodeURIComponent(tourTitle)}`;
const screenToursSeenThisSession = new Set<string>();

export const guideStorage = {
  async shouldShow(userId: string): Promise<boolean> {
    if (!userId.trim() || dismissedThisSession.has(userId)) return false;
    try {
      const stored = await AsyncStorage.getItem(keyFor(userId));
      return stored !== "done" && !dismissedThisSession.has(userId);
    } catch {
      return false;
    }
  },
  async dismiss(userId: string): Promise<void> {
    if (!userId.trim()) return;
    dismissedThisSession.add(userId);
    try {
      await AsyncStorage.setItem(keyFor(userId), "done");
    } catch {
      return;
    }
  },
};

/**
 * Remembers which per-screen "Show me around" tours a user has finished or
 * skipped, so that screen stops offering its tour. Tours stay replayable from
 * Settings → Feature tours.
 */
export const screenTourStorage = {
  /** Unknown or unreadable state keeps the tour on offer — it's harmless to show. */
  async hasSeen(userId: string, tourTitle: string): Promise<boolean> {
    if (!userId.trim()) return false;
    const key = screenTourKeyFor(userId, tourTitle);
    if (screenToursSeenThisSession.has(key)) return true;
    try {
      const stored = await AsyncStorage.getItem(key);
      return stored === "done" || screenToursSeenThisSession.has(key);
    } catch {
      return screenToursSeenThisSession.has(key);
    }
  },
  /** Synchronous check so a remounted screen doesn't flash the bar after a tour this session. */
  hasSeenThisSession(userId: string, tourTitle: string): boolean {
    return screenToursSeenThisSession.has(screenTourKeyFor(userId, tourTitle));
  },
  async markSeen(userId: string, tourTitle: string): Promise<void> {
    if (!userId.trim()) return;
    const key = screenTourKeyFor(userId, tourTitle);
    screenToursSeenThisSession.add(key);
    try {
      await AsyncStorage.setItem(key, "done");
    } catch {
      return;
    }
  },
};
