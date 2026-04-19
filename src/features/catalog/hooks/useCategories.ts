import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "../../../store/store";
import {
  createCategoryThunk,
  updateCategoryThunk,
  deleteCategoryThunk,
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

  const createCategory = async (cat: { name: string; description?: string; color?: string }) => {
    await dispatch(createCategoryThunk(cat));
  };

  const updateCategory = async (id: string, data: { name: string; description?: string }) => {
    await dispatch(updateCategoryThunk({ id, data }));
  };

  const deleteCategory = async (id: string) => {
    await dispatch(deleteCategoryThunk(id));
  };

  return { loading, error, createCategory, updateCategory, deleteCategory };
};
