import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowCounterclockwise } from "react-bootstrap-icons";
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
import RevertConsumableUsageModal from "../components/RevertConsumableUsageModal";
import { usePermissions } from "../../../hooks/usePermissions";
import "../styles/ConsumableInventoryPage.scss";
import "../styles/ConsumableUsageHistoryPage.scss";
import "../styles/RevertConsumableUsageModal.scss";

const SOURCE_LABEL: Record<string, string> = {
  appointment_complete: "Appointment completed",
  appointment_adjustment: "Appointment edited",
  manual: "Manual adjustment",
  revert: "Reverted",
};

const ConsumableUsageHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams] = useSearchParams();
  const { can } = usePermissions();

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

  // The row awaiting confirmation. Null = dialog closed.
  const [revertRow, setRevertRow] = useState<UsageHistoryRow | null>(null);

  // Reverting moves stock, so it is gated on adjust_consumable_stock rather
  // than the view permission that got the user onto this page.
  const canRevert = can("adjust_consumable_stock");

  const handleRevert = useCallback(async (row: UsageHistoryRow, reason: string) => {
    try {
      await api.post(INVENTORY.CONSUMABLES_USAGE_REVERT(row.id), reason.trim() ? { reason: reason.trim() } : {});
    } catch (err: any) {
      // Surfaced inside the dialog — the row stays put and nothing is refetched,
      // matching the backend, where a failed revert writes neither stock nor history.
      throw new Error(err?.response?.data?.message || "Could not revert this deduction.");
    }
    setRevertRow(null);
    // Refetch rather than patching locally: the revert adds a new row AND
    // changes the original’s state, and current_stock on every other row of
    // the same product is now stale too.
    await load(filters, page, pageSize);
  }, [load, filters, page, pageSize]);

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
            <tr><th>Date</th><th>Product</th><th>Service</th><th>Staff</th><th>Qty</th><th>Direction</th><th>Source</th><th aria-label="Actions" /></tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 8 }).map((__, j) => <td key={j}><Skeleton height={14} /></td>)}</tr>
              ))
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="ci-empty">No usage recorded for this filter.</td></tr>
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
                  <td className="ci-usage-actions">
                    {r.can_revert ? (
                      <button
                        type="button"
                        className="ci-revert-btn"
                        onClick={() => setRevertRow(r)}
                        disabled={!canRevert}
                        title={canRevert ? "Revert this deduction" : "Needs the adjust_consumable_stock permission"}
                      >
                        <ArrowCounterclockwise size={12} /> Revert
                      </button>
                    ) : r.reverted_at ? (
                      /* Stated rather than left blank: an empty cell reads as
                         "not allowed", which is a different thing. */
                      <span className="ci-reverted-tag">Reverted</span>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <RevertConsumableUsageModal
        row={revertRow}
        onClose={() => setRevertRow(null)}
        onConfirm={handleRevert}
      />

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
