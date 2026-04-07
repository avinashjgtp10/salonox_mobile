import { createCRUDSlice } from "./utils/createCRUDSlice";
import type { Staff } from "../types/staff.types";
import {
  fetchStaffThunk,
  fetchStaffByIdThunk,
  createStaffThunk,
  updateStaffThunk,
  deleteStaffThunk,
  exportStaffThunk,
} from "../middleware/staff/staff.thunk";

const staffSlice = createCRUDSlice<Staff>({
  name: "staff",
  thunks: {
    fetchAllThunk:  fetchStaffThunk,
    fetchByIdThunk: fetchStaffByIdThunk,
    createThunk:    createStaffThunk,
    updateThunk:    updateStaffThunk,
    deleteThunk:    deleteStaffThunk,
    exportThunk:    exportStaffThunk,
  },
});

export const { clearError: clearStaffError, clearSelectedItem: clearSelectedStaff } = staffSlice.actions;
export default staffSlice.reducer;
