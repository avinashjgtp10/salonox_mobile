import React from "react";
import { formatTime12 } from "../../utils/timeUtils";
import { SLOT_HEIGHT } from "../../hooks/useScheduler";

interface TimeGutterProps {
  slots: string[];
  headerHeight?: number;
}

const TimeGutter: React.FC<TimeGutterProps> = ({ slots, headerHeight = 64 }) => {
  return (
    <div style={{
      width: 70, flexShrink: 0,
      borderRight: "1px solid #e5e7eb",
      background: "#fafafa",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ height: headerHeight, flexShrink: 0, borderBottom: "1px solid #e5e7eb", background: "#fff" }} />
      {slots.map(t => {
        const [, m] = t.split(":").map(Number);
        return (
          <div key={t} style={{
            height: SLOT_HEIGHT,
            position: "relative",
            borderBottom: m === 0 ? "1px solid #e5e7eb" : "1px solid #f0f0f0",
          }}>
            {/* Show label only on the hour */}
            {m === 0 && (
              <span style={{
                position: "absolute",
                top: -8, right: 6,
                fontSize: 11, color: "#9ca3af",
                fontWeight: 500, whiteSpace: "nowrap",
              }}>
                {formatTime12(t).replace(":00 ", " ")}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TimeGutter;
