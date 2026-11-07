import { pearl } from "@/components/auth/pearl/tokens";
import type { createStyles } from "./appointmentStyles";

/** Styling only: native date, availability and status pickers retain their handlers. */
export function pearlBookingFields(styles: ReturnType<typeof createStyles>) {
  const field = { backgroundColor: "rgba(255,255,255,0.7)", borderColor: "rgba(120,118,150,0.18)", borderWidth: 1, borderRadius: 16, minHeight: 52, paddingHorizontal: 14 };
  return {
    ...styles,
    inputLabel: { ...styles.inputLabel, fontSize: 12.5, fontWeight: "700" as const, color: pearl.ink2 },
    dateButton: { ...styles.dateButton, ...field },
    dateButtonText: { ...styles.dateButtonText, fontSize: 14, color: pearl.ink },
    timeDropdownButton: { ...styles.timeDropdownButton, ...field },
    timeDropdownValue: { ...styles.timeDropdownValue, fontSize: 14, color: pearl.ink },
    compactSelectButton: { ...styles.compactSelectButton, ...field },
    compactSelectText: { ...styles.compactSelectText, fontSize: 14, color: pearl.ink },
  };
}
