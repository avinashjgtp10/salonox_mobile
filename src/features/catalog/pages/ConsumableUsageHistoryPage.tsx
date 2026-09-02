import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "react-bootstrap-icons";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../../../store/store";
import api from "../../../services/api/axios";
import { INVENTORY } from "../../../services/api/endpoints/inventory.endpoints";
import { fetchUsageHistoryThunk } from "../../../middleware/inventory/inventory.thunk";
import type { ConsumableListResult } from "../../../middleware/inventory/inventory.thunk";
import type { InventoryResponse, UsageHistoryFilters, UsageHistoryRow } from "../../../types/inventory.types";
import Dropdown from "../../../components/ui/Dropdown";
import { Pagination, DateRangeFilter } from "../../../components/ui";
import type { DateRangeFilterValue } from "../../../components/ui";
import Skeleton from "../../../components/ui/Skeleton";
import "../styles/ConsumableInventoryPage.scss";
import "../styles/ConsumableUsageHistoryPage.scss";

const SOURCE_LABEL: Record<string, string> = {
  appointment_complete: "Appointment completed",
  appointment_adjustment: "Appointment edited",
  manual: "Manual adjustment",
};

const ConsumableUsageHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams] = useSearchParams();

  // Page-local, deliberately NOT the shared inventory.consumables slice: this
  // is only a name lookup for the filter dropdown, and writing a flat 200-row
  // fetch into that slice also overwrote the Consumable Inventory table's own
  // rows and all four of its pagination fields.
  const [productOptions, setProductOptions] = useState<{ product_id: string; name: string }[]>([]);

  const [rows, setRows] = useState<UsageHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);
  const [filters, setFilters] = useState<UsageHistoryFilters>({
    product_id: searchParams.get("product_id") || undefined,
  });
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "all_time", startDate: "", endDate: "" });

  const load = useCallback(async (nextFilters: UsageHistoryFilters, nextPage: number, nextPageSize: number) => {
    setLoading(true);
    try {
      const result = await dispatch(fetchUsageHistoryThunk({ ...nextFilters, page: nextPage, limit: nextPageSize })).unwrap();
      setRows(result.data);
      setTotalRecords(result.totalRecords);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    load(filters, page, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page, pageSize]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<InventoryResponse<ConsumableListResult>>(
          INVENTORY.CONSUMABLES, { params: { limit: 200 } },
        );
        const list = res.data?.data?.data ?? [];
        if (!cancelled) setProductOptions(list.map((c) => ({ product_id: c.product_id, name: c.name })));
      } catch {
        if (!cancelled) setProductOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const updateFilter = <K extends keyof UsageHistoryFilters>(key: K, value: UsageHistoryFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setPage(1);
  };

  const handleDateRangeChange = (next: DateRangeFilterValue) => {
    setDateRange(next);
    setFilters((prev) => ({ ...prev, from: next.startDate || undefined, to: next.endDate || undefined }));
    setPage(1);
  };

  const selectedProductName = filters.product_id
    ? productOptions.find((c) => c.product_id === filters.product_id)?.name
    : undefined;

  return (
    <div className="ci-page">
      <div className="ci-header">
        <div>
          <button className="ci-back-link" onClick={() => navigate("/dashboard/inventory/consumables")}>
            <ArrowLeft size={14} /> Back to Consumable Inventory
          </button>
          <h1 className="ci-header__title">Usage History</h1>
          <p className="ci-header__subtitle">
            {selectedProductName ? `Showing usage for ${selectedProductName}` : "Full consumable usage log across every product."}
          </p>
        </div>
      </div>

      <div className="ci-filters">
        <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />
        <Dropdown
          searchable={false}
          value={filters.product_id ?? ""}
          options={[{ id: "", name: "All products" }, ...productOptions.map((c) => ({ id: c.product_id, name: c.name }))]}
          onChange={(id) => updateFilter("product_id", id)}
        />
        <Dropdown
          searchable={false}
          value={filters.direction ?? ""}
          options={[
            { id: "", name: "Deduct + Return" },
            { id: "deduct", name: "Deducted" },
            { id: "return", name: "Returned" },
          ]}
          onChange={(id) => updateFilter("direction", id as any)}
        />
      </div>

      <div className="ci-table-wrap">
        <table className="ci-table">
          <thead>
            <tr><th>Date</th><th>Product</th><th>Service</th><th>Staff</th><th>Qty</th><th>Direction</th><th>Source</th></tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((__, j) => <td key={j}><Skeleton height={14} /></td>)}</tr>
              ))
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="ci-empty">No usage recorded for this filter.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="ci-usage-row">
                  <td>{new Date(r.date).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="ci-table__name">{r.product_name}</td>
                  <td>{r.service_name || "—"}</td>
                  <td>{r.staff_name?.trim() || "—"}</td>
                  <td>{r.qty.toLocaleString()} {r.unit || ""}</td>
                  <td><span className={`ci-direction ci-direction--${r.direction}`}>{r.direction === "deduct" ? "Deducted" : "Returned"}</span></td>
                  <td>{r.source ? (SOURCE_LABEL[r.source] || r.source) : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={page}
        pageSize={pageSize}
        totalItems={totalRecords}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      />
    </div>
  );
};

export default ConsumableUsageHistoryPage;
