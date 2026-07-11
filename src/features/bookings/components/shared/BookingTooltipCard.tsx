import React, { useEffect, useState } from "react";
import { currencySymbol } from "../../utils/currency";
import {
  useFloating,
  flip,
  shift,
  offset,
  FloatingPortal,
  autoUpdate,
} from "@floating-ui/react";
import { Scissors, AwardFill } from "react-bootstrap-icons";
import { IconBox, IconTag } from "../../../../components/shared/QuickSaleIcons";
import type { Booking, Staff } from "../../types/scheduler-types";
import { formatTime12 } from "../../utils/timeUtils";
import { computeChipStatusClass } from "../../utils/bookingStatusUtils";
import "../../styles/BookingTooltipCard.scss";

interface BookingTooltipCardProps {
  booking: Booking;
  staffList: Staff[];
  anchorEl: HTMLElement;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  coveredServices?: Map<string, number>;
}

// Mirrors the calendar chip's own color logic exactly (computeChipStatusClass) —
// "Booked" for a plain upcoming unpaid appointment, "No Show" once its time has
// passed with nothing paid, "Partial" (not "Due") for a partial payment.
const STATUS_LABEL: Record<string, string> = { cancelled: "Cancelled", confirmed: "Paid", partial: "Partial", "no-show": "No Show", pending: "Booked" };
const STATUS_COLOR: Record<string, string> = { cancelled: "#ef4444", confirmed: "#16a34a", partial: "#6d28d9", "no-show": "#0891b2", pending: "#d97706" };
const STATUS_BG:    Record<string, string> = { cancelled: "#fee2e2", confirmed: "#dcfce7", partial: "#ede9fe", "no-show": "#cffafe", pending: "#fef3c7" };

interface FlatItem {
  icon: React.ReactNode;
  name: string;
  price: number;
  subText?: string;
}

