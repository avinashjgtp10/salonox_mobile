import { useState, useEffect } from "react";
import { Home, Briefcase, MoreHorizontal, Check } from "lucide-react";
import "../styles/NewAddressModal.scss";

// UI Components
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (address: any) => void;
}

export default function NewAddressModal({ open, onClose, onSave }: Props) {
  const [type, setType] = useState("home");
  const [addressValue, setAddressValue] = useState("");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setAddressValue("");
      setAttemptedSubmit(false);
      setType("home");
    }
  }, [open]);

  const isAddressInvalid = attemptedSubmit && addressValue.trim() === "";

  const handleContinue = () => {
    setAttemptedSubmit(true);
    if (addressValue.trim() === "") return;

    const newAddress = {
      type,
      address_name: type.charAt(0).toUpperCase() + type.slice(1),
      address_line1: addressValue,
      address_line2: null,
      apt_suite: "",
      district: "",
      city: "",
      region: "",
      postcode: "",
      country: "IN",
    };

    onSave(newAddress);
    onClose();
  };

  return (
    <Modal
      show={open}
      onClose={onClose}
      title="New address"
      size="lg"
      footer={
        <div className="d-flex justify-content-end gap-2 w-100">
          <Button variant="outline-dark" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="dark" onClick={handleContinue}>
            Continue
          </Button>
        </div>
      }
    >
      <div className="modal-body p-0">
        {/* ADDRESS TYPE */}
        <div className="address-types mb-4">
          <button
            className={type === "home" ? "active" : ""}
            onClick={() => setType("home")}
          >
            <Home size={20} />
            <span>Home</span>
            {type === "home" && <Check className="check-icon" size={16} />}
          </button>

          <button
            className={type === "work" ? "active" : ""}
            onClick={() => setType("work")}
          >
            <Briefcase size={20} />
            <span>Work</span>
            {type === "work" && <Check className="check-icon" size={16} />}
          </button>

          <button
            className={type === "other" ? "active" : ""}
            onClick={() => setType("other")}
          >
            <MoreHorizontal size={20} />
            <span>Other</span>
            {type === "other" && <Check className="check-icon" size={16} />}
          </button>
        </div>

        {/* FORM */}
        <div className="row g-3">
          <div className="col-12">
            <Input label="Address name" placeholder="Home" />
          </div>

          <div className="col-12">
            <Input
              label="Address"
              placeholder="Enter address"
              value={addressValue}
              onChange={(e) => setAddressValue(e.target.value)}
              error={isAddressInvalid ? "Please add a valid address" : ""}
            />
          </div>

          <div className="col-12">
            <Input label="Apt / Suite" placeholder="Apartment / Suite" />
          </div>

          <div className="col-md-6">
            <Input label="District" placeholder="District" />
          </div>

          <div className="col-md-6">
            <Input label="City" placeholder="City" />
          </div>

          <div className="col-12">
            <Input label="Postal code" placeholder="Postal code" />
          </div>
        </div>
      </div>
    </Modal>
  );
}
