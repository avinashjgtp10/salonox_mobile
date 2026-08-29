import { useCallback, useMemo } from "react";

import { useAppDispatch } from "@/store/hooks";
import { showToast, type ToastTone } from "@/store/toast/toast.slice";

// Thin convenience wrapper around the global toast slice so call sites don't
// need to know about dispatch/action-creator plumbing — the single reusable
// success/error/info/warning notification API for the whole app.
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
