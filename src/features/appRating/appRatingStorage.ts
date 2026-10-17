import AsyncStorage from "@react-native-async-storage/async-storage";

export const APP_RATING_REPROMPT_MS = 7 * 24 * 60 * 60 * 1000;

const keyFor = (userId: string) => `salonox.appRating.v1.${encodeURIComponent(userId)}`;

type AppRatingRecord = {
  dismissedAt?: number;
  submittedAt?: number;
};

const parseRecord = (raw: string | null): AppRatingRecord => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as AppRatingRecord;
    return {
      dismissedAt: typeof parsed?.dismissedAt === "number" ? parsed.dismissedAt : undefined,
      submittedAt: typeof parsed?.submittedAt === "number" ? parsed.submittedAt : undefined,
    };
  } catch {
    return {};
  }
};

/** Submitted: never ask again. Dismissed: ask again once 7 days have passed. */
export const isAppRatingDue = (record: AppRatingRecord, now = Date.now()) => {
  if (record.submittedAt) return false;
  if (!record.dismissedAt) return true;
  return now - record.dismissedAt >= APP_RATING_REPROMPT_MS;
};

export const appRatingStorage = {
  async shouldShow(userId: string): Promise<boolean> {
    if (!userId.trim()) return false;
    try {
      return isAppRatingDue(parseRecord(await AsyncStorage.getItem(keyFor(userId))));
    } catch {
      return false;
    }
  },

  async markDismissed(userId: string): Promise<void> {
    if (!userId.trim()) return;
    try {
      await AsyncStorage.setItem(keyFor(userId), JSON.stringify({ dismissedAt: Date.now() }));
    } catch {
      return;
    }
  },

  async markSubmitted(userId: string): Promise<void> {
    if (!userId.trim()) return;
    try {
      await AsyncStorage.setItem(keyFor(userId), JSON.stringify({ submittedAt: Date.now() }));
    } catch {
      return;
    }
  },
};
