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
  // Fetch all staff for the salon (uses existing staff endpoint) — each staff
  // record already carries its own `schedule` array, so there's no separate
  // per-staff schedule fetch anymore.
  getStaffMembers: () => api.get("/api/v1/staff"),

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
  }) => api.put(`/api/v1/staff/${data.staffId}/scheduled`, {
    items: [{
      day_of_week: new Date(data.date + "T12:00:00").getDay(),
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

  // Save shift for a SPECIFIC date only — no recurring weekly propagation.
  // The `date` field tells the backend to store this as a date-specific record.
  // `day_of_week` is kept alongside it for backends that require both fields;
  // when `date` is present the backend should use it as the primary key and
  // must NOT apply the change to all other weeks' matching weekday.
  saveSingleShift: (payload: {
    staff_id: string;
    date: string;
    start_time: string;
    end_time: string;
    breaks?: { start_time: string; end_time: string }[];
  }) => {
    const dateObj = new Date(payload.date + "T12:00:00");
    const dayOfWeek = dateObj.getDay();
    const isAvailable = !!(payload.start_time && payload.end_time);
    return api.put(`/api/v1/staff/${payload.staff_id}/scheduled`, {
      items: [
        {
          date: payload.date,          // specific date — save only this day
          day_of_week: dayOfWeek,      // kept for backward compatibility
          is_available: isAvailable,
          start_time: isAvailable ? payload.start_time : null,
          end_time: isAvailable ? payload.end_time : null,
          breaks: isAvailable ? (payload.breaks ?? []) : [],
        }
      ]
    });
  },

  // Delete a single schedule block for the selected date only
  deleteSingleShift: (payload: { staff_id: string; date: string }) =>
    api.delete(`/api/v1/staff/${payload.staff_id}/scheduled`, {
      params: { date: payload.date },
    }),
};

export default shiftApi;
