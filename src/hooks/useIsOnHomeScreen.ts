import { useSegments } from "expo-router";

import { useAuth } from "@/context/AuthContext";
import { isStaffExperienceUser } from "@/utils/routeResolver";

/** True while a signed-in user is on their home screen: the owner dashboard or the staff home. */
export function useIsOnHomeScreen() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const segments: readonly string[] = useSegments();
  const staff = isStaffExperienceUser(user);
  const onHome = String(segments[0]) === (staff ? "(staff)" : "(tabs)")
    && String(segments[1]) === (staff ? "home" : "dashboard");

  return isAuthenticated && !isLoading && Boolean(user?.id) && onHome;
}
