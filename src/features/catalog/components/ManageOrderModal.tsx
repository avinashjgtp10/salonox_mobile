import React, { useState } from "react";
import type { Service } from "../types/catalog.types.ts";
import "../styles/ManageOrderModal.scss";

interface Props {
    services: Service[];
    onClose: () => void;
    onSave: (orderedIds: string[]) => void;
}

const ManageOrderModal: React.FC<Props> = ({ services, onClose, onSave }) => {
    const [ordered, setOrdered] = useState<Service[]>([...services]);
    const [dragIndex, setDragIndex] = useState<number | null>(null);

    const handleDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        if (dragIndex === null || dragIndex === idx) return;
        const updated = [...ordered];
        const [moved] = updated.splice(dragIndex, 1);
        updated.splice(idx, 0, moved);
        setDragIndex(idx);
        setOrdered(updated);
    };

    return (
        <div className="modal show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content manage-order-modal">
                    <div className="modal-header">
                        <h5 className="modal-title">Manage Service Order</h5>
                        <button type="button" className="btn-close" onClick={onClose} />
                    </div>
                    <div className="modal-body">
                        <p className="text-muted mb-3">Drag and drop to reorder services in your menu.</p>
                        <div className="manage-order-modal__list">
                            {ordered.map((svc, idx) => (
                                <div key={svc.id} className={`manage-order-modal__item ${dragIndex === idx ? "dragging" : ""}`}
                                    draggable onDragStart={() => setDragIndex(idx)} onDragOver={(e) => handleDragOver(e, idx)} onDrop={() => setDragIndex(null)}>
                                    <i className="bi bi-grip-vertical manage-order-modal__grip" />
                                    <span className="manage-order-modal__index">{idx + 1}</span>
                                    <span className="manage-order-modal__name">{svc.name}</span>
                                    <span className="badge bg-secondary ms-auto">{svc.categoryName}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
                        <button className="btn btn-primary" onClick={() => onSave(ordered.map((s) => s.id))}>Save Order</button>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop show" onClick={onClose} />
        </div>
    );
};

export default ManageOrderModal;