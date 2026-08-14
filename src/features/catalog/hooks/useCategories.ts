import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "../../../store/store";
import {
  createCategoryThunk,
  updateCategoryThunk,
  deleteCategoryThunk,
  type CategoryType,
} from "../../../middleware/services/categories.thunk";
import {
  selectCategoriesLoading,
  selectCategoriesError,
} from "../../../store/selectors/slices.selectors";

export const useCategories = () => {
  const dispatch = useDispatch<AppDispatch>();
  const loadingState = useSelector(selectCategoriesLoading);
  const loading = loadingState?.create ?? false;
  const error = useSelector(selectCategoriesError);

  // This hook is only ever used from the Services list page — default new
  // categories to 'service' so "Manage categories → Add category" doesn't
  // fall through to the backend's 'both' default and leak into the Product
  // picker too. An explicit type (rare) still overrides it.
  const createCategory = async (cat: { name: string; description?: string; color?: string; type?: CategoryType }) => {
    await dispatch(createCategoryThunk({ ...cat, type: cat.type ?? "service" }));
  };

  const updateCategory = async (id: string, data: { name: string; description?: string; type?: CategoryType }) => {
    await dispatch(updateCategoryThunk({ id, data }));
  };

  const deleteCategory = async (id: string) => {
    await dispatch(deleteCategoryThunk(id));
  };

  return { loading, error, createCategory, updateCategory, deleteCategory };
};
