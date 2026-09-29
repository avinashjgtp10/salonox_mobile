import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { People, Wallet2, DashCircle, CashStack, CheckCircle, ClockHistory, Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { PAYROLL } from "../../../services/api/endpoints";
import { useCurrency } from "../../../hooks/useCurrency";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { usePermissions } from "../../../hooks/usePermissions";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import DateRangeFilter, { type DateRangeFilterValue, getDateRangePresetValue } from "../../../components/ui/DateRangeFilter";
import { Pagination } from "../../../components/ui/Pagination";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import { SkeletonStatCards, SkeletonTableRows } from "../../analytics/reports/ReportSkeleton";
import "../styles/PayrollPage.scss";

type PayrollStatus = "draft" | "pending" | "paid";
type AdjustField = "commission" | "bonus" | "tips" | "deduction" | "other_earning" | "salary";

interface CommissionByCategory {
  services: number; products: number; memberships: number; packages: number; other: number;
}

interface PayrollAdjustment {
  id: string;
  field: AdjustField;
  original_value: number;
  adjusted_value: number;
  reason: string;
  created_at: string;
}

interface StaffPayrollSummary {
  staff_id: string;
  staff_first_name: string;
  staff_last_name: string | null;
  staff_email: string;
  staff_calendar_color: string | null;
  staff_designation: string | null;
  base_salary: number;
  commission_by_category: CommissionByCategory;
  commission_total: number;
  tips_total: number;
  bonus: number;
  deductions: number;
  other_earning: number;
  salary_advance: number;
  net_salary: number;
  status: PayrollStatus;
  payment_method: string | null;
  payment_date: string | null;
  payroll_entry_id: string | null;
  adjustments: PayrollAdjustment[];
}

const STATUS_LABEL: Record<PayrollStatus, string> = { draft: "Not Started", pending: "In Progress", paid: "Paid" };

const STATUS_FILTER_OPTIONS: { value: "all" | PayrollStatus; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "In Progress" },
  { value: "draft", label: "Not Started" },
];

