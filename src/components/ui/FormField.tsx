// src/components/ui/FormField.tsx
import React from "react";
import "./styles/FormField.scss";

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

const FormField: React.FC<FormFieldProps> = ({ label, required, error, hint, children, className = "" }) => (
  <div className={`ui-form-field ${className}`}>
    <label className={`ui-form-field__label${error ? " ui-form-field__label--error" : ""}`}>
      {label}
      {required && <span className="ui-form-field__required"> *</span>}
    </label>
    {children}
    {hint && !error && <span className="ui-form-field__hint">{hint}</span>}
    {error && <span className="ui-form-field__error">{error}</span>}
  </div>
);

export default FormField;
