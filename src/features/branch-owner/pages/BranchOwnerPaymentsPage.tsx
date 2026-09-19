import { useEffect, useMemo, useState } from "react";
import { CashCoin, CheckCircle, ClockHistory, XCircle } from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchBranchOwnerPaymentsThunk } from "../../../middleware/branchOwner/branchOwner.thunk";
import { DateRangeFilter, JiraFilterMenu, getDateRangePresetValue, Table, Card } from "../../../components/ui";
import type { DateRangeFilterValue, JiraFilterField } from "../../../components/ui";
import type { BranchOwnerPayment } from "../../../store/branchOwnerSlice";
import { StatTile, StatusBadge, Shimmer, BoSearchInput, usePagination, BoPagination } from "../components/BranchOwnerUI";

const STATUS_OPTIONS = [
  { id: "paid", label: "Paid" },
  { id: "pending", label: "Pending" },
  { id: "failed", label: "Failed" },
];

export default function BranchOwnerPaymentsPage() {
  const dispatch = useAppDispatch();
  const { payments, loading } = useAppSelector((s) => s.branchOwner);

  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "all_time", ...getDateRangePresetValue("all_time") });
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [methodFilter, setMethodFilter] = useState<string[]>([]);
  const [salonFilter, setSalonFilter] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    dispatch(fetchBranchOwnerPaymentsThunk(statusFilter.length === 1 ? statusFilter[0] : undefined));
  }, [dispatch, statusFilter]);

  const fmt = (n: any) => n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "—";

  const methodOptions = useMemo(() => {
    const seen = new Map<string, string>();
    payments.forEach((p) => {
      if (p.payment_method && !seen.has(p.payment_method)) seen.set(p.payment_method, p.payment_method);
    });
    return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
  }, [payments]);

  // Keyed by salon_id when present, falling back to the salon name itself —
  // a handful of payment rows can lack salon_id (see BranchOwnerPayment's
  // optional field), and without this fallback those salons would have no
  // way to appear in the filter at all.
  const salonOptions = useMemo(() => {
    const seen = new Map<string, string>();
    payments.forEach((p) => {
      const key = p.salon_id || p.salon_name;
      if (key && !seen.has(key)) seen.set(key, p.salon_name);
    });
    return Array.from(seen.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [payments]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "salon", label: "Salon Name", options: salonOptions, searchable: true },
    { key: "status", label: "Payment Status", options: STATUS_OPTIONS },
    { key: "method", label: "Payment Method", options: methodOptions, searchable: true },
  ], [salonOptions, methodOptions]);

  const filterMenuSelected = useMemo(() => ({ status: statusFilter, method: methodFilter, salon: salonFilter }), [statusFilter, methodFilter, salonFilter]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setStatusFilter(next.status ?? []);
    setMethodFilter(next.method ?? []);
    setSalonFilter(next.salon ?? []);
  };

  const { startDate, endDate } = dateRange;

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((p) => {
      if (startDate && (!p.created_at || p.created_at.slice(0, 10) < startDate)) return false;
      if (endDate && (!p.created_at || p.created_at.slice(0, 10) > endDate)) return false;
      if (methodFilter.length && !methodFilter.includes(p.payment_method)) return false;
      if (salonFilter.length && !salonFilter.includes(p.salon_id || p.salon_name)) return false;
      if (q) {
        const haystack = `${p.salon_name} ${p.invoice_number ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [payments, startDate, endDate, methodFilter, salonFilter, search]);

  const total = filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const kpis = useMemo(() => {
    const paidCount = filteredPayments.filter((p) => p.status === "paid" || p.status === "completed").length;
    const pendingCount = filteredPayments.filter((p) => p.status === "pending" || p.status === "partial").length;
    const failedCount = filteredPayments.filter((p) => p.status === "failed").length;
    return { count: filteredPayments.length, total, paidCount, pendingCount, failedCount };
  }, [filteredPayments, total]);

  const paymentsPage = usePagination(filteredPayments, 10);

  return (
    <div style={{ padding: "28px 28px 40px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Payments</h1>
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>{filteredPayments.length} payment{filteredPayments.length !== 1 ? "s" : ""} · {fmt(total)} total</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        {loading.payments ? [...Array(4)].map((_, i) => <Shimmer key={i} h={72} />) : (<>
          <StatTile icon={<CashCoin size={16} />} label="Total Amount" value={fmt(kpis.total)} variantIndex={0} sub={`${kpis.count} payment${kpis.count !== 1 ? "s" : ""}`} />
          <StatTile icon={<CheckCircle size={16} />} label="Paid" value={kpis.paidCount} variantIndex={1} />
          <StatTile icon={<ClockHistory size={16} />} label="Pending" value={kpis.pendingCount} variantIndex={2} />
          <StatTile icon={<XCircle size={16} />} label="Failed" value={kpis.failedCount} variantIndex={3} />
        </>)}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <BoSearchInput value={search} onChange={setSearch} placeholder="Search salon or invoice no." />
      </div>

      <Card noPadding shadow="sm">
        <Table<BranchOwnerPayment>
          loading={loading.payments}
          data={paymentsPage.pageItems}
          emptyMessage="No payments found"
          columns={[
            { header: "Salon Name", key: "salon_name", render: (p) => <span className="fw-bold text-dark">{p.salon_name}</span> },
            { header: "Invoice Number", key: "invoice_number", render: (p) => p.invoice_number || "—" },
            { header: "Payment Received", key: "amount", render: (p) => <span className="fw-bold" style={{ color: "#16a34a" }}>{fmt(p.amount)}</span> },
            { header: "Payment Method", key: "payment_method", className: "text-capitalize", render: (p) => p.payment_method || "—" },
            { header: "Payment Status", key: "status", render: (p) => <StatusBadge status={p.status} /> },
            { header: "Payment Date", key: "created_at", render: (p) => p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN") : "—" },
          ]}
        />
        <BoPagination {...paymentsPage} />
      </Card>
    </div>
  );
}
