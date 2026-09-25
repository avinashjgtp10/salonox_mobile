import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../../../services/api/axios";
import { PAYROLL } from "../../../services/api/endpoints";
import { useCurrency } from "../../../hooks/useCurrency";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import "../styles/PayrollPage.scss";

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
  status: "draft" | "pending" | "paid";
  payment_date: string | null;
  adjustments: PayrollAdjustment[];
}

const ADJUST_FIELD_LABEL: Record<AdjustField, string> = {
  commission: "Commission", bonus: "Bonus", tips: "Tips",
  deduction: "Deduction", other_earning: "Other Earning", salary: "Base Salary",
};

export default function PayrollAdjustPage() {
  const { staffId } = useParams<{ staffId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const { overlay, showError, showSuccess } = useStatusOverlay();

  const periodStart = searchParams.get("period_start") ?? "";
  const periodEnd = searchParams.get("period_end") ?? "";

  const [staff, setStaff] = useState<StaffPayrollSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [field, setField] = useState<AdjustField>("bonus");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!staffId || !periodStart || !periodEnd) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ period_start: periodStart, period_end: periodEnd }).toString();
      const res = await api.get(PAYROLL.STAFF_SUMMARY(params));
      const items: StaffPayrollSummary[] = res.data?.data?.items ?? [];
      const found = items.find((r) => r.staff_id === staffId) ?? null;
      setStaff(found);
    } catch (err: any) {
      showError(err?.response?.data?.error?.message || "Failed to load payroll data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId, periodStart, periodEnd]);

  const submit = async () => {
    if (!staffId) return;
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      showError("Enter a valid number");
      return;
    }
    if (!reason.trim()) {
      showError("A reason is required for every adjustment");
      return;
    }
    setSaving(true);
    try {
      const res = await api.post(PAYROLL.ADJUST(staffId), {
        period_start: periodStart,
        period_end: periodEnd,
        field,
        adjusted_value: numericValue,
        reason: reason.trim(),
      });
      setStaff(res.data?.data);
      setValue("");
      setReason("");
      showSuccess("Adjustment saved");
    } catch (err: any) {
      showError(err?.response?.data?.error?.message || "Failed to save adjustment");
    } finally {
      setSaving(false);
    }
  };

  if (!staffId || !periodStart || !periodEnd) {
    return (
      <div className="rp-detail-view pr-page">
        <div className="text-muted">Missing staff or period — go back to Payroll and try again.</div>
        <Button variant="outline-secondary" className="mt-3" onClick={() => navigate("/dashboard/team/payroll")}>
          Back to Payroll
        </Button>
      </div>
    );
  }

  return (
    <div className="rp-detail-view pr-page">
      {overlay}
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="outline-secondary" onClick={() => navigate("/dashboard/team/payroll")}>← Back</Button>
          <span className="rp-breadcrumb-current">
            Adjust Payroll {staff ? `— ${staff.staff_first_name} ${staff.staff_last_name || ""}` : ""}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="rp-detail-loading-cell">Loading...</div>
      ) : !staff ? (
        <div className="rp-detail-empty-cell">Staff member not found for this payroll period.</div>
      ) : (
        <div className="row g-3 pr-adjust-grid">
          <div className="col-lg-6">
            <div className="rp-graph-card">
              <div className="fw-semibold mb-3">Payroll Breakdown</div>
              <Row label="Basic Salary" value={formatAmount(staff.base_salary)} />
              <Row label="Service Commission" value={formatAmount(staff.commission_by_category.services)} />
              <Row label="Product Commission" value={formatAmount(staff.commission_by_category.products)} />
              <Row label="Membership Commission" value={formatAmount(staff.commission_by_category.memberships)} />
              <Row label="Package Commission" value={formatAmount(staff.commission_by_category.packages)} />
              {staff.commission_by_category.other > 0 && (
                <Row label="Other Commission" value={formatAmount(staff.commission_by_category.other)} />
              )}
              <Row label="Tips" value={formatAmount(staff.tips_total)} />
              <Row label="Bonus" value={formatAmount(staff.bonus)} />
              <Row label="Other Earnings" value={formatAmount(staff.other_earning)} />
              <Row label="Salary Advance" value={`−${formatAmount(staff.salary_advance)}`} negative />
              <Row label="Deductions" value={`−${formatAmount(staff.deductions)}`} negative />
              <hr className="my-2" />
              <Row label="Net Salary" value={formatAmount(staff.net_salary)} bold />
              {staff.status === "paid" && (
                <div className="mt-2">
                  <span className="rp-status-badge rp-status-paid">
                    Paid on {staff.payment_date ? new Date(staff.payment_date).toLocaleDateString("en-IN") : ""}
                  </span>
                </div>
              )}
            </div>

            {staff.adjustments.length > 0 && (
              <div className="rp-graph-card mt-3">
                <div className="fw-semibold mb-2">Adjustment History</div>
                <div className="d-flex flex-column gap-2">
                  {staff.adjustments.map((a) => (
                    <div key={a.id} className="pr-adjust-history-row">
                      <div className="fw-semibold">{ADJUST_FIELD_LABEL[a.field]}: {a.original_value} → {a.adjusted_value}</div>
                      <div className="text-muted">{a.reason}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>{new Date(a.created_at).toLocaleString("en-IN")}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="col-lg-6">
            <div className="rp-graph-card">
              <div className="fw-semibold mb-3">New Adjustment</div>
              {staff.status === "paid" ? (
                <div className="text-muted">This payroll period is already paid and can no longer be adjusted.</div>
              ) : (
                <>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Field <span className="text-danger">*</span></label>
                    <select className="form-select" value={field} onChange={(e) => setField(e.target.value as AdjustField)}>
                      {Object.entries(ADJUST_FIELD_LABEL).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label={<>New Value <span className="text-danger">*</span></>}
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                  <Input
                    label={<>Reason <span className="text-danger">*</span></>}
                    multiline
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <div className="d-flex justify-content-end mt-3">
                    <Button variant="primary" onClick={submit} disabled={saving} loading={saving}>
                      Save Adjustment
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold = false, negative = false }: { label: string; value: string; bold?: boolean; negative?: boolean }) {
  return (
    <div className="pr-adjust-row">
      <span className={bold ? "fw-bold" : ""}>{label}</span>
      <span className={bold ? "fw-bold" : negative ? "text-danger" : ""}>{value}</span>
    </div>
  );
}
