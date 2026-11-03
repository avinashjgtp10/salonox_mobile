import { api } from "@/services/api";
import { MOBILE_OWNER, MOBILE_STAFF } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";

// Mobile-only "Client name access" switch. The owner sets it per staff member;
// the staff app reads its own value to show full client names instead of
// masked ones. The web app never uses it.
type ClientNameAccessApiData = { clientNameAccess?: unknown } | null;

const toClientNameAccess = (data: ClientNameAccessApiData) => data?.clientNameAccess === true;

export const staffClientNameAccessService = {
  async getOwnClientNameAccess(): Promise<boolean> {
    const response = await api.get<ApiResponse<ClientNameAccessApiData>>(MOBILE_STAFF.CLIENT_NAME_ACCESS);
    return toClientNameAccess(response.data.data);
  },

  // staffId → switch value for every staff member in the salon.
  async listStaffClientNameAccess(): Promise<Record<string, boolean>> {
    const response = await api.get<ApiResponse<{ items?: unknown } | null>>(MOBILE_OWNER.STAFF_CLIENT_NAME_ACCESS_LIST);
    const items = Array.isArray(response.data.data?.items) ? response.data.data.items : [];
    return Object.fromEntries(
      items.flatMap((item) => {
        const record = item as { staffId?: unknown; clientNameAccess?: unknown } | null;
        return typeof record?.staffId === "string" ? [[record.staffId, record.clientNameAccess === true]] : [];
      }),
    );
  },

  async getStaffClientNameAccess(staffId: string): Promise<boolean> {
    const response = await api.get<ApiResponse<ClientNameAccessApiData>>(MOBILE_OWNER.STAFF_CLIENT_NAME_ACCESS(staffId));
    return toClientNameAccess(response.data.data);
  },

  async setStaffClientNameAccess(staffId: string, clientNameAccess: boolean): Promise<boolean> {
    const response = await api.put<ApiResponse<ClientNameAccessApiData>>(
      MOBILE_OWNER.STAFF_CLIENT_NAME_ACCESS(staffId),
      { clientNameAccess },
    );
    return toClientNameAccess(response.data.data);
  },
};
