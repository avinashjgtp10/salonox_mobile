import AsyncStorage from "@react-native-async-storage/async-storage";

const keyFor = (userId: string) => `salonox.userGuide.v1.${encodeURIComponent(userId)}`;
// Set only right after this device completes a fresh sign-up, never on login.
// The guide is meant to greet a brand-new account once, not every device that
// later logs into it — that's the per-device AsyncStorage flag above getting
// mistaken for "this account has never seen the guide" when it's really just
// "this device hasn't".
const justRegisteredKeyFor = (userId: string) => `salonox.userGuide.v1.justRegistered.${encodeURIComponent(userId)}`;
const dismissedThisSession = new Set<string>();

const screenTourKeyFor = (userId: string, tourTitle: string) =>
  `salonox.screenTour.v1.${encodeURIComponent(userId)}.${encodeURIComponent(tourTitle)}`;
const screenToursSeenThisSession = new Set<string>();

export const guideStorage = {
  async shouldShow(userId: string): Promise<boolean> {
    if (!userId.trim() || dismissedThisSession.has(userId)) return false;
    try {
      const [done, justRegistered] = await Promise.all([
        AsyncStorage.getItem(keyFor(userId)),
        AsyncStorage.getItem(justRegisteredKeyFor(userId)),
      ]);
      // Without this, the guide reappeared on every new device logged into an
      // already-onboarded account, since AsyncStorage never leaves this device.
      return justRegistered === "1" && done !== "done" && !dismissedThisSession.has(userId);
    } catch {
      return false;
    }
  },
  async dismiss(userId: string): Promise<void> {
    if (!userId.trim()) return;
    dismissedThisSession.add(userId);
    try {
      await AsyncStorage.multiSet([
        [keyFor(userId), "done"],
        [justRegisteredKeyFor(userId), "0"],
      ]);
    } catch {
      return;
    }
  },
  /** Call once, right after a brand-new sign-up on this device, never on login. */
  async markJustRegistered(userId: string): Promise<void> {
    if (!userId.trim()) return;
    try {
      await AsyncStorage.setItem(justRegisteredKeyFor(userId), "1");
    } catch {
      return;
    }
  },
};

export const screenTourStorage = {
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
