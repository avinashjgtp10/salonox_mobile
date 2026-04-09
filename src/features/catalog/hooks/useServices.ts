import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../store/store";
import {
  fetchCatalogThunk,
  fetchCategoriesThunk,
} from "../../../middleware/catalog/catalog.thunk";
import type { Service, CategoryItem } from "../../../types/catalog.types";

// Derived view type — adds serviceCount computed from the services array
export interface CategoryView extends CategoryItem {
  serviceCount: number;
}

export const useServices = () => {
  const dispatch = useDispatch<AppDispatch>();

  const services = useSelector(
    (state: RootState) => (state.catalog as any).items as Service[],
  );
  const rawCategories = useSelector(
    (state: RootState) => (state.catalog as any).categories as CategoryItem[],
  );
  const loading = useSelector(
    (state: RootState) =>
      ((state.catalog as any).loading?.fetchAll as boolean) ?? false,
  );
  const error = useSelector(
    (state: RootState) => (state.catalog as any).error as string | null,
  );

  // Derive serviceCount per category from the services list
  const categories: CategoryView[] = rawCategories.map((cat) => ({
    ...cat,
    serviceCount: services.filter(
      (svc) => String(svc.category_id) === String(cat.id),
    ).length,
  }));

  const fetchServices = useCallback(() => {
    dispatch(fetchCatalogThunk());
    dispatch(fetchCategoriesThunk());
  }, [dispatch]);

  return { services, categories, loading, error, fetchServices };
};
