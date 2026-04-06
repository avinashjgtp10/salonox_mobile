import { createCRUDSlice } from "./utils/createCRUDSlice";
import type { Sale } from "../types/sale.types";
import {
  fetchSalesThunk,
  fetchSaleByIdThunk,
  createSaleThunk,
  updateSaleThunk,
  deleteSaleThunk,
  exportSalesThunk,
} from "../middleware/sale/sale.thunk";

const saleSlice = createCRUDSlice<Sale>({
  name: "sale",
  thunks: {
    fetchAllThunk:  fetchSalesThunk,
    fetchByIdThunk: fetchSaleByIdThunk,
    createThunk:    createSaleThunk,
    updateThunk:    updateSaleThunk,
    deleteThunk:    deleteSaleThunk,
    exportThunk:    exportSalesThunk,
  },
});

export const { clearError: clearSaleError, clearSelectedItem: clearSelectedSale } = saleSlice.actions;
export default saleSlice.reducer;
