import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { CONSUMABLE_ANALYTICS_REPORT } from "../../../services/api/endpoints";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, JiraFilterMenu, DateRangeFilter, getDateRangePresetValue } from "../../../components/ui";
import type { JiraFilterField, DateRangeFilterValue } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import "./PayrollHistoryReport.scss";

const REPORT_NAME = "Consumable Analytics Report";

interface ConsumableRow {
  id: string;
  clientId: string;
  clientName: string;
  productName: string;
  qty: number;
  unit: string;
  serviceName: string;
  usageDate: string;
}

interface FilterOption { id: string; label: string; }

function formatDate(input: string | null): string {
  if (!input) return "—";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Maps a row from the independent Consumable Analytics API
// (POST /api/report/consumable-analytics — reads consumable_usage directly,
// joined through appointments for the client) to the table's row shape.
function mapRow(row: any): ConsumableRow {
  return {
    id: row.id,
    clientId: row.client_id ? String(row.client_id) : "",
    clientName: row.client_name || "—",
    productName: row.product_name || "—",
    qty: Number(row.qty) || 0,
    unit: row.unit || "",
    serviceName: row.service_name || "—",
    usageDate: row.usage_date || "",
  };
}

export default function ConsumableAnalyticsReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  // No fixed preset matches "everything to date" — starts wide open (empty
  // range) rather than defaulting to a narrow recent window, since consumable
  // usage is a lower-volume, less time-sensitive dataset than sales/bookings.
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "all_time", startDate: "", endDate: "" });
  const { startDate: dateFrom, endDate: dateTo } = dateRange;
  const [search,           setSearchInput]     = useState("");
  const [debouncedSearch,  setDebouncedSearch]  = useState("");
  const [clientFilterIds,  setClientFilterIds]  = useState<string[]>([]);
  const [productFilterIds, setProductFilterIds] = useState<string[]>([]);
  const [serviceFilterIds, setServiceFilterIds] = useState<string[]>([]);
  const [clientOptions,    setClientOptions]    = useState<FilterOption[]>([]);
  const [productOptions,   setProductOptions]   = useState<FilterOption[]>([]);
  const [serviceOptions,   setServiceOptions]   = useState<FilterOption[]>([]);
  const [rows,             setRows]             = useState<ConsumableRow[]>([]);
  const [total,            setTotal]            = useState(0);
  const [loading,          setLoading]          = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Real server-side pagination for the row list.
  const fetchData = useCallback(async () => {
    if (dateTo && dateFrom && dateTo < dateFrom) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const body: Record<string, any> = {
        from: dateFrom, to: dateTo,
        page: currentPage, limit: pageSize,
      };
      if (clientFilterIds.length > 0) body.client_ids = clientFilterIds;
      if (productFilterIds.length > 0) body.product_ids = productFilterIds;
      if (serviceFilterIds.length > 0) body.service_ids = serviceFilterIds;
      const res = await api.post(CONSUMABLE_ANALYTICS_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const avail = data?.filters_available ?? {};
      if (Array.isArray(avail.clients)) setClientOptions(avail.clients);
      if (Array.isArray(avail.products)) setProductOptions(avail.products);
      if (Array.isArray(avail.services)) setServiceOptions(avail.services);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, clientFilterIds, productFilterIds, serviceFilterIds, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, clientFilterIds, productFilterIds, serviceFilterIds]);

  // Search filters the currently-loaded page client-side (client/product/
  // service name) — the heavier filtering (date range, exact client/product/
  // service selection) is server-side via the Filters menu above.
  const visibleRows = useMemo(() => {
    if (!debouncedSearch) return rows;
    const q = debouncedSearch.toLowerCase();
    return rows.filter(r =>
      r.clientName.toLowerCase().includes(q) ||
      r.productName.toLowerCase().includes(q) ||
      r.serviceName.toLowerCase().includes(q)
    );
  }, [rows, debouncedSearch]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "client", label: "Client", options: clientOptions, searchable: true },
    { key: "product", label: "Consumable Product", options: productOptions, searchable: true },
    { key: "service", label: "Service", options: serviceOptions, searchable: true },
  ], [clientOptions, productOptions, serviceOptions]);

  const filterMenuSelected = useMemo(() => ({
    client: clientFilterIds,
    product: productFilterIds,
    service: serviceFilterIds,
  }), [clientFilterIds, productFilterIds, serviceFilterIds]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setClientFilterIds(next.client ?? []);
    setProductFilterIds(next.product ?? []);
    setServiceFilterIds(next.service ?? []);
  };

  const HEADERS = ["Client Name", "Consumable Product", "Quantity Used", "Service Name", "Usage Date"];
  const exportRows = () => visibleRows.map(r => [
    r.clientName, r.productName, `${r.qty}${r.unit ? ` ${r.unit}` : ""}`, r.serviceName, formatDate(r.usageDate),
  ]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={category} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <ReportExportButton
              title={REPORT_NAME}
              headers={HEADERS}
              rows={exportRows}
              reportId="consumable_analytics"
              filename={`consumable-analytics-${dateFrom || "all"}-${dateTo || "all"}`}
              variant="button"
              csv
              filterLines={[
                ...(dateRange.startDate || dateRange.endDate ? [`Date: ${dateRange.startDate || "…"} to ${dateRange.endDate || "…"}`] : []),
                ...(clientFilterIds.length ? [`Client: ${clientOptions.filter(o => clientFilterIds.includes(o.id)).map(o => o.label).join(", ")}`] : []),
                ...(productFilterIds.length ? [`Consumable Product: ${productOptions.filter(o => productFilterIds.includes(o.id)).map(o => o.label).join(", ")}`] : []),
                ...(serviceFilterIds.length ? [`Service: ${serviceOptions.filter(o => serviceFilterIds.includes(o.id)).map(o => o.label).join(", ")}`] : []),
                ...(debouncedSearch ? [`Search: "${debouncedSearch}"`] : []),
              ]}
            />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {!loading && (
        <div className="rp-detail-drag-hint">
          {total} consumable usage record{total !== 1 ? "s" : ""} found
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input
            type="text"
            className="rp-detail-search-input"
            placeholder="Search client, product or service name"
            value={search}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Client Name</th><th>Consumable Product</th><th>Quantity Used</th><th>Service Name</th><th>Usage Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={5} />
            ) : visibleRows.length === 0 ? (
              <tr><td colSpan={5} className="rp-detail-empty-cell">No consumable usage found</td></tr>
            ) : visibleRows.map((r) => (
              <tr key={r.id}>
                <td className="fw-semibold">{r.clientName}</td>
                <td>{r.productName}</td>
                <td>{r.qty}{r.unit ? ` ${r.unit}` : ""}</td>
                <td>{r.serviceName}</td>
                <td>{formatDate(r.usageDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />
    </div>
  );
}
