import { useCallback, useMemo } from "react";

import { useAppDispatch } from "@/store/hooks";
import { showToast, type ToastTone } from "@/store/toast/toast.slice";

export function useAppToast() {
  const dispatch = useAppDispatch();

  const show = useCallback(
    (message: string, tone: ToastTone, duration?: number) => {
      dispatch(showToast({ duration, message, tone }));
    },
    [dispatch],
  );

  return useMemo(
    () => ({
      showError: (message: string, duration?: number) => show(message, "error", duration),
      showInfo: (message: string, duration?: number) => show(message, "info", duration),
      showSuccess: (message: string, duration?: number) => show(message, "success", duration),
      showWarning: (message: string, duration?: number) => show(message, "warning", duration),
    }),
    [show],
  );
}
