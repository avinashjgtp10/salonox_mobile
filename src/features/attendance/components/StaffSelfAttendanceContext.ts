import { createContext, useContext } from "react";
import type { StaffSelfAttendance } from "@/services/staffSelfAttendance.service";
import type { AttendanceRecord, StartBreakRequest } from "@/types/attendance";

export type StaffSelfAttendanceContextValue = {
  state: StaffSelfAttendance | null;
  record: AttendanceRecord | null;
  refresh: () => Promise<void>;
  checkIn: () => Promise<void>;
  checkOut: (pendingAttendanceId?: string) => Promise<void>;
  startBreak: (body: StartBreakRequest) => Promise<void>;
  busy: boolean;
  error: string | null;
  refreshing: boolean;
};
export const StaffAttendanceContext = createContext<StaffSelfAttendanceContextValue | null>(null);
export const useStaffSelfAttendance = () => useContext(StaffAttendanceContext);
