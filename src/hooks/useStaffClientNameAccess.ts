import { useCallback, useEffect, useRef } from "react";

import { useAuth } from "@/context/AuthContext";
import { useAppForeground } from "@/hooks/useAppForeground";
import { fetchNotificationsThunk } from "@/middleware/notification/notification.thunk";
import { staffClientNameAccessService } from "@/services/staffClientNameAccess.service";
import { useAppDispatch } from "@/store/hooks";
import { isStaffExperienceUser } from "@/utils/routeResolver";

// Mounted once at the root: reads the owner-controlled Client name switch for
// the signed-in staff member when they sign in and whenever the app returns to
// the foreground, and stores it on the user (AuthUser.mobileClientNameAccess)
// so useClientPrivacy() shows full or masked client names.
export const useStaffClientNameAccessSync = () => {
  const { user, updateUser } = useAuth();
  const dispatch = useAppDispatch();
  const userId = user && isStaffExperienceUser(user) ? user.id : null;
  const userIdRef = useRef(userId);
  const knownValueRef = useRef(user?.mobileClientNameAccess);

  userIdRef.current = userId;
  knownValueRef.current = user?.mobileClientNameAccess;

  const refresh = useCallback(async () => {
    const startedUserId = userIdRef.current;
    if (!startedUserId) return;

    try {
      const clientNameAccess = await staffClientNameAccessService.getOwnClientNameAccess();
      // Ignore the answer if the session changed while it was in flight.
      if (userIdRef.current !== startedUserId || knownValueRef.current === clientNameAccess) return;
      await updateUser({ mobileClientNameAccess: clientNameAccess });
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
