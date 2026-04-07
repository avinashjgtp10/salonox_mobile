import { useRef, useEffect } from "react";
import {
  ThreeDotsVertical,
  Pencil,
  Link45deg,
  ArrowsMove,
  CalendarCheck,
  Trash,
} from "react-bootstrap-icons";
import "../styles/ServiceActionsMenu.scss";

export interface ServiceActionsMenuProps {
  serviceId: string;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onQuickBookingLink: () => void;
  onSetMenuOrder: () => void;
  onSetBookingSequence: () => void;
}

const ServiceActionsMenu = ({
  serviceId: _serviceId,
  open,
  onToggle,
  onEdit,
  onDelete,
  onQuickBookingLink,
  onSetMenuOrder,
  onSetBookingSequence,
}: ServiceActionsMenuProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        if (open) onToggle();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onToggle]);

  return (
    <div className="service-actions-menu" ref={ref}>
      <div className="service-actions-menu__trigger" onClick={onToggle}>
        <ThreeDotsVertical size={18} />
      </div>

      {open && (
        <div className="service-actions-menu__dropdown shadow-lg">
          <button className="service-actions-menu__item" onClick={onEdit}>
            <Pencil size={15} /> Edit Service
          </button>

          <button
            className="service-actions-menu__item"
            onClick={onQuickBookingLink}
          >
            <Link45deg size={18} /> Quick Booking Link
          </button>

          <button
            className="service-actions-menu__item"
            onClick={onSetMenuOrder}
          >
            <ArrowsMove size={15} /> Set Menu Order
          </button>

          <button
            className="service-actions-menu__item"
            onClick={onSetBookingSequence}
          >
            <CalendarCheck size={15} /> Set Booking Sequence
          </button>

          <div className="service-actions-menu__divider" />

          <button
            className="service-actions-menu__item service-actions-menu__item--danger"
            onClick={onDelete}
          >
            <Trash size={15} /> Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default ServiceActionsMenu;
