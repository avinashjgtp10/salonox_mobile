import { useCallback, useEffect, useRef } from "react";

import { useAuth } from "@/context/AuthContext";
import { useAppForeground } from "@/hooks/useAppForeground";
import { staffPermissionsService } from "@/services/staffPermissions.service";
import { isStaffExperienceUser } from "@/utils/routeResolver";
import { canUseStaffQuickSale } from "@/utils/staffAccess";

// Refreshes the backend-resolved web permission map for the signed-in staff member.
export const useStaffCalendarAccess = () => {
  const { user, updateUser } = useAuth();
  const userId = user && isStaffExperienceUser(user) ? user.id : null;
  const userIdRef = useRef(userId);

  userIdRef.current = userId;

  const refresh = useCallback(async () => {
    const startedUserId = userIdRef.current;
    if (!startedUserId) return;

    try {
      const { permissions, roleName } = await staffPermissionsService.ownAccess();
      const calendarAccess = permissions.view_calendar === true && permissions.access_quick_sale === true;
      // Ignore the answer if the session changed while it was in flight.
      if (userIdRef.current !== startedUserId) return;
      await updateUser({ roleName, effective_permissions: permissions, custom_permissions: permissions, mobileCalendarAccess: calendarAccess });
    } catch {
      // Retain cached permissions offline; the backend authorizes each operation.
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
