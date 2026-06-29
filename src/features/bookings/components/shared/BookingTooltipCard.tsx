import React, { useEffect, useState } from "react";
import { currencySymbol } from "../../../../utils/currency";
import {
  useFloating,
  flip,
  shift,
  offset,
  FloatingPortal,
  autoUpdate,
} from "@floating-ui/react";
import type { Booking, Staff } from "../../types/scheduler-types";
import { formatTime12 } from "../../utils/timeUtils";

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

const BookingTooltipCard: React.FC<BookingTooltipCardProps> = ({
  booking,
  staffList,
  anchorEl,
  onMouseEnter,
  onMouseLeave,
}) => {
  // Position via floating-ui — uses the chip DOM element as the reference
  const { refs, floatingStyles } = useFloating({
    placement: "right",
    middleware: [offset(10), flip({ fallbackAxisSideDirection: "end" }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
    elements: { reference: anchorEl },
  });

  // Defer visibility by one frame so floating-ui has computed the position before we show
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // ── Data helpers ──────────────────────────────────────────────────────────
  const getStaffName = (staffId?: string) =>
    staffId ? (staffList.find((s) => s.id === staffId)?.name ?? "") : "";

  const primaryStaff = staffList.find((s) => s.id === booking.staffId);

  // Collect unique staff names involved across all services
  const staffNames = Array.from(
    new Set(
      [
        booking.staffId,
        ...(booking.services || []).map((s) => s.staffId),
      ].filter(Boolean) as string[]
    )
  )
    .map(getStaffName)
    .filter(Boolean);

  const services      = booking.services || [];
  const productItems  = (booking as any).productItems  || (booking as any).products  || [];
  const packageItems  = (booking as any).packageItems  || (booking as any).packages  || [];

  // Fall back to summing services/products/packages if grandTotal wasn't returned by the list API
  const computedTotal =
    services.reduce((s: number, x: any) => s + (Number(x.total) || Number(x.price) || 0), 0) +
    productItems.reduce((s: number, x: any) => s + (Number(x.total) || Number(x.price) || 0), 0) +
    packageItems.reduce((s: number, x: any) => s + (Number(x.total) || Number(x.price) || 0), 0);
  const total = booking.grandTotal || computedTotal || 0;
  const isCancelled = (booking.status || "").toLowerCase() === "cancelled";
  const rawPs = isCancelled ? "Cancelled" : (booking.paymentStatus ?? "Unpaid");
  const ps    = rawPs.charAt(0).toUpperCase() + rawPs.slice(1).toLowerCase();
  const payColor = PAY_COLOR[ps] ?? "#d97706";
  const payBg    = PAY_BG[ps]    ?? "#fef3c7";
  const payLabel = PAY_LABEL[ps] ?? ps;

  // Client avatar uses initials
  const clientInitials = (booking.clientName || "Walk-In")
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2) || "W";

  const avatarColor = primaryStaff?.color ?? "#6b7280";

  return (
    <FloatingPortal>
      <div
        ref={refs.setFloating}
        style={{
          ...floatingStyles,
          zIndex: 99999,
          opacity: visible ? 1 : 0,
          transition: "opacity 0.1s",
          pointerEvents: visible ? "auto" : "none",
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,.18)",
            width: 268,
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            fontSize: 13,
            overflow: "hidden",
          }}
        >
          {/* ── Header: avatar + client + time + pay badge ── */}
          <div
            style={{
              padding: "11px 13px",
              borderBottom: "1px solid #f3f4f6",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: avatarColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                flexShrink: 0,
                userSelect: "none",
              }}
            >
              {clientInitials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 700,
                  color: "#111827",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: 13,
                }}
              >
                {booking.clientName || "Walk-In"}
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>
                {formatTime12(booking.startTime)} – {formatTime12(booking.endTime)}
              </div>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: 4,
                background: payBg,
                color: payColor,
                flexShrink: 0,
                letterSpacing: "0.2px",
              }}
            >
              {payLabel}
            </span>
          </div>

          {/* ── Staff row ── */}
          {staffNames.length > 0 && (
            <div
              style={{
                padding: "7px 13px",
                borderBottom: "1px solid #f3f4f6",
                fontSize: 12,
                color: "#374151",
                display: "flex",
                gap: 5,
                alignItems: "center",
              }}
            >
              <span style={{ color: "#9ca3af" }}>Staff:</span>
              <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {staffNames.join(", ")}
              </span>
            </div>
          )}

          {/* ── Service / product / package rows ── */}
          <div style={{ padding: "6px 13px" }}>
            {services.map((svc, i) => {
              const svcStaff = svc.staffId && svc.staffId !== booking.staffId
                ? getStaffName(svc.staffId)
                : "";
              const svcTotal = svc.total || svc.price || 0;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    padding: "4px 0",
                    borderBottom:
                      i < services.length - 1 || productItems.length > 0 || packageItems.length > 0
                        ? "1px solid #f9fafb"
                        : "none",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                    <div
                      style={{
                        color: "#111827",
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: 12,
                      }}
                    >
                      {svc.service || (svc as any).name}
                    </div>
                    {svcStaff && (
                      <div style={{ fontSize: 10, color: "#9ca3af" }}>{svcStaff}</div>
                    )}
                  </div>
                  <div style={{ color: "#374151", fontWeight: 600, fontSize: 12, flexShrink: 0 }}>
                    {currencySymbol}{Number(svcTotal).toFixed(0)}
                  </div>
                </div>
              );
            })}

            {productItems.map((p: any, i: number) => (
              <div
                key={`prod-${i}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "4px 0",
                  borderBottom: i < productItems.length - 1 ? "1px solid #f9fafb" : "none",
                }}
              >
                <div style={{ color: "#111827", fontWeight: 500, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                  {p.name || p.productName}
                </div>
                <div style={{ color: "#374151", fontWeight: 600, fontSize: 12, flexShrink: 0 }}>
                  {currencySymbol}{Number(p.total || p.price || 0).toFixed(0)}
                </div>
              </div>
            ))}

            {packageItems.map((p: any, i: number) => (
              <div
                key={`pkg-${i}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "4px 0",
                  borderBottom: i < packageItems.length - 1 ? "1px solid #f9fafb" : "none",
                }}
              >
                <div style={{ color: "#111827", fontWeight: 500, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                  {p.name || p.packageName}
                </div>
                <div style={{ color: "#374151", fontWeight: 600, fontSize: 12, flexShrink: 0 }}>
                  {currencySymbol}{Number(p.total || p.price || 0).toFixed(0)}
                </div>
              </div>
            ))}
          </div>

          {/* ── Total / Paid / Due ── */}
          <div style={{ borderTop: "1px solid #f3f4f6" }}>
            <div style={{ padding: "8px 13px 4px", display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#111827", fontSize: 13 }}>
              <span>Total</span>
              <span>{currencySymbol}{Number(total).toFixed(0)}</span>
            </div>
            {booking.payingNow != null && Number(booking.payingNow) > 0 && (
              <div style={{ padding: "2px 13px", display: "flex", justifyContent: "space-between", fontSize: 12, color: "#16a34a", fontWeight: 600 }}>
                <span>Paid</span>
                <span>{currencySymbol}{Number(booking.payingNow).toFixed(0)}</span>
              </div>
            )}
            {Number(booking.dueAmount) > 0 && (
              <div style={{ padding: "2px 13px 8px", display: "flex", justifyContent: "space-between", fontSize: 12, color: "#dc2626", fontWeight: 600 }}>
                <span>Due</span>
                <span>{currencySymbol}{Number(booking.dueAmount).toFixed(0)}</span>
              </div>
            )}
          </div>

          {/* ── Notes (only if non-empty) ── */}
          {booking.notes && (
            <div
              style={{
                padding: "6px 13px 10px",
                fontSize: 11,
                color: "#6b7280",
                borderTop: "1px solid #f9fafb",
                fontStyle: "italic",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              📝 {booking.notes}
            </div>
          )}
        </div>
      </div>
    </FloatingPortal>
  );
};

export default BookingTooltipCard;
