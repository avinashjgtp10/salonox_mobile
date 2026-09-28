import { api } from "@/services/api";
import { salesService } from "@/services/sales.service";
import { serviceService } from "@/services/service.service";
import { clientService } from "@/services/client.service";
import { consumableService } from "@/services/consumable.service";
import { getSortQuery } from "@/features/clients/utils/clientList";
import type { SalesListQuery } from "@/types/sales";

jest.mock("@/services/api", () => ({ api: { get: jest.fn() } }));

test.each(["asc", "desc"] as const)("consumable stock sorts all pages numerically (%s)", async (sortOrder) => {
  const items = [
    { product_id: "a", name: "A", remaining_stock: "100" },
    { product_id: "b", name: "B", remaining_stock: "20" },
    { product_id: "c", name: "C", remaining_stock: "2" },
  ];
  jest.mocked(api.get).mockImplementation(async (_url, config) => {
    const page = (config?.params as { page?: number } | undefined)?.page ?? 1;
    return { data: { data: { list: { data: items.slice((page - 1) * 2, page * 2), page, pageSize: 2, totalPages: 2, totalRecords: 3 } } } };
  });
  const result = await consumableService.getDashboard({ page: 1, limit: 2, search: "", sortBy: "amount", sortOrder }, "branch-a");
  expect(result.consumables.map((item) => item.amount)).toEqual(sortOrder === "asc" ? [2, 20] : [100, 20]);
  expect(result.pagination.totalRecords).toBe(3);
  expect(result.pagination.hasMore).toBe(true);
  expect(api.get).toHaveBeenCalledWith(expect.any(String), { params: expect.objectContaining({ sort_by: "newest", salon_id: "branch-a" }) });
});

test("consumable alphabetical sorting uses the supported API preset", async () => {
  jest.mocked(api.get).mockResolvedValue({ data: { data: { list: { data: [], totalRecords: 0 } } } });
  await consumableService.getDashboard({ page: 1, limit: 10, search: "", sortBy: "name", sortOrder: "asc" });
  expect(api.get).toHaveBeenCalledWith(expect.any(String), { params: { page: 1, limit: 10, sort_by: "a_z" } });
});

const query: SalesListQuery = { limit: 10, offset: 0, search: "", sort_by: "total", sort_order: "asc" };
const rows = Array.from({ length: 14 }, (_, index) => ({
  id: `sale-${index}`, total_amount: String((14 - index) * 10),
  client_name: index === 13 ? "Alice" : "Bob", invoice_number: `INV-${index}`, status: "completed",
}));

beforeEach(() => { jest.mocked(api.get).mockResolvedValue({ data: { data: rows } }); });

test("Sales Summary sorts the complete numeric result low to high, including rows past page one", async () => {
  const result = await salesService.getSales(query, "branch-a");
  expect(result.sales.map((sale) => sale.total)).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140]);
  expect(result.totalCount).toBe(14);
  expect(result.pagination.hasMore).toBe(false);
  expect(api.get).toHaveBeenCalledWith(expect.any(String), { params: { status: undefined, salon_id: "branch-a" } });
  expect(rows[0].total_amount).toBe("140");
});

test("switching to high-to-low reverses the amount order", async () => {
  const result = await salesService.getSales({ ...query, sort_order: "desc" });
  expect(result.sales[0].total).toBe(140);
  expect(result.sales[13].total).toBe(10);
});

test("search and sorting work together and retain the selected status filter", async () => {
  const result = await salesService.getSales({ ...query, search: " alice ", status: "completed" });
  expect(result.sales).toHaveLength(1);
  expect(result.sales[0].clientName).toBe("Alice");
  expect(result.totalCount).toBe(1);
  expect(api.get).toHaveBeenCalledWith(expect.any(String), { params: { status: "completed" } });
});

test("Highest Spending uses the backend's supported total_sales field", () => {
  expect(getSortQuery("Highest Spending")).toEqual({ sort_by: "total_sales", sort_order: "desc" });
});

