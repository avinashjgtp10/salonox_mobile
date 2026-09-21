import { useEffect, useMemo, useState } from "react";
import { CashCoin, CheckCircle, ClockHistory, ExclamationTriangle, CalendarDay, PersonFill, Telephone, Building, Receipt, CalendarEvent } from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchBranchOwnerPaymentsThunk } from "../../../middleware/branchOwner/branchOwner.thunk";
import { DateRangeFilter, JiraFilterMenu, getDateRangePresetValue, Modal } from "../../../components/ui";
import type { DateRangeFilterValue, JiraFilterField } from "../../../components/ui";
import type { BranchOwnerPayment } from "../../../store/branchOwnerSlice";
import { StatTile, SoftBadge, BoSearchInput, usePagination, BoPagination, BoTable } from "../components/BranchOwnerUI";

const STATUS_OPTIONS = [
  { id: "paid", label: "Paid" },
  { id: "pending", label: "Pending" },
  { id: "partial", label: "Partial" },
];

// Real DB statuses ('completed'/'partial'/'pending'/'failed'/'refunded') are
// mapped to these three business-facing buckets everywhere on this page —
// "failed" is a payment-gateway concept the salon flow never actually sets,
// so it's deliberately excluded rather than shown as its own bucket.
const STATUS_DISPLAY: Record<string, { label: string; variant: "success" | "warning" | "info" | "secondary" }> = {
  completed: { label: "Paid", variant: "success" },
  paid: { label: "Paid", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  partial: { label: "Partial", variant: "info" },
  failed: { label: "Partial", variant: "info" },
  refunded: { label: "Refunded", variant: "secondary" },
};

function paymentBucket(status: string): "paid" | "pending" | "partial" | null {
  if (status === "completed" || status === "paid") return "paid";
  if (status === "pending") return "pending";
  if (status === "partial" || status === "failed") return "partial";
  return null;
}

// The business runs on IST regardless of the viewer's browser timezone, and
// the backend already buckets "today"/"yesterday" the same way (see
// reports.repository.ts) — bucketing here in the viewer's local time instead
// would make a late-night payment land under the wrong day.
const toISTDateString = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const todayIST = () => toISTDateString(new Date().toISOString());

function PaymentStatusBadge({ status }: { status: string }) {
  const d = STATUS_DISPLAY[status] ?? { label: status, variant: "secondary" as const };
  return <SoftBadge variant={d.variant}>{d.label}</SoftBadge>;
}

// Shown when a payment row is clicked — same fields already in the table,
// plus the client name/phone the table has no room for, laid out as a
// single-payment detail card instead of scanning across a row.
function PaymentDetailModal({ payment, onClose }: { payment: BranchOwnerPayment; onClose: () => void }) {
  const fmt = (n: any) => n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "—";
  return (
    <Modal show title={payment.client_name || "Walk-in Client"} onClose={onClose} size="md">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <PaymentStatusBadge status={payment.status} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "#374151" }}>
          <PersonFill size={13} color="#9ca3af" />
          <span>{payment.client_name || "Walk-in Client"}</span>
        </div>
        {payment.client_phone && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "#374151" }}>
            <Telephone size={13} color="#9ca3af" />
            <span>{payment.client_phone}</span>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "#374151" }}>
          <Building size={13} color="#9ca3af" />
          <span>{payment.salon_name}</span>
        </div>
        {payment.invoice_number && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "#374151" }}>
            <Receipt size={13} color="#9ca3af" />
            <span>Invoice #{payment.invoice_number}</span>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "#374151" }}>
          <CalendarEvent size={13} color="#9ca3af" />
          <span>{payment.payment_date || payment.created_at ? new Date(payment.payment_date || payment.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "—"}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        <StatTile icon={<CashCoin size={16} />} label="Payment Received" value={fmt(payment.amount)} />
        <StatTile icon={<CheckCircle size={16} />} label="Payment Method" value={payment.payment_method || "—"} />
      </div>
    </Modal>
  );
}

