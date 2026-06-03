// src/components/ui/ProgressBar.tsx
import React from "react";

interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  color?: string;
  height?: number;
  className?: string;
  animated?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  showLabel = true,
  color,
  height = 6,
  className = "",
  animated = true,
}) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const gradient = color ?? "linear-gradient(90deg, #7C3AED, #6C27BE)";

  return (
    <div className={className} style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          flex: 1,
          height,
          background: "#E5E7EB",
          borderRadius: height / 2,
          overflow: "hidden",
          minWidth: 70,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: gradient,
            borderRadius: height / 2,
            transition: animated ? "width .5s ease" : "none",
          }}
        />
      </div>
      {showLabel && (
        <span style={{ fontSize: 11, color: "#6B7280", minWidth: 30, textAlign: "right" }}>
          {pct}%
        </span>
      )}
    </div>
  );
};

export default ProgressBar;