const BookingTooltipCard: React.FC<BookingTooltipCardProps> = ({
  booking,
  staffList,
  anchorEl,
  onMouseEnter,
  onMouseLeave,
  coveredServices,
}) => {
  const { refs, floatingStyles } = useFloating({
    placement: "right",
    middleware: [offset(10), flip({ fallbackAxisSideDirection: "end" }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
    elements: { reference: anchorEl },
  });

  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // ── Data helpers ──────────────────────────────────────────────────────────
  const getStaffName = (staffId?: string | number) =>
    staffId ? (staffList.find((s) => String(s.id) === String(staffId))?.name ?? "") : "";

  const primaryStaff = staffList.find((s) => s.id === booking.staffId);

  const services        = booking.services || [];
  const packageItems    = (booking as any).packageItems  || (booking as any).packages  || [];
  const membershipItems = (booking as any).membershipItems || (booking as any).memberships || [];
  const productItems    = (booking as any).productItems  || (booking as any).products  || [];

  const staffNames = Array.from(
    new Set(
      [
        booking.staffId,
        ...services.map((s) => s.staffId),
        ...packageItems.map((p: any) => p.staffId),
        ...membershipItems.map((m: any) => m.staffId),
        ...productItems.map((p: any) => p.staffId),
      ].filter(Boolean) as string[]
    )
  ).map(getStaffName).filter(Boolean);

  // Always show the assigned staff per item, even when it matches the
  // appointment's main staff — with multi-staff bookings now common, hiding it
  // in that one case made the display look inconsistent/incomplete.
  const itemStaffSub = (staffId?: string) => (staffId ? getStaffName(staffId) : "");

  const isPackagePaid =
    (((booking as any).paymentMode || "").toLowerCase() === "package");
  // Only true when eWallet was the SOLE method (buildMethodLabel only ever
  // returns "eWallet" when there was no Cash/Card/UPI leg) — a mixed
  // eWallet+Cash payment shows as "Cash" and falls into the generic "Paid"
  // row below instead, same as it already did before eWallet existed.
  const isEwalletPaid =
    (((booking as any).paymentMode || "").toLowerCase() === "ewallet");

  const allItems: FlatItem[] = [
    ...services.map((svc: any) => {
      const svcName = (svc.service || svc.name || "").toLowerCase();
      const isCovered = isPackagePaid
        || !!(svc.isPackageService || svc.is_package_service)
        || (coveredServices != null && coveredServices.size > 0 && coveredServices.has(svcName));
      const rawTotal = (svc as any).total;
      const price = isCovered ? 0
        : ((rawTotal !== undefined && rawTotal !== null) ? Number(rawTotal) : (Number(svc.price) || 0));
      return {
        icon: isCovered ? <IconBox /> : <Scissors size={13} />,
        name: svc.service || svc.name || "",
        price,
        subText: isCovered ? "From Package" : (itemStaffSub(svc.staffId) || undefined),
      };
    }),
    ...packageItems.map((p: any) => {
      const isPkgCovered = isPackagePaid || !!(p.isPackageService || p.is_package_service);
      return {
        icon: <IconBox />,
        name: p.name || p.packageName || "",
        price: isPkgCovered ? 0 : (Number(p.total) || Number(p.price) || 0),
        subText: isPkgCovered ? "From Package" : (itemStaffSub(p.staffId) || undefined),
      };
    }),
    ...membershipItems.map((m: any) => ({ icon: <AwardFill size={13} />, name: m.name || m.membershipName || "", price: Number(m.total) || Number(m.price) || 0, subText: itemStaffSub(m.staffId) || undefined })),
    ...productItems.map((p: any)    => ({ icon: <IconTag />,      name: p.name || p.productName    || "", price: Number(p.total) || Number(p.price) || 0, subText: itemStaffSub(p.staffId) || undefined })),
  ].filter((item) => item.name);

  const computedTotal = allItems.reduce((sum, item) => sum + item.price, 0);

  // ── Charges & discount breakdown (mirrors totalsUtils.computeTotals) ───────
  const discountValue = Number(booking.discount) || 0;
  const exCharges     = Number((booking as any).exCharges) || 0;
  const tipAmount     = Number((booking as any).tipAmount) || 0;
  const gstPercent    = Number(booking.gst) || 0;
  const discountAmt   = booking.discountType === "Flat (₹)" ? discountValue : (computedTotal * discountValue) / 100;
  const couponDiscount = Number((booking as any).couponDiscount) || 0;
  const referralDiscount = Number((booking as any).referralDiscount) || 0;
  const taxable       = Math.max(0, computedTotal - discountAmt - couponDiscount - referralDiscount);
  // Prefer the persisted (accurate, per-tax) amount; fall back to the old
  // blended-rate estimate for bookings saved before tax breakdown existed.
  const gstAmount      = (booking as any).gstAmount != null
    ? Number((booking as any).gstAmount) || 0
    : (taxable * gstPercent) / 100;
  const adjustedTotal = taxable + gstAmount + exCharges + tipAmount;
  const hasAnyCovered = services.some((svc: any) =>
    svc.isPackageService || svc.is_package_service
    || (coveredServices != null && coveredServices.size > 0 && coveredServices.has((svc.service || svc.name || "").toLowerCase()))
  ) || packageItems.some((p: any) => p.isPackageService || p.is_package_service);
  // Package-paid or mixed: total is derived from allItems (covered services already priced at ₹0).
  const total = (isPackagePaid || hasAnyCovered)
    ? adjustedTotal
    : (allItems.length > 0 ? adjustedTotal : (Number(booking.grandTotal) || 0));

  const chipStatus = computeChipStatusClass(booking);
  const payColor = STATUS_COLOR[chipStatus];
  const payBg    = STATUS_BG[chipStatus];
  const payLabel = STATUS_LABEL[chipStatus];

  const clientInitials = (booking.clientName || "Walk-In")
    .split(" ").map((w) => w[0] ?? "").join("").toUpperCase().slice(0, 2) || "W";

  const avatarColor = primaryStaff?.color ?? "#6b7280";

  return (
    <FloatingPortal>
      <div
        ref={refs.setFloating}
        style={{ ...floatingStyles, zIndex: 99999, opacity: visible ? 1 : 0, transition: "opacity 0.1s", pointerEvents: visible ? "auto" : "none" }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="btc">
          {/* ── Header ── */}
          <div className="btc__header">
            <div className="btc__avatar" style={{ background: avatarColor }}>{clientInitials}</div>
            <div className="btc__client-info">
              <div className="btc__client-name">{booking.clientName || "Walk-In"}</div>
              {booking.clientPhone && <div className="btc__phone">{booking.clientPhone}</div>}
              <div className="btc__time">{formatTime12(booking.startTime)} – {formatTime12(booking.endTime)}</div>
            </div>
            <span className="btc__pay-badge" style={{ background: payBg, color: payColor }}>{payLabel}</span>
          </div>

          {/* ── Staff row ── */}
          {staffNames.length > 0 && (
            <div className="btc__staff-row">
              <span className="btc__staff-label">Staff:</span>
              <span className="btc__staff-names">{staffNames.join(", ")}</span>
            </div>
          )}

          {/* ── Item rows ── */}
          {allItems.length > 0 && (
            <div className="btc__items">
              {allItems.map((item, i) => (
                <div key={i} className={`btc__item ${item.subText ? "btc__item--flex-start" : "btc__item--centered"}`}>
                  <div className="btc__item-left">
                    <span className="btc__item-icon">{item.icon}</span>
                    <div className="btc__item-info">
                      <div className="btc__item-name">{item.name}</div>
                      {item.subText && <div className="btc__item-sub">{item.subText}</div>}
                    </div>
                  </div>
                  <div className="btc__item-price">{currencySymbol}{item.price.toFixed(0)}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── Totals ── */}
          <div className="btc__totals">
            {discountAmt > 0 && (
              <div className="btc__paid-row">
                <span>Discount</span>
                <span>-{currencySymbol}{discountAmt.toFixed(0)}</span>
              </div>
            )}
            {couponDiscount > 0 && (
              <div className="btc__paid-row" style={{ color: "#dc2626" }}>
                <span>Coupon{(booking as any).couponCode ? ` (${(booking as any).couponCode})` : ""}</span>
                <span>-{currencySymbol}{couponDiscount.toFixed(0)}</span>
              </div>
            )}
            {referralDiscount > 0 && (
              <div className="btc__paid-row" style={{ color: "#dc2626" }}>
                <span>Referral Discount</span>
                <span>-{currencySymbol}{referralDiscount.toFixed(0)}</span>
              </div>
            )}
            {exCharges > 0 && (
              <div className="btc__paid-row">
                <span>Ex. Charges</span>
                <span>{currencySymbol}{exCharges.toFixed(0)}</span>
              </div>
            )}
            {tipAmount > 0 && (
              <div className="btc__paid-row">
                <span>Tip</span>
                <span>{currencySymbol}{tipAmount.toFixed(0)}</span>
              </div>
            )}
            {gstAmount > 0 && (
              <div className="btc__paid-row">
                <span>GST ({gstPercent}%)</span>
                <span>{currencySymbol}{gstAmount.toFixed(0)}</span>
              </div>
            )}
            <div className="btc__total-row">
              <span>Total</span>
              <span>{currencySymbol}{Number(total).toFixed(0)}</span>
            </div>
            {isPackagePaid ? (
              <div className="btc__paid-row" style={{ color: "#16a34a" }}>
                <span>Paid via Package</span>
                <span>{currencySymbol}0</span>
              </div>
            ) : (
              <>
                {hasAnyCovered && (
                  <div className="btc__paid-row" style={{ color: "#16a34a" }}>
                    <span>📦 Package covered</span>
                    <span>{currencySymbol}0</span>
                  </div>
                )}
                {Number(booking.membershipWalletUsed) > 0 && (
                  <div className="btc__paid-row" style={{ color: "#16a34a" }}>
                    <span>🎗️ Paid via Membership</span>
                    <span>{currencySymbol}{Number(booking.membershipWalletUsed).toFixed(0)}</span>
                  </div>
                )}
                {booking.payingNow != null && Number(booking.payingNow) > 0 && (
                  <div className="btc__paid-row" style={isEwalletPaid ? { color: "#16a34a" } : undefined}>
                    <span>{isEwalletPaid ? "💳 Paid via eWallet" : "Paid"}</span>
                    <span>{currencySymbol}{Number(booking.payingNow).toFixed(0)}</span>
                  </div>
                )}
                {Number(booking.rewardPointsValue) > 0 && (
                  <div className="btc__paid-row" style={{ color: "#7c3aed" }}>
                    <span>🎁 Paid from Reward Points</span>
                    <span>{currencySymbol}{Number(booking.rewardPointsValue).toFixed(0)}</span>
                  </div>
                )}
              </>
            )}
            {!isPackagePaid && Number(booking.dueAmount) > 0 && (
              <div className="btc__due-row">
                <span>Due</span>
                <span>{currencySymbol}{Number(booking.dueAmount).toFixed(0)}</span>
              </div>
            )}
          </div>

          {/* ── Notes ── */}
          {booking.notes && (
            <div className="btc__notes">📝 {booking.notes}</div>
          )}
        </div>
      </div>
    </FloatingPortal>
  );
};

export default BookingTooltipCard;
