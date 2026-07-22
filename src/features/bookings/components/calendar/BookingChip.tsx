import React from "react";
import type { Booking } from "../../types";
import type { DragCandidate, ResizeState } from "../../hooks/useDragDrop";
import { currencySymbol } from "../../utils/currency";
import { formatTime12, addMinutes } from "../../utils/timeUtils";
import { computeChipStatusClass } from "../../utils/bookingStatusUtils";

function buildTitle(b: Booking): string {
  if (b.title && b.title !== "Appointment" && b.title !== "appointment") return b.title;
  return [
    ...(b.services || []).map((s) => s.service || (s as any).name).filter(Boolean),
    ...((b as any).productItems || []).map((p: any) => p.productName || p.name).filter(Boolean),
    ...((b as any).packageItems || []).map((p: any) => p.packageName || p.name).filter(Boolean),
    ...((b as any).membershipItems || []).map((m: any) => m.membershipName || m.name).filter(Boolean),
  ].join(", ") || "Appointment";
}

interface Props {
  booking: Booking;
  // Ticks (DayView refreshes this every minute) so a "booked" chip whose end
  // time has now passed flips to no-show live, without needing a page reload.
  nowTs: number;
  staffStart: string;
  staffEnd: string;
  chipTop: number;
  chipHeight: number;
  /** Side-by-side column index/count for concurrent appointments on the same staff (0/1 = full width). */
  chipCol?: number;
  chipTotalCols?: number;
  slotHeight: number;
  intervalMins: number;
  isDraggingThis: boolean;
  isResizingThis: boolean;
  dragging: { currentTop: number; currentStaffId: string } | null;
  resizing: ResizeState | null;
  justDraggedRef: React.MutableRefObject<boolean>;
  isInteracting: boolean;
  isHighlighted?: boolean;
  staffId: string;
  visibleStaffIndex: number;
  onEdit: (b: Booking) => void;
  onCancel: (b: Booking) => void;
  onDelete: (b: Booking) => void;
  onOpenTip: (b: Booking, el: HTMLElement) => void;
  onCloseTip: () => void;
  onStartDragCandidate: (candidate: DragCandidate) => void;
  onStartResize: (state: ResizeState) => void;
}

function arePropsEqual(prev: Props, next: Props): boolean {
  // Always re-render when interaction state for THIS chip changes
  if (prev.isDraggingThis !== next.isDraggingThis) return false;
  if (prev.isResizingThis !== next.isResizingThis) return false;
  if (prev.isInteracting !== next.isInteracting) return false;

  // Data that directly affects visual output of every chip
  if (prev.booking !== next.booking) return false;
  if (prev.chipTop !== next.chipTop) return false;
  if (prev.chipHeight !== next.chipHeight) return false;
  if (prev.chipCol !== next.chipCol) return false;
  if (prev.chipTotalCols !== next.chipTotalCols) return false;
  if (prev.slotHeight !== next.slotHeight) return false;
  if (prev.staffStart !== next.staffStart) return false;
  if (prev.staffEnd !== next.staffEnd) return false;
  if (prev.nowTs !== next.nowTs) return false;

  // For the actively dragged chip only — track position updates
  if (next.isDraggingThis) {
    return (
      prev.dragging?.currentTop === next.dragging?.currentTop &&
      prev.dragging?.currentStaffId === next.dragging?.currentStaffId
    );
  }

  // For the actively resized chip only — track height updates
  if (next.isResizingThis) {
    return prev.resizing?.currentHeight === next.resizing?.currentHeight;
  }

  if (prev.isHighlighted !== next.isHighlighted) return false;

  // Idle chip: dragging/resizing props don't affect its render output
  return true;
}

