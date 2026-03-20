import React, { useState, useMemo } from "react";
import { GripVertical, ChevronDown } from "react-bootstrap-icons";
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
    const [showSelector, setShowSelector] = useState(false);
    const [viewMode, setViewMode] = useState<"both" | "categories">("both");

    const servicesByCategory = useMemo(() => {
        const groups: Record<string, { name: string, services: Service[] }> = {};
        ordered.forEach(svc => {
            if (!groups[svc.categoryId]) {
                groups[svc.categoryId] = { name: svc.categoryName, services: [] };
            }
            groups[svc.categoryId].services.push(svc);
        });
        return Object.entries(groups).map(([id, group]) => ({ id, ...group }));
    }, [ordered]);

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
        <div className="set-menu-order-page">
            <header className="set-menu-order-page__header">
                <div className="header-actions">
                    <button className="btn-close-text" onClick={onClose}>Close</button>
                    <button className="btn-save-pill" onClick={() => onSave(ordered.map((s) => s.id))}>Save</button>
                </div>
            </header>

            <main className="set-menu-order-page__content">
                <div className="content-intro">
                    <h1>Set menu order</h1>
                    <p>Define the order that services will appear to clients when booking online.</p>
                </div>

                <div className="dropdown-selector mb-4">
                    <div className="custom-dropdown-container">
                        <button className="btn-dropdown" onClick={() => setShowSelector(!showSelector)}>
                            {viewMode === "both" ? "Categories and services" : "Categories only"} 
                            <ChevronDown size={14} className={`ms-2 transition-icon ${showSelector ? "rotate-180" : ""}`} />
                        </button>
                        
                        {showSelector && (
                            <div className="dropdown-options-menu">
                                <button 
                                    className={`dropdown-opt-item ${viewMode === "both" ? "active" : ""}`}
                                    onClick={() => { setViewMode("both"); setShowSelector(false); }}
                                >
                                    Categories and services
                                </button>
                                <button 
                                    className={`dropdown-opt-item ${viewMode === "categories" ? "active" : ""}`}
                                    onClick={() => { setViewMode("categories"); setShowSelector(false); }}
                                >
                                    Categories only
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="order-list-container">
                    {servicesByCategory.map((group) => (
                        <div key={group.id} className="category-order-group">
                            <div className="category-order-header">
                                <GripVertical size={20} className="grip-icon" />
                                <span>{group.name}</span>
                            </div>
                            
                            {viewMode === "both" && (
                                <div className="services-order-list">
                                    {group.services.map((svc) => {
                                        const globalIdx = ordered.findIndex(s => s.id === svc.id);
                                        return (
                                            <div 
                                                key={svc.id} 
                                                className={`service-order-item ${dragIndex === globalIdx ? "dragging" : ""}`}
                                                draggable 
                                                onDragStart={() => setDragIndex(globalIdx)} 
                                                onDragOver={(e) => handleDragOver(e, globalIdx)} 
                                                onDrop={() => setDragIndex(null)}
                                            >
                                                <div className="item-left">
                                                    <GripVertical size={18} className="grip-icon" />
                                                    <span className="name">{svc.name}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default ManageOrderModal;