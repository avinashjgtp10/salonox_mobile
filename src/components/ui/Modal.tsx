import React from "react";

interface ModalProps {
  show: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  centered?: boolean;
  /** Hides the header "x" and disables backdrop-click dismissal — for flows
   *  the user must complete rather than dismiss (e.g. a mandatory cash
   *  counter open/close). */
  hideCloseButton?: boolean;
  /** Disables dismissal by clicking the backdrop, while still allowing the
   *  header "x" (unless hideCloseButton is also set) and any footer actions
   *  to close it — for forms where an accidental outside click shouldn't
   *  discard in-progress input. */
  disableBackdropClose?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  show,
  onClose,
  title,
  children,
  footer,
  size = "md",
  centered = true,
  hideCloseButton = false,
  disableBackdropClose = false,
}) => {
  if (!show) return null;

  const closeOnBackdrop = !hideCloseButton && !disableBackdropClose;

  return (
    <>
      <div
        className="modal-backdrop fade show"
        onClick={closeOnBackdrop ? onClose : undefined}
      ></div>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        onClick={closeOnBackdrop ? onClose : undefined}
      >
        <div
          className={`modal-dialog modal-${size} modal-dialog-scrollable ${centered ? "modal-dialog-centered" : ""}`}
          role="document"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content border-0 shadow-lg rounded-4">
            <div className="modal-header border-0 pt-4 px-4">
              {title && <h5 className="modal-title fw-bold">{title}</h5>}
              {!hideCloseButton && (
                <button
                  type="button"
                  className="btn-close shadow-none"
                  onClick={onClose}
                  aria-label="Close"
                ></button>
              )}
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
