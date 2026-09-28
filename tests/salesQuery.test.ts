import { configureStore } from "@reduxjs/toolkit";
import { fetchSalesThunk } from "@/middleware/sales/sales.thunk";
import { salesService } from "@/services/sales.service";
import type { RootState } from "@/store";

jest.mock("@/services/sales.service", () => ({ salesService: { getSales: jest.fn() } }));
jest.mock("@/services/api", () => ({ ApiError: class extends Error {}, getApiErrorMessage: () => "error" }));
jest.mock("@/store/branch/branch.slice", () => ({ selectActiveBranchId: () => "branch-a" }));
jest.mock("@/middleware/dashboard/dashboard.thunk", () => ({}));
jest.mock("@/middleware/notification/notification.thunk", () => ({}));
jest.mock("@/middleware/product/product.thunk", () => ({}));

const makeStore = () => configureStore({ reducer: () => ({
  sales: { query: { limit: 10, offset: 0, search: "", sort_by: "total", sort_order: "desc", status: "completed" } },
} as RootState) });

test("selecting All clears the old sales status while changing the sort", async () => {
  await makeStore().dispatch(fetchSalesThunk({ status: undefined, sort_order: "asc", reset: true, offset: 0 }));
  expect(salesService.getSales).toHaveBeenCalledWith(expect.objectContaining({ status: undefined, sort_order: "asc", offset: 0 }), "branch-a");
});

test("background refresh preserves the selected sales filter and sort", async () => {
  await makeStore().dispatch(fetchSalesThunk());
  expect(salesService.getSales).toHaveBeenCalledWith(expect.objectContaining({ status: "completed", sort_by: "total", sort_order: "desc" }), "branch-a");
});
