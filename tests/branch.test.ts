import reducer, { selectVisibleBranches, setActiveBranchId } from "@/store/branch/branch.slice";
import { fetchBranchesThunk } from "@/middleware/branch/branch.thunk";
import type { RootState } from "@/store";
import type { Branch } from "@/types/branch";

// Exercise the real reducer/selectors without starting unrelated API services.
jest.mock("@/middleware/branch/branch.thunk", () => {
  const { createAsyncThunk } = require("@reduxjs/toolkit");
  return { fetchBranchesThunk: createAsyncThunk("branch/fetchBranches", async () => []) };
});
jest.mock("@/middleware/user/user.thunk", () => {
  const { createAsyncThunk } = require("@reduxjs/toolkit");
  return { fetchCurrentUserThunk: createAsyncThunk("user/fetchCurrentUser", async () => null) };
});

const branches: Branch[] = [
  { id: "a", name: "Branch A", city: "", isActive: true },
  { id: "b", name: "Branch B", city: "", isActive: true },
];
const loaded = () => reducer(undefined, fetchBranchesThunk.fulfilled(branches, "request", undefined));

test("refresh preserves an existing selection, but removes a branch that is no longer available", () => {
  const selected = reducer(loaded(), setActiveBranchId("b"));
  expect(reducer(selected, fetchBranchesThunk.fulfilled(branches, "refresh", undefined)).activeBranchId).toBe("b");
  expect(reducer(selected, fetchBranchesThunk.fulfilled([branches[0]], "refresh", undefined)).activeBranchId).toBe("a");
});

test("a failed branch refresh preserves selection and previously loaded data", () => {
  const selected = reducer(loaded(), setActiveBranchId("b"));
  const next = reducer(selected, fetchBranchesThunk.rejected(new Error("offline"), "refresh", undefined));
  expect(next.activeBranchId).toBe("b");
  expect(next.branches).toEqual(branches);
  expect(next.status).toBe("failed");
});

test("staff selectors expose only their assigned branch", () => {
  const state = { branch: loaded(), user: { user: { id: "staff-1", role: "staff", salonId: "b" } } } as RootState;
  expect(selectVisibleBranches(state)).toEqual([branches[1]]);
});
