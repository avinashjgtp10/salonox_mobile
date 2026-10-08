import { useCallback, useEffect, useRef, useState } from "react";

import { getApiErrorMessage } from "@/services/api";
import { staffCalendarAccessService } from "@/services/staffCalendarAccess.service";
import { isValidStaffId } from "@/utils/staffIds";

// Owner side of the mobile-only Calendar & Quick Sale switch for one staff
// member. Saves as soon as it is toggled, independent of the Edit Staff form.
export const useStaffCalendarAccessSetting = (staffId?: string | null) => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const staffIdRef = useRef(staffId);

  staffIdRef.current = staffId;

  useEffect(() => {
    if (!staffId || !isValidStaffId(staffId)) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    staffCalendarAccessService
      .getStaffCalendarAccess(staffId)
      .then((value) => {
        if (!cancelled) setEnabled(value);
      })
      .catch((loadError) => {
        if (!cancelled) setError(getApiErrorMessage(loadError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [staffId]);

  const setCalendarAccess = useCallback(async (nextEnabled: boolean) => {
    const targetStaffId = staffIdRef.current;
    if (!targetStaffId || !isValidStaffId(targetStaffId)) {
      return;
    }

    setEnabled(nextEnabled);
    setSaving(true);
    setError(null);

    try {
      const saved = await staffCalendarAccessService.setStaffCalendarAccess(targetStaffId, nextEnabled);
      if (staffIdRef.current === targetStaffId) setEnabled(saved);
    } catch (saveError) {
      if (staffIdRef.current === targetStaffId) {
        setEnabled(!nextEnabled);
        setError(getApiErrorMessage(saveError));
      }
    } finally {
      if (staffIdRef.current === targetStaffId) setSaving(false);
    }
  }, []);

  return { enabled, error, loading, saving, setCalendarAccess };
};
