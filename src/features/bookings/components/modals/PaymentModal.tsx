import React, { useState } from "react";
import type { Booking } from "../../types/scheduler-types";
import { STAFF_LIST } from "../../utils/schedulerMockData";
import { useSchedulerContext } from "../../store/SchedulerContext";
import { formatTime12 } from "../../utils/timeUtils";
import { computePointsEarned, computeEWalletCredit, EWALLET_REDEEM_MINIMUM, MEMBERSHIP_TIERS } from "../../../../store/schedulerSlice";
import Button from "../../../../components/ui/Button";
import Badge from "../../../../components/ui/Badge";
import "../../styles/PaymentModal.scss";

interface Props { booking: Booking; onClose: () => void }

type PayMethod = "Cash" | "Card" | "UPI" | "Cash+Card" | "Cash+UPI" | "Card+UPI";
const PAY_METHODS: PayMethod[] = ["Cash", "Card", "UPI", "Cash+Card", "Cash+UPI", "Card+UPI"];
const COUPON_CODES: Record<string, number> = { SAVE10: 10, FLAT50: 50, NEW20: 20 };

function isSplit(m: PayMethod) { return m.includes("+"); }
function splitParts(m: PayMethod): [string, string] { const [a, b] = m.split("+"); return [a, b]; }
function getMembershipLabel(r: number) { if (r >= MEMBERSHIP_TIERS.Platinum) return "Platinum"; if (r >= MEMBERSHIP_TIERS.Gold) return "Gold"; if (r >= MEMBERSHIP_TIERS.Silver) return "Silver"; return "NA"; }
function getMembershipColor(t: string) { if (t === "Platinum") return "#7c3aed"; if (t === "Gold") return "#d97706"; if (t === "Silver") return "#64748b"; return "#9ca3af"; }
function getNextTier(r: number) { if (r < MEMBERSHIP_TIERS.Silver) return { name: "Silver", remaining: MEMBERSHIP_TIERS.Silver - r }; if (r < MEMBERSHIP_TIERS.Gold) return { name: "Gold", remaining: MEMBERSHIP_TIERS.Gold - r }; if (r < MEMBERSHIP_TIERS.Platinum) return { name: "Platinum", remaining: MEMBERSHIP_TIERS.Platinum - r }; return null; }

