import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { fetchBranchesThunk } from "@/middleware/branch/branch.thunk";
import { updateSalonThunk } from "@/middleware/salon/salon.thunk";
import type { RootState } from "@/store";
import { selectCurrentUser } from "@/store/user/user.slice";
import type { Branch } from "@/types/branch";
import { canManageStaffLifecycle, getUserBusinessName } from "@/utils/userProfile";

type BranchStatus = "idle" | "loading" | "succeeded" | "failed";

type BranchState = {
  activeBranchId: string | null;
  branches: Branch[];
  error: string | null;
  isSwitching: boolean;
  status: BranchStatus;
  currentRequestId: string | null;
};

const initialState: BranchState = {
  activeBranchId: null,
  branches: [],
  error: null,
  isSwitching: false,
  status: "idle",
  currentRequestId: null,
};

const branchSlice = createSlice({
  name: "branch",
  initialState,
  reducers: {
    setActiveBranchId(state, action: PayloadAction<string | null>) {
      state.activeBranchId = action.payload;
    },
    setSwitchingBranch(state, action: PayloadAction<boolean>) {
      state.isSwitching = action.payload;
    },
    resetBranchState() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBranchesThunk.pending, (state, action) => {
        state.currentRequestId = action.meta.requestId;
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchBranchesThunk.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.currentRequestId = null;
        state.status = "succeeded";
        state.branches = action.payload;
        if (action.payload.length === 0) {
          state.activeBranchId = null;
        } else if (!state.activeBranchId) {
          // Removing a link must not change the selected salon independently
          // of its authenticated session. The switch flow replaces both.
          state.activeBranchId = action.payload[0].id;
        }
        state.error = null;
      })
      .addCase(fetchBranchesThunk.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.currentRequestId = null;
        state.status = "failed";
        state.error = action.payload?.message ?? action.error.message ?? "Unable to load branches.";
      })
      // A renamed salon is the same record as its branch: keep the dashboard
      // header (which shows the branch name) in step without a refetch.
      .addCase(updateSalonThunk.fulfilled, (state, action) => {
        const { id, name, timezone, country, countryCode } = action.payload.salon;
        const branch = state.branches.find((entry) => entry.id === id);
        if (branch && name) branch.name = name;
        if (branch) Object.assign(branch, { timezone, country, countryCode });
      });
  },
});

export const { resetBranchState, setActiveBranchId, setSwitchingBranch } = branchSlice.actions;
export const selectBranchStatus = (state: RootState) => state.branch.status;
export const selectBranchError = (state: RootState) => state.branch.error;
export const selectIsSwitchingBranch = (state: RootState) => state.branch.isSwitching;

export const selectActiveBranchId = (state: RootState) =>
  state.branch.activeBranchId ?? selectCurrentUser(state)?.salonId ?? null;

export const selectActiveBranch = (state: RootState): Branch | null => {
  const activeBranchId = selectActiveBranchId(state);
  const match = state.branch.branches.find((branch) => branch.id === activeBranchId);

  if (match) {
    return match;
  }

  if (!activeBranchId) {
    return null;
  }

  return {
    city: "",
    id: activeBranchId,
    isActive: true,
    name: getUserBusinessName(selectCurrentUser(state)),
  };
};

export const selectVisibleBranches = (state: RootState): Branch[] => {
  const currentUser = selectCurrentUser(state);
  const branches = state.branch.branches;

  if (canManageStaffLifecycle(currentUser?.role)) {
    return branches;
  }

  return branches.filter((branch) => branch.id === currentUser?.salonId);
};

export const selectShouldShowBranchSelector = (state: RootState) =>
  selectCurrentUser(state)?.role === "salon_owner" || selectVisibleBranches(state).length > 1;

export default branchSlice.reducer;
