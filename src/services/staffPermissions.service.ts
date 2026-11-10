import { api } from "@/services/api";
import type { ApiResponse } from "@/types/auth";
export type StaffPermission = {
  key: string;
  name: string;
  description: string | null;
  module: string;
  group_name: string | null;
  depends_on: string[] | null;
  risk_level: string;
};
export type StaffPermissionView = {
  role: { id: string; name: string } | null;
  permissions: {
    key: string;
    roleDefault: boolean;
    override: boolean | null;
    effective: boolean;
  }[];
};
const hidden = new Set([
  "view_sales",
  "quick_sale_view_client",
  "view_dashboard_appointments",
  "view_dashboard_client_info",
  "view_dashboard_financials",
  "view_dashboard_staff_performance",
  "manage_client_purchase_history",
]);
export const staffPermissionsService = {
  async catalog() {
    const res =
      await api.get<ApiResponse<{ items: StaffPermission[] }>>("/permissions");
    return res.data.data.items.filter((p) => !hidden.has(p.key));
  },
  async get(staffId: string) {
    const res = await api.get<ApiResponse<StaffPermissionView>>(
      "/staff/" + encodeURIComponent(staffId) + "/permissions",
    );
    return res.data.data;
  },
  async save(staffId: string, overrides: Record<string, boolean | null>) {
    const res = await api.patch<ApiResponse<StaffPermissionView>>(
      "/staff/" + encodeURIComponent(staffId) + "/permissions",
      { overrides },
    );
    return res.data.data;
  },
  async assignNamedRole(staffId: string, name: "Staff" | "Manager") {
    const response =
      await api.get<ApiResponse<{ items: { id: string; name: string }[] }>>(
        "/roles",
      );
    let role = response.data.data.items.find((item) => item.name === name);
    if (!role) {
      const created = await api.post<ApiResponse<{ id: string; name: string }>>(
        "/roles",
        { name, permissions: {} },
      );
      role = created.data.data;
    }
    const result = await api.patch<ApiResponse<StaffPermissionView>>(
      "/staff/" + encodeURIComponent(staffId) + "/role",
      { role_id: role.id },
    );
    return result.data.data;
  },
  async own() { return (await this.ownAccess()).permissions; },
  async ownAccess() {
    const res =
      await api.get<
        ApiResponse<{ effective_permissions?: Record<string, boolean>; roleName?: string | null }>
      >("/users/me");
    return { permissions: res.data.data.effective_permissions ?? {}, roleName: res.data.data.roleName ?? null };
  },
};
