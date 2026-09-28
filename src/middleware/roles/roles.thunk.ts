import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { PERMISSIONS_CATALOG, ROLES, STAFF_PERMISSIONS } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";
import type { Permission, Role, RoleWithPermissions, StaffPermissionsView } from "../../types/roles.types";

const asErrorMessage = (err: any, fallback: string) =>
  err instanceof ApiError ? err.message : fallback;

// Hidden from every Permissions UI (Roles panel, Individual Staff overrides,
// Branch Owner staff detail) per product request — Quick Sale's "View Sales"
// toggle was confusing next to "Create Sales" (which already covers
// view+create+checkout). The backend still enforces view_sales on
// sales.routes.ts and it stays granted-by-default (permissionMatrix.ts /
// role seeds), so hiding it here is purely cosmetic and can't lock anyone
// out of Sales.
const HIDDEN_CATALOG_KEYS = new Set(["view_sales"]);

// ── Permission catalog ──────────────────────────────────────────────────────────
export const fetchPermissionsCatalogThunk = createAsyncThunk<
  Permission[],
  void,
  { rejectValue: string }
>("roles/fetchPermissionsCatalog", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<any>(PERMISSIONS_CATALOG.BASE);
    const items: Permission[] = res.data?.data?.items ?? [];
    return items.filter((p) => !HIDDEN_CATALOG_KEYS.has(p.key));
  } catch (err: any) {
    return rejectWithValue(asErrorMessage(err, "Failed to fetch permission catalog"));
  }
});

// ── Roles CRUD ───────────────────────────────────────────────────────────────────
export const fetchRolesThunk = createAsyncThunk<
  Role[],
  void,
  { rejectValue: string }
>("roles/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<any>(ROLES.BASE);
    return res.data?.data?.items ?? [];
  } catch (err: any) {
    return rejectWithValue(asErrorMessage(err, "Failed to fetch roles"));
  }
});

export const fetchRoleByIdThunk = createAsyncThunk<
  RoleWithPermissions,
  string,
  { rejectValue: string }
>("roles/fetchById", async (id, { rejectWithValue }) => {
  try {
    const res = await api.get<any>(ROLES.BY_ID(id));
    return res.data.data;
  } catch (err: any) {
    return rejectWithValue(asErrorMessage(err, "Failed to fetch role"));
  }
});

export const createRoleThunk = createAsyncThunk<
  RoleWithPermissions,
  { name: string; description?: string; permissions?: Record<string, boolean> },
  { rejectValue: string }
>("roles/create", async (body, { rejectWithValue }) => {
  try {
    const res = await api.post<any>(ROLES.BASE, body);
    return res.data.data;
  } catch (err: any) {
    return rejectWithValue(asErrorMessage(err, "Failed to create role"));
  }
});

export const updateRoleThunk = createAsyncThunk<
  RoleWithPermissions,
  { id: string; name?: string; description?: string; permissions?: Record<string, boolean> },
  { rejectValue: string }
>("roles/update", async ({ id, ...body }, { rejectWithValue }) => {
  try {
    const res = await api.patch<any>(ROLES.BY_ID(id), body);
    return res.data.data;
  } catch (err: any) {
    return rejectWithValue(asErrorMessage(err, "Failed to update role"));
  }
});

export const deleteRoleThunk = createAsyncThunk<
  string,
  { id: string; reassignTo?: string },
  { rejectValue: string }
>("roles/delete", async ({ id, reassignTo }, { rejectWithValue }) => {
  try {
    const query = reassignTo ? `?reassign_to=${encodeURIComponent(reassignTo)}` : "";
    await api.delete(`${ROLES.BY_ID(id)}${query}`);
    return id;
  } catch (err: any) {
    return rejectWithValue(asErrorMessage(err, "Failed to delete role"));
  }
});

export const duplicateRoleThunk = createAsyncThunk<
  RoleWithPermissions,
  string,
  { rejectValue: string }
