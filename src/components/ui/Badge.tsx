import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "danger"
    | "warning"
    | "info"
    | "light"
    | "dark";
  className?: string;
  pill?: boolean;
  style?: React.CSSProperties;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "primary",
  className = "",
  pill = true,
  style,
}) => {
  const baseClass = "badge";
  const variantClass = `bg-${variant} text-white`;
  const roundedClass = pill ? "rounded-pill" : "";

  return (
    <span
      className={`${baseClass} ${variantClass} ${roundedClass} ${className}`}
      style={style}
    >
      {children}
    </span>
  );
};

export default Badge;