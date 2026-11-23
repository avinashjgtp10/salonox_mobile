import { api } from "@/services/api";
import { USER } from "@/services/api/endpoints/user.endpoints";
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
  // Find the Staff/Manager role, creating it if the salon has not used it yet.
  async findOrCreateNamedRole(name: "Staff" | "Manager") {
    const response =
      await api.get<ApiResponse<{ items: { id: string; name: string }[] }>>(
        "/roles",
      );
    const existing = response.data.data.items.find((item) => item.name === name);
    if (existing) return existing;
    const created = await api.post<ApiResponse<{ id: string; name: string }>>(
      "/roles",
      { name, permissions: {} },
    );
    return created.data.data;
  },
  // The role's default grants, keyed by permission — used to seed the Add Staff
  // permission toggles before the staff member (and so their per-staff view)
  // exists. permissions comes back as a key->boolean map.
  async roleDefaults(name: "Staff" | "Manager"): Promise<Record<string, boolean>> {
    const response = await api.get<ApiResponse<{ items: { id: string; name: string }[] }>>("/roles");
    const role = response.data.data.items.find(item => item.name === name);
    if (!role) return {};
    const res = await api.get<
      ApiResponse<{ permissions?: Record<string, boolean> | null }>
    >("/roles/" + encodeURIComponent(role.id));
    return res.data.data.permissions ?? {};
  },
  // Ids of the staff who already hold the Manager role. The backend allows only
  // one Manager per salon and rejects a second one on save, so the Role switcher
  // reads this to grey the Manager option out up front instead.
  async managerIds(): Promise<string[]> {
    const res = await api.get<ApiResponse<{ manager_ids?: string[] }>>("/staff/manager-status");
    return res.data.data.manager_ids ?? [];
  },
  async assignNamedRole(staffId: string, name: "Staff" | "Manager") {
    const role = await this.findOrCreateNamedRole(name);
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
      // GET /users/me does not exist on the backend — only PATCH /users/me and
      // POST /users/me/{avatar,change-password} do. A GET fell through to
      // GET /users/:id with id="me", which is restricted to admin/salon_owner,
      // so every staff member got 403 here. refresh() swallows the error, so a
      // staff member's permission map stayed empty forever and no permission
      // the owner granted ever reached the app. The real route is /users/profile.
      >(USER.PROFILE);
    return { permissions: res.data.data.effective_permissions ?? {}, roleName: res.data.data.roleName ?? null };
  },
};
