import React, { useState } from "react";
import type { Booking, PaymentStatus } from "../../types/scheduler-types";
import { useSchedulerContext } from "../../store/SchedulerContext";
import { useAppSelector } from "../../../../hooks/useAppRedux";
import api from "../../../../services/api/axios";
import { COUPON, PAYMENT } from "../../../../services/api/endpoints";
import { formatTime12 } from "../../utils/timeUtils";
import {
  computePointsEarned, computeEWalletCredit,
  EWALLET_REDEEM_MINIMUM, MEMBERSHIP_TIERS,
} from "../../../../store/schedulerSlice";
import Button from "../../../../components/ui/Button";
import Badge from "../../../../components/ui/Badge";
import "../../styles/PaymentModal.scss";

interface Props { booking: Booking; onClose: () => void; collectDue?: boolean }

type SingleMethod = "Cash" | "Card" | "UPI";
const SINGLE_METHODS: SingleMethod[] = ["Cash", "Card", "UPI"];
const METHOD_ICON: Record<SingleMethod, string> = { Cash: "💵", Card: "💳", UPI: "📱" };

function getMembershipLabel(r: number) {
  if (r >= MEMBERSHIP_TIERS.Platinum) return "Platinum";
  if (r >= MEMBERSHIP_TIERS.Gold)     return "Gold";
  if (r >= MEMBERSHIP_TIERS.Silver)   return "Silver";
  return "NA";
}
function getMembershipColor(t: string) {
  if (t === "Platinum") return "#7c3aed";
  if (t === "Gold")     return "#d97706";
  if (t === "Silver")   return "#64748b";
  return "#9ca3af";
}
function getNextTier(r: number) {
  if (r < MEMBERSHIP_TIERS.Silver)   return { name: "Silver",   remaining: MEMBERSHIP_TIERS.Silver   - r };
  if (r < MEMBERSHIP_TIERS.Gold)     return { name: "Gold",     remaining: MEMBERSHIP_TIERS.Gold     - r };
  if (r < MEMBERSHIP_TIERS.Platinum) return { name: "Platinum", remaining: MEMBERSHIP_TIERS.Platinum - r };
  return null;
}

function printBill(booking: Booking, paidMethods: Record<string, number>, staffList: { id: string; name: string }[]) {
  const staffName = staffList.find((s) => s.id === booking.staffId)?.name || "—";
  const methodStr = Object.entries(paidMethods).map(([m, a]) => `${m}: ₹${a.toFixed(2)}`).join(", ");
  const svcRows = booking.services.map((s) =>
    `<tr><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0">${s.service}</td><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;color:#6b7280">${s.staff || staffName}</td><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;text-align:center">${s.qty}</td><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">₹${(s.total || 0).toFixed(2)}</td></tr>`
  ).join("");
  const pkgRows = (booking.packageItems || []).map((p) =>
    `<tr><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0">${p.packageName} <span style="color:#f59e0b">[PKG]</span></td><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;color:#6b7280">—</td><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;text-align:center">${p.qty}</td><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">₹${(p.total || 0).toFixed(2)}</td></tr>`
  ).join("");
  const html = `<!DOCTYPE html><html><head><title>Receipt</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif;padding:32px;color:#111;max-width:600px;margin:0 auto}</style></head><body><div style="text-align:center;margin-bottom:24px"><div style="font-size:26px;font-weight:800">SalonOx</div><div style="font-size:13px;color:#6b7280">Payment Receipt</div></div><table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px"><thead><tr style="background:#1f2937;color:#fff"><th style="padding:9px 10px;text-align:left">Item</th><th style="padding:9px 10px;text-align:left">Staff</th><th style="padding:9px 10px;text-align:center">Qty</th><th style="padding:9px 10px;text-align:right">Amount</th></tr></thead><tbody>${svcRows}${pkgRows}</tbody></table><div style="display:flex;justify-content:flex-end"><div style="width:260px"><div style="display:flex;justify-content:space-between;font-size:17px;font-weight:800;border-top:2px solid #1f2937;padding-top:10px">Grand Total<span>₹${(booking.grandTotal || 0).toFixed(2)}</span></div><div style="display:flex;justify-content:space-between;font-size:12px;color:#22c55e;margin-top:6px;font-weight:600">Payment<span>${methodStr}</span></div><div style="background:#22c55e;color:#fff;text-align:center;padding:6px;border-radius:6px;margin-top:10px;font-weight:700">✓ PAID</div></div></div><div style="text-align:center;margin-top:28px;font-size:11px;color:#9ca3af">Thank you for visiting SalonOx! 🌸</div></body></html>`;
  const win = window.open("", "_blank", "width=700,height=650");
  if (!win) { alert("Please allow popups."); return; }
  win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 500);
}

