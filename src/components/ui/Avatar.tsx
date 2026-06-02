// src/components/ui/Avatar.tsx
import React from "react";

interface AvatarProps {
  initials: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  style?: React.CSSProperties;
}

const SIZE_MAP = { sm: 28, md: 36, lg: 48 } as const;
const FONT_MAP = { sm: 10, md: 12, lg: 16 } as const;

const Avatar: React.FC<AvatarProps> = ({ initials, size = "md", className = "", style }) => {
  const px = SIZE_MAP[size];
  const fs = FONT_MAP[size];

  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: px,
        height: px,
        borderRadius: "50%",
        background: "#EDE9FE",
        color: "#6C27BE",
        fontWeight: 800,
        fontSize: fs,
        flexShrink: 0,
        letterSpacing: ".03em",
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        ...style,
      }}
    >
      {initials.slice(0, 2).toUpperCase()}
    </div>
  );
};

export default Avatar;
