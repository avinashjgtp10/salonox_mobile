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
  getDailyShifts: (weekStart: string) =>
    api.get(`/api/shifts`, { params: { weekStart } }),
  createShift: (data: CreateShiftPayload) => api.post("/api/shifts", data),
  updateShift: (id: string, data: UpdateShiftPayload) =>
    api.put(`/api/shifts/${id}`, data),
  deleteShift: (id: string) => api.delete(`/api/shifts/${id}`),
  addTimeOff: (data: { staffId: string; date: string; reason?: string }) =>
    api.post("/api/shifts/timeoff", data),
  addDayOff: (data: { staffId: string; date: string }) =>
    api.post("/api/shifts/dayoff", data),
  addBlockedTime: (data: {
    staffId: string;
    date: string;
    startTime?: string;
    endTime?: string;
  }) => api.post("/api/shifts/block", data),
  copySchedule: (data: {
    staffId: string;
    fromDate: string;
    toDates: string[];
    type: "day" | "week";
  }) => api.post("/api/shifts/copy", data),
};

export default shiftApi;
