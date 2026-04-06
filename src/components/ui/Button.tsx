import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
  | "primary" | "secondary" | "success" | "danger" | "warning" | "info" | "dark" | "light"
  | "outline-primary" | "outline-secondary" | "outline-success" | "outline-danger" | "outline-warning" | "outline-info" | "outline-dark" | "outline-light"
  | "outline" | "ghost" | "link";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  pill?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  pill = false,
  iconLeft,
  iconRight,
  fullWidth = false,
  className = "",
  children,
  disabled,
  ...props
}) => {
  const baseClass = "btn d-inline-flex align-items-center justify-content-center gap-2 transition-all";
  const variantClass = `btn-${variant}`;
  const sizeClass = size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "";
  const widthClass = fullWidth ? "w-100" : "";
  const roundedClass = pill ? "rounded-pill" : "rounded-3";

  return (
    <button
      className={`${baseClass} ${variantClass} ${sizeClass} ${widthClass} ${roundedClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>}
      {!loading && iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  );
};

export default Button;
