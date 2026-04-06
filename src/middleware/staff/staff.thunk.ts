import { STAFF } from "../../services/api/endpoints";
import { createCRUDThunks } from "../utils/createCRUDThunks";
import type { Staff, CreateStaffPayload } from "../../types/staff.types";

// ── Standard CRUD thunks (generated) ─────────────────────────────────────────
const staffThunks = createCRUDThunks<Staff, CreateStaffPayload, Partial<CreateStaffPayload>>(
  "staff",
  STAFF,
  "staff member",
);

export const {
  fetchAllThunk:  fetchStaffThunk,
  fetchByIdThunk: fetchStaffByIdThunk,
  createThunk:    createStaffThunk,
  updateThunk:    updateStaffThunk,
  deleteThunk:    deleteStaffThunk,
  exportThunk:    exportStaffThunk,
} = staffThunks;
