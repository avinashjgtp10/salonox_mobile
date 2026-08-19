import { createToastContainer } from "@/components/ui/Toast";
import { dismissToast } from "@/store/toast/toast.slice";

export const StaffToast = createToastContainer({
  selector: (state) => state.toast,
  clearAction: dismissToast,
});