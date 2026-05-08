import { useState, useEffect } from "react";
import { Home, Briefcase, MoreHorizontal } from "lucide-react";
import "../styles/NewAddressModal.scss";

// UI Components
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (address: any) => void;
  initialData?: any;
}

export default function NewAddressModal({ open, onClose, onSave, initialData }: Props) {
  const [type, setType] = useState("home");
  const [addressValue, setAddressValue] = useState("");
  const [aptSuite, setAptSuite] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Populate from initialData when editing, otherwise reset
  useEffect(() => {
    if (open) {
      setAttemptedSubmit(false);
      if (initialData) {
        setType(initialData.type || "home");
        setAddressValue(initialData.line1 || "");
        setAptSuite(initialData.line2 || "");
        setDistrict(initialData.district || "");
        setCity(initialData.city || "");
        setPostcode(initialData.postcode || "");
      } else {
        setType("home");
        setAddressValue("");
        setAptSuite("");
        setDistrict("");
        setCity("");
        setPostcode("");
      }
    }
  }, [open, initialData]);

  const isAddressInvalid = attemptedSubmit && addressValue.trim() === "";

  const handleContinue = () => {
    setAttemptedSubmit(true);
    if (addressValue.trim() === "") return;

    const newAddress = {
      type,
      label: type.charAt(0).toUpperCase() + type.slice(1),
      line1: addressValue,
      line2: aptSuite,
      city,
      district,
      postcode,
      country: "India",
    };

    onSave(newAddress);
    onClose();
  };

  return (
    <Modal
      show={open}
      onClose={onClose}
      title={initialData ? "Edit address" : "New address"}
      size="md"
      centered
      footer={
        <div className="new-address-footer">
          <Button variant="outline-dark" onClick={onClose} className="rounded-pill px-4">
            Cancel
          </Button>
          <Button variant="dark" onClick={handleContinue} className="rounded-pill px-4">
            Continue
          </Button>
        </div>
      }
    >
      <div className="new-address-modal">
        {/* ADDRESS TYPE SELECTOR */}
        <div className="type-selector mb-4">
          <button
            className={`type-btn ${type === "home" ? "active" : ""}`}
            onClick={() => setType("home")}
          >
            <div className="icon-wrapper"><Home size={20} /></div>
            <span>Home</span>
          </button>

          <button
            className={`type-btn ${type === "work" ? "active" : ""}`}
            onClick={() => setType("work")}
          >
            <div className="icon-wrapper"><Briefcase size={20} /></div>
            <span>Work</span>
          </button>

          <button
            className={`type-btn ${type === "other" ? "active" : ""}`}
            onClick={() => setType("other")}
          >
            <div className="icon-wrapper"><MoreHorizontal size={20} /></div>
            <span>Other</span>
          </button>
        </div>

        {/* FORM GRID */}
        <div className="row g-3">
          <div className="col-12">
            <Input
              label="Address line 1"
              placeholder="Building, street, area"
              value={addressValue}
              onChange={(e) => setAddressValue(e.target.value)}
              error={isAddressInvalid ? "Please enter a valid address" : ""}
              required
            />
          </div>

          <div className="col-12">
            <Input 
              label="Apt / Suite / Landmark (Optional)" 
              placeholder="e.g. Apt 402, Near Metro Station" 
              value={aptSuite}
              onChange={(e) => setAptSuite(e.target.value)}
            />
          </div>

          <div className="col-md-6">
            <Input 
              label="District" 
              placeholder="District" 
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            />
          </div>

          <div className="col-md-6">
            <Input 
              label="City" 
              placeholder="City" 
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <div className="col-12">
            <Input 
              label="Postal code" 
              placeholder="6-digit PIN code" 
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              maxLength={6}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
