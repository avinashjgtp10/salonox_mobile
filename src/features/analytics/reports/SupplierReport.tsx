import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { INVENTORY } from "../../../services/api/endpoints/inventory.endpoints";
import type { Supplier } from "../../../types/inventory.types";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, JiraFilterMenu } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui/JiraFilterMenu";
import ReportExportButton from "../../../components/ui/ReportExportButton";

const REPORT_NAME = "Supplier Report";

interface SupplierRow {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  createdAt: string;
}

export default function SupplierReport({ onBack, category: reportCategory, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const [search, setSearch] = useState("");
  const [allRows, setAllRows] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [cityFilter, setCityFilter] = useState<string[]>([]);
  const [countryFilter, setCountryFilter] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const res = await api.get(INVENTORY.SUPPLIERS, { signal: ctrl.signal });
      const list: Supplier[] = res.data?.data ?? [];
      const rows: SupplierRow[] = list.map((s) => ({
        id: s.id,
        name: s.name,
        contactPerson: [s.first_name, s.last_name].filter(Boolean).join(" ") || "—",
        email: s.email || "—",
        phone: s.mobile_number || s.telephone_number || "—",
        city: s.city || "—",
        country: s.country || "—",
        createdAt: s.created_at,
      }));
      setAllRows(rows);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setAllRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const rows = useMemo(() => {
    let r = allRows;
    if (cityFilter.length) r = r.filter(x => cityFilter.includes(x.city));
    if (countryFilter.length) r = r.filter(x => countryFilter.includes(x.country));
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(x =>
        x.name.toLowerCase().includes(q) ||
        x.contactPerson.toLowerCase().includes(q) ||
        x.email.toLowerCase().includes(q),
      );
    }
    return r;
  }, [allRows, cityFilter, countryFilter, search]);

  useEffect(() => { setCurrentPage(1); }, [rows]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "city", label: "City", options: [...new Set(allRows.map(r => r.city))].filter(c => c !== "—").sort().map(c => ({ id: c, label: c })), searchable: true },
    { key: "country", label: "Country", options: [...new Set(allRows.map(r => r.country))].filter(c => c !== "—").sort().map(c => ({ id: c, label: c })), searchable: true },
  ], [allRows]);

  const filterSelected = useMemo(() => ({ city: cityFilter, country: countryFilter }), [cityFilter, countryFilter]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setCityFilter(next.city ?? []);
    setCountryFilter(next.country ?? []);
  };

  const uniqueCountries = new Set(rows.map(r => r.country).filter(c => c !== "—")).size;

  const HEADERS = ["Supplier Name", "Contact Person", "Email", "Phone", "City", "Country"];
  const exportRows = () => rows.map(r => [r.name, r.contactPerson, r.email, r.phone, r.city, r.country]);
  const paged = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={reportCategory} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename="supplier-report" variant="button" csv reportId="supplier_report" />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <JiraFilterMenu fields={filterFields} selected={filterSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={2} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{rows.length}</div><div className="rp-sra-summary-label">Total Suppliers</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{uniqueCountries}</div><div className="rp-sra-summary-label">Countries</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Supplier name, contact or email" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr><th>Supplier Name</th><th>Contact Person</th><th>Email</th><th>Phone</th><th>City</th><th>Country</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={6} />
            ) : paged.length === 0 ? (
              <tr><td colSpan={6} className="rp-detail-empty-cell">No suppliers found</td></tr>
            ) : paged.map(r => (
              <tr key={r.id}>
                <td className="fw-semibold">{r.name}</td>
                <td>{r.contactPerson}</td>
                <td>{r.email}</td>
                <td>{r.phone}</td>
                <td>{r.city}</td>
                <td>{r.country}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={rows.length}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />
    </div>
  );
}
