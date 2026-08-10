import { useCallback, useEffect, useState } from "react";

import {
  appUpdateService,
  type AppUpdateInfo,
} from "@/services/appUpdate.service";

// TODO: Re-enable once the backend implements GET /api/v1/app/version.
const IS_APP_VERSION_CHECK_TEMPORARILY_DISABLED = true;

export function useAppUpdateAnnouncement() {
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (IS_APP_VERSION_CHECK_TEMPORARILY_DISABLED) {
      setUpdateInfo(null);
      setIsVisible(false);
      return;
    }

    let isMounted = true;

    appUpdateService
      .checkForUpdate()
      .then((nextUpdateInfo) => {
        if (!isMounted || !nextUpdateInfo?.isUpdateAvailable) {
          return;
        }

        setUpdateInfo(nextUpdateInfo);
        setIsVisible(true);
      })
      .catch(() => {
        if (isMounted) {
          setUpdateInfo(null);
          setIsVisible(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const close = useCallback(() => {
    if (!updateInfo?.isMandatory) {
      setIsVisible(false);
    }
  }, [updateInfo?.isMandatory]);

  return {
    close,
    isVisible,
    updateInfo,
  };
}
