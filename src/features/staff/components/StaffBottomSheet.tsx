// Relocated to the shared UI primitives (src/components/ui/BottomSheet.tsx)
// so other modules can reuse the same sheet instead of hand-rolling their
// own. Re-exported under the original name so no existing caller in the
// staff module needs to change its import.
export { BottomSheet as StaffBottomSheet } from "@/components/ui/BottomSheet";