export default function PayrollPage() {
  const { formatAmount } = useCurrency();
  const { overlay, showSuccess, showError } = useStatusOverlay();
  const { can } = usePermissions();

  const navigate = useNavigate();
  const [rows, setRows] = useState<StaffPayrollSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<StaffPayrollSummary | null>(null);
  const [payingStaff, setPayingStaff] = useState<StaffPayrollSummary | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PayrollStatus>("all");
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>(() => ({
    preset: "this_month",
    ...getDateRangePresetValue("this_month"),
  }));

  const periodStart = dateRange.startDate;
  const periodEnd = dateRange.endDate;

  // Single fetch for the whole table — no per-staff waterfalls (the prior
  // version's 13+ redundant calls, dropped per the rebuild plan).
  const loadSummary = async () => {
    if (!periodStart || !periodEnd) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ period_start: periodStart, period_end: periodEnd }).toString();
      const res = await api.get(PAYROLL.STAFF_SUMMARY(params));
      setRows(res.data?.data?.items ?? []);
    } catch (err: any) {
      showError(err?.response?.data?.error?.message || "Failed to load payroll data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodStart, periodEnd]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, periodStart, periodEnd]);

  // Search/status only narrow what the TABLE shows — the KPI cards above
  // stay computed off the whole month (summaryStats, below) so they always
  // answer "how's this month doing overall," not "how's my current filter."
  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesSearch = !term || `${r.staff_first_name} ${r.staff_last_name ?? ""}`.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [rows, search, statusFilter]);

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const summaryStats = useMemo(() => {
    const grossPayroll = rows.reduce(
      (sum, r) => sum + r.base_salary + r.commission_total + r.tips_total + r.bonus + r.other_earning,
      0
    );
    const totalDeductions = rows.reduce((sum, r) => sum + r.deductions + r.salary_advance, 0);
    const totalNet = rows.reduce((sum, r) => sum + r.net_salary, 0);
    const totalPaid = rows.filter((r) => r.status === "paid").reduce((sum, r) => sum + r.net_salary, 0);
    const totalPending = totalNet - totalPaid;
    const paidCount = rows.filter((r) => r.status === "paid").length;
    return { grossPayroll, totalDeductions, totalNet, totalPaid, totalPending, paidCount, staffCount: rows.length };
  }, [rows]);

  const refreshAfterChange = async () => {
    await loadSummary();
  };

  const EXPORT_HEADERS = ["Staff Name", "Basic Salary", "Commission", "Tips", "Deductions", "Net Salary", "Payroll Status", "Payment Date"];
  // Exports whatever the table is currently showing (respects the search/
  // status filter), not the whole unfiltered period — matches what the
  // manager sees on screen at the moment they click Export.
  const exportRows = () => filteredRows.map((r) => [
    `${r.staff_first_name} ${r.staff_last_name ?? ""}`.trim(),
    r.base_salary, r.commission_total, r.tips_total, r.deductions, r.net_salary,
    STATUS_LABEL[r.status],
    r.payment_date ? new Date(r.payment_date).toLocaleDateString("en-IN") : "",
  ]);

  const [paying, setPaying] = useState(false);

  const handlePay = async (paymentMethod: string, paymentReference?: string) => {
    if (!payingStaff) return;
    setPaying(true);
    try {
      const res = await api.post(PAYROLL.PAY(payingStaff.staff_id), {
        period_start: periodStart,
        period_end: periodEnd,
        payment_method: paymentMethod,
        payment_reference: paymentReference,
      });
      const updated: StaffPayrollSummary = res.data?.data?.summary;
      const receiptSent: boolean = res.data?.data?.receiptSent;
      setSelectedStaff((prev) => (prev && prev.staff_id === updated.staff_id ? updated : prev));
      showSuccess(
        receiptSent
          ? "Salary paid successfully — receipt emailed."
          : "Salary paid successfully, but the receipt email failed to send."
      );
      setPayingStaff(null);
      await refreshAfterChange();
    } catch (err: any) {
      showError(err?.response?.data?.error?.message || "Failed to process payment");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="rp-detail-view pr-page">
      {overlay}
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <div>
            <span className="rp-breadcrumb-current">Payroll</span>
          </div>
        </div>
      </div>

      <div className="pr-toolbar">
        <div className="pr-toolbar-search">
          <Search size={13} className="pr-toolbar-search-ic" />
          <input
            type="text"
            placeholder="Search staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="form-select pr-toolbar-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | PayrollStatus)}>
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <ReportExportButton
          title="Payroll"
          headers={EXPORT_HEADERS}
          rows={exportRows}
          filename={`payroll-${periodStart}-to-${periodEnd}`}
          variant="button"
          csv
          disabled={filteredRows.length === 0}
          dateRangeLabel={periodStart && periodEnd ? `${periodStart} to ${periodEnd}` : undefined}
        />
      </div>

      {loading ? (
        <SkeletonStatCards count={6} />
      ) : (
        <div className="rp-sra-summary-row">
          <SummaryCard icon={<People size={16} />} iconTone="blue" label="Staff" value={String(summaryStats.staffCount)} />
          <SummaryCard icon={<Wallet2 size={16} />} iconTone="green" label="Gross Payroll" value={formatAmount(summaryStats.grossPayroll)} />
          <SummaryCard icon={<DashCircle size={16} />} iconTone="red" label="Deductions" value={formatAmount(summaryStats.totalDeductions)} valueClass="text-danger" />
          <SummaryCard icon={<CashStack size={16} />} iconTone="purple" label="Net Payroll" value={formatAmount(summaryStats.totalNet)} />
          <SummaryCard
            icon={<CheckCircle size={16} />}
            iconTone="green"
            label="Paid"
            value={formatAmount(summaryStats.totalPaid)}
            sublabel={`${summaryStats.paidCount} of ${summaryStats.staffCount} staff`}
            valueClass="text-success"
          />
          <SummaryCard icon={<ClockHistory size={16} />} iconTone="amber" label="Pending" value={formatAmount(summaryStats.totalPending)} valueClass="text-warning" />
        </div>
      )}

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Staff Name</th>
              <th>Basic Salary</th>
              <th>Commission</th>
              <th>Tips</th>
              <th>Deductions</th>
              <th>Net Salary</th>
              <th>Payroll Status</th>
              <th>Payment Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={9} />
            ) : filteredRows.length === 0 ? (
              <tr><td colSpan={9} className="rp-detail-empty-cell">No staff match the current search/filter.</td></tr>
            ) : (
              pagedRows.map((row) => (
                <tr key={row.staff_id} className="rp-ss-clickable-row" onClick={() => setSelectedStaff(row)}>
                  <td className="fw-semibold">
                    <div className="pr-staff-name-cell">
                      <span className="pr-staff-avatar">
                        {(row.staff_first_name?.[0] || "").toUpperCase()}{(row.staff_last_name?.[0] || "").toUpperCase()}
                      </span>
                      {row.staff_first_name} {row.staff_last_name || ""}
                    </div>
                  </td>
                  <td>{formatAmount(row.base_salary)}</td>
                  <td>{formatAmount(row.commission_total)}</td>
                  <td>{formatAmount(row.tips_total)}</td>
                  <td>{formatAmount(row.deductions)}</td>
                  <td className="fw-bold">{formatAmount(row.net_salary)}</td>
                  <td>
                    <span className={`rp-status-badge rp-status-${row.status === "draft" ? "pending" : row.status}`}>
                      {STATUS_LABEL[row.status]}
                    </span>
                  </td>
                  <td>{row.payment_date ? new Date(row.payment_date).toLocaleDateString("en-IN") : "—"}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {row.status === "paid" ? (
                      <span className="text-muted small">—</span>
                    ) : (
                      <div className="d-flex gap-2">
                        {can("edit_payroll") && (
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            onClick={() => navigate(`/dashboard/team/payroll/${row.staff_id}/adjust?period_start=${periodStart}&period_end=${periodEnd}`)}
                          >
                            Adjust
                          </Button>
                        )}
                        {can("pay_salary") && (
                          <Button size="sm" variant="primary" onClick={() => setPayingStaff(row)}>
                            Pay Salary
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={filteredRows.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
      />

      {selectedStaff && (
        <PayrollDetailsModal
          staff={selectedStaff}
          periodStart={periodStart}
          periodEnd={periodEnd}
          canEdit={can("edit_payroll")}
          canPay={can("pay_salary")}
          onClose={() => setSelectedStaff(null)}
          onChanged={async (updated) => {
            setSelectedStaff(updated);
            await refreshAfterChange();
          }}
          formatAmount={formatAmount}
          showSuccess={showSuccess}
          showError={showError}
        />
      )}

      {payingStaff && (
        <Modal show onClose={() => !paying && setPayingStaff(null)} title="Confirm Salary Payment" size="sm">
          <PayConfirmForm
            paying={paying}
            netSalary={payingStaff.net_salary}
            formatAmount={formatAmount}
            onConfirm={handlePay}
            onCancel={() => setPayingStaff(null)}
          />
        </Modal>
      )}
    </div>
  );
}

async function downloadPayrollPdf(url: string, filename: string, showError: (msg: string) => void) {
  try {
    const res = await api.get(url, { responseType: "blob" });
    const blobUrl = URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(blobUrl);
  } catch (err: any) {
    showError(err?.response?.data?.error?.message || "Failed to download document");
  }
}

// ─── Payroll Details Modal ───────────────────────────────────────────────

function PayrollDetailsModal({
  staff, periodStart, periodEnd, canEdit, canPay, onClose, onChanged, formatAmount, showSuccess, showError,
}: {
  staff: StaffPayrollSummary;
  periodStart: string;
  periodEnd: string;
  canEdit: boolean;
  canPay: boolean;
  onClose: () => void;
  onChanged: (updated: StaffPayrollSummary) => void;
  formatAmount: (n: number) => string;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
}) {
  const navigate = useNavigate();
  const [showPayConfirm, setShowPayConfirm] = useState(false);
  const [paying, setPaying] = useState(false);
  const [receiptState, setReceiptState] = useState<"sent" | "failed" | null>(null);

  const isPaid = staff.status === "paid";

  const handlePay = async (paymentMethod: string, paymentReference?: string) => {
    setPaying(true);
    try {
      const res = await api.post(PAYROLL.PAY(staff.staff_id), {
        period_start: periodStart,
        period_end: periodEnd,
        payment_method: paymentMethod,
        payment_reference: paymentReference,
      });
      const updated: StaffPayrollSummary = res.data?.data?.summary;
      const receiptSent: boolean = res.data?.data?.receiptSent;
      setReceiptState(receiptSent ? "sent" : "failed");
      onChanged(updated);
      showSuccess("Salary paid successfully");
      setShowPayConfirm(false);
    } catch (err: any) {
      showError(err?.response?.data?.error?.message || "Failed to process payment");
    } finally {
      setPaying(false);
    }
  };

  return (
    <Modal show onClose={onClose} title={`Payroll — ${staff.staff_first_name} ${staff.staff_last_name || ""}`} size="md">
      <div className="d-flex flex-column gap-2">
        <Row label="Basic Salary" value={formatAmount(staff.base_salary)} />
        <Row label="Service Commission" value={formatAmount(staff.commission_by_category.services)} />
        <Row label="Product Commission" value={formatAmount(staff.commission_by_category.products)} />
        <Row label="Membership Commission" value={formatAmount(staff.commission_by_category.memberships)} />
        <Row label="Package Commission" value={formatAmount(staff.commission_by_category.packages)} />
        {staff.commission_by_category.other > 0 && <Row label="Other Commission" value={formatAmount(staff.commission_by_category.other)} />}
        <Row label="Tips" value={formatAmount(staff.tips_total)} />
        <Row label="Bonus" value={formatAmount(staff.bonus)} />
        <Row label="Other Earnings" value={formatAmount(staff.other_earning)} />
        <Row label="Salary Advance" value={`−${formatAmount(staff.salary_advance)}`} negative />
        <Row label="Deductions" value={`−${formatAmount(staff.deductions)}`} negative />
        <hr className="my-1" />
        <Row label="Net Salary" value={formatAmount(staff.net_salary)} bold />

        {receiptState && (
          <div className={`small mt-1 ${receiptState === "sent" ? "text-success" : "text-warning"}`}>
            {receiptState === "sent" ? "Receipt emailed successfully." : "Payment recorded, but the receipt email failed to send — it can be resent manually."}
          </div>
        )}

        <div className="d-flex gap-2 mt-3 flex-wrap">
          {canEdit && !isPaid && (
            <Button
              variant="outline-secondary"
              onClick={() => navigate(`/dashboard/team/payroll/${staff.staff_id}/adjust?period_start=${periodStart}&period_end=${periodEnd}`)}
            >
              Adjust Payroll
            </Button>
          )}
          {canPay && !isPaid && (
            <Button variant="primary" onClick={() => setShowPayConfirm(true)}>
              Pay Salary {formatAmount(staff.net_salary)}
            </Button>
          )}
          {isPaid && <span className="text-success fw-semibold">Paid on {staff.payment_date ? new Date(staff.payment_date).toLocaleDateString("en-IN") : ""}</span>}
        </div>

        <div className="d-flex gap-2 mt-2 flex-wrap">
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={() => {
              const params = new URLSearchParams({ period_start: periodStart, period_end: periodEnd }).toString();
              downloadPayrollPdf(PAYROLL.SLIP(staff.staff_id, params), `salary-slip-${periodStart}-to-${periodEnd}.pdf`, showError);
            }}
          >
            Download Salary Slip
          </Button>
          {isPaid && (
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={() => {
                const params = new URLSearchParams({ period_start: periodStart, period_end: periodEnd }).toString();
                downloadPayrollPdf(PAYROLL.RECEIPT(staff.staff_id, params), `payment-receipt-${periodStart}-to-${periodEnd}.pdf`, showError);
              }}
            >
              Download Payment Receipt
            </Button>
          )}
        </div>
      </div>

      {showPayConfirm && (
        <Modal show onClose={() => !paying && setShowPayConfirm(false)} title="Confirm Salary Payment" size="sm">
          <PayConfirmForm paying={paying} netSalary={staff.net_salary} formatAmount={formatAmount} onConfirm={handlePay} onCancel={() => setShowPayConfirm(false)} />
        </Modal>
      )}
    </Modal>
  );
}

function SummaryCard({ icon, iconTone, label, value, sublabel, valueClass = "" }: {
  icon: React.ReactNode;
  iconTone: "blue" | "green" | "red" | "purple" | "amber";
  label: string;
  value: string;
  sublabel?: string;
  valueClass?: string;
}) {
  return (
    <div className="rp-sra-summary-card pr-kpi-card">
      <div className={`pr-kpi-icon pr-kpi-icon--${iconTone}`}>{icon}</div>
      <div>
        <div className="rp-sra-summary-label">{label}</div>
        <div className={`rp-sra-summary-val ${valueClass}`}>{value}</div>
        {sublabel && <div className="text-muted" style={{ fontSize: 11 }}>{sublabel}</div>}
      </div>
    </div>
  );
}

function Row({ label, value, bold = false, negative = false }: { label: string; value: string; bold?: boolean; negative?: boolean }) {
  return (
    <div className="d-flex justify-content-between">
      <span className={bold ? "fw-bold" : ""}>{label}</span>
      <span className={bold ? "fw-bold" : negative ? "text-danger" : ""}>{value}</span>
    </div>
  );
}

// ─── Pay Salary confirmation ──────────────────────────────────────────────

function PayConfirmForm({ paying, netSalary, formatAmount, onConfirm, onCancel }: {
  paying: boolean;
  netSalary: number;
  formatAmount: (n: number) => string;
  onConfirm: (method: string, reference?: string) => void;
  onCancel: () => void;
}) {
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [clicked, setClicked] = useState(false);

  const confirm = () => {
    if (clicked) return; // defense-in-depth alongside the backend's DB-level duplicate guard
    setClicked(true);
    onConfirm(method, reference || undefined);
  };

  return (
    <div>
      <p>Pay <strong>{formatAmount(netSalary)}</strong> as net salary for this period?</p>
      <div className="mb-3">
        <label className="form-label fw-semibold">Payment Method</label>
        <select className="form-select" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="cash">Cash</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="upi">UPI</option>
          <option value="cheque">Cheque</option>
        </select>
      </div>
      <Input label="Payment Reference (optional)" value={reference} onChange={(e) => setReference(e.target.value)} />
      <div className="d-flex justify-content-end gap-2 mt-3">
        <Button variant="outline-secondary" onClick={onCancel} disabled={clicked || paying}>Cancel</Button>
        <Button variant="primary" onClick={confirm} disabled={clicked || paying} loading={paying}>
          Confirm Payment
        </Button>
      </div>
    </div>
  );
}

