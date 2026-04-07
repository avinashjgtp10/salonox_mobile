import React from "react";

export const Divider: React.FC<{ text?: string }> = ({ text = "OR" }) => (
  <div className="d-flex align-items-center my-4">
    <hr className="flex-grow-1 border-secondary" />
    {text && <span className="mx-3 fw-semibold text-secondary">{text}</span>}
    <hr className="flex-grow-1 border-secondary" />
  </div>
);
