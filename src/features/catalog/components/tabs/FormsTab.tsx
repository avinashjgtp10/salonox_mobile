import React, { useState } from "react";
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
        const newForm: ServiceForm = { id: Math.random().toString(36).slice(2), name: newFormName.trim(), createdAt: new Date().toISOString() };
        onChange({ ...data, availableForms: [...data.availableForms, newForm], selectedFormIds: [...data.selectedFormIds, newForm.id] });
        setNewFormName("");
        setShowCreateModal(false);
    };

    return (
        <div className="tab-content-panel">
            <h5 className="tab-content-panel__title">Forms</h5>
            <p className="text-muted mb-3">Attach intake forms or consent forms to this service.</p>
            <div className="d-flex justify-content-end mb-3">
                <button className="btn btn-outline-primary btn-sm" onClick={() => setShowCreateModal(true)}>
                    <i className="bi bi-plus-lg" /> Create New Form
                </button>
            </div>
            {data.availableForms.length === 0 ? (
                <div className="alert alert-info">No forms yet. Create your first form to attach to services.</div>
            ) : (
                <div className="forms-list">
                    {data.availableForms.map((form: ServiceForm) => (
                        <div key={form.id} className="d-flex align-items-center gap-3 py-2 border-bottom">
                            <input type="checkbox" className="form-check-input" id={`form-${form.id}`}
                                checked={data.selectedFormIds.includes(form.id)} onChange={() => toggleForm(form.id)} />
                            <label className="form-check-label flex-grow-1" htmlFor={`form-${form.id}`}>{form.name}</label>
                            <small className="text-muted">{new Date(form.createdAt).toLocaleDateString()}</small>
                        </div>
                    ))}
                </div>
            )}
            {showCreateModal && (
                <div className="modal show d-block" tabIndex={-1}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Create New Form</h5>
                                <button className="btn-close" onClick={() => setShowCreateModal(false)} />
                            </div>
                            <div className="modal-body">
                                <label className="form-label">Form Name</label>
                                <input type="text" className="form-control" placeholder="e.g. Client Intake Form"
                                    value={newFormName} onChange={(e) => setNewFormName(e.target.value)} autoFocus />
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-outline-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleCreateForm} disabled={!newFormName.trim()}>Create</button>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop show" onClick={() => setShowCreateModal(false)} />
                </div>
            )}
        </div>
    );
};

export default FormsTab;