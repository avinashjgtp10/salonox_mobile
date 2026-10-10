import * as Updates from "expo-updates";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { useAppForeground } from "@/hooks/useAppForeground";

// expo-updates on its own only checks at a cold start and applies the download on
// the *next* cold start, so an app left open never noticed a new OTA. This checks
// at start, on returning to the foreground, and every minute while the app is
// active, against the channel/runtime baked into the installed build. Checks are
// never closer together than this, so a foreground return right after a check
// waits for the next scheduled one instead of sending a duplicate request.
const CHECK_INTERVAL_MS = 60_000;

export function useOtaUpdate(startupReady = true) {
  // Disabled in dev clients and Expo Go; only release builds receive EAS Updates.
  const enabled = startupReady && Updates.isEnabled && !__DEV__;
  const { availableUpdate, downloadedUpdate, isUpdateAvailable, isUpdatePending } = Updates.useUpdates();
  const checking = useRef(false);
  const applying = useRef(false);
  const lastCheckAt = useRef(0);
  const nextCheck = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkRef = useRef<() => Promise<void>>(async () => undefined);
  const [isApplying, setIsApplying] = useState(false);
  const [visible, setVisible] = useState(false);
  const [dismissedUpdateId, setDismissedUpdateId] = useState<string | null>(null);

  const cancelNextCheck = () => {
    if (nextCheck.current) clearTimeout(nextCheck.current);
    nextCheck.current = null;
  };

  // Next check exactly one interval after the last one, only while the app is active.
  const scheduleNextCheck = useCallback(() => {
    cancelNextCheck();
    if (!enabled || AppState.currentState !== "active") return;
    const wait = Math.max(0, lastCheckAt.current + CHECK_INTERVAL_MS - Date.now());
    nextCheck.current = setTimeout(() => void checkRef.current(), wait);
  }, [enabled]);

  const check = useCallback(async () => {
    if (!enabled || checking.current) return;
    // Within a minute of the last check, or while an update is installing:
    // let the scheduled check handle it.
    if (applying.current || Date.now() - lastCheckAt.current < CHECK_INTERVAL_MS) {
      scheduleNextCheck();
      return;
    }
    cancelNextCheck();
    checking.current = true;
    lastCheckAt.current = Date.now();
    try {
      // The result lands in useUpdates() state (isUpdateAvailable / availableUpdate),
      // which shows the modal straight away.
      await Updates.checkForUpdateAsync();
    } catch {
      // Offline or server error: stay quiet and retry at the next scheduled check.
    } finally {
      checking.current = false;
      scheduleNextCheck();
    }
  }, [enabled, scheduleNextCheck]);
  checkRef.current = check;

  // At start (lastCheckAt is 0, so this runs immediately).
  useEffect(() => {
    void check();
    return cancelNextCheck;
  }, [check]);

  // Immediately on returning to the foreground (debounced by the one-minute gap).
  useAppForeground(() => {
    void check();
  });

  // No checks while backgrounded; the foreground handler resumes them.
  useEffect(() => {
    if (!enabled) return undefined;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") cancelNextCheck();
    });
    return () => subscription.remove();
  }, [enabled]);

  // A downloaded-but-not-applied update counts too (the start-up check may have fetched it).
  const newUpdateId =
    (isUpdatePending ? downloadedUpdate?.updateId : undefined) ??
    (isUpdateAvailable ? availableUpdate?.updateId : undefined) ??
    null;
  const hasUpdate = enabled && Boolean(newUpdateId) && newUpdateId !== Updates.updateId;

  // Show once per update; "Maybe Later" hides it until a newer update is published.
  useEffect(() => {
    if (hasUpdate && newUpdateId !== dismissedUpdateId) setVisible(true);
  }, [dismissedUpdateId, hasUpdate, newUpdateId]);

  const apply = useCallback(async () => {
    if (applying.current) return;
    applying.current = true;
    setIsApplying(true);
    try {
      if (!isUpdatePending) {
        const result = await Updates.fetchUpdateAsync();
        if (!result.isNew && !result.isRollBackToEmbedded) {
          // Nothing newer to apply after all (e.g. already running it).
          setVisible(false);
          applying.current = false;
          setIsApplying(false);
          return;
        }
      }
      await Updates.reloadAsync();
    } catch (error) {
      applying.current = false;
      setIsApplying(false);
      throw error;
    }
  }, [isUpdatePending]);

  const dismiss = useCallback(() => {
    setVisible(false);
    setDismissedUpdateId(newUpdateId);
  }, [newUpdateId]);

  return {
    apply,
    dismiss,
    hasUpdate,
    isApplying,
    reopen: () => { if (hasUpdate) setVisible(true); },
    visible: hasUpdate && visible,
  };
}