const BookingChipComponent: React.FC<Props> = ({
  booking: b, nowTs, staffStart, staffEnd,
  chipTop, chipHeight, chipCol = 0, chipTotalCols = 1, slotHeight, intervalMins,
  isDraggingThis, isResizingThis,
  dragging, resizing,
  justDraggedRef, isInteracting, isHighlighted,
  staffId, visibleStaffIndex,
  onEdit, onOpenTip, onCloseTip,
  onStartDragCandidate, onStartResize,
}) => {
  // b.status carries the raw backend appointment status through unchanged
  // (booked/paid/partial/cancelled/no-show/deleted) — payment state and
  // lifecycle state are the same field now, no separate paymentStatus.
  const bs = (b.status || "").toLowerCase();

  const isPartial   = bs === "partial";
  const isCancelled = bs === "cancelled";
  // Cancelled and deleted appointments are locked from dragging — paid/
  // no-show ones keep their normal chip styling but stay fully draggable, per
  // explicit choice over the original locked-by-default design.
  const isReadOnly  = isCancelled || !!b.isDeleted;

  const statusClass = computeChipStatusClass(b, new Date(nowTs));

  // Preview times during drag/resize
  const previewStart = isDraggingThis && dragging
    ? (() => {
        const totalMins = (dragging.currentTop / slotHeight) * intervalMins;
        const h = Math.floor(totalMins / 60);
        const m = Math.round(totalMins % 60);
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      })()
    : staffStart;

  const previewEnd = isResizingThis && resizing
    ? (() => {
        const [sh, sm] = staffStart.split(":").map(Number);
        const addedMins = (resizing.currentHeight / slotHeight) * intervalMins;
        const endMins = sh * 60 + sm + addedMins;
        return `${String(Math.floor(endMins / 60)).padStart(2, "0")}:${String(Math.round(endMins % 60)).padStart(2, "0")}`;
      })()
    : isDraggingThis
      ? (() => {
          const [sh, sm] = staffStart.split(":").map(Number);
          const [eh, em] = staffEnd.split(":").map(Number);
          return addMinutes(previewStart, (eh * 60 + em) - (sh * 60 + sm));
        })()
      : staffEnd;

  const appointmentTitle = buildTitle(b);
  const originalBooking = (b as any)._originalBooking || b;

  // Concurrent appointments for the same staff render side-by-side instead of stacking.
  const isConcurrent = chipTotalCols > 1;
  const overlapStyle: React.CSSProperties = isConcurrent
    ? {
        left: `calc(${(chipCol / chipTotalCols) * 100}% + 2px)`,
        right: "auto",
        width: `calc(${100 / chipTotalCols}% - 4px)`,
      }
    : {};

  return (
    <div
      key={`${b.id}-${staffId}`}
      data-booking-id={b.id}
      className={[
        "dv-chip",
        `dv-chip--${statusClass}`,
        isDraggingThis ? "dv-chip--dragging" : "",
        isResizingThis ? "dv-chip--resizing" : "",
        isConcurrent ? "dv-chip--concurrent" : "",
        isHighlighted ? "dv-chip--highlighted" : "",
      ].filter(Boolean).join(" ")}
      style={{ top: chipTop, height: chipHeight, cursor: isReadOnly ? "pointer" : undefined, ...overlapStyle }}
      onMouseEnter={(e) => { if (!isInteracting) onOpenTip(originalBooking, e.currentTarget); }}
      onMouseLeave={onCloseTip}
      onMouseDown={(e) => {
        if (isReadOnly) return;
        if ((e.target as HTMLElement).closest(".dv-chip__resize-handle")) return;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const fromBottom = rect.bottom - e.clientY;
        if (fromBottom > 14) {
          onStartDragCandidate({
            booking: b,
            initialX: e.clientX,
            initialY: e.clientY,
            originalTop: chipTop,
            currentStaffId: staffId,
            currentStaffIndex: visibleStaffIndex,
            startTime: staffStart,
            endTime: staffEnd,
            originalStaffId: staffId,
          });
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (justDraggedRef.current || isInteracting || b.isDeleted) return;
        onEdit(originalBooking);
      }}
    >
      <div className="dv-chip__body">
        <span className="dv-chip__time">{formatTime12(previewStart)} – {formatTime12(previewEnd)}</span>
        <span className="dv-chip__service" title={appointmentTitle}>{appointmentTitle}</span>
        <span className="dv-chip__client">👤 {b.clientName || "Walk-In"}</span>
        {isPartial && Number(b.dueAmount) > 0 && (
          <span className="dv-chip__due">Due {currencySymbol}{Number(b.dueAmount).toFixed(2)}</span>
        )}
        {b.notes && chipHeight >= slotHeight * 2 && (
          <span className="dv-chip__note">📝 {b.notes}</span>
        )}
      </div>
      <div
        className="dv-chip__resize-handle"
        onMouseDown={(e) => {
          if (isReadOnly) return;
          e.stopPropagation(); e.preventDefault();
          const h = Math.max(chipHeight, slotHeight);
          onStartResize({ booking: b, startY: e.clientY, originalHeight: h, currentHeight: h, staffId });
        }}
      >
        <div className="dv-chip__resize-bar" />
      </div>
    </div>
  );
};

export const BookingChip = React.memo(BookingChipComponent, arePropsEqual);
export default BookingChip;
