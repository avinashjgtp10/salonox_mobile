import React, { useState } from "react";
import { Pencil, Trash3 } from "react-bootstrap-icons";
import NewAddressModal from "../../clients/pages/NewAddressModal";

interface Address {
  id: number;
  label: string;
  line1: string;
  city: string;
  country: string;
}

interface StaffAddressesProps {
  addresses?: Address[];
  setAddresses?: (
    addresses: Address[] | ((prev: Address[]) => Address[]),
  ) => void;
}

const StaffAddressesSection: React.FC<StaffAddressesProps> = ({
  addresses = [],
  setAddresses = () => {},
}) => {
  const [openAddressModal, setOpenAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const handleSaveAddress = (addr: any) => {
    if (editingAddress) {
      setAddresses((prev) =>
        prev.map((a) => (a.id === editingAddress.id ? { ...a, ...addr } : a))
      );
    } else {
      setAddresses((prev) => [...prev, { id: Date.now(), ...addr }]);
    }
    setEditingAddress(null);
    setOpenAddressModal(false);
  };

  const handleEditAddress = (addr: Address) => {
    setEditingAddress(addr);
    setOpenAddressModal(true);
  };

  const handleCloseModal = () => {
    setEditingAddress(null);
    setOpenAddressModal(false);
  };

  return (
    <div className="section staff-form">
      <h5 className="fw-bold mb-3 section__title">Addresses</h5>
      <p className="text-muted section__subtitle">
        Manage the team member's home and other addresses
      </p>

      {/* Render existing addresses */}
      {addresses.length > 0 &&
        addresses.map((addr) => (
          <div className="staff-list-item mb-3" key={addr.id}>
            <div className="staff-list-item__info">
              <div className="staff-list-item__label">
                {addr.label || "Address"}
              </div>
              <div className="staff-list-item__sub">
                {[addr.line1, addr.city, addr.country]
                  .filter(Boolean)
                  .join(", ")}
              </div>
            </div>
            <div className="staff-list-item__actions">
              <button
                className="staff-list-item__action-btn"
                onClick={() => handleEditAddress(addr)}
              >
                <Pencil size={14} />
              </button>
              <button
                className="staff-list-item__action-btn staff-list-item__action-btn--danger"
                onClick={() =>
                  setAddresses((p) => p.filter((a) => a.id !== addr.id))
                }
              >
                <Trash3 size={14} />
              </button>
            </div>
          </div>
        ))}

      <button
        className="btn btn-outline-primary mt-3"
        onClick={() => setOpenAddressModal(true)}
      >
        + Add new address
      </button>

      {/* ADDRESS MODAL */}
      <NewAddressModal
        open={openAddressModal}
        onClose={handleCloseModal}
        onSave={handleSaveAddress}
        initialData={editingAddress}
      />
    </div>
  );
};

export default StaffAddressesSection;
