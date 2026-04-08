import { createCRUDSlice } from "./utils/createCRUDSlice";
import type { CatalogItem } from "../types/catalog.types";
import {
  fetchCatalogThunk,
  fetchCatalogByIdThunk,
  createCatalogThunk,
  updateCatalogThunk,
  deleteCatalogThunk,
  exportCatalogThunk,
} from "../middleware/catalog/catalog.thunk";

const catalogSlice = createCRUDSlice<CatalogItem>({
  name: "catalog",
  thunks: {
    fetchAllThunk: fetchCatalogThunk,
    fetchByIdThunk: fetchCatalogByIdThunk,
    createThunk: createCatalogThunk,
    updateThunk: updateCatalogThunk,
    deleteThunk: deleteCatalogThunk,
    exportThunk: exportCatalogThunk,
  },
});

export const {
  clearError: clearCatalogError,
  clearSelectedItem: clearSelectedCatalogItem,
} = catalogSlice.actions;
export default catalogSlice.reducer;
