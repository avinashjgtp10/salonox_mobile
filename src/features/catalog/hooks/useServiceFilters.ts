import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "../../../store/store";
import {
  setServiceFilters,
  resetServiceFilters,
  INITIAL_SERVICE_FILTERS,
} from "../../../store/serviceFiltersSlice";
import type { ServiceFiltersState } from "../../../store/serviceFiltersSlice";

/**
 * Count how many filters deviate from the default (INITIAL_SERVICE_FILTERS).
 * Used to display the active filter badge on the Filters button.
 */
export const countActiveFilters = (f: ServiceFiltersState): number =>
  [
    f.categoryId !== INITIAL_SERVICE_FILTERS.categoryId,
    f.durationRange !== INITIAL_SERVICE_FILTERS.durationRange,
    f.onlineBooking !== INITIAL_SERVICE_FILTERS.onlineBooking,
    f.commissions !== INITIAL_SERVICE_FILTERS.commissions,
    f.resourceRequirements !== INITIAL_SERVICE_FILTERS.resourceRequirements,
  ].filter(Boolean).length;

export const useServiceFilters = () => {
  const dispatch = useDispatch<AppDispatch>();
  const filters = useSelector((state: RootState) => state.serviceFilters);
  const activeCount = countActiveFilters(filters);

  const apply = (updates: Partial<ServiceFiltersState>) =>
    dispatch(setServiceFilters(updates));

  const reset = () => dispatch(resetServiceFilters());

  return { filters, apply, reset, activeCount };
};
