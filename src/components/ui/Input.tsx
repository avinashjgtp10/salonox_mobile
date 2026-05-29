import React, { useId } from "react";

interface InputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>,
  "onChange"
> {
  label?: React.ReactNode;
  error?: string;
  floating?: boolean;
  containerClass?: string;
  multiline?: boolean;
  rows?: number;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  showCharCount?: boolean;
  onChange?: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
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
  showCharCount = false,
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
      <input id={inputId} className={inputClass} {...props} />
    );

    if (iconLeft || iconRight) {
      return (
        <div className="position-relative d-flex align-items-center">
          {iconLeft && (
            <div
              className="position-absolute start-0 ps-3 text-muted d-flex align-items-center"
              style={{ zIndex: 4 }}
            >
              {iconLeft}
            </div>
          )}
          {inputElement}
          {iconRight && (
            <div
              className="position-absolute end-0 pe-3 text-muted d-flex align-items-center"
              style={{ zIndex: 4 }}
            >
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
      {label && (
        <div className={showCharCount ? "d-flex justify-content-between align-items-center mb-1" : undefined}>
          <label
            htmlFor={inputId}
            className="form-label fw-semibold mb-0"
            style={{ fontSize: "13px", color: "#374151" }}
          >
            {label}
          </label>
          {showCharCount && props.maxLength !== undefined && (
            <span className="text-muted" style={{ fontSize: "12px" }}>
              {String(props.value ?? "").length}/{props.maxLength}
            </span>
          )}
        </div>
      )}
      {renderInput()}
      {error && (
        <div className="text-danger mt-1" style={{ fontSize: "12px" }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default Input;
