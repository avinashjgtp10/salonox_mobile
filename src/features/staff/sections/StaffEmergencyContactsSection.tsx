import React, { useState } from "react";

interface Contact { id: number; name: string; relationship: string; phone: string; }

const StaffEmergencyContactsSection: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", relationship: "", phone: "" });

  const handleSave = () => {
    if (!form.name.trim()) return;
    setContacts((prev) => [...prev, { id: Date.now(), ...form }]);
    setForm({ name: "", relationship: "", phone: "" });
    setShowForm(false);
  };

  return (
    <div className="section staff-form">
      <h4 className="section__title">Emergency contacts</h4>
      <p className="section__subtitle">Add emergency contacts for this team member</p>

      {contacts.length === 0 && !showForm && (
        <div className="staff-empty">
          <i className="bi bi-person-lines-fill staff-empty__icon" />
          <p className="staff-empty__title">No emergency contacts</p>
          <p className="staff-empty__desc">Add a contact to reach in case of emergency</p>
        </div>
      )}

      {contacts.map((c) => (
        <div className="staff-list-item" key={c.id}>
          <div className="staff-list-item__info">
            <div className="staff-list-item__label">{c.name}</div>
            <div className="staff-list-item__sub">{c.relationship} · {c.phone}</div>
          </div>
          <div className="staff-list-item__actions">
            <button className="staff-list-item__action-btn"><i className="bi bi-pencil" /></button>
            <button
              className="staff-list-item__action-btn staff-list-item__action-btn--danger"
              onClick={() => setContacts((p) => p.filter((x) => x.id !== c.id))}>
              <i className="bi bi-trash" />
            </button>
          </div>
        </div>
      ))}

      {showForm && (
        <div className="p-3 border rounded mb-3 bg-white">
          <div className="mb-2">
            <label className="form-label">Full name</label>
            <input className="form-control" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="mb-2">
            <label className="form-label">Relationship</label>
            <input className="form-control" placeholder="e.g. Spouse, Parent" value={form.relationship}
              onChange={(e) => setForm({ ...form, relationship: e.target.value })} />
          </div>
          <div className="mb-3">
            <label className="form-label">Phone number</label>
            <input type="tel" className="form-control" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="d-flex gap-2 justify-content-end">
            <button className="btn btn-light btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-dark btn-sm" onClick={handleSave}>Save contact</button>
          </div>
        </div>
      )}

      {!showForm && (
        <button className="btn d-flex align-items-center gap-2 mt-2"
          style={{ color: "#6c3ce1", fontWeight: 600, fontSize: 13 }}
          onClick={() => setShowForm(true)}>
          <i className="bi bi-plus-circle" /> Add an emergency contact
        </button>
      )}
    </div>
  );
};

export default StaffEmergencyContactsSection;