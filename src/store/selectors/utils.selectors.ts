import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../store";
import type { CRUDState } from "../utils/createCRUDSlice";
import type { WithId } from "../../middleware/utils/createCRUDThunks";

/**
 * Factory that generates the six standard memoized selectors for any CRUD slice.
 *
 * Usage:
 * ```ts
 * const clientBase = createCRUDSelectors((s: RootState) => s.client)
 * export const selectAllClients = clientBase.selectItems
 * ```
 */
export function createCRUDSelectors<TEntity extends WithId>(
  sliceSelector: (state: RootState) => CRUDState<TEntity>,
) {
  const selectItems = createSelector(sliceSelector, (s) => s.items);
  const selectSelectedItem = createSelector(
    sliceSelector,
    (s) => s.selectedItem,
  );
  const selectLoading = createSelector(sliceSelector, (s) => s.loading);
  const selectError = createSelector(sliceSelector, (s) => s.error);
  const selectCount = createSelector(selectItems, (items) => items.length);
  const selectIsEmpty = createSelector(
    selectItems,
    (items) => items.length === 0,
  );

  return {
    selectItems,
    selectSelectedItem,
    selectLoading,
    selectError,
    selectCount,
    selectIsEmpty,
  };
}
