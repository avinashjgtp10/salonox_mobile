import React from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  containerClass?: string;
}

const Select: React.FC<SelectProps> = ({
  label,
  containerClass = "",
  className = "",
  children,
  ...props
}) => {
  return (
    <div className={containerClass}>
      {label && (
        <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
          {label}
        </label>
      )}
      <select className={`form-select ${className}`} {...props}>
        {children}
      </select>
    </div>
  );
};

export default Select;
