import React, { useState } from "react";
import { Pencil, Trash3 } from "react-bootstrap-icons";
import AddEmergencyContactModal from "../components/AddEmergencyContactModal";

interface Contact {
  id: number;
  full_name: string;
  relationship: string;
  email?: string;
  phone_number?: string;
  phone_country_code?: string;
}

interface StaffEmergencyContactsProps {
  contacts?: Contact[];
  setContacts?: (contacts: Contact[] | ((prev: Contact[]) => Contact[])) => void;
}

const StaffEmergencyContactsSection: React.FC<StaffEmergencyContactsProps> = ({
  contacts = [],
  setContacts = () => {},
}) => {
  const [openContactModal, setOpenContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const handleSaveContact = (contact: Omit<Contact, "id">) => {
    if (editingContact) {
      setContacts((prev) =>
        prev.map((c) => (c.id === editingContact.id ? { ...c, ...contact } : c))
      );
    } else {
      setContacts((prev) => [...prev, { id: Date.now(), ...contact }]);
    }
    setEditingContact(null);
    setOpenContactModal(false);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setOpenContactModal(true);
  };

  const handleCloseModal = () => {
    setEditingContact(null);
    setOpenContactModal(false);
  };

  return (
    <div className="section staff-form emergency-contacts-section">
      <h5 className="fw-bold mb-1 section__title">
        Emergency Contacts
      </h5>
      <p className="text-muted mb-4 section__subtitle">
        Manage your team members' emergency contacts.
      </p>

      {contacts.map((c) => (
        <div className="staff-list-item mb-3" key={c.id}>
          <div className="staff-list-item__info">
            <div className="staff-list-item__label">{c.full_name}</div>
            <div className="staff-list-item__sub">
              {[c.relationship, c.phone_number, c.email].filter(Boolean).join(" · ")}
            </div>
          </div>
          <div className="staff-list-item__actions">
            <button
              className="staff-list-item__action-btn"
              onClick={() => handleEditContact(c)}
            >
              <Pencil size={14} />
            </button>
            <button
              className="staff-list-item__action-btn staff-list-item__action-btn--danger"
              onClick={() => setContacts((prev) => prev.filter((x) => x.id !== c.id))}
            >
              <Trash3 size={14} />
            </button>
          </div>
        </div>
      ))}

      <button
        className="btn btn-outline-primary d-inline-flex align-items-center gap-1 mt-3 add-contact-btn"
        onClick={() => setOpenContactModal(true)}
      >
        <span className="add-contact-btn__plus">+</span>
        Add an emergency contact
      </button>

      <AddEmergencyContactModal
        open={openContactModal}
        onClose={handleCloseModal}
        onSave={handleSaveContact}
        initialData={editingContact}
      />
    </div>
  );
};

export default StaffEmergencyContactsSection;
