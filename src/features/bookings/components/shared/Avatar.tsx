import React from "react";
import type { Staff } from "../../types/scheduler-types";

interface AvatarProps {
  staff: Staff;
  size?: number;
}

const Avatar: React.FC<AvatarProps> = ({ staff, size = 44 }) => {
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        background: staff.color,
        fontSize: size * 0.35,
      }}
    >
      {staff.initials}
    </div>
  );
};

export default Avatar;
