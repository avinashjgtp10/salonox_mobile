import { APP } from "../../services/api/endpoints";
import { createCRUDThunks } from "../utils/createCRUDThunks";
import type { ExternalApp, ConnectAppPayload } from "../../types/app.types";

// ── Standard CRUD thunks (generated) ─────────────────────────────────────────
// "connect" → createThunk (POST), "disconnect" → deleteThunk (DELETE)
const appThunks = createCRUDThunks<ExternalApp, ConnectAppPayload, Partial<ConnectAppPayload>>(
  "app",
  APP,
  "app",
);

export const {
  fetchAllThunk:  fetchAppsThunk,
  fetchByIdThunk: fetchAppByIdThunk,
  createThunk:    connectAppThunk,
  updateThunk:    updateAppThunk,
  deleteThunk:    disconnectAppThunk,
  exportThunk:    exportAppsThunk,
} = appThunks;