const catalogue = [
  { id: "a", name: "Zebra", price: "100", created_at: "2026-01-04" },
  { id: "b", name: "Bravo", price: "30", created_at: "2026-01-03" },
  { id: "c", name: "Alpha", price: "2", created_at: "2026-01-02" },
  { id: "d", name: "Delta", price: "90", created_at: "2026-01-01" },
];
function mockCatalogue() {
  jest.mocked(api.get).mockImplementation(async (_url, config) => {
    const page = (config?.params as { page?: number } | undefined)?.page ?? 1;
    return { data: { data: { data: catalogue.slice((page - 1) * 2, page * 2), pagination: { page, limit: 2, total: 4, total_pages: 2 } } } };
  });
}

test("service price ordering includes later server pages before slicing the visible page", async () => {
  mockCatalogue();
  const first = await serviceService.getServices({ ...query, limit: 2, sort_by: "price", categoryId: "hair", isActive: true }, "branch-a");
  expect(first.services.map((service) => service.price)).toEqual([2, 30]);
  expect(first.pagination).toEqual({ offset: 0, limit: 2, nextOffset: 2, hasMore: true });
  expect(first.totalCount).toBe(4);
  expect(api.get).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ params: expect.objectContaining({ category_id: "hair", status: "active", salon_id: "branch-a" }) }));
  const second = await serviceService.getServices({ ...query, limit: 2, offset: 2, sort_by: "price" });
  expect(second.services.map((service) => service.price)).toEqual([90, 100]);
  expect(second.pagination.hasMore).toBe(false);
});

test("service high-to-low and alphabetical sorts use the entire matching catalogue", async () => {
  mockCatalogue();
  const descending = await serviceService.getServices({ ...query, sort_by: "price", sort_order: "desc" });
  expect(descending.services.map((service) => service.price)).toEqual([100, 90, 30, 2]);
  const alphabetical = await serviceService.getServices({ ...query, sort_by: "name" });
  expect(alphabetical.services.map((service) => service.name)).toEqual(["Alpha", "Bravo", "Delta", "Zebra"]);
});

test("service sorting reports a failed later page instead of showing partially sorted results", async () => {
  jest.mocked(api.get)
    .mockResolvedValueOnce({ data: { data: { data: catalogue.slice(0, 2), pagination: { page: 1, limit: 2, total: 4, total_pages: 2 } } } })
    .mockRejectedValueOnce(new Error("offline"));
  await expect(serviceService.getServices({ ...query, sort_by: "price" })).rejects.toThrow("offline");
});

test("client search sends sorting and offset to the paginated list endpoint", async () => {
  jest.mocked(api.get).mockResolvedValue({ data: { data: { clients: [], total: 0 } } });
  await clientService.searchClients({ ...query, search: "Alice", offset: 10, sort_by: "total_sales", sort_order: "desc" }, "branch-a");
  expect(api.get).toHaveBeenCalledWith("/clients", { params: expect.objectContaining({
    search: "Alice", offset: 10, sort_by: "total_sales", sort_order: "desc", salon_id: "branch-a",
  }) });
});

test("filtered clients retain server spending order across pages instead of campaign name order", async () => {
  const low = "00000000-0000-4000-8000-000000000001";
  const high = "00000000-0000-4000-8000-000000000002";
  const other = "00000000-0000-4000-8000-000000000003";
  jest.mocked(api.get).mockImplementation(async (url, config) => {
    if (url === "/clients/filter") return { data: { data: { clients: [{ id: low }, { id: high }] } } };
    const offset = (config?.params as { offset: number }).offset;
    return { data: { data: {
      clients: offset === 0 ? [{ id: high, full_name: "High" }, { id: other, full_name: "Other" }] : [{ id: low, full_name: "Low" }],
      total: 3, pagination: { offset, limit: 2, next_offset: offset + 2, has_more: offset === 0 },
    } } };
  });
  const result = await clientService.filterClients({ ...query, limit: 1, offset: 1, sort_by: "total_sales", sort_order: "desc" }, "membership", "branch-a");
  expect(result.clients.map((client) => client.id)).toEqual([low]);
  expect(result.totalCount).toBe(2);
  expect(result.pagination.hasMore).toBe(false);
  expect(api.get).toHaveBeenCalledWith("/clients", { params: expect.objectContaining({ sort_by: "total_sales", sort_order: "desc", offset: 2 }) });
});
