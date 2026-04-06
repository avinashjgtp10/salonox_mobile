import React, { useId } from "react";

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>, 'onChange'> {
  label?: string;
  error?: string;
  floating?: boolean;
  containerClass?: string;
  multiline?: boolean;
  rows?: number;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  floating = false,
  containerClass = "mb-3",
  className = "",
  multiline = false,
  rows = 3,
  iconLeft,
  iconRight,
  id,
  ...props
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const inputClass = `form-control ${error ? "is-invalid" : ""} ${className} ${iconLeft ? "ps-5" : ""} ${iconRight ? "pe-5" : ""}`;

  const renderInput = () => {
    const inputElement = multiline ? (
      <textarea
        id={inputId}
        className={inputClass}
        rows={rows}
        {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
      />
    ) : (
      <input
        id={inputId}
        className={inputClass}
        {...props}
      />
    );

    if (iconLeft || iconRight) {
      return (
        <div className="position-relative d-flex align-items-center">
          {iconLeft && (
            <div className="position-absolute start-0 ps-3 text-muted d-flex align-items-center" style={{ zIndex: 4 }}>
              {iconLeft}
            </div>
          )}
          {inputElement}
          {iconRight && (
            <div className="position-absolute end-0 pe-3 text-muted d-flex align-items-center" style={{ zIndex: 4 }}>
              {iconRight}
            </div>
          )}
        </div>
      );
    }

    return inputElement;
  };

  if (floating && !multiline) {
    return (
      <div className={`form-floating ${containerClass}`}>
        {renderInput()}
        {label && <label htmlFor={inputId}>{label}</label>}
        {error && <div className="invalid-feedback">{error}</div>}
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {label && <label htmlFor={inputId} className="form-label fw-semibold" style={{ fontSize: "13px" }}>{label}</label>}
      {renderInput()}
      {error && <div className="text-danger mt-1" style={{ fontSize: "12px" }}>{error}</div>}
    </div>
  );
};

export default Input;
