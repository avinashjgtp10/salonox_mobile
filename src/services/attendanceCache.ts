import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AttendanceSummary, AttendanceToday } from "@/types/attendance";

const TODAY_KEY = "salonox.attendance.today";
const SUMMARY_KEY = "salonox.attendance.summary";

export const attendanceCache = {
  async getSummary(): Promise<AttendanceSummary | null> {
    try {
      const raw = await AsyncStorage.getItem(SUMMARY_KEY);

      return raw ? (JSON.parse(raw) as AttendanceSummary) : null;
    } catch {
      return null;
    }
  },

  async getToday(): Promise<AttendanceToday | null> {
    try {
      const raw = await AsyncStorage.getItem(TODAY_KEY);

      return raw ? (JSON.parse(raw) as AttendanceToday) : null;
    } catch {
      return null;
    }
  },

  async setSummary(value: AttendanceSummary) {
    try {
      await AsyncStorage.setItem(SUMMARY_KEY, JSON.stringify(value));
    } catch {
      // Best-effort cache only; ignore storage failures (quota, disabled storage, etc).
    }
  },

  async setToday(value: AttendanceToday) {
    try {
      await AsyncStorage.setItem(TODAY_KEY, JSON.stringify(value));
    } catch {
      // Best-effort cache only; ignore storage failures (quota, disabled storage, etc).
    }
  },
};
