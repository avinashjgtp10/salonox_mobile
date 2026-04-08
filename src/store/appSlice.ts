import { createCRUDSlice } from "./utils/createCRUDSlice";
import type { ExternalApp } from "../types/app.types";
import {
  fetchAppsThunk,
  fetchAppByIdThunk,
  connectAppThunk,
  updateAppThunk,
  disconnectAppThunk,
  exportAppsThunk,
} from "../middleware/app/app.thunk";

const appSlice = createCRUDSlice<ExternalApp>({
  name: "app",
  thunks: {
    fetchAllThunk: fetchAppsThunk,
    fetchByIdThunk: fetchAppByIdThunk,
    createThunk: connectAppThunk,
    updateThunk: updateAppThunk,
    deleteThunk: disconnectAppThunk,
    exportThunk: exportAppsThunk,
  },
});

export const {
  clearError: clearAppError,
  clearSelectedItem: clearSelectedApp,
} = appSlice.actions;
export default appSlice.reducer;
