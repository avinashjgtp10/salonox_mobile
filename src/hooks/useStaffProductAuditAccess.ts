import { useCallback, useEffect, useRef } from "react";

import { useAuth } from "@/context/AuthContext";
import { useAppForeground } from "@/hooks/useAppForeground";
import { staffProductAuditAccessService } from "@/services/staffProductAuditAccess.service";
import { isStaffExperienceUser } from "@/utils/routeResolver";

// Mounted once at the root: reads the owner-controlled Product Audit switch for
// the signed-in staff member when they sign in and whenever the app returns to
// the foreground, and stores it on the user (AuthUser.mobileProductAuditAccess)
// so route guards, menus and the staff write guard in services/api see it.
export const useStaffProductAuditAccessSync = () => {
  const { user, updateUser } = useAuth();
  const userId = user && isStaffExperienceUser(user) ? user.id : null;
  const userIdRef = useRef(userId);
  const knownValueRef = useRef(user?.mobileProductAuditAccess);

  userIdRef.current = userId;
  knownValueRef.current = user?.mobileProductAuditAccess;

  const refresh = useCallback(async () => {
    const startedUserId = userIdRef.current;
    if (!startedUserId) return;

    try {
      const productAuditAccess = await staffProductAuditAccessService.getOwnProductAuditAccess();
      // Ignore the answer if the session changed while it was in flight.
      if (userIdRef.current !== startedUserId || knownValueRef.current === productAuditAccess) return;
      await updateUser({ mobileProductAuditAccess: productAuditAccess });
    } catch {
      // Keep the last known value; the backend enforces the switch on every request.
    }
  }, [updateUser]);

  useEffect(() => {
    if (userId) void refresh();
  }, [refresh, userId]);

  useAppForeground(() => void refresh());
};
