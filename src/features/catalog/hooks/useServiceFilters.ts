import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "../../../store/store";
import {
  setServiceFilters,
  resetServiceFilters,
} from "../../../store/serviceFiltersSlice";
import type { ServiceFiltersState } from "../../../store/serviceFiltersSlice";

/**
 * Total number of selected options across every field — JiraFilterMenu shows
 * its own badge from the same tally, so counting fields rather than options
 * would disagree with it (two durations ticked is 2, not 1).
 */
export const countActiveFilters = (f: ServiceFiltersState): number =>
  Object.values(f).reduce((sum, ids) => sum + (ids?.length ?? 0), 0);

export const useServiceFilters = () => {
  const dispatch = useDispatch<AppDispatch>();
  const filters = useSelector((state: RootState) => state.serviceFilters);
  const activeCount = countActiveFilters(filters);

  const apply = (updates: Partial<ServiceFiltersState>) =>
    dispatch(setServiceFilters(updates));

  const reset = () => dispatch(resetServiceFilters());

  return { filters, apply, reset, activeCount };
};
