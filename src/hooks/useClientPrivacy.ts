import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import type { AppointmentListItem } from "@/types/appointment";
import { isStaffExperienceUser } from "@/utils/routeResolver";
import { canSeeFullClientNames, getAppointmentBillLabel, maskClientName } from "@/utils/clientPrivacy";

export function useClientPrivacy() {
  const user = useAppSelector(selectCurrentUser);
  const staffMode = isStaffExperienceUser(user);
  const showFullName = canSeeFullClientNames(user);
  return {
    staffMode,
    showFullName,
    clientName: (name: string) => staffMode ? maskClientName(name, showFullName) : name,
    billLabel: (appointment: AppointmentListItem) => getAppointmentBillLabel(appointment, showFullName),
  };
}
