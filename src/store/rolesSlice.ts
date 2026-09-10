import { createSlice } from "@reduxjs/toolkit";
import type { Permission, Role } from "../types/roles.types";
import {
  fetchPermissionsCatalogThunk,
  fetchRolesThunk,
  createRoleThunk,
  updateRoleThunk,
  deleteRoleThunk,
  duplicateRoleThunk,
} from "../middleware/roles/roles.thunk";

interface RolesState {
  permissions: Permission[];
  permissionsLoaded: boolean;
  roles: Role[];
  loading: {
    permissions: boolean;
    roles: boolean;
    saving: boolean;
  };
  error: string | null;
}

const initialState: RolesState = {
  permissions: [],
  permissionsLoaded: false,
  roles: [],
  loading: { permissions: false, roles: false, saving: false },
  error: null,
};

const rolesSlice = createSlice({
  name: "roles",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPermissionsCatalogThunk.pending, (state) => {
        state.loading.permissions = true;
      })
      .addCase(fetchPermissionsCatalogThunk.fulfilled, (state, { payload }) => {
        state.loading.permissions = false;
        state.permissions = payload;
        state.permissionsLoaded = true;
      })
      .addCase(fetchPermissionsCatalogThunk.rejected, (state, { payload }) => {
        state.loading.permissions = false;
        state.error = payload ?? "Failed to fetch permission catalog";
      });

    builder
      .addCase(fetchRolesThunk.pending, (state) => {
        state.loading.roles = true;
      })
      .addCase(fetchRolesThunk.fulfilled, (state, { payload }) => {
        state.loading.roles = false;
        state.roles = payload;
      })
      .addCase(fetchRolesThunk.rejected, (state, { payload }) => {
        state.loading.roles = false;
        state.error = payload ?? "Failed to fetch roles";
      });

    builder
      .addCase(createRoleThunk.pending, (state) => { state.loading.saving = true; })
      .addCase(createRoleThunk.fulfilled, (state, { payload }) => {
        state.loading.saving = false;
        state.roles.push(payload);
      })
      .addCase(createRoleThunk.rejected, (state, { payload }) => {
        state.loading.saving = false;
        state.error = payload ?? "Failed to create role";
      });

    builder
      .addCase(updateRoleThunk.pending, (state) => { state.loading.saving = true; })
      .addCase(updateRoleThunk.fulfilled, (state, { payload }) => {
        state.loading.saving = false;
        const idx = state.roles.findIndex((r) => r.id === payload.id);
        if (idx !== -1) state.roles[idx] = { ...state.roles[idx], ...payload };
      })
      .addCase(updateRoleThunk.rejected, (state, { payload }) => {
        state.loading.saving = false;
        state.error = payload ?? "Failed to update role";
      });

    builder
      .addCase(deleteRoleThunk.fulfilled, (state, { payload: id }) => {
        state.roles = state.roles.filter((r) => r.id !== id);
      })
      .addCase(deleteRoleThunk.rejected, (state, { payload }) => {
        state.error = payload ?? "Failed to delete role";
      });

    builder
      .addCase(duplicateRoleThunk.fulfilled, (state, { payload }) => {
        state.roles.push(payload);
      })
      .addCase(duplicateRoleThunk.rejected, (state, { payload }) => {
        state.error = payload ?? "Failed to duplicate role";
      });
  },
});

export default rolesSlice.reducer;
