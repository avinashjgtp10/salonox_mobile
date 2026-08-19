import { createSlice } from "@reduxjs/toolkit";
import { fetchMySalonsThunk } from "../middleware/branchOwner/branchOwner.thunk";

export interface BranchOwnerSalon {
  id: string;
  name: string;
  owner_email?: string;
  owner_name?: string;
  status: string;
  created_at: string;
}

interface BranchOwnerState {
  salons: BranchOwnerSalon[];
  loading: boolean;
  error: string | null;
}

const initialState: BranchOwnerState = {
  salons: [],
  loading: false,
  error: null,
};

const branchOwnerSlice = createSlice({
  name: "branchOwner",
  initialState,
  reducers: {
    clearBranchOwnerError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMySalonsThunk.pending,   (state) => { state.loading = true; })
      .addCase(fetchMySalonsThunk.fulfilled, (state, { payload }) => { state.loading = false; state.salons = payload; })
      .addCase(fetchMySalonsThunk.rejected,  (state, { payload }) => { state.loading = false; state.error = payload ?? null; });
  },
});

export const { clearBranchOwnerError } = branchOwnerSlice.actions;
export default branchOwnerSlice.reducer;
