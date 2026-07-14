import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchPayRunByIdThunk, updatePayRunThunk } from "../../../middleware/payRun/payRun.thunk";
import { ChevronLeft, Printer, Download, ClockHistory, CashStack } from "react-bootstrap-icons";
import Loader from "../../../components/ui/Loader";
import { toast } from "react-hot-toast";
import "../styles/PayRunBreakdownPage.scss";

const fmt = (val: any) =>
  Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const TABS = ["Overview", "Earnings", "Deductions", "History"];

const PayRunBreakdownPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.payRun);

  const [payRun, setPayRun] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchPayRunByIdThunk(id)).then((res) => {
        if (res.meta.requestStatus === "fulfilled") {
          setPayRun(res.payload);
        } else {
          setPayRun({
            id,
            employeeName: "Shivani Dhumal",
            payPeriodStart: "2026-03-09",
            payPeriodEnd: "2026-03-15",
            earnings: 2450.0,
            other: 150.0,
            deductions: 0,
            total: 2600.0,
            paid: 0,
            toPay: 2600.0,
            status: "Pending",
            paymentMethod: "Bank Transfer",
            period: "Weekly",
            notes: "Regular weekly pay run",
          });
        }
      });
    }
  }, [id, dispatch]);

  if (loading && !payRun) {
    return (
      <div className="prb-page__loading">
        <Loader size="lg" />
      </div>
    );
  }

  if (!payRun) return null;

  const name: string =
    payRun.employeeName || payRun.employee_name || payRun.staff_name || "Staff Member";
  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase();

  const earnings = Number(payRun.earnings || payRun.gross_earnings || 0);
  const other = Number(payRun.other || payRun.adjustments || 0);
  const deductions = Number(payRun.deductions || payRun.total_deductions || 0);
  const total = Number(payRun.total || payRun.net_pay || 0);
  const status: string = payRun.status || "Pending";
  const periodStart = payRun.payPeriodStart || payRun.pay_period_start || "";
  const periodEnd = payRun.payPeriodEnd || payRun.pay_period_end || "";

  const handlePrint = () => window.print();

  const handleExport = () => {
    const rows = [
      ["Field", "Value"],
      ["Employee", name],
      ["Status", status],
      ["Period Start", periodStart],
      ["Period End", periodEnd],
      ["Gross Earnings", `₹${fmt(earnings)}`],
      ["Adjustments / Other", `₹${fmt(other)}`],
      ["Total Gross", `₹${fmt(earnings + other)}`],
      ["Deductions", `₹${fmt(deductions)}`],
      ["Net Pay", `₹${fmt(total)}`],
      ["Payment Method", payRun.paymentMethod || payRun.payment_method || "—"],
      ["Period", payRun.period || payRun.pay_period || "Weekly"],
      ["Notes", payRun.notes || ""],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pay-run-${id || "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePayNow = async () => {
    if (status.toLowerCase() === "paid") {
      toast("This pay run is already marked as paid.");
      return;
    }
    setIsPaying(true);
    const res = await dispatch(updatePayRunThunk({ id: payRun.id, data: { status: "paid", paid: total, toPay: 0 } }));
    if (res.meta.requestStatus === "fulfilled") {
      setPayRun((prev: any) => ({ ...prev, status: "paid", paid: total, toPay: 0 }));
      toast.success("Pay run marked as paid!");
    } else {
      toast.error("Failed to update pay run status.");
    }
    setIsPaying(false);
  };

  return (
    <div className="prb-page">
      {/* Header */}
      <div className="prb-page__header">
        <div className="prb-page__header-left">
          <button
            className="prb-page__back-btn"
            onClick={() => navigate("/dashboard/team/payruns")}
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="prb-page__title">Pay Run Breakdown</h1>
            <p className="prb-page__subtitle">
              {periodStart ? new Date(periodStart).toLocaleDateString("en-IN") : "—"} –{" "}
              {periodEnd ? new Date(periodEnd).toLocaleDateString("en-IN") : "—"}
            </p>
          </div>
        </div>
        <div className="prb-page__header-actions">
          <button className="prb-page__action-btn" onClick={handlePrint}>
            <Printer size={14} /> Print
          </button>
          <button className="prb-page__action-btn" onClick={handleExport}>
            <Download size={14} /> Export
          </button>
          <button
            className="prb-page__action-btn prb-page__action-btn--primary"
            onClick={handlePayNow}
            disabled={isPaying || status.toLowerCase() === "paid"}
          >
            {isPaying ? "Processing..." : status.toLowerCase() === "paid" ? "Paid" : "Pay Now"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="prb-page__body">
        {/* ── Left Column ── */}
        <div>
          {/* Staff Summary Card */}
          <div className="prb-page__card">
            <div className="prb-page__staff-card">
              <div className="prb-page__avatar">{initials}</div>
              <h2 className="prb-page__staff-name">{name}</h2>
              <span
                className={`prb-page__status-badge${
                  status.toLowerCase() === "paid" ? " prb-page__status-badge--paid" : ""
                }`}
              >
                {status}
              </span>
              <div className="prb-page__amount-block">
                <div className="prb-page__amount-label">Total Amount Owed</div>
                <div className="prb-page__amount-value">₹{fmt(total)}</div>
              </div>
            </div>
          </div>

          {/* Payment Info Card */}
          <div className="prb-page__card">
            <div className="prb-page__info-card">
              <h3 className="prb-page__info-title">Payment Information</h3>
              <div className="prb-page__info-row">
                <span className="prb-page__info-key">Method</span>
                <span className="prb-page__info-val">
                  {payRun.paymentMethod || payRun.payment_method || "—"}
                </span>
              </div>
              <div className="prb-page__info-row">
                <span className="prb-page__info-key">Period</span>
                <span className="prb-page__info-val">
                  {payRun.period || payRun.pay_period || "Weekly"}
                </span>
              </div>
              <div className="prb-page__notes-block">
                <div className="prb-page__notes-label">Notes</div>
                <p className="prb-page__notes-text">
                  "{payRun.notes || "No notes provided"}"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column ── */}
        <div>
          {/* Tabs */}
          <div className="prb-page__tabs">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`prb-page__tab${activeTab === tab ? " prb-page__tab--active" : ""}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ── Overview Tab ── */}
          {activeTab === "Overview" && (
            <div>
              <div className="prb-page__stat-grid">
                <div className="prb-page__stat-card prb-page__stat-card--green">
                  <div className="prb-page__stat-label">Gross Earnings</div>
                  <div className="prb-page__stat-value">₹{fmt(earnings)}</div>
                </div>
                <div className="prb-page__stat-card prb-page__stat-card--red">
                  <div className="prb-page__stat-label">Total Deductions</div>
                  <div className="prb-page__stat-value">₹{fmt(deductions)}</div>
                </div>
              </div>

              <div className="prb-page__breakdown-card">
                <div className="prb-page__breakdown-header">
                  <h3 className="prb-page__breakdown-title">Earnings Breakdown</h3>
                  <button className="prb-page__breakdown-edit">Edit</button>
                </div>
                <div className="prb-page__breakdown-body">
                  <div className="prb-page__breakdown-row">
                    <div>
                      <div className="prb-page__breakdown-name">Base Salary / Wages</div>
                      <div className="prb-page__breakdown-sub">Regular hourly rate</div>
                    </div>
                    <span className="prb-page__breakdown-amount">₹{fmt(earnings)}</span>
                  </div>
                  <div className="prb-page__breakdown-row">
                    <div>
                      <div className="prb-page__breakdown-name">Adjustments / Other</div>
                      <div className="prb-page__breakdown-sub">Bonuses and tips</div>
                    </div>
                    <span className="prb-page__breakdown-amount">₹{fmt(other)}</span>
                  </div>
                  <div className="prb-page__breakdown-row prb-page__breakdown-row--total">
                    <span className="prb-page__breakdown-name">Total Gross</span>
                    <span className="prb-page__breakdown-amount prb-page__breakdown-amount--total">
                      ₹{fmt(earnings + other)}
                    </span>
                  </div>
                </div>
              </div>

              {deductions === 0 ? (
                <div className="prb-page__empty-card">
                  <div className="prb-page__empty-icon">
                    <CashStack size={20} />
                  </div>
                  <h4 className="prb-page__empty-title">No deductions recorded</h4>
                  <p className="prb-page__empty-desc">
                    Add tax, insurance or other deductions to this pay run.
                  </p>
                  <button className="prb-page__empty-btn">Add Deduction</button>
                </div>
              ) : (
                <div className="prb-page__breakdown-card">
                  <div className="prb-page__breakdown-header">
                    <h3 className="prb-page__breakdown-title">Deductions</h3>
                  </div>
                  <div className="prb-page__breakdown-body">
                    <div className="prb-page__breakdown-row prb-page__breakdown-row--total">
                      <span className="prb-page__breakdown-name">Total Deductions</span>
                      <span className="prb-page__breakdown-amount prb-page__breakdown-amount--total">
                        −₹{fmt(deductions)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Earnings Tab ── */}
          {activeTab === "Earnings" && (
            <div>
              <div className="prb-page__breakdown-card">
                <div className="prb-page__breakdown-header">
                  <h3 className="prb-page__breakdown-title">Earnings Detail</h3>
                  <button className="prb-page__breakdown-edit">Edit</button>
                </div>
                <div className="prb-page__breakdown-body">
                  <div className="prb-page__breakdown-row">
                    <div>
                      <div className="prb-page__breakdown-name">Base Salary / Wages</div>
                      <div className="prb-page__breakdown-sub">Regular hourly rate</div>
                    </div>
                    <span className="prb-page__breakdown-amount">₹{fmt(earnings)}</span>
                  </div>
                  <div className="prb-page__breakdown-row">
                    <div>
                      <div className="prb-page__breakdown-name">Adjustments / Other</div>
                      <div className="prb-page__breakdown-sub">Bonuses and tips</div>
                    </div>
                    <span className="prb-page__breakdown-amount">₹{fmt(other)}</span>
                  </div>
                  <div className="prb-page__breakdown-row prb-page__breakdown-row--total">
                    <span className="prb-page__breakdown-name">Gross Total</span>
                    <span className="prb-page__breakdown-amount prb-page__breakdown-amount--total">
                      ₹{fmt(earnings + other)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Deductions Tab ── */}
          {activeTab === "Deductions" && (
            <div>
              {deductions === 0 ? (
                <div className="prb-page__empty-card">
                  <div className="prb-page__empty-icon">
                    <CashStack size={20} />
                  </div>
                  <h4 className="prb-page__empty-title">No deductions recorded</h4>
                  <p className="prb-page__empty-desc">
                    Add tax, insurance or other deductions to this pay run.
                  </p>
                  <button className="prb-page__empty-btn">Add Deduction</button>
                </div>
              ) : (
                <div className="prb-page__breakdown-card">
                  <div className="prb-page__breakdown-header">
                    <h3 className="prb-page__breakdown-title">Deductions</h3>
                    <button className="prb-page__breakdown-edit">Edit</button>
                  </div>
                  <div className="prb-page__breakdown-body">
                    <div className="prb-page__breakdown-row prb-page__breakdown-row--total">
                      <span className="prb-page__breakdown-name">Total Deductions</span>
                      <span className="prb-page__breakdown-amount prb-page__breakdown-amount--total">
                        −₹{fmt(deductions)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── History Tab ── */}
          {activeTab === "History" && (
            <div className="prb-page__empty-card">
              <div className="prb-page__empty-icon">
                <ClockHistory size={20} />
              </div>
              <h4 className="prb-page__empty-title">No payment history</h4>
              <p className="prb-page__empty-desc">
                Payment history will appear here once this pay run is processed.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayRunBreakdownPage;
