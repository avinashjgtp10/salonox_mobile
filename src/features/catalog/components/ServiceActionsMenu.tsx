import React, { useRef, useEffect } from "react";
import "../styles/ServiceActionsMenu.scss";

interface Props {
    serviceId: string;
    open: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onQuickBookingLink: () => void;
    onSetMenuOrder: () => void;
    onSetBookingSequence: () => void;
}

const ServiceActionsMenu: React.FC<Props> = ({
    serviceId: _serviceId,
    open,
    onToggle,
    onEdit,
    onDelete,
    onQuickBookingLink,
    onSetMenuOrder,
    onSetBookingSequence
}) => {
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
            <div className="menu-trigger" onClick={onToggle}>
                <i className="bi bi-three-dots-vertical" />
            </div>

            {open && (
                <div className="service-actions-menu__dropdown">
                    <button className="service-actions-menu__item" onClick={onEdit}>
                        <i className="bi bi-pencil" /> Edit Service
                    </button>

                    <button className="service-actions-menu__item" onClick={onQuickBookingLink}>
                        <i className="bi bi-link-45deg" /> Quick Booking Link
                    </button>

                    <button className="service-actions-menu__item" onClick={onSetMenuOrder}>
                        <i className="bi bi-arrows-move" /> Set Menu Order
                    </button>

                    <button className="service-actions-menu__item" onClick={onSetBookingSequence}>
                        <i className="bi bi-calendar-check" /> Set Booking Sequence
                    </button>

                    <div className="service-actions-menu__divider" />

                    <button
                        className="service-actions-menu__item service-actions-menu__item--danger"
                        onClick={onDelete}
                    >
                        <i className="bi bi-trash" /> Delete
                    </button>
                </div>
            )}
        </div>
    );
};

export default ServiceActionsMenu;