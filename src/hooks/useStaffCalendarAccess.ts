import { useCallback, useEffect, useRef } from "react";

import { useAuth } from "@/context/AuthContext";
import { useAppForeground } from "@/hooks/useAppForeground";
import { staffCalendarAccessService } from "@/services/staffCalendarAccess.service";
import { isStaffExperienceUser } from "@/utils/routeResolver";
import { canUseStaffQuickSale } from "@/utils/staffAccess";

// Reads the owner-controlled Calendar & Quick Sale switch for the signed-in
// staff member and stores it on the user (see AuthUser.mobileCalendarAccess),
// so route guards and the staff write guard in services/api see it too.
export const useStaffCalendarAccess = () => {
  const { user, updateUser } = useAuth();
  const userId = user && isStaffExperienceUser(user) ? user.id : null;
  const userIdRef = useRef(userId);
  const knownValueRef = useRef(user?.mobileCalendarAccess);

  userIdRef.current = userId;
  knownValueRef.current = user?.mobileCalendarAccess;

  const refresh = useCallback(async () => {
    const startedUserId = userIdRef.current;
    if (!startedUserId) return;

    try {
      const calendarAccess = await staffCalendarAccessService.getOwnCalendarAccess();
      // Ignore the answer if the session changed while it was in flight.
      if (userIdRef.current !== startedUserId || knownValueRef.current === calendarAccess) return;
      await updateUser({ mobileCalendarAccess: calendarAccess });
    } catch {
      // Keep the last known value; the backend enforces the switch on every request.
    }
  }, [updateUser]);

  return { canUseQuickSale: canUseStaffQuickSale(user), refresh };
};

// Mounted once at the root: loads the switch when a staff member signs in and
// re-checks it whenever the app returns to the foreground.
export const useStaffCalendarAccessSync = () => {
  const { user } = useAuth();
  const { refresh } = useStaffCalendarAccess();
  const staffUserId = user && isStaffExperienceUser(user) ? user.id : null;

  useEffect(() => {
    if (staffUserId) void refresh();
  }, [refresh, staffUserId]);

  useAppForeground(() => void refresh());
};
