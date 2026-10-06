import { useCallback, useEffect, useRef, useState } from "react";

import {
  appUpdateService,
  type AppUpdateInfo,
} from "@/services/appUpdate.service";
import { appUpdateStorage } from "@/services/appUpdateStorage";

export function useAppUpdateAnnouncement() {
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);
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

        if (!nextUpdateInfo.isUpdateAvailable && !nextUpdateInfo.isMandatory) {
          return;
        }

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
