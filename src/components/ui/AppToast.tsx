import { createToastContainer } from "@/components/ui/Toast";
import { dismissToast } from "@/store/toast/toast.slice";

// The single, app-wide toast/snackbar instance — mounted once at the root
// layout so every screen shares the same queue and visual style instead of
// each feature rendering its own container against the same global slice.
export const AppToast = createToastContainer({
  selector: (state) => state.toast,
  clearAction: dismissToast,
});
