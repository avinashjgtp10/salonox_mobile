import { AppointmentCalendarContent } from "@/features/appointments/screens/AppointmentCalendarScreen";
import { withScreenTour } from "@/features/userGuide/DashboardTour";
import { screenTours } from "@/features/userGuide/screenTours";
function StaffCalendarScreenContent() { return <AppointmentCalendarContent staffMode />; }
export const StaffCalendarScreen = withScreenTour(StaffCalendarScreenContent, screenTours.calendar);