export default function BranchOwnerPaymentsPage() {
  const dispatch = useAppDispatch();
  const { payments, loading } = useAppSelector((s) => s.branchOwner);

  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "all_time", ...getDateRangePresetValue("all_time") });
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [methodFilter, setMethodFilter] = useState<string[]>([]);
  const [salonFilter, setSalonFilter] = useState<string[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<BranchOwnerPayment | null>(null);
  const [search, setSearch] = useState("");

  // Status filtering happens entirely client-side below (see filteredPayments)
  // since the UI's "paid"/"pending"/"partial" ids don't match the DB's raw
  // status values 1:1 (paid -> completed; partial also covers the unused
  // "failed") and the filter supports multi-select, which the old
  // single-status query param never did. So the full list is fetched once.
  useEffect(() => {
    dispatch(fetchBranchOwnerPaymentsThunk(undefined));
  }, [dispatch]);

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
      const dateKey = p.payment_date || p.created_at;
      const istDate = dateKey ? toISTDateString(dateKey) : null;
      if (startDate && (!istDate || istDate < startDate)) return false;
      if (endDate && (!istDate || istDate > endDate)) return false;
      if (methodFilter.length && !methodFilter.includes(p.payment_method)) return false;
      if (salonFilter.length && !salonFilter.includes(p.salon_id || p.salon_name)) return false;
      if (statusFilter.length && !statusFilter.includes(paymentBucket(p.status) ?? "")) return false;
      if (q) {
        const haystack = `${p.salon_name} ${p.invoice_number ?? ""} ${p.client_name ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [payments, startDate, endDate, methodFilter, salonFilter, statusFilter, search]);

  const total = filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const kpis = useMemo(() => {
    const today = todayIST();
    let paidCount = 0, pendingCount = 0, partialCount = 0;
    let todaysCount = 0, todaysTotal = 0;
    for (const p of filteredPayments) {
      const bucket = paymentBucket(p.status);
      if (bucket === "paid") paidCount++;
      else if (bucket === "pending") pendingCount++;
      else if (bucket === "partial") partialCount++;
    }
    // Today's Payments is a fixed "as of right now" figure, deliberately
    // read off the full unfiltered list rather than filteredPayments — it
    // must keep showing today's total even while a Yesterday/custom date
    // filter is active, and a payment made yesterday must never count here.
    for (const p of payments) {
      const dateKey = p.payment_date || p.created_at;
      if (dateKey && toISTDateString(dateKey) === today) {
        todaysCount++;
        todaysTotal += Number(p.amount) || 0;
      }
    }
    return { count: filteredPayments.length, total, paidCount, pendingCount, partialCount, todaysCount, todaysTotal };
  }, [filteredPayments, payments, total]);

  const paymentsPage = usePagination(filteredPayments, 10);

  return (
    <div style={{ padding: "28px 28px 40px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Payments</h1>
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>{filteredPayments.length} payment{filteredPayments.length !== 1 ? "s" : ""} · {fmt(total)} total</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        <StatTile icon={<CashCoin size={16} />} label="Total Amount" value={loading.payments ? "—" : fmt(kpis.total)} />
        <StatTile icon={<Receipt size={16} />} label="Total Payments" value={loading.payments ? "—" : kpis.count} />
        <StatTile icon={<CheckCircle size={16} />} label="Paid" value={loading.payments ? "—" : kpis.paidCount} />
        <StatTile icon={<ClockHistory size={16} />} label="Pending" value={loading.payments ? "—" : kpis.pendingCount} />
        <StatTile icon={<ExclamationTriangle size={16} />} label="Partial" value={loading.payments ? "—" : kpis.partialCount} />
        <StatTile icon={<CalendarDay size={16} />} label="Today's Payments" value={loading.payments ? "—" : fmt(kpis.todaysTotal)} sub={loading.payments ? undefined : `${kpis.todaysCount} payment${kpis.todaysCount !== 1 ? "s" : ""}`} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <BoSearchInput value={search} onChange={setSearch} placeholder="Search client, salon or invoice no." />
      </div>

      <BoTable<BranchOwnerPayment>
        loading={loading.payments}
        data={paymentsPage.pageItems}
        emptyMessage="No payments found"
        onRowClick={(p) => setSelectedPayment(p)}
        columns={[
          { header: "Client", key: "client_name", render: (p) => <span style={{ color: "#0f172a", fontWeight: 700 }}>{p.client_name || "Walk-in Client"}</span> },
          { header: "Salon Name", key: "salon_name", render: (p) => <span style={{ color: "#64748b" }}>{p.salon_name}</span> },
          { header: "Invoice Number", key: "invoice_number", render: (p) => p.invoice_number || "—" },
          { header: "Payment Received", key: "amount", render: (p) => <span style={{ color: "#16a34a", fontWeight: 700 }}>{fmt(p.amount)}</span> },
          { header: "Payment Method", key: "payment_method", render: (p) => <span style={{ textTransform: "capitalize" }}>{p.payment_method || "—"}</span> },
          { header: "Payment Status", key: "status", render: (p) => <PaymentStatusBadge status={p.status} /> },
          { header: "Payment Date", key: "created_at", render: (p) => {
            const d = p.payment_date || p.created_at;
            return d ? new Date(d).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) : "—";
          } },
        ]}
      />
      <BoPagination {...paymentsPage} />

      {selectedPayment && (
        <PaymentDetailModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} />
      )}
    </div>
  );
}
