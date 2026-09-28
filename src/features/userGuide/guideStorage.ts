import AsyncStorage from "@react-native-async-storage/async-storage";

const keyFor = (userId: string) => `salonox.userGuide.v1.${encodeURIComponent(userId)}`;
const dismissedThisSession = new Set<string>();

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
