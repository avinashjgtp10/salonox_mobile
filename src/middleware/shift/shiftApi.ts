import api from "../../services/api/axios";

export interface CreateShiftPayload {
  staffId: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable?: boolean;
}
export interface UpdateShiftPayload {
  startTime?: string;
  endTime?: string;
  isAvailable?: boolean;
  type?: string;
}

const shiftApi = {
  // Fetch all staff for the salon (uses existing staff endpoint)
  getStaffMembers: () => api.get("/api/v1/staff"),

  // Fetch schedules for a specific staff member
  getStaffSchedules: (staffId: string) =>
    api.get(`/api/v1/staff/${staffId}/scheduled`),

  // Bulk update schedules for a specific staff member
  upsertStaffSchedules: (staffId: string, items: any[]) =>
    api.put(`/api/v1/staff/${staffId}/scheduled`, { items }),

  // Helpers for common actions (mapping to backend if possible)
  addTimeOff: (data: { staffId: string; date: string; reason?: string }) =>
    api.post(`/api/v1/staff/${data.staffId}/leaves`, {
      start_date: data.date,
      end_date: data.date,
      leave_type: "timeoff",
      reason: data.reason
    }),

  addDayOff: (data: { staffId: string; date: string }) =>
    api.post(`/api/v1/staff/${data.staffId}/leaves`, {
      start_date: data.date,
      end_date: data.date,
      leave_type: "dayoff",
      status: "approved"
    }),

  // Legacy/Mock mappings (if backend doesn't support date-specific blocks yet)
  addBlockedTime: (data: {
    staffId: string;
    date: string;
    startTime?: string;
    endTime?: string;
  }) => api.post(`/api/v1/staff/${data.staffId}/scheduled`, {
    items: [{
      day_of_week: new Date(data.date).getDay(),
      is_available: false,
      start_time: data.startTime,
      end_time: data.endTime,
      notes: "Blocked"
    }]
  }),

  copySchedule: (data: {
    staffId: string;
    fromDate: string;
    toDates: string[];
    type: "day" | "week";
  }) => api.post(`/api/v1/staff/${data.staffId}/copy-schedule`, data), // Hypothetical endpoint
};

export default shiftApi;
