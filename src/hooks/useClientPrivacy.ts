import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import { isStaffExperienceUser } from "@/utils/routeResolver";
import { maskClientName } from "@/utils/clientPrivacy";

export function useClientPrivacy() {
  const staffMode = isStaffExperienceUser(useAppSelector(selectCurrentUser));
  return { staffMode, clientName: (name: string) => staffMode ? maskClientName(name) : name };
}
