import { useCallback, useEffect, useRef, useState } from "react";

import { getApiErrorMessage } from "@/services/api";
import { staffCalendarAccessService } from "@/services/staffCalendarAccess.service";
import { staffProductAuditAccessService } from "@/services/staffProductAuditAccess.service";
import { isValidStaffId } from "@/utils/staffIds";

// Owner side of one mobile-only per-staff switch. Saves as soon as it is
// toggled, independent of the Edit Staff form.
const useStaffAccessSetting = (
  staffId: string | null | undefined,
  load: (staffId: string) => Promise<boolean>,
  save: (staffId: string, enabled: boolean) => Promise<boolean>,
) => {
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

    load(staffId)
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
  }, [load, staffId]);

  const setAccess = useCallback(async (nextEnabled: boolean) => {
    const targetStaffId = staffIdRef.current;
    if (!targetStaffId || !isValidStaffId(targetStaffId)) {
      return;
    }

    setEnabled(nextEnabled);
    setSaving(true);
    setError(null);

    try {
      const saved = await save(targetStaffId, nextEnabled);
      if (staffIdRef.current === targetStaffId) setEnabled(saved);
    } catch (saveError) {
      if (staffIdRef.current === targetStaffId) {
        setEnabled(!nextEnabled);
        setError(getApiErrorMessage(saveError));
      }
    } finally {
      if (staffIdRef.current === targetStaffId) setSaving(false);
    }
  }, [save]);

  return { enabled, error, loading, saving, setAccess };
};

// Calendar & Quick Sale access.
export const useStaffCalendarAccessSetting = (staffId?: string | null) => {
  const { setAccess, ...state } = useStaffAccessSetting(
    staffId,
    staffCalendarAccessService.getStaffCalendarAccess,
    staffCalendarAccessService.setStaffCalendarAccess,
  );
  return { ...state, setCalendarAccess: setAccess };
};

// Product Audit access.
export const useStaffProductAuditAccessSetting = (staffId?: string | null) => {
  const { setAccess, ...state } = useStaffAccessSetting(
    staffId,
    staffProductAuditAccessService.getStaffProductAuditAccess,
    staffProductAuditAccessService.setStaffProductAuditAccess,
  );
  return { ...state, setProductAuditAccess: setAccess };
};
