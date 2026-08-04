import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "react-bootstrap-icons";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../store/store";
import { fetchUsageHistoryThunk, fetchConsumablesThunk } from "../../../middleware/inventory/inventory.thunk";
import type { UsageHistoryFilters, UsageHistoryRow } from "../../../types/inventory.types";
import { Pagination } from "../../../components/ui";
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
  const { consumables } = useSelector((s: RootState) => s.inventory);

  const [rows, setRows] = useState<UsageHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);
  const [filters, setFilters] = useState<UsageHistoryFilters>({
    product_id: searchParams.get("product_id") || undefined,
  });

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

  // The product filter dropdown reuses the already-fetched consumables list
  // from the main page — but if a user lands here directly (e.g. a bookmark),
  // that list may still be empty, so fetch it defensively.
  useEffect(() => {
    if (consumables.length === 0) dispatch(fetchConsumablesThunk({ limit: 200 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateFilter = <K extends keyof UsageHistoryFilters>(key: K, value: UsageHistoryFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setPage(1);
  };

  const selectedProductName = filters.product_id
    ? consumables.find((c) => c.product_id === filters.product_id)?.name
    : undefined;

  return (
    <div className="ci-page">
      <div className="ci-header">
        <div>
          <button className="ci-back-link" onClick={() => navigate("/dashboard/catalog/inventory/consumables")}>
            <ArrowLeft size={14} /> Back to Consumable Inventory
          </button>
          <h1 className="ci-header__title">Usage History</h1>
          <p className="ci-header__subtitle">
            {selectedProductName ? `Showing usage for ${selectedProductName}` : "Full consumable usage log across every product."}
          </p>
        </div>
      </div>

      <div className="ci-filters">
        <select value={filters.product_id ?? ""} onChange={(e) => updateFilter("product_id", e.target.value)}>
          <option value="">All products</option>
          {consumables.map((c) => <option key={c.product_id} value={c.product_id}>{c.name}</option>)}
        </select>
        <select value={filters.direction ?? ""} onChange={(e) => updateFilter("direction", e.target.value as any)}>
          <option value="">Deduct + Return</option>
          <option value="deduct">Deducted</option>
          <option value="return">Returned</option>
        </select>
        <label className="ci-date-filter">
          From
          <input type="date" value={filters.from ?? ""} onChange={(e) => updateFilter("from", e.target.value)} />
        </label>
        <label className="ci-date-filter">
          To
          <input type="date" value={filters.to ?? ""} onChange={(e) => updateFilter("to", e.target.value)} />
        </label>
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
