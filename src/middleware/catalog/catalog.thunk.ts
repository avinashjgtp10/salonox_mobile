import { CATALOG } from "../../services/api/endpoints";
import { createCRUDThunks } from "../utils/createCRUDThunks";
import type { CatalogItem, CreateCatalogPayload } from "../../types/catalog.types";

// ── Standard CRUD thunks (generated) ─────────────────────────────────────────
const catalogThunks = createCRUDThunks<CatalogItem, CreateCatalogPayload, Partial<CreateCatalogPayload>>(
  "catalog",
  CATALOG,
  "catalog item",
);

export const {
  fetchAllThunk:  fetchCatalogThunk,
  fetchByIdThunk: fetchCatalogByIdThunk,
  createThunk:    createCatalogThunk,
  updateThunk:    updateCatalogThunk,
  deleteThunk:    deleteCatalogThunk,
  exportThunk:    exportCatalogThunk,
} = catalogThunks;
