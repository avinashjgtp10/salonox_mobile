import React from "react";

interface ModalProps {
  show: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  centered?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  show,
  onClose,
  title,
  children,
  footer,
  size = "md",
  centered = true,
}) => {
  if (!show) return null;

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose}></div>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        onClick={onClose}
      >
        <div
          className={`modal-dialog modal-${size} ${centered ? "modal-dialog-centered" : ""}`}
          role="document"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content border-0 shadow-lg rounded-4">
            <div className="modal-header border-0 pt-4 px-4">
              {title && <h3 className="modal-title fw-bold">{title}</h3>}
              <button
                type="button"
                className="btn-close shadow-none"
                onClick={onClose}
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body px-4 py-3">{children}</div>
            {footer && (
              <div className="modal-footer border-0 pb-4 px-4">{footer}</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Modal;
