// src/components/ui/FormField.tsx
import React from "react";

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

const FormField: React.FC<FormFieldProps> = ({ label, required, error, hint, children, className = "" }) => (
  <div className={className} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <label
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: error ? "#DC2626" : "#6B7280",
        textTransform: "uppercase",
        letterSpacing: ".06em",
      }}
    >
      {label}
      {required && <span style={{ color: "#DC2626" }}> *</span>}
    </label>
    {children}
    {hint && !error && (
      <span style={{ fontSize: 11, color: "#9CA3AF" }}>{hint}</span>
    )}
    {error && (
      <span style={{ fontSize: 11, color: "#DC2626", fontWeight: 600 }}>{error}</span>
    )}
  </div>
);

export default FormField;
