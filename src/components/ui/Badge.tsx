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
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "primary",
  className = "",
  pill = true,
}) => {
  const baseClass = "badge";
  const variantClass = `bg-${variant} text-white`;
  const roundedClass = pill ? "rounded-pill" : "";

  return (
    <span
      className={`${baseClass} ${variantClass} ${roundedClass} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