>("roles/duplicate", async (id, { rejectWithValue }) => {
  try {
    const res = await api.post<any>(ROLES.DUPLICATE(id));
    return res.data.data;
  } catch (err: any) {
    return rejectWithValue(asErrorMessage(err, "Failed to duplicate role"));
  }
});

// ── Staff effective permissions / overrides / role assignment ───────────────────
export const fetchStaffPermissionsThunk = createAsyncThunk<
  StaffPermissionsView,
  string,
  { rejectValue: string }
>("roles/fetchStaffPermissions", async (staffId, { rejectWithValue }) => {
  try {
    const res = await api.get<any>(STAFF_PERMISSIONS.EFFECTIVE(staffId));
    return res.data.data;
  } catch (err: any) {
    return rejectWithValue(asErrorMessage(err, "Failed to fetch staff permissions"));
  }
});

export const setStaffOverridesThunk = createAsyncThunk<
  StaffPermissionsView,
  { staffId: string; overrides: Record<string, boolean | null> },
  { rejectValue: string }
>("roles/setStaffOverrides", async ({ staffId, overrides }, { rejectWithValue }) => {
  try {
    const res = await api.patch<any>(STAFF_PERMISSIONS.SET_OVERRIDES(staffId), { overrides });
    return res.data.data;
  } catch (err: any) {
    return rejectWithValue(asErrorMessage(err, "Failed to update permission overrides"));
  }
});

export const assignStaffRoleThunk = createAsyncThunk<
  StaffPermissionsView,
  { staffId: string; roleId: string },
  { rejectValue: string }
>("roles/assignStaffRole", async ({ staffId, roleId }, { rejectWithValue }) => {
  try {
    const res = await api.patch<any>(STAFF_PERMISSIONS.ASSIGN_ROLE(staffId), { role_id: roleId });
    return res.data.data;
  } catch (err: any) {
    return rejectWithValue(asErrorMessage(err, "Failed to assign role"));
  }
});

export const bulkAssignRoleThunk = createAsyncThunk<
  void,
  { staffIds: string[]; roleId: string },
  { rejectValue: string }
>("roles/bulkAssignRole", async ({ staffIds, roleId }, { rejectWithValue }) => {
  try {
    await api.post(STAFF_PERMISSIONS.BULK_ASSIGN_ROLE, { staffIds, roleId });
  } catch (err: any) {
    return rejectWithValue(asErrorMessage(err, "Failed to bulk-assign role"));
  }
});

// ── Audit log ────────────────────────────────────────────────────────────────────
export interface AuditLogEntry {
  id: string;
  salon_id: string;
  actor_user_id: string;
  actor_first_name: string | null;
  actor_last_name: string | null;
  actor_email: string | null;
  target_type: "staff" | "role";
  target_id: string;
  action: string;
  permission_key: string | null;
  before_value: unknown;
  after_value: unknown;
  source: string;
  created_at: string;
}

export const fetchAuditLogThunk = createAsyncThunk<
  { items: AuditLogEntry[]; nextCursor: string | null },
  { targetStaffId?: string; cursor?: string } | void,
  { rejectValue: string }
>("roles/fetchAuditLog", async (params, { rejectWithValue }) => {
  try {
    const query = new URLSearchParams();
    if (params?.targetStaffId) query.set("target_staff_id", params.targetStaffId);
    if (params?.cursor) query.set("cursor", params.cursor);
    const res = await api.get<any>(`${ROLES.AUDIT_LOG}?${query.toString()}`);
    return res.data.data;
  } catch (err: any) {
    return rejectWithValue(asErrorMessage(err, "Failed to fetch permission activity"));
  }
});

export const bulkResetOverridesThunk = createAsyncThunk<
  void,
  { staffIds: string[] },
  { rejectValue: string }
>("roles/bulkResetOverrides", async ({ staffIds }, { rejectWithValue }) => {
  try {
    await api.post(STAFF_PERMISSIONS.BULK_RESET_OVERRIDES, { staffIds });
  } catch (err: any) {
    return rejectWithValue(asErrorMessage(err, "Failed to bulk-reset overrides"));
  }
});
