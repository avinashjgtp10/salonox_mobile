// src/features/bookings/components/calendar/CalendarSkeleton.tsx
//
// Shown by Scheduler.tsx instead of the real Day/Week/Month/List views while
// staff/bookings are still loading — placeholder blocks shaped like the real
// grid (staff columns, time slots, a scatter of "chip" bars) instead of a
// blank page or a bare spinner, so the layout doesn't visibly pop in once
// data arrives.
import Skeleton from "../../../../components/ui/Skeleton";
import type { ViewMode } from "../../types/scheduler-types";
import "../../styles/CalendarSkeleton.scss";

const GUTTER_WIDTH = 72;
const HEADER_HEIGHT = 56;
const SLOT_HEIGHT = 48;
const SLOT_ROWS = 9;
const STAFF_COLS = 5;

// Deterministic pseudo-random placement so the skeleton doesn't jump around
// on every re-render (no Math.random() during render).
const CHIP_SPOTS = [
  { col: 0, row: 1, span: 2 },
  { col: 1, row: 3, span: 1 },
  { col: 2, row: 0, span: 3 },
  { col: 3, row: 4, span: 2 },
  { col: 4, row: 2, span: 1 },
  { col: 0, row: 6, span: 1 },
  { col: 2, row: 5, span: 2 },
];

function GridSkeleton() {
  return (
    <div className="cal-skel cal-skel--grid">
      <div className="cal-skel__header" style={{ height: HEADER_HEIGHT }}>
        <div className="cal-skel__gutter-cell" style={{ width: GUTTER_WIDTH }} />
        {Array.from({ length: STAFF_COLS }).map((_, i) => (
          <div key={i} className="cal-skel__col-header">
            <Skeleton width={28} height={28} borderRadius="50%" />
            <Skeleton width="60%" height={11} style={{ marginTop: 6 }} />
          </div>
        ))}
      </div>

      <div className="cal-skel__body">
        {Array.from({ length: SLOT_ROWS }).map((_, r) => (
          <div key={r} className="cal-skel__row" style={{ height: SLOT_HEIGHT }}>
            <div className="cal-skel__gutter-cell" style={{ width: GUTTER_WIDTH }}>
              <Skeleton width={40} height={10} />
            </div>
            {Array.from({ length: STAFF_COLS }).map((_, c) => (
              <div key={c} className="cal-skel__cell" />
            ))}
          </div>
        ))}

        {/* Scattered "booking chip" placeholders, absolutely positioned over the grid */}
        {CHIP_SPOTS.map((spot, i) => (
          <Skeleton
            key={i}
            className="cal-skel__chip"
            height={SLOT_HEIGHT * spot.span - 6}
            style={{
              position: "absolute",
              top: HEADER_HEIGHT + spot.row * SLOT_HEIGHT + 3,
              left: `calc(${GUTTER_WIDTH}px + (100% - ${GUTTER_WIDTH}px) * ${spot.col} / ${STAFF_COLS} + 4px)`,
              width: `calc((100% - ${GUTTER_WIDTH}px) / ${STAFF_COLS} - 8px)`,
            }}
            borderRadius={8}
          />
        ))}
      </div>
    </div>
  );
}

function MonthSkeleton() {
  return (
    <div className="cal-skel cal-skel--month">
      <div className="cal-skel__month-dow">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} width="40%" height={11} style={{ margin: "0 auto" }} />
        ))}
      </div>
      <div className="cal-skel__month-grid">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="cal-skel__month-cell">
            <Skeleton width={18} height={12} style={{ marginBottom: 8 }} />
            {(i % 3 === 0) && <Skeleton width="80%" height={14} borderRadius={5} style={{ marginBottom: 4 }} />}
            {(i % 5 === 0) && <Skeleton width="60%" height={14} borderRadius={5} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="cal-skel cal-skel--list">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="cal-skel__list-row">
          <Skeleton width={60} height={12} />
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="cal-skel__list-card">
              <Skeleton width={30} height={30} borderRadius="50%" />
              <div style={{ flex: 1 }}>
                <Skeleton width="70%" height={12} style={{ marginBottom: 6 }} />
                <Skeleton width="40%" height={10} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function CalendarSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === "Month") return <MonthSkeleton />;
  if (viewMode === "List Week") return <ListSkeleton />;
  return <GridSkeleton />;
}
