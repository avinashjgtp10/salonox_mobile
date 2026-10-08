import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

import { AppointmentCalendarContent } from "@/features/appointments/screens/AppointmentCalendarScreen";
import { withScreenTour } from "@/features/userGuide/DashboardTour";
import { screenTours } from "@/features/userGuide/screenTours";
import { useStaffCalendarAccess } from "@/hooks/useStaffCalendarAccess";

function StaffCalendarScreenContent() {
  const { canUseQuickSale, refresh } = useStaffCalendarAccess();
  // Re-check on every visit so an owner's change applies without a restart.
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  return <AppointmentCalendarContent staffMode staffQuickSale={canUseQuickSale} />;
}
export const StaffCalendarScreen = withScreenTour(StaffCalendarScreenContent, screenTours.calendar);
