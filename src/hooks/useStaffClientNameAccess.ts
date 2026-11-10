import { useCallback, useEffect, useRef } from "react";

import { useAuth } from "@/context/AuthContext";
import { useAppForeground } from "@/hooks/useAppForeground";
import { fetchNotificationsThunk } from "@/middleware/notification/notification.thunk";
import { staffPermissionsService } from "@/services/staffPermissions.service";
import { useAppDispatch } from "@/store/hooks";
import { isStaffExperienceUser } from "@/utils/routeResolver";

// Refreshes the backend-resolved web permission map for the signed-in staff member.
export const useStaffClientNameAccessSync = () => {
  const { user, updateUser } = useAuth();
  const dispatch = useAppDispatch();
  const userId = user && isStaffExperienceUser(user) ? user.id : null;
  const userIdRef = useRef(userId);

  userIdRef.current = userId;

  const refresh = useCallback(async () => {
    const startedUserId = userIdRef.current;
    if (!startedUserId) return;

    try {
      const permissions = await staffPermissionsService.own();
      const clientNameAccess = permissions.view_clients === true;
      // Ignore the answer if the session changed while it was in flight.
      if (userIdRef.current !== startedUserId) return;
      await updateUser({ effective_permissions: permissions, custom_permissions: permissions, mobileClientNameAccess: clientNameAccess });
      // The staff notification list stores its text with names already
      // masked/unmasked, so rebuild it for the new value.
      void dispatch(fetchNotificationsThunk({ refresh: true }));
    } catch {
      // Keep the last known value (masked until the switch has been read once).
    }
  }, [dispatch, updateUser]);

  useEffect(() => {
    if (userId) void refresh();
  }, [refresh, userId]);

  useAppForeground(() => void refresh());
};
