import { useSchedulerContext } from "../store/SchedulerContext";
import {
  generateTimeSlots,
  getTimePosition,
  getBookingHeight,
} from "../utils/timeUtils";

export const SLOT_HEIGHT = 48;

export function useScheduler() {
  const ctx = useSchedulerContext();
  const intervalMins = parseInt(ctx.interval); // 15, 30, 45, or 60

  const slots = generateTimeSlots(ctx.interval);

  function timeToPx(time: string): number {
    return getTimePosition(time, intervalMins, SLOT_HEIGHT);
  }

  function durationToPx(start: string, end: string): number {
    return getBookingHeight(start, end, intervalMins, SLOT_HEIGHT);
  }

  return { ...ctx, slots, intervalMins, SLOT_HEIGHT, timeToPx, durationToPx };
}
