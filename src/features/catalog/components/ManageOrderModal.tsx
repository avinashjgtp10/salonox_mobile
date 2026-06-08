import React, { useState, useMemo } from "react";
import { GripVertical, ChevronDown, X } from "react-bootstrap-icons";
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
    const groups: Record<string, { name: string; services: Service[] }> = {};
    ordered.forEach((svc) => {
      const key = String(svc.category_id ?? "uncategorized");
      if (!groups[key]) {
        groups[key] = { name: svc.category_name ?? "Uncategorized", services: [] };
      }
      groups[key].services.push(svc);
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
    <div className="mom-backdrop" onClick={onClose}>
      <div className="mom" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="mom__header">
          <div>
            <h2 className="mom__title">Set menu order</h2>
            <p className="mom__subtitle">Drag to reorder how services appear to clients when booking.</p>
          </div>
          <button className="mom__close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* View toggle */}
        <div className="mom__toolbar">
          <div className="mom__dropdown-wrap">
            <button
              className="mom__dropdown-btn"
              onClick={() => setShowSelector((v) => !v)}
            >
              {viewMode === "both" ? "Categories & services" : "Categories only"}
              <ChevronDown
                size={13}
                style={{ transform: showSelector ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
              />
            </button>
            {showSelector && (
              <div className="mom__dropdown-menu">
                {(["both", "categories"] as const).map((mode) => (
                  <button
                    key={mode}
                    className={`mom__dropdown-item${viewMode === mode ? " mom__dropdown-item--active" : ""}`}
                    onClick={() => { setViewMode(mode); setShowSelector(false); }}
                  >
                    {mode === "both" ? "Categories & services" : "Categories only"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* List */}
        <div className="mom__body">
          <div className="mom__list">
            {servicesByCategory.map((group) => (
              <div key={group.id} className="mom__group">
                <div className="mom__group-row">
                  <GripVertical size={18} className="mom__grip mom__grip--cat" />
                  <span className="mom__group-name">{group.name}</span>
                  <span className="mom__group-count">{group.services.length}</span>
                </div>

                {viewMode === "both" && (
                  <div className="mom__services">
                    {group.services.map((svc) => {
                      const globalIdx = ordered.findIndex((s) => s.id === svc.id);
                      return (
                        <div
                          key={svc.id}
                          className={`mom__svc-row${dragIndex === globalIdx ? " mom__svc-row--dragging" : ""}`}
                          draggable
                          onDragStart={() => setDragIndex(globalIdx)}
                          onDragOver={(e) => handleDragOver(e, globalIdx)}
                          onDrop={() => setDragIndex(null)}
                        >
                          <GripVertical size={16} className="mom__grip" />
                          <span className="mom__svc-name">{svc.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mom__footer">
          <button className="mom__btn mom__btn--ghost" onClick={onClose}>Cancel</button>
          <button
            className="mom__btn mom__btn--save"
            onClick={() => onSave(ordered.map((s) => String(s.id)))}
          >
            Save order
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageOrderModal;
