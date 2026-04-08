import { createCRUDSlice } from "./utils/createCRUDSlice";
import type { Setting } from "../types/setting.types";
import {
  fetchSettingsThunk,
  fetchSettingByIdThunk,
  createSettingThunk,
  updateSettingThunk,
  deleteSettingThunk,
  exportSettingsThunk,
} from "../middleware/setting/setting.thunk";

const settingSlice = createCRUDSlice<Setting>({
  name: "setting",
  thunks: {
    fetchAllThunk: fetchSettingsThunk,
    fetchByIdThunk: fetchSettingByIdThunk,
    createThunk: createSettingThunk,
    updateThunk: updateSettingThunk,
    deleteThunk: deleteSettingThunk,
    exportThunk: exportSettingsThunk,
  },
});

export const {
  clearError: clearSettingError,
  clearSelectedItem: clearSelectedSetting,
} = settingSlice.actions;
export default settingSlice.reducer;
