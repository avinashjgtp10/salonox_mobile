import { createCRUDSlice } from "./utils/createCRUDSlice";
import type { Service } from "../features/catalog/types/catalog.types";
import {
  fetchServicesThunk,
  fetchServiceByIdThunk,
  createServiceThunk,
  updateServiceThunk,
  deleteServiceThunk,
  exportServicesThunk,
} from "../middleware/services/services.thunk";

const servicesSlice = createCRUDSlice<Service>({
  name: "services",
  thunks: {
    fetchAllThunk: fetchServicesThunk,
    fetchByIdThunk: fetchServiceByIdThunk,
    createThunk: createServiceThunk,
    updateThunk: updateServiceThunk,
    deleteThunk: deleteServiceThunk,
    exportThunk: exportServicesThunk,
  },
});

export const {
  clearError: clearServicesError,
  clearSelectedItem: clearSelectedService,
} = servicesSlice.actions;
export default servicesSlice.reducer;
