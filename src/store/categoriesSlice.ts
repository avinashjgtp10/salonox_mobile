import { createCRUDSlice } from "./utils/createCRUDSlice";
import type { CategoryEntity } from "../middleware/services/categories.thunk";
import {
  fetchCategoriesThunk,
  fetchCategoryByIdThunk,
  createCategoryThunk,
  updateCategoryThunk,
  deleteCategoryThunk,
  exportCategoriesThunk,
} from "../middleware/services/categories.thunk";

const categoriesSlice = createCRUDSlice<CategoryEntity>({
  name: "categories",
  thunks: {
    fetchAllThunk: fetchCategoriesThunk,
    fetchByIdThunk: fetchCategoryByIdThunk,
    createThunk: createCategoryThunk,
    updateThunk: updateCategoryThunk,
    deleteThunk: deleteCategoryThunk,
    exportThunk: exportCategoriesThunk,
  },
});

export const {
  clearError: clearCategoriesError,
  clearSelectedItem: clearSelectedCategory,
} = categoriesSlice.actions;
export default categoriesSlice.reducer;
