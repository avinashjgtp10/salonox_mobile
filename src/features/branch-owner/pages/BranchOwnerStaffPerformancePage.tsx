import { useEffect, useMemo, useState } from "react";
import { PersonBadge, CurrencyRupee, GraphUpArrow, PeopleFill } from "react-bootstrap-icons";
import { useAppSelector } from "../../../hooks/useAppRedux";
import api from "../../../services/api/axios";
import { BRANCH_OWNER } from "../../../services/api/endpoints/branchOwner.endpoints";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import Dropdown from "../../../components/ui/Dropdown";
import { DateRangeFilter, JiraFilterMenu, getDateRangePresetValue, SummaryCardRow, Table, Modal, Button } from "../../../components/ui";
import type { DateRangeFilterValue, JiraFilterField, SummaryCardItem } from "../../../components/ui";
import {
  SectionCard, BoEmptyState, Shimmer, BoSearchInput,
  usePagination, BoPagination,
} from "../components/BranchOwnerUI";

interface StaffPerformanceRow {
  staffId: string; name: string; role: string;
  salonId: string; salonName: string;
  revenue: number; commissionEarned: number; pendingPayout: number; paidOut: number; transactionCount: number;
}

const fmtMoney = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : `₹${Math.round(n).toLocaleString("en-IN")}`);
const fmtMoneyFull = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

// DateRangeFilter presets map onto the backend's coarser period buckets —
// "yesterday"/"this_quarter" both fall back to "monthly" server-side since
// getStaffRevenue only understands today/weekly/monthly/yearly, but the
// client-side date-range filter below still narrows the exact days shown.
function presetToApiPeriod(preset: DateRangeFilterValue["preset"]): string {
  if (preset === "today" || preset === "yesterday") return "today";
  if (preset === "this_week") return "weekly";
  if (preset === "this_year") return "yearly";
  return "monthly";
}

function StaffDetailDrawer({ row, onClose }: { row: StaffPerformanceRow; onClose: () => void }) {
  const avgPerTxn = row.transactionCount > 0 ? row.revenue / row.transactionCount : 0;
  return (
    <Modal show title={row.name} onClose={onClose} size="sm">
      <div style={{ fontSize: 12.5, color: "#94a3b8", marginTop: -8, marginBottom: 18 }}>{row.role} · {row.salonName}</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
        <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Revenue</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginTop: 3 }}>{fmtMoney(row.revenue)}</div>
        </div>
        <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Commission</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginTop: 3 }}>{fmtMoney(row.commissionEarned)}</div>
        </div>
        <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Transactions</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginTop: 3 }}>{row.transactionCount}</div>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
        <tbody>
          <tr style={{ borderTop: "1px solid #f1f5f9" }}>
            <td style={{ padding: "9px 0", color: "#64748b" }}>Average / transaction</td>
            <td style={{ padding: "9px 0", color: "#0f172a", fontWeight: 600, textAlign: "right" }}>{fmtMoneyFull(avgPerTxn)}</td>
          </tr>
          <tr style={{ borderTop: "1px solid #f1f5f9" }}>
            <td style={{ padding: "9px 0", color: "#64748b" }}>Paid out</td>
            <td style={{ padding: "9px 0", color: "#0f172a", fontWeight: 600, textAlign: "right" }}>{fmtMoneyFull(row.paidOut)}</td>
          </tr>
          <tr style={{ borderTop: "1px solid #f1f5f9" }}>
            <td style={{ padding: "9px 0", color: "#64748b" }}>Pending payout</td>
            <td style={{ padding: "9px 0", color: row.pendingPayout > 0 ? "#d97706" : "#0f172a", fontWeight: 600, textAlign: "right" }}>{fmtMoneyFull(row.pendingPayout)}</td>
          </tr>
        </tbody>
      </table>
    </Modal>
  );
}

const SORT_OPTIONS = [
  { id: "revenue", name: "Sort: Revenue" },
  { id: "commission", name: "Sort: Commission" },
  { id: "transactions", name: "Sort: Transactions" },
];

