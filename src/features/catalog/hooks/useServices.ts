import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "../../../store/store";
import { fetchServicesThunk } from "../../../middleware/services/services.thunk";
import type { FetchServicesParams } from "../../../middleware/services/services.thunk";
import { fetchCategoriesThunk } from "../../../middleware/services/categories.thunk";
import {
  selectAllServices,
  selectServicesLoading,
  selectServicesError,
  selectServicesPagination,
  selectCategoriesWithServiceCount,
} from "../../../store/selectors/slices.selectors";
import type { Service } from "../types/catalog.types";

export interface CategoryItem {
  id: string | number;
  name: string;
  [key: string]: any;
}

// Derived view type — adds serviceCount computed from the services array
export interface CategoryView extends CategoryItem {
  serviceCount: number;
}

export const useServices = () => {
  const dispatch = useDispatch<AppDispatch>();

  const rawServices = useSelector(selectAllServices);
  const services = (Array.isArray(rawServices) ? rawServices : []) as Service[];

  // Memoized selector: categories with service counts. Only recomputes when
  // services or categories in Redux state actually change.
  const categories = useSelector(
    selectCategoriesWithServiceCount,
  ) as CategoryView[];

  const loadingState = useSelector(selectServicesLoading);
  const loading = loadingState?.fetchAll ?? false;
  const error = useSelector(selectServicesError);
  const pagination = useSelector(selectServicesPagination);

  const fetchServices = useCallback(
    (params?: FetchServicesParams) => {
      dispatch(fetchServicesThunk(params));
      dispatch(fetchCategoriesThunk());
    },
    [dispatch],
  );

  return { services, categories, loading, error, pagination, fetchServices };
};
