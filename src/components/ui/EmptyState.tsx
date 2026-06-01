// src/components/ui/EmptyState.tsx
import React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, className = "" }) => (
  <div
    className={className}
    style={{ padding: "52px 20px", textAlign: "center", color: "#6B7280" }}
  >
    {icon && (
      <div style={{ fontSize: 40, opacity: 0.22, marginBottom: 12 }}>{icon}</div>
    )}
    <div style={{ fontSize: 15, fontWeight: 700, color: "#374151", marginBottom: 6 }}>{title}</div>
    {description && (
      <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>{description}</div>
    )}
    {action && <div>{action}</div>}
  </div>
);

export default EmptyState;
