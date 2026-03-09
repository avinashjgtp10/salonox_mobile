import React, { useState } from "react";

interface Address {
  id: number;
  label: string;
  line1: string;
  city: string;
  country: string;
}

const StaffAddressesSection: React.FC = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "", line1: "", city: "", country: "" });

  const handleSave = () => {
    if (!form.line1.trim()) return;
    setAddresses((prev) => [...prev, { id: Date.now(), ...form }]);
    setForm({ label: "", line1: "", city: "", country: "" });
    setShowForm(false);
  };

  return (
    <div className="section staff-form">
      <h4 className="section__title">Addresses</h4>
      <p className="section__subtitle">Manage the team member's home and other addresses</p>

      {addresses.length === 0 && !showForm && (
        <div className="staff-empty">
          <i className="bi bi-house-door staff-empty__icon" />
          <p className="staff-empty__title">No addresses yet</p>
          <p className="staff-empty__desc">Add a home or other address for this team member</p>
        </div>
      )}

      {addresses.map((addr) => (
        <div className="staff-list-item" key={addr.id}>
          <div className="staff-list-item__info">
            <div className="staff-list-item__label">{addr.label || "Address"}</div>
            <div className="staff-list-item__sub">
              {[addr.line1, addr.city, addr.country].filter(Boolean).join(", ")}
            </div>
          </div>
          <div className="staff-list-item__actions">
            <button className="staff-list-item__action-btn"><i className="bi bi-pencil" /></button>
            <button
              className="staff-list-item__action-btn staff-list-item__action-btn--danger"
              onClick={() => setAddresses((p) => p.filter((a) => a.id !== addr.id))}
            >
              <i className="bi bi-trash" />
            </button>
          </div>
        </div>
      ))}

      {showForm && (
        <div className="p-3 border rounded mb-3 bg-white">
          <div className="mb-2">
            <label className="form-label">Label</label>
            <input className="form-control" placeholder="e.g. Home"
              value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </div>
          <div className="mb-2">
            <label className="form-label">Address line 1</label>
            <input className="form-control"
              value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} />
          </div>
          <div className="row g-2 mb-3">
            <div className="col">
              <label className="form-label">City</label>
              <input className="form-control"
                value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="col">
              <label className="form-label">Country</label>
              <select className="form-select"
                value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
                <option value="">Select country</option>
                <option>India</option><option>United States</option>
                <option>United Kingdom</option><option>Australia</option>
              </select>
            </div>
          </div>
          <div className="d-flex gap-2 justify-content-end">
            <button className="btn btn-light btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-dark btn-sm" onClick={handleSave}>Save address</button>
          </div>
        </div>
      )}

      {!showForm && (
        <button className="btn d-flex align-items-center gap-2 mt-2"
          style={{ color: "#6c3ce1", fontWeight: 600, fontSize: 13 }}
          onClick={() => setShowForm(true)}>
          <i className="bi bi-plus-circle" /> Add an address
        </button>
      )}
    </div>
  );
};

export default StaffAddressesSection;