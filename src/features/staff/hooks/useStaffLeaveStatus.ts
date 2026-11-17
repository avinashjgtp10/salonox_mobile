import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import type { StaffMember } from "@/data/teamData";
import { useAppForeground } from "@/hooks/useAppForeground";
import { staffLeavesService } from "@/services/staffLeaves.service";
import { addRealtimeEntityChangedListener } from "@/services/realtimeEvents";
import { useAppSelector } from "@/store/hooks";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import type { LeaveEntry } from "@/types/staffLeaves";
import type { StaffSchedule } from "@/types/staffSchedule";
import { staffScheduleService } from "@/services/staffSchedule.service";
import { applyStaffLeaveStatus, getApprovedLeaveForDate } from "../utils/staffLeaveStatus";

/** Leave is date-specific and lives separately from the staff's active status. */
export function useStaffLeaveStatus(staff: StaffMember[], date: string, includeSchedule = false) {
  const branch = useAppSelector(selectActiveBranchId);
  const focused = useIsFocused();
  const idsKey = JSON.stringify([...new Set(staff.map(member => member.id))].sort());
  const ids = useMemo<string[]>(() => JSON.parse(idsKey), [idsKey]);
  const scope = JSON.stringify([branch, date, idsKey]);
  const generation = useRef(0);
  const [result, setResult] = useState<{ scope: string; leaves: Record<string, LeaveEntry[]> } | null>(null);
  const [loading, setLoading] = useState(false);
  const [scheduleResult, setScheduleResult] = useState<{ scope: string; schedules: Record<string, StaffSchedule> } | null>(null);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    const [responses, scheduleResponses] = await Promise.all([
      Promise.allSettled(ids.map(id => staffLeavesService.getLeaves(id))),
      Promise.allSettled(includeSchedule ? ids.map(id => staffScheduleService.getSchedule(id)) : []),
    ]);
    if (request !== generation.current) return;
    setResult(previous => {
      const leaves = previous?.scope === scope ? { ...previous.leaves } : {};
      responses.forEach((response, index) => {
        if (response.status === "fulfilled") leaves[ids[index]] = response.value;
      });
      return { scope, leaves };
    });
    const schedules: Record<string, StaffSchedule> = {};
    scheduleResponses.forEach((response, index) => {
      if (response.status === "fulfilled") schedules[ids[index]] = response.value;
    });
    setScheduleResult({ scope, schedules });
    setError([...responses, ...scheduleResponses].some(response => response.status === "rejected"));
    setLoading(false);
  }, [ids, scope, includeSchedule]);

  useFocusEffect(useCallback(() => {
    void refresh();
    // Web leave approval has no dedicated socket event; refresh while visible too.
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void refresh();
    }, 60_000);
    return () => { clearInterval(timer); generation.current += 1; };
  }, [refresh]));
  useAppForeground(() => { if (focused) void refresh(); });
  useEffect(() => addRealtimeEntityChangedListener(({ entity }) => {
    if (focused && (entity === "staff" || entity === "attendance")) void refresh();
  }), [focused, refresh]);

  const approvedLeaves = useMemo(() => {
    const leaves: Record<string, LeaveEntry | undefined> = {};
    if (result?.scope === scope) ids.forEach(id => {
      leaves[id] = getApprovedLeaveForDate(result.leaves[id] ?? [], date);
    });
    return leaves;
  }, [date, ids, result, scope]);
  const members = useMemo(() => staff.map(member => applyStaffLeaveStatus(member, approvedLeaves[member.id])), [staff, approvedLeaves]);
  return { members, approvedLeaves, schedules: scheduleResult?.scope === scope ? scheduleResult.schedules : undefined, loading, error, refresh };
}
