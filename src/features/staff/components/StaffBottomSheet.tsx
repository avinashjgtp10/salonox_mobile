import type { ComponentProps } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
export function StaffBottomSheet(props: ComponentProps<typeof BottomSheet>) {
  return <BottomSheet pearlStyle centered={false} avoidKeyboard {...props}/>;
}
