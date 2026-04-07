import { createSlice, type ActionReducerMapBuilder } from "@reduxjs/toolkit";
import { castDraft } from "immer";
import type { WithId } from "../../middleware/utils/createCRUDThunks";

// ─────────────────────────────────────────────────────────────────────────────
// Base state every CRUD slice shares
// ─────────────────────────────────────────────────────────────────────────────
export interface CRUDState<TEntity> {
  items:        TEntity[];
  selectedItem: TEntity | null;
  loading:      boolean;
  error:        string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Minimal async-thunk shape the factory needs (avoids complex RTK generics)
// ─────────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyThunk = { pending: any; fulfilled: any; rejected: any };

export interface CRUDThunks {
  fetchAllThunk:  AnyThunk;
  fetchByIdThunk: AnyThunk;
  createThunk:    AnyThunk;
  /** Optional – omit for entities that have no PUT/PATCH update endpoint */
  updateThunk?:   AnyThunk;
  deleteThunk:    AnyThunk;
  exportThunk:    AnyThunk;
}

// ─────────────────────────────────────────────────────────────────────────────
// Options
// ─────────────────────────────────────────────────────────────────────────────
export interface CreateCRUDSliceOptions<TEntity extends WithId> {
  /** Redux slice name, e.g. "catalog" */
  name: string;
  /** The six standard thunks produced by createCRUDThunks() */
  thunks: CRUDThunks;
  /**
   * Optional callback to attach domain-specific extra reducers
   * (e.g. blockClients, import, merge …)
   */
  extraReducers?: (builder: ActionReducerMapBuilder<CRUDState<TEntity>>) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a Redux slice with the standard CRUD extra-reducers pre-wired.
 *
 * Produces two built-in sync actions:
 *   `clearError`        – sets state.error = null
 *   `clearSelectedItem` – sets state.selectedItem = null
 *
 * Usage:
 * ```ts
 * const catalogSlice = createCRUDSlice({ name: "catalog", thunks: catalogThunks });
 * export const { clearError, clearSelectedItem } = catalogSlice.actions;
 * export default catalogSlice.reducer;
 * ```
 */
export function createCRUDSlice<TEntity extends WithId>({
  name,
  thunks,
  extraReducers: domainExtraReducers,
}: CreateCRUDSliceOptions<TEntity>) {
  const initialState: CRUDState<TEntity> = {
    items:        [],
    selectedItem: null,
    loading:      false,
    error:        null,
  };

  return createSlice({
    name,
    initialState,
    reducers: {
      clearError(state) {
        state.error = null;
      },
      clearSelectedItem(state) {
        (state as { selectedItem: null }).selectedItem = null;
      },
    },

    extraReducers: (builder) => {
      const {
        fetchAllThunk,
        fetchByIdThunk,
        createThunk,
        updateThunk,
        deleteThunk,
        exportThunk,
      } = thunks;

      // ── fetchAll ────────────────────────────────────────────────────────────
      builder
        .addCase(fetchAllThunk.pending, (state) => {
          state.loading = true;
          state.error   = null;
        })
        .addCase(fetchAllThunk.fulfilled, (state, { payload }) => {
          state.loading = false;
          state.items   = castDraft(payload as TEntity[]);
        })
        .addCase(fetchAllThunk.rejected, (state, { payload }) => {
          state.loading = false;
          state.error   = (payload as string) ?? "Failed to fetch items";
        });

      // ── fetchById ───────────────────────────────────────────────────────────
      builder
        .addCase(fetchByIdThunk.pending, (state) => {
          state.loading      = true;
          state.error        = null;
          (state as { selectedItem: null }).selectedItem = null;
        })
        .addCase(fetchByIdThunk.fulfilled, (state, { payload }) => {
          state.loading      = false;
          (state as any).selectedItem = payload;
        })
        .addCase(fetchByIdThunk.rejected, (state, { payload }) => {
          state.loading = false;
          state.error   = (payload as string) ?? "Failed to fetch item";
        });

      // ── create ──────────────────────────────────────────────────────────────
      builder
        .addCase(createThunk.pending, (state) => {
          state.loading = true;
          state.error   = null;
        })
        .addCase(createThunk.fulfilled, (state, { payload }) => {
          state.loading = false;
          state.items.push(castDraft(payload as TEntity));
        })
        .addCase(createThunk.rejected, (state, { payload }) => {
          state.loading = false;
          state.error   = (payload as string) ?? "Failed to create item";
        });

      // ── update (optional – skipped when entity has no update endpoint) ────────
      if (updateThunk) {
        builder
          .addCase(updateThunk.pending, (state) => {
            state.loading = true;
            state.error   = null;
          })
          .addCase(updateThunk.fulfilled, (state, { payload }) => {
            state.loading = false;
            const entity  = payload as TEntity;
            const idx     = state.items.findIndex((i) => (i as TEntity).id === entity.id);
            if (idx !== -1) state.items[idx] = castDraft(entity);
          })
          .addCase(updateThunk.rejected, (state, { payload }) => {
            state.loading = false;
            state.error   = (payload as string) ?? "Failed to update item";
          });
      }

      // ── delete ──────────────────────────────────────────────────────────────
      builder
        .addCase(deleteThunk.pending, (state) => {
          state.loading = true;
          state.error   = null;
        })
        .addCase(deleteThunk.fulfilled, (state, { payload }) => {
          state.loading = false;
          state.items   = castDraft(
            (state.items as TEntity[]).filter((i) => i.id !== payload),
          );
        })
        .addCase(deleteThunk.rejected, (state, { payload }) => {
          state.loading = false;
          state.error   = (payload as string) ?? "Failed to delete item";
        });

      // ── export ──────────────────────────────────────────────────────────────
      builder
        .addCase(exportThunk.pending,   (state) => { state.loading = true;  state.error = null; })
        .addCase(exportThunk.fulfilled, (state) => { state.loading = false; })
        .addCase(exportThunk.rejected,  (state, { payload }) => {
          state.loading = false;
          state.error   = (payload as string) ?? "Failed to export";
        });

      // ── domain-specific extra reducers (optional) ───────────────────────────
      domainExtraReducers?.(builder);
    },
  });
}
