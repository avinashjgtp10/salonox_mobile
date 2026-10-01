import AsyncStorage from "@react-native-async-storage/async-storage";

import { appEnv } from "@/config/environment";

const keyFor = (scope: string) => `salonox.notifications.${appEnv}.removed.${scope}`;
let pendingWrite: Promise<void> = Promise.resolve();

const parseIds = (value: string | null): string[] => {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    // A damaged local preference must not prevent the notification feed loading.
    return [];
  }
};

export const notificationLocalStorage = {
  async getRemovedIds(scope: string): Promise<string[]> {
    await pendingWrite;
    const value = await AsyncStorage.getItem(keyFor(scope));
    return parseIds(value);
  },
  remove(scope: string, id: string): Promise<void> {
    const write = pendingWrite.then(async () => {
      const value = await AsyncStorage.getItem(keyFor(scope));
      const ids = parseIds(value);
      await AsyncStorage.setItem(keyFor(scope), JSON.stringify([...new Set([...ids, id])]));
    });
    pendingWrite = write.catch(() => undefined);
    return write;
  },
};
