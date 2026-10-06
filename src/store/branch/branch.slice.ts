import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { fetchBranchesThunk } from "@/middleware/branch/branch.thunk";
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
};

const initialState: BranchState = {
  activeBranchId: null,
  branches: [],
  error: null,
  isSwitching: false,
  status: "idle",
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
      .addCase(fetchBranchesThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchBranchesThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.branches = action.payload;
        if (action.payload.length === 0) {
          state.activeBranchId = null;
        } else if (
          action.payload.length === 1 ||
          !state.activeBranchId ||
          !action.payload.some((branch) => branch.id === state.activeBranchId)
        ) {
          state.activeBranchId = action.payload[0].id;
        }
        state.error = null;
      })
      .addCase(fetchBranchesThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message ?? action.error.message ?? "Unable to load branches.";
      });
  },
});

export const { resetBranchState, setActiveBranchId, setSwitchingBranch } = branchSlice.actions;

export const selectBranches = (state: RootState) => state.branch.branches;
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
  selectVisibleBranches(state).length > 1;

export default branchSlice.reducer;