const PaymentModal: React.FC<Props> = ({ booking, onClose, collectDue = false }) => {
  const { updateBooking, clientStats, deductEWallet, processPaymentRewards, staffList } = useSchedulerContext();
  const salonId = useAppSelector((s: any) => s.salon?.currentSalon?.id);

  const clientStat       = clientStats.find((c) => c.clientId === booking.clientId);
  const eWalletBalance   = clientStat?.ewalletAmt       ?? 0;
  const currentRevenue   = clientStat?.totalRevenue      ?? 0;
  const currentPoints    = clientStat?.rewardPointsTotal ?? 0;
  const currentMembership = clientStat?.membership ?? "NA";
  const grandTotal       = booking.grandTotal || 0;

  // ── Coupon ──────────────────────────────────────────────────────────────────
  const [couponInput,    setCouponInput]    = useState("");
  const [couponApplied,  setCouponApplied]  = useState(booking.couponCode   || "");
  const [couponDiscount, setCouponDiscount] = useState(booking.couponDiscount ?? 0);
  const [couponMsg,      setCouponMsg]      = useState("");
  const [couponError,    setCouponError]    = useState("");
  const [couponLoading,  setCouponLoading]  = useState(false);

  // ── eWallet ─────────────────────────────────────────────────────────────────
  const [useEWallet, setUseEWallet] = useState(false);
  const [eWalletAmt, setEWalletAmt] = useState(0);
  const canUseEWallet = eWalletBalance >= EWALLET_REDEEM_MINIMUM;

  // ── Payment method ───────────────────────────────────────────────────────────
  const [payMode,       setPayMode]       = useState<"Single" | "Split">("Single");
  const [singleMethod,  setSingleMethod]  = useState<SingleMethod>("Cash");
  const [split1Method,  setSplit1Method]  = useState<SingleMethod>("Cash");
  const [split2Method,  setSplit2Method]  = useState<SingleMethod>("Card");
  const [split1Amt,     setSplit1Amt]     = useState(0);
  const [split2Amt,     setSplit2Amt]     = useState(0);
  const [upiId,         setUpiId]         = useState("");
  const [cardNumber,    setCardNumber]    = useState("");
  const [cardExpiry,    setCardExpiry]    = useState("");
  const [cardCvv,       setCardCvv]       = useState("");
  const [printReceipt,  setPrintReceipt]  = useState(false);

  // ── Partial payment ──────────────────────────────────────────────────────────
  const [isPartialMode, setIsPartialMode] = useState(false);
  const [partialAmt,    setPartialAmt]    = useState(0);

  // ── Post-payment ─────────────────────────────────────────────────────────────
  const [paid,         setPaid]         = useState(false);
  const [paidMethods,  setPaidMethods]  = useState<Record<string, number>>({});
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [earnedWallet, setEarnedWallet] = useState(0);
  const [newMembership,setNewMembership]= useState("");

  // ── Derived ──────────────────────────────────────────────────────────────────
  const effectiveTotal    = Math.max(0, grandTotal - couponDiscount - (useEWallet ? eWalletAmt : 0));
  const previewPoints     = computePointsEarned(effectiveTotal);
  const previewWallet     = computeEWalletCredit(previewPoints);
  const previewRevenue    = currentRevenue + effectiveTotal;
  const previewMembership = getMembershipLabel(previewRevenue);
  const willUpgrade       = previewMembership !== currentMembership && previewMembership !== "NA";
  const nextTier          = getNextTier(currentRevenue);

  // In collect-due mode: pay exactly the outstanding balance. Otherwise allow partial.
  const payingNow = collectDue
    ? (booking.dueAmount || 0)
    : isPartialMode
      ? Math.min(Math.max(0, partialAmt), effectiveTotal)
      : effectiveTotal;
  const dueNow   = collectDue ? 0 : Math.max(0, effectiveTotal - payingNow);
  const isPartial = dueNow > 0;

  const splitValid = payMode === "Split"
    ? Math.abs(split1Amt + split2Amt - payingNow) <= 0.01
    : true;
  const canPay = splitValid && (!isPartialMode || partialAmt > 0);

  // ── Coupon handlers ───────────────────────────────────────────────────────────
  async function handleApplyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true); setCouponError(""); setCouponMsg("");
    try {
      const res = await api.post(COUPON.VALIDATE, {
        code,
        orderAmount: grandTotal,
        salonId,
      });
      const d = res.data?.data;
      setCouponDiscount(Number(d.discountAmount));
      setCouponApplied(d.couponCode);
      setCouponMsg(d.message);
      setCouponInput("");
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || "Invalid or expired coupon";
      setCouponError(msg);
      setCouponDiscount(0);
      setCouponApplied("");
    } finally {
      setCouponLoading(false);
    }
  }

  function handleRemoveCoupon() {
    setCouponApplied(""); setCouponDiscount(0); setCouponMsg(""); setCouponError(""); setCouponInput("");
  }

  // ── eWallet handler ───────────────────────────────────────────────────────────
  function handleEWalletToggle(checked: boolean) {
    setUseEWallet(checked);
    const deductible = Math.max(0, grandTotal - couponDiscount);
    setEWalletAmt(checked ? Math.min(eWalletBalance, deductible) : 0);
    if (checked) {
      const remaining = Math.max(0, deductible - Math.min(eWalletBalance, deductible));
      setSplit1Amt(remaining); setSplit2Amt(0);
    }
  }

  // ── Pay mode handler ──────────────────────────────────────────────────────────
  function handlePayModeChange(m: "Single" | "Split") {
    setPayMode(m);
    setSplit1Amt(payingNow); setSplit2Amt(0);
  }

  // ── Confirm & Pay ─────────────────────────────────────────────────────────────
  async function handleCompletePayment() {
    const methods: Record<string, number> = {};
    if (useEWallet && eWalletAmt > 0) methods["eWallet"] = eWalletAmt;

    if (payMode === "Split") {
      if (split1Amt > 0) methods[split1Method] = split1Amt;
      if (split2Amt > 0) methods[split2Method] = split2Amt;
    } else {
      methods[singleMethod] = payingNow;
    }

    const methodLabel = payMode === "Split"
      ? `${split1Method}+${split2Method}`
      : singleMethod;

    const totalPaid = Object.values(methods).reduce((a, b) => a + b, 0);

    // Accumulate paid across multiple partial payments (collect-due flow)
    const accumulatedPaid = collectDue ? (booking.payingNow || 0) + totalPaid : totalPaid;
    const remainingDue    = collectDue ? 0 : dueNow;
    const newPayStatus: PaymentStatus = remainingDue > 0 ? "Partial" : "Paid";

    const updated: Booking = {
      ...booking,
      paymentStatus: newPayStatus,
      status: "Confirmed",
      paymentMode: singleMethod as any,
      payingNow: accumulatedPaid,
      dueAmount: remainingDue,
      couponCode: collectDue ? booking.couponCode : (couponApplied || undefined),
      couponDiscount: collectDue ? booking.couponDiscount : (couponDiscount || undefined),
      grandTotal: collectDue ? (booking.grandTotal || grandTotal) : effectiveTotal,
    };

    updateBooking(updated);

    // Save payment to backend — use any non-temp booking ID (same guard as SchedulerContext)
    const appointmentId = !String(booking.id).startsWith("b_") ? booking.id : undefined;
    const canSaveToApi = salonId && appointmentId;
    if (!canSaveToApi) console.warn("Payment not saved to API: salonId=", salonId, "bookingId=", booking.id);
    if (canSaveToApi) {
      try {
        await api.post(PAYMENT.BASE, {
          appointment_id: appointmentId,
          salon_id: salonId,
          client_id: booking.clientId && !String(booking.clientId).startsWith("b_") ? booking.clientId : undefined,
          gross_amount: collectDue ? (booking.grandTotal || grandTotal) : grandTotal,
          discount_amount: collectDue ? 0 : couponDiscount,
          ewallet_used: collectDue ? 0 : (useEWallet ? eWalletAmt : 0),
          net_amount: collectDue ? (booking.grandTotal || grandTotal) : effectiveTotal,
          paid_amount: totalPaid,
          due_amount: remainingDue,
          coupon_code: collectDue ? undefined : (couponApplied || undefined),
          payment_method: methodLabel.toLowerCase(),
          split_details: payMode === "Split" ? methods : undefined,
          status: remainingDue > 0 ? "partial" : "completed",
        });
      } catch (err) {
        console.error("Failed to save payment:", err);
      }
    }

    if (useEWallet && eWalletAmt > 0 && booking.clientId)
      deductEWallet(booking.clientId, eWalletAmt);

    if (booking.clientId && effectiveTotal > 0) {
      const pts = computePointsEarned(effectiveTotal);
      const wc  = computeEWalletCredit(pts);
      const nt  = getMembershipLabel(currentRevenue + effectiveTotal);
      setEarnedPoints(pts); setEarnedWallet(wc);
      setNewMembership(nt !== currentMembership ? nt : "");
      processPaymentRewards(booking.clientId, effectiveTotal);
    }

    setPaidMethods(methods);
    if (printReceipt) printBill(updated, methods, staffList);
    setPaid(true);
  }

  // ── Success screen ────────────────────────────────────────────────────────────
  if (paid) {
    return (
      <div className="pm-overlay">
        <div className="pm-modal">
          <div className="pm-success text-center p-4">
            <div style={{ fontSize: 56 }}>✅</div>
            <h4 className={`fw-bold mb-1 mt-2 ${dueNow > 0 ? "text-warning" : "text-success"}`}>
              {dueNow > 0 ? "Partial Payment Recorded" : "Payment Complete!"}
            </h4>
            <p className="text-muted mb-3">
              {booking.clientName} · ₹{payingNow.toFixed(2)} paid
              {dueNow > 0 && <span className="text-warning fw-semibold"> · ₹{dueNow.toFixed(2)} still due</span>}
            </p>
            <div className="d-flex flex-wrap gap-2 justify-content-center mb-3">
              {Object.entries(paidMethods).map(([m, a]) => (
                <Badge key={m} variant="success">{m}: ₹{a.toFixed(2)}</Badge>
              ))}
            </div>
            {booking.clientId && earnedPoints > 0 && (
              <div className="card border-0 bg-light rounded-3 p-3 mb-3 text-start">
                <div className="fw-bold mb-2">🎁 Rewards Earned</div>
                <div className="d-flex justify-content-between small mb-1">
                  <span>Points earned</span><span className="fw-semibold">+{earnedPoints} pts</span>
                </div>
                <div className="d-flex justify-content-between small">
                  <span>eWallet credited</span>
                  <span className="fw-semibold text-success">+₹{earnedWallet.toFixed(2)}</span>
                </div>
                {newMembership && newMembership !== "NA" && (
                  <div className="mt-2 fw-bold" style={{ color: getMembershipColor(newMembership) }}>
                    🎉 Upgraded to {newMembership} member!
                  </div>
                )}
              </div>
            )}
            <Button variant="dark" fullWidth onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Payment screen ────────────────────────────────────────────────────────────
  return (
    <div className="pm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pm-modal">

        {/* Header */}
        <div className="pm-header d-flex align-items-center justify-content-between px-4 py-3 border-bottom">
          <div className="d-flex align-items-center gap-2">
            <span className="fs-4">💳</span>
            <div>
              <div className="fw-bold">Complete Payment</div>
              <div className="text-muted small">{booking.clientName} · {formatTime12(booking.startTime)}</div>
            </div>
          </div>
          <button className="btn btn-sm btn-link text-dark text-decoration-none fs-5 p-0" onClick={onClose}>✕</button>
        </div>

        <div className="pm-body p-4 d-flex flex-column gap-3">

          {/* Loyalty snapshot */}
          {clientStat && (
            <div className="d-flex border rounded-3 overflow-hidden">
              {[
                { label: "Membership", value: currentMembership === "NA" ? "—" : `⭐ ${currentMembership}`, color: getMembershipColor(currentMembership) },
                { label: "Points",     value: `${currentPoints} pts`,          color: "#111827" },
                { label: "eWallet",    value: `₹${eWalletBalance.toFixed(2)}`, color: "#111827" },
                ...(nextTier ? [{ label: `→ ${nextTier.name}`, value: `₹${nextTier.remaining.toLocaleString()} more`, color: "#6b7280" }] : []),
              ].map((item, i, arr) => (
                <div key={item.label} className={`flex-fill d-flex flex-column align-items-center py-2 px-1${i < arr.length - 1 ? " border-end" : ""}`}>
                  <span className="text-uppercase text-muted fw-bold mb-1" style={{ fontSize: 9, letterSpacing: "0.04em" }}>{item.label}</span>
                  <span className="fw-bold" style={{ fontSize: 12, color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Collect-due banner */}
          {collectDue && (
            <div className="alert alert-warning py-2 px-3 mb-0 small fw-semibold">
              ⏳ Collecting outstanding balance — Previously paid: ₹{(booking.payingNow || 0).toFixed(2)}
            </div>
          )}

          {/* Bill summary */}
          <div className="card border rounded-3">
            <div className="card-body p-0">
              {booking.services?.map((s) => (
                <div key={s.id} className="d-flex justify-content-between px-3 py-2 border-bottom small">
                  <span>{s.service}{s.qty > 1 && <span className="text-muted"> ×{s.qty}</span>}{s.staff && <span className="text-muted fst-italic"> · {s.staff}</span>}</span>
                  <span className="fw-semibold">₹{(s.total || s.price * s.qty).toFixed(2)}</span>
                </div>
              ))}
              {booking.packageItems?.map((p) => (
                <div key={p.id} className="d-flex justify-content-between px-3 py-2 border-bottom small">
                  <span>{p.packageName} <Badge variant="warning" className="ms-1">PKG</Badge></span>
                  <span className="fw-semibold">₹{(p.total || p.price * p.qty).toFixed(2)}</span>
                </div>
              ))}
              {couponDiscount > 0 && (
                <div className="d-flex justify-content-between px-3 py-2 border-bottom small text-success">
                  <span>Coupon <Badge variant="success">{couponApplied}</Badge></span>
                  <span>−₹{couponDiscount.toFixed(2)}</span>
                </div>
              )}
              {useEWallet && eWalletAmt > 0 && (
                <div className="d-flex justify-content-between px-3 py-2 border-bottom small text-primary">
                  <span>eWallet</span><span>−₹{eWalletAmt.toFixed(2)}</span>
                </div>
              )}
              <div className="d-flex justify-content-between px-3 py-3 fw-bold"
                style={{ background: "#111827", color: "#fff", borderRadius: "0 0 8px 8px" }}>
                <span>{collectDue ? "Outstanding Balance" : "Amount to Pay"}</span>
                <span>₹{payingNow.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Rewards preview */}
          {effectiveTotal > 0 && (
            <div className="alert alert-warning py-2 px-3 mb-0 small">
              🎁 Earn <strong>{previewPoints} pts</strong> → ₹{previewWallet.toFixed(2)} eWallet credit
              {willUpgrade && (
                <span className="fw-bold ms-1" style={{ color: getMembershipColor(previewMembership) }}>
                  · Upgrades to {previewMembership}!
                </span>
              )}
            </div>
          )}

          {/* Coupon */}
          <div>
            <label className="form-label fw-semibold text-uppercase text-muted" style={{ fontSize: 11 }}>
              Coupon Code
            </label>
            {couponApplied ? (
              <div className="d-flex align-items-center gap-2 p-2 border border-success rounded-3 bg-light">
                <span className="text-success fw-semibold small">✓ "{couponApplied}" — ₹{couponDiscount.toFixed(2)} off</span>
                <button className="btn btn-sm btn-link text-danger p-0 ms-auto text-decoration-none" onClick={handleRemoveCoupon}>✕ Remove</button>
              </div>
            ) : (
              <>
                <div className="input-group input-group-sm">
                  <input
                    className="form-control"
                    placeholder="Enter coupon code (e.g. SAVE10)"
                    value={couponInput}
                    onChange={(e) => { setCouponInput(e.target.value); setCouponError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                  />
                  <Button variant="dark" size="sm" onClick={handleApplyCoupon} disabled={couponLoading}>
                    {couponLoading ? "…" : "Apply"}
                  </Button>
                </div>
                {couponMsg   && <div className="text-success mt-1 small fw-semibold">✓ {couponMsg}</div>}
                {couponError && <div className="text-danger  mt-1 small">{couponError}</div>}
                <div className="text-muted mt-1" style={{ fontSize: 11 }}>
                  Try: SAVE10 · FLAT50 · NEW20 · WELCOME · VIP30
                </div>
              </>
            )}
          </div>

          {/* eWallet */}
          {eWalletBalance > 0 && (
            <div className={`rounded-3 p-3 border ${canUseEWallet ? "border-primary bg-light" : "bg-light"}`}>
              {canUseEWallet ? (
                <>
                  <div className="form-check">
                    <input type="checkbox" className="form-check-input" id="ewallet"
                      checked={useEWallet} onChange={(e) => handleEWalletToggle(e.target.checked)} />
                    <label className="form-check-label fw-semibold text-primary" htmlFor="ewallet">
                      Use eWallet (Available: ₹{eWalletBalance.toFixed(2)})
                    </label>
                  </div>
                  {useEWallet && (
                    <div className="text-primary small mt-1 fw-semibold">
                      ✓ Applying ₹{eWalletAmt.toFixed(2)} from eWallet
                    </div>
                  )}
                </>
              ) : (
                <div className="small text-muted">
                  🔒 eWallet: ₹{eWalletBalance.toFixed(2)} — Redeemable at ₹{EWALLET_REDEEM_MINIMUM}
                </div>
              )}
            </div>
          )}

          {/* Payment Method */}
          <div>
            <label className="form-label fw-semibold text-uppercase text-muted" style={{ fontSize: 11 }}>
              Payment Method <span className="text-danger">*</span>
            </label>

            {/* Single / Split tabs */}
            <div className="d-flex gap-2 mb-3">
              {(["Single", "Split"] as const).map((m) => (
                <button key={m} onClick={() => handlePayModeChange(m)}
                  className={`btn btn-sm ${payMode === m ? "btn-dark" : "btn-outline-secondary"}`}
                  style={{ minWidth: 70 }}>
                  {m}
                </button>
              ))}
            </div>

            {/* Single method */}
            {payMode === "Single" && (
              <>
                <div className="d-flex gap-2 mb-3">
                  {SINGLE_METHODS.map((m) => (
                    <button key={m} onClick={() => setSingleMethod(m)}
                      className={`btn btn-sm d-flex align-items-center gap-1 ${singleMethod === m ? "btn-dark" : "btn-outline-secondary"}`}>
                      <span>{METHOD_ICON[m]}</span> {m}
                    </button>
                  ))}
                </div>

                {singleMethod === "UPI" && (
                  <input className="form-control form-control-sm" placeholder="Enter UPI ID (e.g. name@upi)"
                    value={upiId} onChange={(e) => setUpiId(e.target.value)} />
                )}
                {singleMethod === "Card" && (
                  <div className="d-flex flex-column gap-2">
                    <input className="form-control form-control-sm" placeholder="Card Number"
                      maxLength={19} value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim())} />
                    <div className="d-flex gap-2">
                      <input className="form-control form-control-sm" placeholder="MM/YY"
                        maxLength={5} value={cardExpiry}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, "");
                          setCardExpiry(v.length >= 3 ? `${v.slice(0, 2)}/${v.slice(2, 4)}` : v);
                        }} />
                      <input className="form-control form-control-sm" placeholder="CVV"
                        maxLength={4} type="password" value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))} />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Split method */}
            {payMode === "Split" && (
              <div className="card border rounded-3 p-3">
                {([
                  { method: split1Method, amt: split1Amt, setMethod: setSplit1Method, setAmt: setSplit1Amt, other: split2Amt, setOther: setSplit2Amt, label: "Method 1" },
                  { method: split2Method, amt: split2Amt, setMethod: setSplit2Method, setAmt: setSplit2Amt, other: split1Amt, setOther: setSplit1Amt, label: "Method 2" },
                ] as const).map((row) => (
                  <div key={row.label} className="mb-3">
                    <div className="small fw-semibold text-muted mb-1">{row.label}</div>
                    <div className="d-flex gap-2 mb-2">
                      {SINGLE_METHODS.map((m) => (
                        <button key={m} onClick={() => row.setMethod(m)}
                          className={`btn btn-sm d-flex align-items-center gap-1 ${row.method === m ? "btn-dark" : "btn-outline-secondary"}`}>
                          <span>{METHOD_ICON[m]}</span> {m}
                        </button>
                      ))}
                    </div>
                    <input type="number" className="form-control form-control-sm" placeholder="Amount"
                      value={row.amt || ""}
                      onChange={(e) => {
                        const v = Math.max(0, parseFloat(e.target.value) || 0);
                        row.setAmt(v);
                        row.setOther(Math.max(0, effectiveTotal - v));
                      }} />
                  </div>
                ))}
                <div className={`small fw-semibold ${splitValid ? "text-success" : "text-danger"}`}>
                  Total: ₹{(split1Amt + split2Amt).toFixed(2)}
                  {!splitValid && <span className="ms-1">(must equal ₹{effectiveTotal.toFixed(2)})</span>}
                </div>
              </div>
            )}
          </div>

          {/* Partial payment toggle */}
          {!collectDue && effectiveTotal > 0 && (
            <div className="border rounded-3 p-3">
              <div className="form-check mb-0">
                <input type="checkbox" className="form-check-input" id="partialMode"
                  checked={isPartialMode}
                  onChange={(e) => { setIsPartialMode(e.target.checked); setPartialAmt(0); }} />
                <label className="form-check-label small fw-semibold" htmlFor="partialMode">
                  Partial payment (collect remaining later)
                </label>
              </div>
              {isPartialMode && (
                <div className="mt-2">
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    placeholder={`Amount to pay now (max ₹${effectiveTotal.toFixed(2)})`}
                    min={0.01}
                    max={effectiveTotal - 0.01}
                    step={0.01}
                    value={partialAmt || ""}
                    onChange={(e) => setPartialAmt(Math.min(parseFloat(e.target.value) || 0, effectiveTotal - 0.01))}
                  />
                  {dueNow > 0 && (
                    <div className="text-warning small fw-semibold mt-1">
                      ⏳ ₹{dueNow.toFixed(2)} will remain due
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Print receipt checkbox */}
          <div className="form-check">
            <input type="checkbox" className="form-check-input" id="printReceipt"
              checked={printReceipt} onChange={(e) => setPrintReceipt(e.target.checked)} />
            <label className="form-check-label small text-muted" htmlFor="printReceipt">
              Print receipt after payment
            </label>
          </div>

          {/* Confirm & Pay */}
          <Button
            variant={isPartial ? "warning" : "success"}
            fullWidth
            size="lg"
            iconLeft="💳"
            onClick={handleCompletePayment}
            disabled={!canPay}
            autoDisable
            successLabel="✓ Payment Done"
          >
            {collectDue ? `Collect Due — ₹${payingNow.toFixed(2)}`
              : isPartial ? `Confirm Partial — ₹${payingNow.toFixed(2)} (₹${dueNow.toFixed(2)} due)`
              : `Confirm & Pay — ₹${payingNow.toFixed(2)}`}
          </Button>

        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
