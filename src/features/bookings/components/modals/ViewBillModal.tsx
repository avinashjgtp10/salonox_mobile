import React, { useState, useRef, useEffect, useMemo } from "react";
import { useCurrency } from "../../../../hooks/useCurrency";
import type { Booking } from "../../types/scheduler-types";
import { useSchedulerContext } from "../../store/SchedulerContext";
import { useAppSelector } from "../../../../hooks/useAppRedux";
import { formatTime12 } from "../../utils/timeUtils";
import Badge from "../../../../components/ui/Badge";
import { getActiveTaxes } from "../../../settings/utils/taxSettings";
import { getTaxModuleConfig } from "../../../settings/utils/taxModuleSettings";
import { computeTotals } from "../../utils/totalsUtils";
import { useClientDetails } from "../../hooks/useClientDetails";
import { useClientMembershipWallet } from "../../hooks/useClientMembershipWallet";
import { useListClientPackagesQuery } from "../../../../services/api/endpoints/packages.endpoints";
import { printReceipt } from "../../utils/receipt";
import { normalizePaymentStatus } from "../../utils/bookingMapper";
import { useFocusTrap } from "../../../../hooks/useFocusTrap";
import { computeBillBreakdown } from "../../../../components/shared/billBreakdown";
import "../../styles/ViewBillModal.scss";

interface Props { booking: Booking; onClose: () => void; onEdit?: (booking: Booking) => void; onCollectDue?: (booking: Booking) => void }

// Mirrors the rp-status-* badge palette in analytics/styles/_reportDetailBase.scss
// so this panel's status pill always matches the color/label shown for the same
// status in the Sales Summary report table.
// booking.date/billDate are YYYY-MM-DD strings (see toLocalDateStr in bookingMapper.ts);
// display them as DD-MM-YYYY per report side-panel formatting requirements.
function formatDateDMY(dateStr?: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return y && m && d ? `${d}-${m}-${y}` : dateStr;
}

const STATUS_PILL_STYLES: Record<string, { label: string; text: string; bg: string; color: string }> = {
  paid:      { label: "✓ Paid",      text: "Paid",      bg: "#22c55e", color: "#fff" },
  partial:   { label: "⏳ Partial",   text: "Partial",   bg: "#f59e0b", color: "#fff" },
  booked:    { label: "Booked",      text: "Booked",    bg: "#1d4ed8", color: "#fff" },
  cancelled: { label: "Cancelled",   text: "Cancelled", bg: "#991b1b", color: "#fff" },
  "no-show": { label: "No-show",     text: "No-show",   bg: "#6b7280", color: "#fff" },
  deleted:   { label: "Deleted",     text: "Deleted",   bg: "#9ca3af", color: "#fff" },
};

