import React, { useState, useRef, useEffect, useMemo } from "react";
import { currencySymbol } from "../../utils/currency";
import type { Booking, BookingStatus } from "../../types/scheduler-types";
import { useSchedulerContext } from "../../store/SchedulerContext";
import { useAppSelector } from "../../../../hooks/useAppRedux";
import { formatTime12 } from "../../utils/timeUtils";
import Badge from "../../../../components/ui/Badge";
import { getActiveTaxes } from "../../../settings/utils/taxSettings";
import { computeTotals } from "../../utils/totalsUtils";
import { useClientDetails } from "../../hooks/useClientDetails";
import { useClientMembershipWallet } from "../../hooks/useClientMembershipWallet";
import { useListClientPackagesQuery } from "../../../../services/api/endpoints/packages.endpoints";
import { printReceipt } from "../../utils/receipt";
import { useFocusTrap } from "../../../../hooks/useFocusTrap";
import "../../styles/ViewBillModal.scss";

interface Props { booking: Booking; onClose: () => void; onEdit?: (booking: Booking) => void; onCollectDue?: (booking: Booking) => void }

const ViewBillModal: React.FC<Props> = ({ booking, onClose, onEdit, onCollectDue }) => {
  const { staffList, clientsList } = useSchedulerContext();
  const currentSalon = useAppSelector((s) => s.salon.currentSalon);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true, onClose);
  const settingItems = useAppSelector((s) => s.setting.items);
  const activeTaxes  = useMemo(() => getActiveTaxes(settingItems), [settingItems]);
  const [tab, setTab] = useState<"Booking Details" | "Activity Log">("Booking Details");
  const [showDotMenu, setShowDotMenu] = useState(false);

  const isPaid    = booking.paymentStatus === "Paid";
  const isPartial = booking.paymentStatus === "Partial" || (booking.dueAmount ?? 0) > 0;
  const bookingStatus: BookingStatus = isPaid && !isPartial ? "Completed" : "Due";
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

  // ── Client's overall standing (reward points / active memberships / packages) ──
  // Distinct from the items purchased on THIS booking — this reflects the client's
  // current balance, shown "if had" on both the screen view and the printed receipt.
  const clientIdForExtras = booking.clientId && booking.clientId !== "walk-in" ? booking.clientId : undefined;
  const { stats: clientExtraStats } = useClientDetails(clientIdForExtras);
  const { memberships: clientActiveMemberships } = useClientMembershipWallet(clientIdForExtras);
  const { data: clientPkgsData } = useListClientPackagesQuery(
    { clientId: clientIdForExtras, status: "Active", limit: 50 },
    { skip: !clientIdForExtras },
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
  const payVariant = booking.paymentStatus === "Paid" ? ("success" as const) : booking.paymentStatus === "Partial" ? ("warning" as const) : ("danger" as const);
  const _vbmGt = (booking as any).grandTotal;
  const isPackagePaid = (booking as any).paymentMode === "Package" ||
    (_vbmGt !== null && _vbmGt !== undefined && Number(_vbmGt) === 0) ||
    (booking.paymentStatus === "Paid" && Number(booking.payingNow) === 0 && Number(booking.dueAmount) === 0);

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
            <Badge variant={payVariant}>{booking.paymentStatus}</Badge>
            <div className="vbm-pay-mode mt-1">Mode: <strong>{booking.paymentMode || "—"}</strong></div>
          </div>

          {(activeMembershipsForBill.length > 0 || activePackagesForBill.length > 0) && (
            <div className="vbm-section">
              <div className="vbm-section-label">🎁 Loyalty &amp; Memberships</div>
              {activeMembershipsForBill.map((m) => (
                <div className="vbm-info-row" key={m.id}>
                  <div className="vbm-info-row__label">Membership</div>
                  <div className="vbm-info-row__value">{m.membershipName} ({currencySymbol}{m.membershipWalletBalance.toFixed(2)} left)</div>
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
              ["📅 Date", booking.billDate || booking.date],
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
              booking.tipAmount      ? ["Tip", `${currencySymbol}${booking.tipAmount.toFixed(2)}`, "#374151", false] : null,
              ["Total", `${currencySymbol}${(isPackagePaid ? 0 : (booking.grandTotal || 0)).toFixed(2)}`, "#111827", true],
              (booking.rewardPointsValue || 0) > 0 ? ["🎁 Paid from Reward Points", `${currencySymbol}${(booking.rewardPointsValue || 0).toFixed(2)}`, "#7c3aed", false] : null,
              ["Paid",  `${currencySymbol}${(booking.payingNow || 0).toFixed(2)}`, "#111827", false],
              (booking.dueAmount || 0) > 0 ? ["Due", `${currencySymbol}${(booking.dueAmount || 0).toFixed(2)}`, "#ef4444", false] : null,
            ].filter((row): row is [string, string, string, boolean] => row !== null).map(([l, v, c, bold]) => (
              <div key={l as string} className={`vbm-summary-row${bold ? " vbm-summary-row--bold" : ""}`} style={{ color: c as string }}>
                <span>{l as string}</span>
                <span>{v as string}</span>
              </div>
            ))}
          </div>

          {(booking.dueAmount || 0) > 0 && booking.paymentStatus === "Partial" && onCollectDue && (
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
            <span
              style={{
                display: "inline-block",
                padding: "5px 16px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 700,
                color: "#fff",
                background: bookingStatus === "Completed" ? "#22c55e" : "#7c3aed",
              }}
            >
              {bookingStatus === "Completed" ? "✓ Completed" : "⏳ Partial"}
            </span>
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
                  #{(booking as any).invoiceNumber
                    ? String((booking as any).invoiceNumber).padStart(5, "0")
                    : String(booking.id).slice(0, 8).toUpperCase()}
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
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#111827", borderRadius: "10px 10px 0 0", textAlign: "left" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <span>✏️</span> Edit Appointment
                  </button>
                  <div style={{ height: 1, background: "#f3f4f6" }} />
                  <button
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
                          couponDiscount: Number((booking as any).couponDiscount || 0) + Number((booking as any).referralDiscount || 0),
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
                      });
                    }}
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#111827", borderRadius: "0 0 10px 10px", textAlign: "left" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <span>🖨️</span> Print Receipt
                  </button>
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
                        <div className="vbm-service-card__total">{currencySymbol}{(isPackagePaid ? 0 : (s.total || 0)).toFixed(2)}</div>
                      </div>
                      <div className="vbm-service-card__pills">
                        {[["Qty", s.qty], ["Price", `${currencySymbol}${(s.price || 0).toFixed(2)}`], ["Disc", `${currencySymbol}${((s as any).discount || 0).toFixed(2)}`]].map(([lbl, val]) => (
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
                      <div className="vbm-service-card__total">{currencySymbol}{(p.total || p.price || 0).toFixed(2)}</div>
                    </div>
                    <div className="vbm-service-card__pills">
                      {[["Qty", p.qty || 1], ["Price", `${currencySymbol}${(p.price || 0).toFixed(2)}`], ["Disc", `${currencySymbol}${((p as any).discount || 0).toFixed(2)}`]].map(([lbl, val]) => (
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
                      <div className="vbm-service-card__total">{currencySymbol}{(p.total || p.price || 0).toFixed(2)}</div>
                    </div>
                    <div className="vbm-service-card__pills">
                      {[["Qty", p.qty || 1], ["Price", `${currencySymbol}${(p.price || 0).toFixed(2)}`], ["Disc", `${currencySymbol}${((p as any).discount || 0).toFixed(2)}`]].map(([lbl, val]) => (
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
                      <div className="vbm-service-card__total">{currencySymbol}{(m.total || m.price || 0).toFixed(2)}</div>
                    </div>
                    <div className="vbm-service-card__pills">
                      {[["Qty", m.qty || 1], ["Price", `${currencySymbol}${(m.price || 0).toFixed(2)}`], ["Disc", `${currencySymbol}${((m as any).discount || 0).toFixed(2)}`]].map(([lbl, val]) => (
                        <span key={lbl as string} className="vbm-pill">{lbl}: {val}</span>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="vbm-breakdown-card">
                  <div className="vbm-breakdown-card__title">Payment Breakdown</div>
                  {[
                    booking.subtotal ? ["Subtotal", `${currencySymbol}${(booking.subtotal || 0).toFixed(2)}`, "#6b7280"] : null,
                    booking.discountAmount ? ["Discount", `−${currencySymbol}${(booking.discountAmount || 0).toFixed(2)}`, "#ef4444"] : null,
                    booking.couponDiscount ? [`Coupon (${booking.couponCode})`, `−${currencySymbol}${(booking.couponDiscount || 0).toFixed(2)}`, "#22c55e"] : null,
                    booking.referralDiscount ? ["Referral Discount", `−${currencySymbol}${(booking.referralDiscount || 0).toFixed(2)}`, "#22c55e"] : null,
                    booking.exCharges ? ["Extra Charges", `${currencySymbol}${(booking.exCharges || 0).toFixed(2)}`, "#374151"] : null,
                    booking.tipAmount ? ["Tip", `${currencySymbol}${(booking.tipAmount || 0).toFixed(2)}`, "#374151"] : null,
                    ...((booking as any).taxBreakdown?.length
                      ? [
                          ...(booking as any).taxBreakdown
                            .filter((t: any) => t.amount > 0)
                            .map((t: any) => [
                              `${t.name} ${t.rate}%${t.inclusive ? " (incl.)" : ""}`,
                              `${t.inclusive ? "" : "+"}${currencySymbol}${t.amount.toFixed(2)}`,
                              "#374151",
                            ]),
                          ["Total Tax", `${currencySymbol}${(booking as any).taxBreakdown.reduce((s: number, t: any) => s + (t.amount > 0 ? t.amount : 0), 0).toFixed(2)}`, "#111827"],
                        ]
                      : ((booking as any).gstAmount > 0
                          ? [[`GST${(booking as any).gst ? ` (${(booking as any).gst}%)` : ""}`, `+${currencySymbol}${(booking as any).gstAmount.toFixed(2)}`, "#374151"]]
                          : [])),
                  ].filter(Boolean).map((row, i) => (
                    <div key={i} className="vbm-breakdown-row" style={{ color: row![2] as string }}>
                      <span>{row![0] as string}</span><span>{row![1] as string}</span>
                    </div>
                  ))}
                  <div className="vbm-breakdown-row vbm-breakdown-row--grand"><span>Grand Total</span><span>{currencySymbol}{(isPackagePaid ? 0 : (booking.grandTotal || 0)).toFixed(2)}</span></div>
                  {(booking.rewardPointsValue || 0) > 0 && (
                    <div className="vbm-breakdown-row" style={{ color: "#7c3aed" }}><span>🎁 Paid from Reward Points</span><span>{currencySymbol}{(booking.rewardPointsValue || 0).toFixed(2)}</span></div>
                  )}
                  <div className="vbm-breakdown-row vbm-breakdown-row--paid"><span>Paid</span><span>{currencySymbol}{(booking.payingNow || 0).toFixed(2)}</span></div>
                  {(booking.dueAmount || 0) > 0 && (
                    <div className="vbm-breakdown-row vbm-breakdown-row--due"><span>Balance Due</span><span>{currencySymbol}{(booking.dueAmount || 0).toFixed(2)}</span></div>
                  )}
                </div>
              </div>
            ) : (
              <div className="vbm-activity-card">
                <div className="vbm-activity-card__title">Activity Log</div>
                {[
                  { icon: "📅", label: "Appointment Created", detail: `${booking.billDate || booking.date} · ${formatTime12(booking.startTime)} – ${formatTime12(booking.endTime)}` },
                  { icon: "👤", label: "Client", detail: [booking.clientName, booking.clientPhone, (booking as any).clientEmail].filter(Boolean).join(" · ") },
                  { icon: "💼", label: "Staff", detail: staffName },
                  { icon: "💳", label: "Payment Status", detail: booking.paymentStatus },
                  { icon: "📋", label: "Booking Status", detail: bookingStatus },
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