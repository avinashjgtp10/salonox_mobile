import React from "react";
import type { Staff } from "../../types/scheduler-types";
import "../../styles/Scheduler.scss";

interface AvatarProps {
  staff: Staff;
  size?: number;
}

const Avatar: React.FC<AvatarProps> = ({ staff, size = 36 }) => {
  const words = staff.name.trim().split(/\s+/);
  const abbrev =
    words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : staff.name.slice(0, 2).toUpperCase();

  return (
    <div
      className="staff-avatar"
      style={{
        width: size,
        height: size,
        background: staff.color,
        fontSize: Math.round(size * 0.36),
      }}
    >
      {abbrev}
    </div>
  );
};

export default Avatar;
