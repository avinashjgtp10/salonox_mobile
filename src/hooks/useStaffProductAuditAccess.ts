import { useCallback, useEffect, useRef } from "react";

import { useAuth } from "@/context/AuthContext";
import { useAppForeground } from "@/hooks/useAppForeground";
import { staffPermissionsService } from "@/services/staffPermissions.service";
import { isStaffExperienceUser } from "@/utils/routeResolver";

// Refreshes the backend-resolved web permission map for the signed-in staff member.
export const useStaffProductAuditAccessSync = () => {
  const { user, updateUser } = useAuth();
  const userId = user && isStaffExperienceUser(user) ? user.id : null;
  const userIdRef = useRef(userId);

  userIdRef.current = userId;

  const refresh = useCallback(async () => {
    const startedUserId = userIdRef.current;
    if (!startedUserId) return;

    try {
      const permissions = await staffPermissionsService.own();
      const productAuditAccess = permissions.view_product_audit === true && permissions.create_product_audit === true;
      // Ignore the answer if the session changed while it was in flight.
      if (userIdRef.current !== startedUserId) return;
      await updateUser({ effective_permissions: permissions, custom_permissions: permissions, mobileProductAuditAccess: productAuditAccess });
    } catch {
      // Retain cached permissions offline; the backend authorizes each operation.
    }
  }, [updateUser]);

  useEffect(() => {
    if (userId) void refresh();
  }, [refresh, userId]);

  useAppForeground(() => void refresh());
};
