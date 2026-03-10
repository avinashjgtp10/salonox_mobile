import React, { useState } from "react";
import AddEmergencyContactModal from "../components/AddEmergencyContactModal";

interface Contact { id: number; name: string; relationship: string; email?: string; phone: string; }

const StaffEmergencyContactsSection: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [openContactModal, setOpenContactModal] = useState(false);

  const handleSaveContact = (contact: Omit<Contact, "id">) => {
    setContacts((prev) => [...prev, { id: Date.now(), ...contact }]);
    setOpenContactModal(false);
  };

  return (
    <div className="section staff-form">
      <h5 className="fw-bold mb-1 section__title" style={{ fontSize: '18px' }}>Emergency Contacts</h5>
      <p className="text-muted mb-4 section__subtitle" style={{ fontSize: '13px' }}>Manage your team members' emergency contacts.</p>

      {contacts.map((c) => (
        <div className="staff-list-item mb-3" key={c.id}>
          <div className="staff-list-item__info">
            <div className="staff-list-item__label">{c.name}</div>
            <div className="staff-list-item__sub">{c.relationship} · {c.phone} {c.email ? ` · ${c.email}` : ""}</div>
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

      <button
        className="btn d-inline-flex align-items-center gap-2"
        style={{
          border: '1px solid #e0e0e0',
          backgroundColor: '#fff',
          color: '#333',
          borderRadius: '20px',
          padding: '6px 16px',
          fontSize: '13px',
          fontWeight: '500'
        }}
        onClick={() => setOpenContactModal(true)}
      >
        <i className="bi bi-plus" style={{ fontSize: '18px', color: '#666', lineHeight: 1 }} /> Add an emergency contact
      </button>

      <AddEmergencyContactModal
        open={openContactModal}
        onClose={() => setOpenContactModal(false)}
        onSave={handleSaveContact}
      />
    </div>
  );
};

export default StaffEmergencyContactsSection;