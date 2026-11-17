import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { usePearlColors } from "@/components/auth/pearl/usePearlColors";
import { useMemo } from "react";

/**
 * Styles for the appointment detail / reschedule / cancel screens.
 *
 * Pearl, not the previous palette: these screens are styled almost entirely
 * from here, so taking the colours from one place keeps the whole flow on one
 * theme instead of leaving icons and buttons on the old maroon.
 */
export const useAppointmentStyles = () => {
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return { Colors, styles };
};
