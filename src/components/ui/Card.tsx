import React from "react";

interface CardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClass?: string;
  noPadding?: boolean;
  shadow?: "none" | "sm" | "md" | "lg";
  style?: React.CSSProperties;
}

const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  headerActions,
  footer,
  children,
  className = "",
  bodyClass = "",
  noPadding = false,
  shadow = "sm",
  style,
}) => {
  const shadowClass = shadow !== "none" ? `shadow-${shadow}` : "";
  
  return (
    <div className={`card border-0 ${shadowClass} rounded-4 ${className}`} style={style}>
      {(title || subtitle || headerActions) && (
        <div className="card-header bg-transparent border-0 pt-4 px-4 d-flex align-items-center justify-content-between">
          <div>
            {title && <h3 className="card-title fw-bold mb-1">{title}</h3>}
            {subtitle && <p className="card-subtitle text-muted mb-0" style={{ fontSize: "14px" }}>{subtitle}</p>}
          </div>
          {headerActions && <div>{headerActions}</div>}
        </div>
      )}
      <div className={`card-body ${noPadding ? "p-0" : "p-4"} ${bodyClass}`}>
        {children}
      </div>
      {footer && (
        <div className="card-footer bg-transparent border-0 pb-4 px-4">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
