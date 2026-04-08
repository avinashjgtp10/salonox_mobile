import React, { useState } from "react";
import { FileEarmarkText, Plus } from "react-bootstrap-icons";
import type { FormsData, ServiceForm } from "../../types/catalog.types.ts";

interface Props {
  data: FormsData;
  onChange: (data: FormsData) => void;
}

const FormsTab: React.FC<Props> = ({ data, onChange }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFormName, setNewFormName] = useState("");

  const toggleForm = (formId: string) => {
    const selected = data.selectedFormIds.includes(formId)
      ? data.selectedFormIds.filter((id: string) => id !== formId)
      : [...data.selectedFormIds, formId];
    onChange({ ...data, selectedFormIds: selected });
  };

  const handleCreateForm = () => {
    if (!newFormName.trim()) return;
    const newForm: ServiceForm = {
      id: Math.random().toString(36).slice(2),
      name: newFormName.trim(),
      createdAt: new Date().toISOString(),
    };
    onChange({
      ...data,
      availableForms: [...data.availableForms, newForm],
      selectedFormIds: [...data.selectedFormIds, newForm.id],
    });
    setNewFormName("");
    setShowCreateModal(false);
  };

  return (
    <div className="tab-content-panel">
      <h5 className="tab-content-panel__title">Consultation forms</h5>
      <p className="text-muted small mb-4">
        Attach intake forms or consent forms to this service
      </p>

      <div className="forms-list mb-4">
        {data.availableForms.map((form: ServiceForm) => (
          <div
            key={form.id}
            className="form-item py-3 border-bottom d-flex align-items-center"
          >
            <div className="form-check d-flex align-items-center gap-3 w-100 mb-0">
              <input
                className="form-check-input flex-shrink-0"
                type="checkbox"
                id={`form-${form.id}`}
                checked={data.selectedFormIds.includes(form.id)}
                onChange={() => toggleForm(form.id)}
              />
              <label
                className="form-check-label d-flex align-items-center justify-content-between flex-grow-1 mb-0"
                htmlFor={`form-${form.id}`}
              >
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="form-icon-circle rounded-circle bg-light d-flex align-items-center justify-content-center"
                    style={{ width: "36px", height: "36px" }}
                  >
                    <FileEarmarkText className="text-muted" size={18} />
                  </div>
                  <span className="fw-medium text-dark">{form.name}</span>
                </div>
                <span className="text-muted small">
                  {new Date(form.createdAt).toLocaleDateString()}
                </span>
              </label>
            </div>
          </div>
        ))}

        {data.availableForms.length === 0 && (
          <div className="text-center py-5 bg-light rounded-4">
            <FileEarmarkText className="text-muted mb-3" size={32} />
            <p className="text-muted small mb-0">
              No consultation forms yet. <br />
              Attach forms to collect info from clients during booking.
            </p>
          </div>
        )}
      </div>

      <button
        className="btn btn-link text-primary text-decoration-none fw-bold p-0 d-flex align-items-center gap-2"
        onClick={() => setShowCreateModal(true)}
      >
        <Plus size={20} /> Create new form
      </button>

      {showCreateModal && (
        <>
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 rounded-4 shadow">
                <div className="modal-header border-0 px-4 pt-4">
                  <h5 className="modal-title fw-bold">
                    Create consultation form
                  </h5>
                  <button
                    className="btn-close shadow-none"
                    onClick={() => setShowCreateModal(false)}
                  />
                </div>
                <div className="modal-body px-4 pb-4">
                  <label className="form-label fw-bold small text-muted text-uppercase mb-2">
                    Form name
                  </label>
                  <input
                    type="text"
                    className="form-control premium-input"
                    placeholder="e.g. Skin consultation"
                    value={newFormName}
                    onChange={(e) => setNewFormName(e.target.value)}
                    autoFocus
                  />
                  <p className="small text-muted mt-2 mb-0">
                    Forms will be sent to clients automatically after booking
                  </p>
                </div>
                <div className="modal-footer border-0 px-4 pb-4">
                  <button
                    className="btn btn-outline-dark rounded-pill px-4 fw-bold"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary rounded-pill px-4 fw-bold"
                    onClick={handleCreateForm}
                    disabled={!newFormName.trim()}
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div
            className="modal-backdrop show opacity-0"
            onClick={() => setShowCreateModal(false)}
          />
        </>
      )}
    </div>
  );
};

export default FormsTab;
