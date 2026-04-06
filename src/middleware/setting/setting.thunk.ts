import { SETTING } from "../../services/api/endpoints";
import { createCRUDThunks } from "../utils/createCRUDThunks";
import type { Setting, CreateSettingPayload } from "../../types/setting.types";

// ── Standard CRUD thunks (generated) ─────────────────────────────────────────
const settingThunks = createCRUDThunks<Setting, CreateSettingPayload, Partial<CreateSettingPayload>>(
  "setting",
  SETTING,
  "setting",
);

export const {
  fetchAllThunk:  fetchSettingsThunk,
  fetchByIdThunk: fetchSettingByIdThunk,
  createThunk:    createSettingThunk,
  updateThunk:    updateSettingThunk,
  deleteThunk:    deleteSettingThunk,
  exportThunk:    exportSettingsThunk,
} = settingThunks;
