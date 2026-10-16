import { api } from "@/services/api";
import { MOBILE_OWNER, MOBILE_STAFF } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";

// Mobile-only "Product Audit access" switch. The owner sets it per staff
// member; the staff app reads its own value. The web app never uses it.
type ProductAuditAccessApiData = { productAuditAccess?: unknown } | null;

const toProductAuditAccess = (data: ProductAuditAccessApiData) => data?.productAuditAccess === true;

export const staffProductAuditAccessService = {
  async getOwnProductAuditAccess(): Promise<boolean> {
    const response = await api.get<ApiResponse<ProductAuditAccessApiData>>(MOBILE_STAFF.PRODUCT_AUDIT_ACCESS);
    return toProductAuditAccess(response.data.data);
  },

  // staffId → switch value for every staff member in the salon.
  async listStaffProductAuditAccess(): Promise<Record<string, boolean>> {
    const response = await api.get<ApiResponse<{ items?: unknown } | null>>(MOBILE_OWNER.STAFF_PRODUCT_AUDIT_ACCESS_LIST);
    const items = Array.isArray(response.data.data?.items) ? response.data.data.items : [];
    return Object.fromEntries(
      items.flatMap((item) => {
        const record = item as { staffId?: unknown; productAuditAccess?: unknown } | null;
        return typeof record?.staffId === "string" ? [[record.staffId, record.productAuditAccess === true]] : [];
      }),
    );
  },

  async getStaffProductAuditAccess(staffId: string): Promise<boolean> {
    const response = await api.get<ApiResponse<ProductAuditAccessApiData>>(MOBILE_OWNER.STAFF_PRODUCT_AUDIT_ACCESS(staffId));
    return toProductAuditAccess(response.data.data);
  },

  async setStaffProductAuditAccess(staffId: string, productAuditAccess: boolean): Promise<boolean> {
    const response = await api.put<ApiResponse<ProductAuditAccessApiData>>(
      MOBILE_OWNER.STAFF_PRODUCT_AUDIT_ACCESS(staffId),
      { productAuditAccess },
    );
    return toProductAuditAccess(response.data.data);
  },
};
