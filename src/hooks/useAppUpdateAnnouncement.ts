import { useCallback, useEffect, useRef, useState } from "react";

import {
  appUpdateService,
  type AppUpdateInfo,
} from "@/services/appUpdate.service";
import { appUpdateStorage } from "@/services/appUpdateStorage";

export function useAppUpdateAnnouncement() {
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  // The check is a once-per-launch side effect. React 19 + the React Compiler
  // can run an effect body more than once (StrictMode double-invoke, remounts),
  // and this component sits at the root where that is most likely — the ref
  // makes the network call idempotent for the lifetime of the process.
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (hasCheckedRef.current) {
      return;
    }

    hasCheckedRef.current = true;

    let isMounted = true;

    void (async () => {
      try {
        const nextUpdateInfo = await appUpdateService.checkForUpdate();

        if (!isMounted || !nextUpdateInfo) {
          return;
        }

        // Nothing to offer: up to date, or the client is ahead of the store.
        if (!nextUpdateInfo.isUpdateAvailable && !nextUpdateInfo.isMandatory) {
          return;
        }

        // A mandatory update ignores any prior snooze — the user cannot defer
        // past the minimum supported version.
        if (!nextUpdateInfo.isMandatory) {
          const snoozed = await appUpdateStorage.isSnoozed(nextUpdateInfo.latestVersion);

          if (!isMounted) {
            return;
          }
          if (snoozed) {
            setUpdateInfo(nextUpdateInfo);
            return;
          }
        }

        setUpdateInfo(nextUpdateInfo);
        setIsVisible(true);
      } catch {
        // Network down, endpoint unavailable, malformed response — the update
        // check must never be able to stop the app from starting.
        if (isMounted) {
          setUpdateInfo(null);
          setIsVisible(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const close = useCallback(() => {
    if (updateInfo?.isMandatory) {
      return;
    }

    setIsVisible(false);

    if (updateInfo?.latestVersion) {
      void appUpdateStorage.snooze(updateInfo.latestVersion);
    }
  }, [updateInfo?.isMandatory, updateInfo?.latestVersion]);

  return {
    close,
    reopen: () => {
      if (updateInfo?.isUpdateAvailable) setIsVisible(true);
    },
    isVisible,
    updateInfo,
  };
}
