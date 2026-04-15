import React from "react";

interface StatusBadgeProps {
  isActive: boolean;
  size?: "sm" | "md";
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ isActive, size = "md" }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: size === "sm" ? "2px 8px" : "4px 12px",
      borderRadius: 999,
      fontSize: size === "sm" ? 11 : 12.5,
      fontWeight: 600,
      background: isActive ? "#dcfce7" : "#fee2e2",
      color: isActive ? "#16a34a" : "#dc2626",
    }}
  >
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: isActive ? "#16a34a" : "#dc2626",
        display: "inline-block",
        flexShrink: 0,
      }}
    />
    {isActive ? "Active" : "Inactive"}
  </span>
);

export default StatusBadge;
