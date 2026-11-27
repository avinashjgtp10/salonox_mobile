/**
 * Live device notification permission for the UI.
 *
 * Re-reads on every foreground, so switching notifications on or off in the
 * device settings is reflected as soon as the user comes back to the app.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { useAppForeground } from "@/hooks/useAppForeground";
import {
  getNotificationPermission,
  type NotificationPermissionState,
} from "@/services/notificationPermission";
import { promptForNotificationPermission } from "@/services/notificationPermissionPrompt";

export const useNotificationPermission = () => {
  const [permission, setPermission] = useState<NotificationPermissionState | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const next = await getNotificationPermission();
    if (mountedRef.current) setPermission(next);
    return next;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useAppForeground(() => {
    void refresh();
  });

  /** Prompt, then the OS request. Called from a button, so it always asks. */
  const request = useCallback(async () => {
    const next = await promptForNotificationPermission({ force: true });
    if (mountedRef.current) setPermission(next);
    return next;
  }, []);

  return { permission, refresh, request };
};
