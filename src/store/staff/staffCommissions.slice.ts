import { createSlice } from "@reduxjs/toolkit";

import {
  commissionHistoryKey,
  fetchCommissionHistoryThunk,
  type CommissionHistoryArgs,
} from "@/middleware/staff/staffCommissions.thunk";
import type { RootState } from "@/store";
import type { CommissionHistoryEntry } from "@/types/staffCommissions";

// History is cached per staff member and month ("staffId:YYYY-MM").
type StaffCommissionsState = {
  historyByKey: Record<string, CommissionHistoryEntry[]>;
  historyErrorByKey: Record<string, string | null>;
  historyLoadedKeys: string[];
  historyLoadingKeys: string[];
};

const initialState: StaffCommissionsState = {
  historyByKey: {},
  historyErrorByKey: {},
  historyLoadedKeys: [],
  historyLoadingKeys: [],
};

const staffCommissionsSlice = createSlice({
  name: "staffCommissions",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCommissionHistoryThunk.pending, (state, action) => {
        const key = commissionHistoryKey(action.meta.arg);

        state.historyErrorByKey[key] = null;
        state.historyLoadingKeys = [...state.historyLoadingKeys, key];
      })
      .addCase(fetchCommissionHistoryThunk.fulfilled, (state, action) => {
        const { history, key } = action.payload;

        state.historyByKey[key] = history;
        state.historyLoadedKeys = state.historyLoadedKeys.includes(key)
          ? state.historyLoadedKeys
          : [...state.historyLoadedKeys, key];
        state.historyLoadingKeys = state.historyLoadingKeys.filter((item) => item !== key);
      })
      .addCase(fetchCommissionHistoryThunk.rejected, (state, action) => {
        const key = commissionHistoryKey(action.meta.arg);

        state.historyErrorByKey[key] =
          action.payload?.message ?? action.error.message ?? "Unable to load commission history.";
        state.historyLoadingKeys = state.historyLoadingKeys.filter((item) => item !== key);
      });
  },
});

type HistoryArgs = Partial<CommissionHistoryArgs>;
const keyOf = ({ month, staffId }: HistoryArgs) => (staffId && month ? commissionHistoryKey({ month, staffId }) : null);

const EMPTY_HISTORY: CommissionHistoryEntry[] = [];

export const selectCommissionHistory = (state: RootState, args: HistoryArgs) => {
  const key = keyOf(args);
  return (key && state.staffCommissions.historyByKey[key]) || EMPTY_HISTORY;
};
export const selectCommissionHistoryLoaded = (state: RootState, args: HistoryArgs) => {
  const key = keyOf(args);
  return key ? state.staffCommissions.historyLoadedKeys.includes(key) : false;
};
export const selectCommissionHistoryLoading = (state: RootState, args: HistoryArgs) => {
  const key = keyOf(args);
  return key ? state.staffCommissions.historyLoadingKeys.includes(key) : false;
};
export const selectCommissionHistoryError = (state: RootState, args: HistoryArgs) => {
  const key = keyOf(args);
  return key ? state.staffCommissions.historyErrorByKey[key] ?? null : null;
};

export default staffCommissionsSlice.reducer;
