import { api } from "@/services/api";
import type { ApiResponse } from "@/types/auth";

export type AttendanceDevice = {
  id: string; serial_no: string; name: string; location: string | null;
  is_active: boolean; last_seen: string | null;
};
export type PendingAttendanceDevice = { sn: string; ip: string; lastSeen: string };
export type AttendanceDeviceMapping = { id: string; staff_id: string; pin: string; staff_name?: string };
const devicePath = (id: string) => `/devices/${encodeURIComponent(id)}`;
const mappingPath = (id: string) => `${devicePath(id)}/mappings`;

export const attendanceDeviceService = {
  async list() { return (await api.get<ApiResponse<AttendanceDevice[]>>("/devices")).data.data; },
  async pending() { return (await api.get<ApiResponse<PendingAttendanceDevice[]>>("/devices/pending")).data.data; },
  async add(body: { serial_no: string; name: string; location?: string }) {
    return (await api.post<ApiResponse<AttendanceDevice>>("/devices", body)).data.data;
  },
  async connect(sn: string, body: { name: string; location?: string }) {
    return (await api.post<ApiResponse<AttendanceDevice>>(`/devices/pending/${encodeURIComponent(sn)}/connect`, body)).data.data;
  },
  async update(id: string, body: { name?: string; location?: string; is_active?: boolean }) {
    return (await api.patch<ApiResponse<AttendanceDevice>>(devicePath(id), body)).data.data;
  },
  async remove(id: string) { await api.delete(devicePath(id)); },
  async mappings(id: string) { return (await api.get<ApiResponse<AttendanceDeviceMapping[]>>(mappingPath(id))).data.data; },
  async addMapping(id: string, staffId: string, pin: string) {
    return (await api.post<ApiResponse<AttendanceDeviceMapping>>(mappingPath(id), { staff_id: staffId, pin })).data.data;
  },
  async removeMapping(id: string, mappingId: string) {
    await api.delete(`${mappingPath(id)}/${encodeURIComponent(mappingId)}`);
  },
};