function printBill(booking: Booking, paidMethods: Record<string, number>) {
  const staffName = STAFF_LIST.find((s) => s.id === booking.staffId)?.name || "—";
  const methodStr = Object.entries(paidMethods).map(([m, a]) => `${m}: ₹${a.toFixed(2)}`).join(", ");
  const serviceRows = booking.services.map((s) => `<tr><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0">${s.service}</td><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;color:#6b7280">${s.staff || staffName}</td><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;text-align:center">${s.qty}</td><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">₹${(s.total || 0).toFixed(2)}</td></tr>`).join("");
  const pkgRows = (booking.packageItems || []).map((p) => `<tr><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0">${p.packageName} <span style="font-size:10px;color:#f59e0b">[PKG]</span></td><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;color:#6b7280">—</td><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;text-align:center">${p.qty}</td><td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">₹${(p.total || 0).toFixed(2)}</td></tr>`).join("");
  const html = `<!DOCTYPE html><html><head><title>Receipt</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif;padding:32px;color:#111;max-width:600px;margin:0 auto}</style></head><body><div style="text-align:center;margin-bottom:24px"><div style="font-size:26px;font-weight:800">SalonOx</div><div style="font-size:13px;color:#6b7280;margin-top:4px">Payment Receipt</div></div><table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px"><thead><tr style="background:#1f2937;color:#fff"><th style="padding:9px 10px;text-align:left">Service</th><th style="padding:9px 10px;text-align:left">Staff</th><th style="padding:9px 10px;text-align:center">Qty</th><th style="padding:9px 10px;text-align:right">Amount</th></tr></thead><tbody>${serviceRows}${pkgRows}</tbody></table><div style="display:flex;justify-content:flex-end"><div style="width:260px">${booking.discount ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;padding:4px 0"><span>Subtotal</span><span>₹${(booking.subtotal||0).toFixed(2)}</span></div>` : ""}<div style="display:flex;justify-content:space-between;font-size:17px;font-weight:800;border-top:2px solid #1f2937;padding-top:10px;margin-top:6px"><span>Grand Total</span><span>₹${(booking.grandTotal||0).toFixed(2)}</span></div><div style="display:flex;justify-content:space-between;font-size:12px;color:#22c55e;margin-top:6px;font-weight:600"><span>Payment</span><span>${methodStr}</span></div><div style="background:#22c55e;color:#fff;text-align:center;padding:6px;border-radius:6px;margin-top:10px;font-weight:700;font-size:13px">✓ PAID</div></div></div><div style="text-align:center;margin-top:28px;font-size:11px;color:#9ca3af">Thank you for visiting SalonOx! 🌸</div></body></html>`;
  const win = window.open("", "_blank", "width=700,height=650");
  if (!win) { alert("Please allow popups."); return; }
  win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 500);
}

const PaymentModal: React.FC<Props> = ({ booking, onClose }) => {
  const { updateBooking, clientStats, deductEWallet, processPaymentRewards } = useSchedulerContext();
  const clientStat      = clientStats.find((c) => c.clientId === booking.clientId);
  const eWalletBalance  = clientStat?.ewalletAmt       ?? 0;
  const currentRevenue  = clientStat?.totalRevenue      ?? 0;
  const currentPoints   = clientStat?.rewardPointsTotal ?? 0;
  const currentMembership = clientStat?.membership ?? "NA";
  const grandTotal      = booking.grandTotal || 0;
  const remaining       = Math.max(0, grandTotal - (booking.payingNow || 0));

  const [payMethod,     setPayMethod]     = useState<PayMethod>("Cash");
  const [useEWallet,    setUseEWallet]    = useState(false);
  const [eWalletAmt,    setEWalletAmt]    = useState(0);
  const [amt1,          setAmt1]          = useState<number>(remaining);
  const [amt2,          setAmt2]          = useState<number>(0);
  const [couponInput,   setCouponInput]   = useState(booking.couponCode || "");
  const [couponDiscount,setCouponDiscount]= useState(booking.couponDiscount || 0);
  const [couponApplied, setCouponApplied] = useState(booking.couponCode || "");
  const [couponError,   setCouponError]   = useState("");
  const [paid,          setPaid]          = useState(false);
  const [paidMethods,   setPaidMethods]   = useState<Record<string, number>>({});
  const [earnedPoints,  setEarnedPoints]  = useState(0);
  const [earnedWallet,  setEarnedWallet]  = useState(0);
  const [newMembership, setNewMembership] = useState("");

  const effectiveTotal = Math.max(0, grandTotal - couponDiscount - (useEWallet ? eWalletAmt : 0));
  const previewPoints  = computePointsEarned(effectiveTotal);
  const previewWalletCredit = computeEWalletCredit(previewPoints);
  const previewNewRevenue = currentRevenue + effectiveTotal;
  const previewNewMembership = getMembershipLabel(previewNewRevenue);
  const willUpgrade = previewNewMembership !== currentMembership && previewNewMembership !== "NA";
  const nextTier = getNextTier(currentRevenue);
  const canUseEWallet = eWalletBalance >= EWALLET_REDEEM_MINIMUM;

  function handleApplyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (COUPON_CODES[code] !== undefined) { setCouponDiscount(COUPON_CODES[code]); setCouponApplied(code); setCouponError(""); }
    else { setCouponDiscount(0); setCouponApplied(""); setCouponError("Invalid coupon code"); }
  }

  function handleEWalletToggle(checked: boolean) {
    setUseEWallet(checked);
    setEWalletAmt(checked ? Math.min(eWalletBalance, Math.max(0, grandTotal - couponDiscount)) : 0);
  }

  function handleMethodChange(m: PayMethod) { setPayMethod(m); setAmt1(effectiveTotal); setAmt2(0); }

  function handleCompletePayment() {
    const methods: Record<string, number> = {};
    if (useEWallet && eWalletAmt > 0) methods["eWallet"] = eWalletAmt;
    if (isSplit(payMethod)) { const [p1, p2] = splitParts(payMethod); if (amt1 > 0) methods[p1] = amt1; if (amt2 > 0) methods[p2] = amt2; }
    else { methods[payMethod] = effectiveTotal; }
    const totalPaid = Object.values(methods).reduce((a, b) => a + b, 0);
    const updated = { ...booking, paymentStatus: "Paid" as const, status: "Confirmed" as const, paymentMode: payMethod as any, payingNow: totalPaid, dueAmount: 0, couponCode: couponApplied, couponDiscount, grandTotal: effectiveTotal };
    updateBooking(updated);
    setPaidMethods(methods);
    printBill(updated, methods);
    if (useEWallet && eWalletAmt > 0 && booking.clientId) deductEWallet(booking.clientId, eWalletAmt);
    if (booking.clientId && effectiveTotal > 0) {
      const pts = computePointsEarned(effectiveTotal);
      const wc  = computeEWalletCredit(pts);
      const nt  = getMembershipLabel(currentRevenue + effectiveTotal);
      setEarnedPoints(pts); setEarnedWallet(wc); setNewMembership(nt !== currentMembership ? nt : "");
      processPaymentRewards(booking.clientId, effectiveTotal);
    }
    setPaid(true);
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  if (paid) {
    return (
      <div className="pm-overlay">
        <div className="pm-modal">
          <div className="pm-success text-center p-4">
            <div className="display-4 mb-2">✅</div>
            <h4 className="fw-bold text-success mb-1">Payment Complete!</h4>
            <p className="text-muted mb-3">{booking.clientName} · ₹{effectiveTotal.toFixed(2)}</p>
            <div className="d-flex flex-wrap gap-2 justify-content-center mb-3">
              {Object.entries(paidMethods).map(([m, a]) => (
                <Badge key={m} variant="success">{m}: ₹{a.toFixed(2)}</Badge>
              ))}
            </div>
            {booking.clientId && earnedPoints > 0 && (
              <div className="card border-0 bg-light rounded-3 p-3 mb-3 text-start">
                <div className="fw-bold mb-2">🎁 Rewards Earned</div>
                <div className="d-flex justify-content-between small mb-1"><span>Points earned</span><span className="fw-semibold">+{earnedPoints} pts</span></div>
                <div className="d-flex justify-content-between small"><span>eWallet credited</span><span className="fw-semibold text-success">+₹{earnedWallet.toFixed(2)}</span></div>
                {newMembership && newMembership !== "NA" && (
                  <div className="mt-2 fw-bold" style={{ color: getMembershipColor(newMembership) }}>🎉 Upgraded to {newMembership} member!</div>
                )}
              </div>
            )}
            <Button variant="dark" fullWidth onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Payment screen ─────────────────────────────────────────────────────────
  return (
    <div className="pm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pm-modal">
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
                { label: "Points",     value: `${currentPoints} pts`,       color: "#111827" },
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
              {booking.discount ? (
                <div className="d-flex justify-content-between px-3 py-2 border-bottom small text-danger">
                  <span>Discount</span><span>−₹{((booking.subtotal || 0) - (booking.taxableAmount || 0)).toFixed(2)}</span>
                </div>
              ) : null}
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
              <div className="d-flex justify-content-between px-3 py-3 fw-bold" style={{ background: "#111827", color: "#fff", borderRadius: "0 0 8px 8px" }}>
                <span>Amount to Pay</span><span>₹{effectiveTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Rewards preview */}
          {effectiveTotal > 0 && (
            <div className="alert alert-warning py-2 px-3 mb-0 small">
              🎁 Earn <strong>{previewPoints} pts</strong> → ₹{previewWalletCredit.toFixed(2)} eWallet credit
              {willUpgrade && <span className="fw-bold ms-1" style={{ color: getMembershipColor(previewNewMembership) }}>· Upgrades to {previewNewMembership}!</span>}
            </div>
          )}

          {/* Coupon */}
          <div>
            <label className="form-label fw-semibold text-uppercase text-muted" style={{ fontSize: 11 }}>Coupon Code</label>
            <div className="input-group input-group-sm">
              <input className="form-control" placeholder="SAVE10, FLAT50, NEW20" value={couponInput}
                onChange={(e) => { setCouponInput(e.target.value); setCouponError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()} />
              <Button variant="dark" size="sm" onClick={handleApplyCoupon}>Apply</Button>
            </div>
            {couponApplied && <div className="text-success mt-1 small fw-semibold">✓ "{couponApplied}" applied — ₹{couponDiscount} off</div>}
            {couponError  && <div className="text-danger mt-1 small">{couponError}</div>}
          </div>

          {/* eWallet */}
          {eWalletBalance > 0 && (
            <div className={`rounded-3 p-3 border ${canUseEWallet ? "border-primary bg-light" : "bg-light"}`}>
              {canUseEWallet ? (
                <>
                  <div className="form-check">
                    <input type="checkbox" className="form-check-input" id="ewallet" checked={useEWallet} onChange={(e) => handleEWalletToggle(e.target.checked)} />
                    <label className="form-check-label fw-semibold text-primary" htmlFor="ewallet">Use eWallet (Available: ₹{eWalletBalance.toFixed(2)})</label>
                  </div>
                  {useEWallet && <div className="text-primary small mt-1 fw-semibold">✓ Applying ₹{eWalletAmt.toFixed(2)} from eWallet</div>}
                </>
              ) : (
                <div className="small text-muted">🔒 eWallet: ₹{eWalletBalance.toFixed(2)} — Redeemable at ₹{EWALLET_REDEEM_MINIMUM}</div>
              )}
            </div>
          )}

          {/* Payment method */}
          <div>
            <label className="form-label fw-semibold text-uppercase text-muted" style={{ fontSize: 11 }}>Payment Method</label>
            <div className="d-flex flex-wrap gap-2">
              {PAY_METHODS.map((m) => (
                <button key={m} onClick={() => handleMethodChange(m)}
                  className={`btn btn-sm ${payMethod === m ? "btn-dark" : "btn-outline-secondary"}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Split amounts */}
          {isSplit(payMethod) && (
            <div className="card border rounded-3 p-3">
              <div className="row g-3">
                {splitParts(payMethod).map((part, idx) => (
                  <div key={part} className="col">
                    <label className="form-label fw-semibold text-uppercase text-muted" style={{ fontSize: 11 }}>{part} Amount</label>
                    <input type="text" inputMode="numeric" className="form-control form-control-sm"
                      value={idx === 0 ? (amt1 || "") : (amt2 || "")}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0;
                        if (idx === 0) { setAmt1(v); setAmt2(Math.max(0, effectiveTotal - v)); }
                        else { setAmt2(v); setAmt1(Math.max(0, effectiveTotal - v)); }
                      }} />
                  </div>
                ))}
              </div>
              <div className="mt-2 small fw-semibold">
                Total: ₹{(amt1 + amt2).toFixed(2)}
                {Math.abs(amt1 + amt2 - effectiveTotal) > 0.01 && (
                  <span className="text-danger ms-2">(must equal ₹{effectiveTotal.toFixed(2)})</span>
                )}
              </div>
            </div>
          )}

          {/* Confirm button */}
          <Button variant="success" fullWidth size="lg"
            onClick={handleCompletePayment}
            disabled={isSplit(payMethod) && Math.abs(amt1 + amt2 - effectiveTotal) > 0.01}
          >
            Confirm &amp; Pay — ₹{effectiveTotal.toFixed(2)}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;