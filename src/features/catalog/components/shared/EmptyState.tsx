import React from "react";
import type { ReactNode } from "react";

interface ActionConfig {
  label: string;
  onClick: () => void;
  variant?: "primary" | "outline";
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ActionConfig;
  secondaryAction?: ActionConfig;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
}) => (
  <div className="slp__empty">
    {icon && <div className="slp__empty-icon">{icon}</div>}
    <h3>{title}</h3>
    {description && <p>{description}</p>}
    {(action || secondaryAction) && (
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        {secondaryAction && (
          <button
            className="slp__btn slp__btn--outline"
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </button>
        )}
        {action && (
          <button
            className={`slp__btn slp__btn--${action.variant === "outline" ? "outline" : "dark"}`}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        )}
      </div>
    )}
  </div>
);

export default EmptyState;
