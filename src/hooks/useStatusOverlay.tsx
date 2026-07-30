import { useCallback, useState } from "react";
import SuccessOverlay from "../components/ui/SuccessOverlay";
import ErrorOverlay from "../components/ui/ErrorOverlay";

// Shared replacement for react-hot-toast's toast.success()/toast.error() —
// a blocking, animated centered confirmation instead of a passive corner
// notification. `overlay` renders nothing until showSuccess/showError is
// called, then auto-dismisses itself (SuccessOverlay/ErrorOverlay each own
// their own timer) and clears back to null.
export function useStatusOverlay() {
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showSuccess = useCallback((message: string) => setStatus({ type: "success", message }), []);
  const showError = useCallback((message: string) => setStatus({ type: "error", message }), []);
  const clear = useCallback(() => setStatus(null), []);

  const overlay = status ? (
    status.type === "success"
      ? <SuccessOverlay message={status.message} onDone={clear} />
      : <ErrorOverlay message={status.message} onDone={clear} />
  ) : null;

  return { showSuccess, showError, clear, overlay };
}
