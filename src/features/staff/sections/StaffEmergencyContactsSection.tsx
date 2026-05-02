import React, { useState } from "react";
import { Pencil, Trash3 } from "react-bootstrap-icons";
import AddEmergencyContactModal from "../components/AddEmergencyContactModal";

interface Contact {
  id: number;
  name: string;
  relationship: string;
  email?: string;
  phone: string;
}

interface StaffEmergencyContactsProps {
  contacts?: Contact[];
  setContacts?: (
    contacts: Contact[] | ((prev: Contact[]) => Contact[]),
  ) => void;
}

const StaffEmergencyContactsSection: React.FC<StaffEmergencyContactsProps> = ({
  contacts = [],
  setContacts = () => {},
}) => {
  const [openContactModal, setOpenContactModal] = useState(false);

  const handleSaveContact = (contact: Omit<Contact, "id">) => {
    setContacts((prev) => [...prev, { id: Date.now(), ...contact }]);
    setOpenContactModal(false);
  };

  return (
    <div className="section staff-form">
      <h5 className="fw-bold mb-1 section__title" style={{ fontSize: "18px" }}>
        Emergency Contacts
      </h5>
      <p
        className="text-muted mb-4 section__subtitle"
        style={{ fontSize: "13px" }}
      >
        Manage your team members' emergency contacts.
      </p>

      {contacts.map((c) => (
        <div className="staff-list-item mb-3" key={c.id}>
          <div className="staff-list-item__info">
            <div className="staff-list-item__label">{c.name}</div>
            <div className="staff-list-item__sub">
              {c.relationship}
              {c.phone && ` · ${c.phone}`}
              {c.email && ` · ${c.email}`}
            </div>
          </div>
          <div className="staff-list-item__actions">
            <button className="staff-list-item__action-btn">
              <Pencil size={14} />
            </button>
            <button
              className="staff-list-item__action-btn staff-list-item__action-btn--danger"
              onClick={() => setContacts((p) => p.filter((x) => x.id !== c.id))}
            >
              <Trash3 size={14} />
            </button>
          </div>
        </div>
      ))}

      <button
        className="btn btn-outline-primary d-inline-flex align-items-center gap-1 mt-3"
        style={{
          borderRadius: "8px",
          padding: "6px 16px",
          fontSize: "14px",
          fontWeight: "500",
        }}
        onClick={() => setOpenContactModal(true)}
      >
        <span style={{ fontSize: "18px", lineHeight: 1 }}>+</span>
        Add an emergency contact
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
