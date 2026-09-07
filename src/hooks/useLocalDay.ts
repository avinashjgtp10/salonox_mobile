import { useEffect, useState } from "react";
import { useAppForeground } from "@/hooks/useAppForeground";
import { getTodayAttendanceDateKey } from "@/features/attendance/utils/attendanceStatus";

export function useLocalDay() {
  const [day, setDay] = useState(getTodayAttendanceDateKey);
  useAppForeground(() => setDay(getTodayAttendanceDateKey()));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      setDay(getTodayAttendanceDateKey());
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(schedule, midnight.getTime() - now.getTime() + 50);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);
  return day;
}
