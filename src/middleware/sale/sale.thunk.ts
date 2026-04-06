import { SALE } from "../../services/api/endpoints";
import { createCRUDThunks } from "../utils/createCRUDThunks";
import type { Sale, CreateSalePayload } from "../../types/sale.types";

// ── Standard CRUD thunks (generated) ─────────────────────────────────────────
const saleThunks = createCRUDThunks<Sale, CreateSalePayload, Partial<CreateSalePayload>>(
  "sale",
  SALE,
  "sale",
);

export const {
  fetchAllThunk:  fetchSalesThunk,
  fetchByIdThunk: fetchSaleByIdThunk,
  createThunk:    createSaleThunk,
  updateThunk:    updateSaleThunk,
  deleteThunk:    deleteSaleThunk,
  exportThunk:    exportSalesThunk,
} = saleThunks;
