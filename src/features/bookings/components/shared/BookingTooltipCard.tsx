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
import { IconBox, IconTag } from "../../../sales/components/QuickSaleIcons";
import type { Booking, Staff } from "../../types/scheduler-types";
import { formatTime12 } from "../../utils/timeUtils";
import "../../styles/BookingTooltipCard.scss";

interface BookingTooltipCardProps {
  booking: Booking;
  staffList: Staff[];
  anchorEl: HTMLElement;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  coveredServices?: Map<string, number>;
}

const PAY_LABEL: Record<string, string> = { Paid: "Paid", Partial: "Due", Unpaid: "Unpaid", Cancelled: "Cancelled" };
const PAY_COLOR: Record<string, string> = { Paid: "#16a34a", Partial: "#6d28d9", Unpaid: "#d97706", Cancelled: "#ef4444" };
const PAY_BG:    Record<string, string> = { Paid: "#dcfce7", Partial: "#ede9fe", Unpaid: "#fef3c7", Cancelled: "#fee2e2" };

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
  const taxable       = Math.max(0, computedTotal - discountAmt);
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

  const isCancelled = (booking.status || "").toLowerCase() === "cancelled";
  const rawPs = isCancelled ? "Cancelled" : (booking.paymentStatus ?? "Unpaid");
  const ps    = rawPs.charAt(0).toUpperCase() + rawPs.slice(1).toLowerCase();
  const payColor = PAY_COLOR[ps] ?? "#d97706";
  const payBg    = PAY_BG[ps]    ?? "#fef3c7";
  const payLabel = PAY_LABEL[ps] ?? ps;

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
                {booking.payingNow != null && Number(booking.payingNow) > 0 && (
                  <div className="btc__paid-row">
                    <span>Paid</span>
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