export default function BranchOwnerStaffPerformancePage() {
  const salons = useAppSelector((s) => s.branchOwner.salons);

  const [rows, setRows] = useState<StaffPerformanceRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "this_month", ...getDateRangePresetValue("this_month") });
  const [salonFilter, setSalonFilter] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("revenue");
  const [selectedRow, setSelectedRow] = useState<StaffPerformanceRow | null>(null);

  const apiPeriod = presetToApiPeriod(dateRange.preset);

  useEffect(() => {
    setLoaded(false);
    api.post(BRANCH_OWNER.STAFF_PERFORMANCE_LIST, { period: apiPeriod })
      .then((r) => setRows(r.data?.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoaded(true));
  }, [apiPeriod]);

  const salonOptions = useMemo(() => salons.map((s) => ({ id: s.id, label: s.name })), [salons]);
  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "salon", label: "Salon", options: salonOptions, searchable: true },
  ], [salonOptions]);
  const filterMenuSelected = useMemo(() => ({ salon: salonFilter }), [salonFilter]);
  const handleFiltersApply = (next: Record<string, string[]>) => setSalonFilter(next.salon ?? []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sortKey: Record<string, keyof StaffPerformanceRow> = { revenue: "revenue", commission: "commissionEarned", transactions: "transactionCount" };
    return rows
      .filter((r) => salonFilter.length === 0 || salonFilter.includes(r.salonId))
      .filter((r) => !q || r.name.toLowerCase().includes(q) || r.salonName.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => (b[sortKey[sortBy]] as number) - (a[sortKey[sortBy]] as number));
  }, [rows, salonFilter, search, sortBy]);

  const totalRevenue = visible.reduce((sum, r) => sum + r.revenue, 0);
  const totalCommission = visible.reduce((sum, r) => sum + r.commissionEarned, 0);
  const uniqueStaff = useMemo(() => new Set(visible.map((r) => r.staffId)).size, [visible]);
  const uniqueSalons = useMemo(() => new Set(visible.map((r) => r.salonId)).size, [visible]);

  const page = usePagination(visible, 10);

  const dateRangeLabel = dateRange.startDate && dateRange.endDate
    ? `${dateRange.startDate} to ${dateRange.endDate}`
    : "All time";
  const EXPORT_HEADERS = ["Staff", "Salon", "Role", "Transactions", "Revenue", "Commission Earned", "Avg / Transaction", "Pending"];
  const exportRows = () => visible.map((r) => [
    r.name, r.salonName, r.role, r.transactionCount, r.revenue, r.commissionEarned,
    r.transactionCount > 0 ? Math.round(r.revenue / r.transactionCount) : 0, r.pendingPayout,
  ]);
  const exportFilterLines = [
    ...(salonFilter.length ? [`Salon: ${salonOptions.filter((o) => salonFilter.includes(o.id)).map((o) => o.label).join(", ")}`] : []),
    ...(search.trim() ? [`Search: "${search.trim()}"`] : []),
  ];

  if (salons.length === 0) {
    return (
      <div style={{ padding: 28, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a" }}>Staff Performance Across Branches</h1>
        <SectionCard title="">
          <BoEmptyState icon={<PersonBadge size={30} />} text="No salons assigned yet." />
        </SectionCard>
      </div>
    );
  }

  return (
    <div style={{ padding: "26px 28px 44px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", maxWidth: 1280 }}>
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Staff Performance Across Branches</h1>
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>Revenue and commission earned, rolled up per staff member across every salon</p>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <ReportExportButton
          title="Staff Performance Across Branches"
          headers={EXPORT_HEADERS}
          rows={exportRows}
          filename={`staff-performance-${apiPeriod}`}
          variant="button"
          csv
          disabled={!loaded || visible.length === 0}
          dateRangeLabel={dateRangeLabel}
          filterLines={exportFilterLines}
          summaryLines={[
            `Revenue Generated: ${fmtMoney(totalRevenue)}`,
            `Commission Earned: ${fmtMoney(totalCommission)}`,
            `Staff Rows: ${uniqueStaff} across ${uniqueSalons} salon${uniqueSalons !== 1 ? "s" : ""}`,
          ]}
        />
      </div>

      {/* KPIs — same shared SummaryCardRow the Reports pages' cards are
          built on (components/ui/SummaryCardRow.tsx + .scss), not a
          page-local copy. */}
      {!loaded ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          {[...Array(3)].map((_, i) => <div key={i} style={{ flex: "1 1 160px", maxWidth: 220 }}><Shimmer h={72} /></div>)}
        </div>
      ) : (
        <SummaryCardRow
          items={[
            { key: "staff", icon: <PeopleFill size={18} />, value: uniqueStaff, label: "Staff Rows", sub: `across ${uniqueSalons} salon${uniqueSalons !== 1 ? "s" : ""}` },
            { key: "revenue", icon: <CurrencyRupee size={18} />, value: fmtMoney(totalRevenue), label: "Revenue Generated" },
            { key: "commission", icon: <GraphUpArrow size={18} />, value: fmtMoney(totalCommission), label: "Commission Earned" },
          ] as SummaryCardItem[]}
        />
      )}

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <div style={{ width: 190 }}>
          <Dropdown value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} searchable={false} style={{ padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, background: "#fff" }} />
        </div>
        <BoSearchInput value={search} onChange={setSearch} placeholder="Search staff or salon" maxWidth={300} />
      </div>

      <SectionCard title="Staff Performance" noPadding>
        {!loaded ? <div style={{ padding: 20 }}><Shimmer h={200} /></div> : (
          <>
            <Table<StaffPerformanceRow>
              data={page.pageItems}
              emptyMessage={rows.length === 0 ? "No staff activity for this date range yet." : "No staff match the current filters."}
              columns={[
                { header: "Staff", key: "name", render: (r) => <span className="fw-bold text-dark">{r.name}</span> },
                { header: "Salon", key: "salonName", className: "text-secondary" },
                { header: "Role", key: "role", className: "text-muted" },
                { header: "Transactions", key: "transactionCount", className: "text-secondary" },
                { header: "Revenue", key: "revenue", render: (r) => <span className="fw-semibold text-dark">{fmtMoney(r.revenue)}</span> },
                { header: "Commission Earned", key: "commissionEarned", className: "text-secondary", render: (r) => fmtMoney(r.commissionEarned) },
                { header: "Avg / Transaction", key: "avg", className: "text-secondary", render: (r) => fmtMoneyFull(r.transactionCount > 0 ? r.revenue / r.transactionCount : 0) },
                { header: "Pending", key: "pendingPayout", render: (r) => <span className="fw-semibold" style={{ color: r.pendingPayout > 0 ? "#d97706" : "#94a3b8" }}>{fmtMoney(r.pendingPayout)}</span> },
                { header: "", key: "action", render: (r) => <Button size="sm" variant="outline-secondary" onClick={() => setSelectedRow(r)}>View</Button> },
              ]}
            />
            <BoPagination {...page} />
          </>
        )}
      </SectionCard>

      {selectedRow && <StaffDetailDrawer row={selectedRow} onClose={() => setSelectedRow(null)} />}
    </div>
  );
}
