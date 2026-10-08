import { api } from "@/services/api";
import { MOBILE_OWNER, MOBILE_STAFF } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";

// Mobile-only "Calendar & Quick Sale access" switch. The owner sets it per
// staff member; the staff app reads its own value. The web app never uses it.
type CalendarAccessApiData = { calendarAccess?: unknown } | null;

const toCalendarAccess = (data: CalendarAccessApiData) => data?.calendarAccess === true;

export const staffCalendarAccessService = {
  async getOwnCalendarAccess(): Promise<boolean> {
    const response = await api.get<ApiResponse<CalendarAccessApiData>>(MOBILE_STAFF.CALENDAR_ACCESS);
    return toCalendarAccess(response.data.data);
  },

  // staffId → switch value for every staff member in the salon.
  async listStaffCalendarAccess(): Promise<Record<string, boolean>> {
    const response = await api.get<ApiResponse<{ items?: unknown } | null>>(MOBILE_OWNER.STAFF_CALENDAR_ACCESS_LIST);
    const items = Array.isArray(response.data.data?.items) ? response.data.data.items : [];
    return Object.fromEntries(
      items.flatMap((item) => {
        const record = item as { staffId?: unknown; calendarAccess?: unknown } | null;
        return typeof record?.staffId === "string" ? [[record.staffId, record.calendarAccess === true]] : [];
      }),
    );
  },

  async getStaffCalendarAccess(staffId: string): Promise<boolean> {
    const response = await api.get<ApiResponse<CalendarAccessApiData>>(MOBILE_OWNER.STAFF_CALENDAR_ACCESS(staffId));
    return toCalendarAccess(response.data.data);
  },

  async setStaffCalendarAccess(staffId: string, calendarAccess: boolean): Promise<boolean> {
    const response = await api.put<ApiResponse<CalendarAccessApiData>>(
      MOBILE_OWNER.STAFF_CALENDAR_ACCESS(staffId),
      { calendarAccess },
    );
    return toCalendarAccess(response.data.data);
  },
};
