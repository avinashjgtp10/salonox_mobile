import React from "react";
import type { Staff } from "../../types/scheduler-types";

interface AvatarProps {
  staff: Staff;
  size?: number;
}

const Avatar: React.FC<AvatarProps> = ({ staff, size = 36 }) => {
  // Build a 2-char abbreviation: first letters of first two words, or first 2 chars
  const words    = staff.name.trim().split(/\s+/);
  const abbrev   = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : staff.name.slice(0, 2).toUpperCase();

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: staff.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(size * 0.36),
        fontWeight: 700,
        color: "#fff",
        letterSpacing: "0.5px",
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {abbrev}
    </div>
  );
};

export default Avatar;