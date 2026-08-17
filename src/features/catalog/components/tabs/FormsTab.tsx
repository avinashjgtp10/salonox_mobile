import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { FileEarmarkText, Plus, PencilSquare } from "react-bootstrap-icons";
import type { AppDispatch } from "../../../../store/store";
import {
  createConsultationFormThunk,
  fetchConsultationFormsThunk,
  updateConsultationFormThunk,
} from "../../../../middleware/services/services.thunk";
import type { FormsData, ServiceConsultationFormValues, ServiceForm, TeamMember } from "../../types/catalog.types.ts";
import ConsultationFormModal from "../ConsultationFormModal.tsx";
import { toTitleCase } from "../../../../utils/titleCase";

interface Props {
  data: FormsData;
  onChange: (data: FormsData) => void;
  /** Present only when editing an existing service — enables backend persistence. */
  serviceId?: string | number;
  staffMembers?: TeamMember[];
}

const FormsTab: React.FC<Props> = ({ data, onChange, serviceId, staffMembers = [] }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFormName, setNewFormName] = useState("");
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // When editing an existing service, load its real consultation forms from
  // the backend instead of relying on whatever local state was passed in.
  useEffect(() => {
    if (!serviceId) return;
    let cancelled = false;
    setLoading(true);
    dispatch(fetchConsultationFormsThunk(serviceId)).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (fetchConsultationFormsThunk.fulfilled.match(result)) {
        const forms = result.payload;
        onChange({
          selectedFormIds: forms.filter((f) => f.is_selected).map((f) => f.id),
          availableForms: forms.map((f) => ({
            id: f.id,
            name: f.name,
            createdAt: f.created_at,
            values: f.values ?? undefined,
          })),
        });
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  const toggleForm = (formId: string) => {
    const nowSelected = !data.selectedFormIds.includes(formId);
    const selected = nowSelected
      ? [...data.selectedFormIds, formId]
      : data.selectedFormIds.filter((id: string) => id !== formId);
    onChange({ ...data, selectedFormIds: selected });

    if (serviceId) {
      dispatch(updateConsultationFormThunk({ serviceId, formId, data: { is_selected: nowSelected } }));
    }
  };

  const handleCreateForm = async () => {
    const name = toTitleCase(newFormName.trim());
    if (!name) return;

    if (serviceId) {
      setCreating(true);
      setCreateError(null);
      const result = await dispatch(createConsultationFormThunk({ serviceId, name }));
      setCreating(false);
      if (createConsultationFormThunk.fulfilled.match(result)) {
        const created = result.payload;
        const newForm: ServiceForm = {
          id: created.id,
          name: created.name,
          createdAt: created.created_at,
          values: created.values ?? undefined,
        };
        onChange({
          ...data,
          availableForms: [...data.availableForms, newForm],
          selectedFormIds: [...data.selectedFormIds, newForm.id],
        });
        setNewFormName("");
        setShowCreateModal(false);
        setEditingFormId(newForm.id);
      } else {
        setCreateError((result.payload as string) ?? "Failed to create the form");
      }
      return;
    }

    // No service saved yet (still on the "New service" screen) — keep it
    // local; there's nothing to attach the form to on the backend yet.
    const newForm: ServiceForm = {
      id: Math.random().toString(36).slice(2),
      name,
      createdAt: new Date().toISOString(),
    };
    onChange({
      ...data,
      availableForms: [...data.availableForms, newForm],
      selectedFormIds: [...data.selectedFormIds, newForm.id],
    });
    setNewFormName("");
    setShowCreateModal(false);
    setEditingFormId(newForm.id);
  };

  const editingForm = data.availableForms.find((f) => f.id === editingFormId) ?? null;

  const handleSaveFormValues = async (values: ServiceConsultationFormValues) => {
    if (!editingFormId) return;

    if (serviceId) {
      const result = await dispatch(
        updateConsultationFormThunk({ serviceId, formId: editingFormId, data: { values } }),
      );
      if (!updateConsultationFormThunk.fulfilled.match(result)) {
        throw new Error((result.payload as string) ?? "Failed to save the form");
      }
    }

    onChange({
      ...data,
      availableForms: data.availableForms.map((f) =>
        f.id === editingFormId ? { ...f, values } : f,
      ),
    });
    setEditingFormId(null);
  };

  return (
    <div className="tab-content-panel">
      <h5 className="tab-content-panel__title">Consultation forms</h5>
      <p className="text-muted small mb-4">
        Attach a consultation form to this service
      </p>

      {loading ? (
        <div className="d-flex align-items-center gap-2 py-4 text-muted">
          <span className="spinner-border spinner-border-sm" />
          <span className="small">Loading consultation forms…</span>
        </div>
      ) : (
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
              <button
                type="button"
                className="btn btn-sm btn-link text-muted p-0 ms-3 flex-shrink-0"
                title="Fill / edit form"
                onClick={(e) => {
                  e.preventDefault();
                  setEditingFormId(form.id);
                }}
              >
                <PencilSquare size={16} />
              </button>
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
      )}

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
                  {createError && (
                    <div className="text-danger small mt-2 mb-0">{createError}</div>
                  )}
                </div>
                <div className="modal-footer border-0 px-4 pb-4">
                  <button
                    className="btn btn-outline-dark rounded-pill px-4 fw-bold"
                    onClick={() => setShowCreateModal(false)}
                    disabled={creating}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary rounded-pill px-4 fw-bold"
                    onClick={handleCreateForm}
                    disabled={!newFormName.trim() || creating}
                  >
                    {creating ? <span className="spinner-border spinner-border-sm me-2" /> : null}
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

      {editingForm && (
        <ConsultationFormModal
          form={editingForm}
          onClose={() => setEditingFormId(null)}
          onSave={handleSaveFormValues}
          staffMembers={staffMembers}
        />
      )}
    </div>
  );
};

export default FormsTab;
