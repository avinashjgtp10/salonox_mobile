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

  const staffNames = Array.from(
    new Set(
      [booking.staffId, ...(booking.services || []).map((s) => s.staffId)].filter(Boolean) as string[]
    )
  ).map(getStaffName).filter(Boolean);

  const services        = booking.services || [];
  const packageItems    = (booking as any).packageItems  || (booking as any).packages  || [];
  const membershipItems = (booking as any).membershipItems || (booking as any).memberships || [];
  const productItems    = (booking as any).productItems  || (booking as any).products  || [];

  const allItems: FlatItem[] = [
    ...services.map((svc: any) => {
      const svcStaff = svc.staffId && svc.staffId !== booking.staffId ? getStaffName(svc.staffId) : "";
      return { icon: <Scissors size={13} />, name: svc.service || svc.name || "", price: Number(svc.total) || Number(svc.price) || 0, subText: svcStaff || undefined };
    }),
    ...packageItems.map((p: any)    => ({ icon: <IconBox />,      name: p.name || p.packageName    || "", price: Number(p.total) || Number(p.price) || 0 })),
    ...membershipItems.map((m: any) => ({ icon: <AwardFill size={13} />, name: m.name || m.membershipName || "", price: Number(m.total) || Number(m.price) || 0 })),
    ...productItems.map((p: any)    => ({ icon: <IconTag />,      name: p.name || p.productName    || "", price: Number(p.total) || Number(p.price) || 0 })),
  ].filter((item) => item.name);

  const computedTotal = allItems.reduce((sum, item) => sum + item.price, 0);

  // ── Charges & discount breakdown (mirrors totalsUtils.computeTotals) ───────
  const discountValue = Number(booking.discount) || 0;
  const exCharges     = Number((booking as any).exCharges) || 0;
  const tipAmount     = Number((booking as any).tipAmount) || 0;
  const gstPercent    = Number(booking.gst) || 0;
  const discountAmt   = booking.discountType === "Flat (₹)" ? discountValue : (computedTotal * discountValue) / 100;
  const taxable       = Math.max(0, computedTotal - discountAmt);
  const gstAmount      = (taxable * gstPercent) / 100;
  const adjustedTotal = taxable + gstAmount + exCharges + tipAmount;
  const total = adjustedTotal || booking.grandTotal || computedTotal || 0;

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
            {booking.payingNow != null && Number(booking.payingNow) > 0 && (
              <div className="btc__paid-row">
                <span>Paid</span>
                <span>{currencySymbol}{Number(booking.payingNow).toFixed(0)}</span>
              </div>
            )}
            {Number(booking.dueAmount) > 0 && (
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
