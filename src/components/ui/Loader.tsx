import React from "react";

interface LoaderProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  variant?: string;
  className?: string;
}

export const Loader: React.FC<LoaderProps> = ({
  message = "Loading…",
  size = "sm",
  variant = "muted",
  className = "",
}) => {
  const sizeClass = size === "sm" ? "spinner-border-sm" : "";
  const variantClass = variant ? `text-${variant}` : "";

  return (
    <div className={`d-flex align-items-center justify-content-center py-5 ${className}`}>
      <div className={`spinner-border ${sizeClass} ${variantClass} me-2`} role="status" />
      {message && <span className={`${variantClass} small`}>{message}</span>}
    </div>
  );
};

export default Loader;