const ViewBillModal: React.FC<Props> = ({ booking, onClose, onEdit, onCollectDue }) => {
  const { currencySymbol, formatAmount } = useCurrency();
  const { staffList, clientsList } = useSchedulerContext();
  const currentSalon = useAppSelector((s) => s.salon.currentSalon);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true, onClose);
  const settingItems = useAppSelector((s) => s.setting.items);
  const activeTaxes  = useMemo(() => getActiveTaxes(settingItems), [settingItems]);
  const showTaxBreakupOnInvoice = useMemo(() => getTaxModuleConfig(settingItems).show_breakup_on_invoice, [settingItems]);
  const [tab, setTab] = useState<"Booking Details" | "Activity Log">("Booking Details");
  const [showDotMenu, setShowDotMenu] = useState(false);

  const dotMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDotMenu) return;
    function handleOutside(e: MouseEvent) {
      if (dotMenuRef.current && !dotMenuRef.current.contains(e.target as Node))
        setShowDotMenu(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showDotMenu]);

  const client = clientsList.find((c) => c.id === booking.clientId);

  // A receipt only makes sense once payment has actually been collected —
  // Booked/Cancelled/No Show/Deleted appointments have no completed transaction to print.
  const canPrintReceipt = booking.status === "paid" || booking.status === "partial";

  // ── Client's overall standing (reward points / active memberships / packages) ──
  // Distinct from the items purchased on THIS booking — this reflects the client's
  // current balance, shown "if had" on both the screen view and the printed receipt.
  const clientIdForExtras = booking.clientId && booking.clientId !== "walk-in" ? booking.clientId : undefined;
  const { stats: clientExtraStats } = useClientDetails(clientIdForExtras);
  const { memberships: clientActiveMemberships } = useClientMembershipWallet(clientIdForExtras);
  const { data: clientPkgsData } = useListClientPackagesQuery(
    { clientId: clientIdForExtras, status: "Active", limit: 50 },
    // See ClientPanel.tsx's identical option — avoids showing a stale
    // "no packages" cache hit for a package bought outside this query.
    { skip: !clientIdForExtras, refetchOnMountOrArgChange: true },
  );
  const activePackagesForBill = (clientPkgsData?.items ?? [])
    .filter((p) => p.status === "Active")
    .map((p) => ({
      packageName: p.packageName,
      remaining: p.services.reduce((s, sv) => s + sv.remainingSessions, 0),
      total: p.services.reduce((s, sv) => s + sv.totalSessions, 0),
    }))
    .filter((p) => p.remaining > 0);
  const activeMembershipsForBill = clientActiveMemberships.filter((m) => m.status === "active");
  const referralEarningsForBill = clientExtraStats?.referralEarnings ?? 0;
  const referralCodeForBill = clientExtraStats?.referralCode ?? null;

  // Use String() coercion so number IDs from the API match string IDs from the form
  const findStaffName = (id?: string | number | null) =>
    id ? staffList.find((s) => String(s.id) === String(id))?.name ?? "" : "";

  // Collect all unique staff names across all item types
  const allStaffNames = (() => {
    const seen = new Set<string>();
    const names: string[] = [];
    const ids = [
      booking.staffId,
      ...(booking.services || []).map((s: any) => s.staffId || s.staff_id),
    ].filter(Boolean);
    ids.forEach((id) => {
      const key = String(id);
      if (!seen.has(key)) {
        seen.add(key);
        const n = findStaffName(id as string);
        if (n) names.push(n);
      }
    });
    return names;
  })();

  const staffName = allStaffNames.join(", ") || "—";
  const payVariant = booking.status === "paid" ? ("success" as const) : booking.status === "partial" ? ("warning" as const) : ("danger" as const);
  // A real Package-covered booking is the ONLY case that should zero out this
  // whole display — detected the same explicit way bookingMapper.ts's own
  // isPackagePaid does (payment_method === "package"), never guessed from
  // symptoms. The previous "grandTotal === 0" / "payingNow === 0 && due === 0"
  // fallbacks were meant to catch stale data, but any bill fully covered by
  // non-cash credit (membership wallet, eWallet, reward points, referral —
  // paid_amount legitimately 0 with nothing due) satisfies that same
  // condition, so a real ₹1,147 membership-wallet-covered bill got same as a
  // ₹0 package and rendered every row and the Grand Total as ₹0.00.
  const isPackagePaid = String((booking as any).paymentMode || "").toLowerCase() === "package";

  return (
    <div className="vbm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="vbm-drawer" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="View Appointment">
        <style>{`@keyframes vbmSlideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* ── Left panel ── */}
        <div className="vbm-left">
          <div className="vbm-client-hero">
            <div className="vbm-avatar">{booking.clientName?.charAt(0) || "?"}</div>
            <div className="vbm-client-name">{booking.clientName || "Walk-In"}</div>
            <div className="vbm-client-phone">
              📞 {booking.clientPhone || client?.phone || "—"}
            </div>
            <div className="vbm-client-phone" style={{ fontSize: 12 }}>
              ✉️ {(booking as any).clientEmail || client?.email || "—"}
            </div>
            {client && <div className="vbm-ewallet"><span>💳 eWallet: {currencySymbol}{client.eWallet?.toFixed(2) || "0.00"}</span></div>}
          </div>

          <div className="vbm-section">
            <div className="vbm-section-label">Payment</div>
            <Badge variant={payVariant}>{normalizePaymentStatus(booking.status)}</Badge>
            <div className="vbm-pay-mode mt-1">Mode: <strong>{booking.paymentMode || "—"}</strong></div>
          </div>

          {(activeMembershipsForBill.length > 0 || activePackagesForBill.length > 0) && (
            <div className="vbm-section">
              <div className="vbm-section-label">🎁 Loyalty &amp; Memberships</div>
              {activeMembershipsForBill.map((m) => (
                <div className="vbm-info-row" key={m.id}>
                  <div className="vbm-info-row__label">Membership</div>
                  <div className="vbm-info-row__value">
                    {m.membershipName} ({currencySymbol}
                    {(m.pricingType === "percentage" ? (m.discountBalanceRemaining ?? 0) : m.membershipWalletBalance).toFixed(2)} left)
                  </div>
                </div>
              ))}
              {activePackagesForBill.map((p) => (
                <div className="vbm-info-row" key={p.packageName}>
                  <div className="vbm-info-row__label">Package</div>
                  <div className="vbm-info-row__value">{p.packageName} ({p.remaining}/{p.total} left)</div>
                </div>
              ))}
            </div>
          )}

          <div className="vbm-section">
            <div className="vbm-section-label">Appointment</div>
            {[
              ["📅 Date", formatDateDMY(booking.billDate || booking.date)],
              ["🕐 Time", `${formatTime12(booking.startTime)} – ${formatTime12(booking.endTime)}`],
              ["💼 Staff", staffName],
            ].map(([l, v]) => (
              <div key={l} className="vbm-info-row">
                <div className="vbm-info-row__label">{l}</div>
                <div className="vbm-info-row__value">{v}</div>
              </div>
            ))}
          </div>

          {(booking as any).staffAlert && (
            <div className="vbm-section">
              <div className="vbm-section-label">🔔 Staff Alert</div>
              <div className="vbm-notes-text">{(booking as any).staffAlert}</div>
            </div>
          )}

          {booking.notes && (
            <div className="vbm-section">
              <div className="vbm-section-label">📝 Notes</div>
              <div className="vbm-notes-text">{booking.notes}</div>
            </div>
          )}

          <div className="vbm-section">
            <div className="vbm-section-label">Summary</div>
            {[
              booking.subtotal       ? ["Subtotal", `${currencySymbol}${booking.subtotal.toFixed(2)}`, "#374151", false] : null,
              booking.discountAmount ? ["Discount", `−${currencySymbol}${booking.discountAmount.toFixed(2)}`, "#ef4444", false] : null,
              booking.couponDiscount ? [`Coupon (${booking.couponCode})`, `−${currencySymbol}${booking.couponDiscount.toFixed(2)}`, "#22c55e", false] : null,
              booking.referralDiscount ? ["Referral Discount", `−${currencySymbol}${booking.referralDiscount.toFixed(2)}`, "#22c55e", false] : null,
              booking.exCharges      ? ["Extra Charges", `${currencySymbol}${booking.exCharges.toFixed(2)}`, "#374151", false] : null,
              ["Total", `${currencySymbol}${(isPackagePaid ? 0 : (booking.grandTotal || 0)).toFixed(2)}`, "#111827", true],
              (booking.rewardPointsValue || 0) > 0 ? ["🎁 Paid from Reward Points", `${currencySymbol}${(booking.rewardPointsValue || 0).toFixed(2)}`, "#7c3aed", false] : null,
              ["Paid",  `${currencySymbol}${(booking.payingNow || 0).toFixed(2)}`, "#111827", false],
              (booking.dueAmount || 0) > 0 ? ["Due", `${currencySymbol}${(booking.dueAmount || 0).toFixed(2)}`, "#ef4444", false] : null,
              // Display/record-only — never part of Total/Paid/Due above.
              booking.tipAmount      ? ["Staff Tip", `${currencySymbol}${booking.tipAmount.toFixed(2)}`, "#374151", false] : null,
            ].filter((row): row is [string, string, string, boolean] => row !== null).map(([l, v, c, bold]) => (
              <div key={l as string} className={`vbm-summary-row${bold ? " vbm-summary-row--bold" : ""}`} style={{ color: c as string }}>
                <span>{l as string}</span>
                <span>{v as string}</span>
              </div>
            ))}
          </div>

          {(booking.dueAmount || 0) > 0 && booking.status === "partial" && onCollectDue && (
            <div className="vbm-section">
              <button
                onClick={() => onCollectDue(booking)}
                style={{
                  width: "100%", background: "#f59e0b", color: "#fff",
                  border: "none", borderRadius: 8, padding: "10px 0",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}
              >
                ⏳ Collect Due — {currencySymbol}{(booking.dueAmount || 0).toFixed(2)}
              </button>
            </div>
          )}

          <div className="vbm-status-section">
            <div className="vbm-section-label">Status</div>
            {(() => {
              const pill = STATUS_PILL_STYLES[booking.status] ?? {
                label: booking.status,
                bg: "#7c3aed",
                color: "#fff",
              };
              return (
                <span
                  style={{
                    display: "inline-block",
                    padding: "5px 16px",
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 700,
                    color: pill.color,
                    background: pill.bg,
                  }}
                >
                  {pill.label}
                </span>
              );
            })()}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="vbm-right">
          <div className="vbm-header">
            <div className="vbm-header__left">
              <button className="vbm-close-btn btn btn-sm btn-link text-dark text-decoration-none" onClick={onClose}>✕</button>
              <div>
                <h2 className="vbm-header__title mb-0">View Appointment</h2>
                <div className="vbm-header__id text-muted small">
                  {(booking as any).invoiceNumber
                    ? String((booking as any).invoiceNumber)
                    : "Not billed yet"}
                </div>
              </div>
            </div>
            <div ref={dotMenuRef} style={{ position: "relative" }}>
              <button
                onClick={() => setShowDotMenu((v) => !v)}
                style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "5px 13px", cursor: "pointer", fontSize: 20, lineHeight: 1, color: "#374151", fontWeight: 700 }}
                title="More options"
              >⋮</button>
              {showDotMenu && (
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, boxShadow: "0 6px 24px rgba(0,0,0,0.13)", minWidth: 190, zIndex: 9999 }}>
                  <button
                    onClick={() => { setShowDotMenu(false); onEdit?.(booking); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#111827", borderRadius: canPrintReceipt ? "10px 10px 0 0" : 10, textAlign: "left" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <span>✏️</span> Edit Appointment
                  </button>
                  {canPrintReceipt && <div style={{ height: 1, background: "#f3f4f6" }} />}
                  {canPrintReceipt && <button
                    onClick={() => {
                      setShowDotMenu(false);
                      // If the booking was loaded from the backend it won't carry taxBreakdown
                      // (the backend doesn't persist/return that field). Re-derive it now from
                      // the active tax settings so the printed invoice always shows correct tax.
                      const existingBreakdown = (booking as any).taxBreakdown;
                      let printBooking: Booking = booking;
                      if ((!existingBreakdown || existingBreakdown.length === 0) && activeTaxes.length > 0) {
                        const toRow = (items: any[]) => items.map((i: any) => ({
                          price: Number(i.price || 0), qty: Number(i.qty || 1),
                          discount: Number(i.discount || 0), total: Number(i.total || i.price || 0),
                        }));
                        const totals = computeTotals({
                          serviceRows:    toRow(booking.services || []),
                          packageRows:    toRow((booking as any).packageItems || []),
                          productRows:    toRow((booking as any).productItems || []),
                          membershipRows: toRow((booking as any).membershipItems || []),
                          discountType:   (booking as any).discountType || "Flat (₹)",
                          discountValue:  Number((booking as any).discountAmount || 0),
                          taxes:          activeTaxes,
                          exCharges:      Number((booking as any).exCharges || 0),
                          tip:            Number((booking as any).tipAmount || 0),
                          couponDiscount: Number((booking as any).couponDiscount || 0),
                          referralDiscount: Number((booking as any).referralDiscount || 0),
                          eWalletUsed:    0,
                        });
                        printBooking = { ...booking, taxBreakdown: totals.taxBreakdown, gstAmount: totals.gstAmount } as any;
                      }
                      printReceipt(printBooking, staffList, currentSalon, {
                        ...client,
                        referralCode: referralCodeForBill,
                        referralEarnings: referralEarningsForBill,
                        activeMemberships: activeMembershipsForBill,
                        activePackages: activePackagesForBill,
                      }, { showTaxBreakup: showTaxBreakupOnInvoice, formatAmount });
                    }}
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#111827", borderRadius: "0 0 10px 10px", textAlign: "left" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <span>🖨️</span> Print Receipt
                  </button>}
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="vbm-tabs">
            <div className="vbm-tabs__inner">
              {(["Booking Details", "Activity Log"] as const).map((t) => (
                <button key={t} className={`vbm-tab-btn${tab === t ? " vbm-tab-btn--active" : ""}`} onClick={() => setTab(t)}>{t}</button>
              ))}
            </div>
          </div>

          <div className="vbm-body">
            {tab === "Booking Details" ? (
              <div className="vbm-cards">
                {booking.services.map((s, i) => {
                  const sAny = s as any;
                  const svcStaffName = (() => {
                    const byId = findStaffName(sAny.staffId);
                    if (byId) return byId;
                    const sf = sAny.staff;
                    if (sf && typeof sf === "object" && sf.name) return sf.name;
                    if (typeof sf === "string" && sf.trim()) return sf.trim();
                    return staffName;
                  })();
                  return (
                    <div key={i} className="vbm-service-card">
                      <div className="vbm-service-card__top">
                        <div>
                          <div className="vbm-service-card__name">{(s as any).name || s.service}</div>
                          <div className="vbm-service-card__sub">
                            {svcStaffName && <span>{svcStaffName}</span>}
                            {s.time && <span>{svcStaffName ? " · " : ""}{s.time}</span>}
                          </div>
                        </div>
                        <div className="vbm-service-card__total">{currencySymbol}{(isPackagePaid ? 0 : (s.total || 0) + (sAny.tax || 0)).toFixed(2)}</div>
                      </div>
                      <div className="vbm-service-card__pills">
                        {[["Qty", s.qty], ["Price", `${currencySymbol}${(s.price || 0).toFixed(2)}`], ["Disc", `${currencySymbol}${((s as any).discount || 0).toFixed(2)}`], ["Tax", `${currencySymbol}${(isPackagePaid ? 0 : (sAny.tax || 0)).toFixed(2)}`]].map(([lbl, val]) => (
                          <span key={lbl as string} className="vbm-pill">{lbl}: {val}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {(booking.packageItems || []).map((p, i) => (
                  <div key={i} className="vbm-service-card">
                    <div className="vbm-service-card__top">
                      <div>
                        <div className="vbm-service-card__name">{p.packageName || (p as any).name}</div>
                        <div className="vbm-service-card__sub">
                          <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 3 }}>PACKAGE</span>
                        </div>
                      </div>
                      <div className="vbm-service-card__total">{currencySymbol}{((p.total || p.price || 0) + ((p as any).tax || 0)).toFixed(2)}</div>
                    </div>
                    <div className="vbm-service-card__pills">
                      {[["Qty", p.qty || 1], ["Price", `${currencySymbol}${(p.price || 0).toFixed(2)}`], ["Disc", `${currencySymbol}${((p as any).discount || 0).toFixed(2)}`], ["Tax", `${currencySymbol}${((p as any).tax || 0).toFixed(2)}`]].map(([lbl, val]) => (
                        <span key={lbl as string} className="vbm-pill">{lbl}: {val}</span>
                      ))}
                    </div>
                  </div>
                ))}

                {((booking as any).productItems || (booking as any).products || []).map((p: any, i: number) => (
                  <div key={i} className="vbm-service-card">
                    <div className="vbm-service-card__top">
                      <div>
                        <div className="vbm-service-card__name">{p.productName || p.name}</div>
                        <div className="vbm-service-card__sub">
                          <span style={{ background: "#dbeafe", color: "#1d4ed8", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 3 }}>PRODUCT</span>
                        </div>
                      </div>
                      <div className="vbm-service-card__total">{currencySymbol}{((p.total || p.price || 0) + (p.tax || 0)).toFixed(2)}</div>
                    </div>
                    <div className="vbm-service-card__pills">
                      {[["Qty", p.qty || 1], ["Price", `${currencySymbol}${(p.price || 0).toFixed(2)}`], ["Disc", `${currencySymbol}${((p as any).discount || 0).toFixed(2)}`], ["Tax", `${currencySymbol}${(p.tax || 0).toFixed(2)}`]].map(([lbl, val]) => (
                        <span key={lbl as string} className="vbm-pill">{lbl}: {val}</span>
                      ))}
                    </div>
                  </div>
                ))}

                {((booking as any).membershipItems || (booking as any).memberships || []).map((m: any, i: number) => (
                  <div key={i} className="vbm-service-card">
                    <div className="vbm-service-card__top">
                      <div>
                        <div className="vbm-service-card__name">{m.membershipName || m.name}</div>
                        <div className="vbm-service-card__sub">
                          <span style={{ background: "#f0fdf4", color: "#15803d", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 3 }}>MEMBERSHIP</span>
                        </div>
                      </div>
                      <div className="vbm-service-card__total">{currencySymbol}{((m.total || m.price || 0) + (m.tax || 0)).toFixed(2)}</div>
                    </div>
                    <div className="vbm-service-card__pills">
                      {[["Qty", m.qty || 1], ["Price", `${currencySymbol}${(m.price || 0).toFixed(2)}`], ["Disc", `${currencySymbol}${((m as any).discount || 0).toFixed(2)}`], ["Tax", `${currencySymbol}${(m.tax || 0).toFixed(2)}`]].map(([lbl, val]) => (
                        <span key={lbl as string} className="vbm-pill">{lbl}: {val}</span>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="vbm-breakdown-card">
                  <div className="vbm-breakdown-card__title">Payment Breakdown</div>
                  {(() => {
                    const membershipDiscountAmount = (booking as any).membershipDiscountUsed || 0;
                    // Split for display only — the Discount Balance
                    // (percentage) share has its own ledger figure; Loyalty's
                    // share is derived as the remainder, since Loyalty never
                    // writes a ledger row of its own (no balance to track).
                    const membershipPercentageDiscountAmount = (booking as any).membershipPercentageDiscountUsed || 0;
                    const membershipLoyaltyDiscountAmount = Math.max(0, membershipDiscountAmount - membershipPercentageDiscountAmount);

                    const { rows } = computeBillBreakdown({
                      currencySymbol,
                      subtotal: booking.subtotal || 0,
                      couponDiscount: booking.couponDiscount || 0,
                      couponCode: booking.couponCode,
                      packageCoveredAmount: (booking as any).packageCoveredAmount || 0,
                      membershipPercentageDiscountAmount,
                      membershipLoyaltyDiscountAmount,
                      taxBreakdown: (booking as any).taxBreakdown,
                      legacyGstAmount: (booking as any).gstAmount || 0,
                      legacyGstRate: (booking as any).gst ?? 0,
                      exCharges: booking.exCharges || 0,
                      discountAmount: booking.discountAmount || 0,
                      referralDiscount: booking.referralDiscount || 0,
                      membershipWalletUsed: (booking as any).membershipWalletUsed || 0,
                      ewalletUsed: booking.ewalletUsed || 0,
                      rewardPointsValue: booking.rewardPointsValue || 0,
                      grandTotal: isPackagePaid ? 0 : (booking.grandTotal || 0),
                    });

                    return rows.map((row, i) => (
                      <div key={i} className="vbm-breakdown-row" style={{ color: row[2] }}>
                        <span>{row[0]}</span><span>{row[1]}</span>
                      </div>
                    ));
                  })()}
                  <div className="vbm-breakdown-row vbm-breakdown-row--grand"><span>Grand Total</span><span>{currencySymbol}{(isPackagePaid ? 0 : (booking.grandTotal || 0)).toFixed(2)}</span></div>
                  <div className="vbm-breakdown-row vbm-breakdown-row--paid"><span>Paid</span><span>{currencySymbol}{(booking.payingNow || 0).toFixed(2)}</span></div>
                  {(booking.dueAmount || 0) > 0 && (
                    <div className="vbm-breakdown-row vbm-breakdown-row--due"><span>Balance Due</span><span>{currencySymbol}{(booking.dueAmount || 0).toFixed(2)}</span></div>
                  )}
                  {/* Display/record-only — never part of Grand Total/Paid/Due above. */}
                  {(booking.tipAmount || 0) > 0 && (
                    <div className="vbm-breakdown-row"><span>Staff Tip</span><span>{currencySymbol}{(booking.tipAmount || 0).toFixed(2)}</span></div>
                  )}
                </div>
              </div>
            ) : (
              <div className="vbm-activity-card">
                <div className="vbm-activity-card__title">Activity Log</div>
                {[
                  { icon: "📅", label: "Appointment Created", detail: `${formatDateDMY(booking.billDate || booking.date)} · ${formatTime12(booking.startTime)} – ${formatTime12(booking.endTime)}` },
                  { icon: "👤", label: "Client", detail: [booking.clientName, booking.clientPhone, (booking as any).clientEmail].filter(Boolean).join(" · ") },
                  { icon: "💼", label: "Staff", detail: staffName },
                  { icon: "💳", label: "Payment Status", detail: normalizePaymentStatus(booking.status) },
                  { icon: "📋", label: "Booking Status", detail: STATUS_PILL_STYLES[booking.status]?.text ?? booking.status },
                  { icon: "💰", label: "Grand Total", detail: `${currencySymbol}${(isPackagePaid ? 0 : (booking.grandTotal || 0)).toFixed(2)}` },
                  ...(booking.payingNow ? [{ icon: "✅", label: "Amount Paid", detail: `${currencySymbol}${(booking.payingNow || 0).toFixed(2)}` }] : []),
                  ...(booking.dueAmount ? [{ icon: "⏳", label: "Balance Due", detail: `${currencySymbol}${(booking.dueAmount || 0).toFixed(2)}` }] : []),
                  ...((booking as any).staffAlert ? [{ icon: "🔔", label: "Staff Alert", detail: (booking as any).staffAlert }] : []),
                  ...(booking.notes ? [{ icon: "📝", label: "Notes", detail: booking.notes }] : []),
                ].map((entry, i, arr) => (
                  <div key={i} className={`vbm-log-entry${i < arr.length - 1 ? " vbm-log-entry--bordered" : ""}`}>
                    <div className="vbm-log-entry__icon">{entry.icon}</div>
                    <div className="vbm-log-entry__content">
                      <div className="vbm-log-entry__label">{entry.label}</div>
                      <div className="vbm-log-entry__detail">{entry.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewBillModal;