import { useState, useEffect } from "react";
import { Country } from "country-state-city";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import "../styles/AddEmergencyContactModal.scss";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (contact: any) => void;
}

const PHONE_CODES = Country.getAllCountries()
  .map((c) => ({
    code: c.phonecode.startsWith("+") ? c.phonecode : `+${c.phonecode}`,
    label: `${c.isoCode} (${c.phonecode.startsWith("+") ? c.phonecode : `+${c.phonecode}`})`,
  }))
  .filter((v, i, a) => a.findIndex((t) => t.label === v.label) === i)
  .sort((a, b) => a.label.localeCompare(b.label));

export default function AddEmergencyContactModal({
  open,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCode, setPhoneCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setName("");
      setRelationship("");
      setEmail("");
      setPhoneCode("+91");
      setPhone("");
      setAttemptedSubmit(false);
    }
  }, [open]);

  const isNameInvalid = attemptedSubmit && name.trim() === "";
  const isEmailInvalid = attemptedSubmit && email.trim() === "";
  const isPhoneInvalid =
    attemptedSubmit && phone.trim() !== "" && !/^\d{10}$/.test(phone.trim());

  const handleAdd = () => {
    setAttemptedSubmit(true);
    if (name.trim() === "" || email.trim() === "" || isPhoneInvalid) return;

    onSave({ 
      full_name: name, 
      relationship, 
      email, 
      phone_number: phone,
      phone_country_code: phoneCode 
    });
    onClose();
  };

  return (
    <Modal
      show={open}
      onClose={onClose}
      title="Add Emergency Contact"
      size="md"
      centered
      footer={
        <div className="emergency-modal-footer w-100">
          <Button 
            variant="outline-dark" 
            onClick={onClose}
            className="rounded-pill px-5 flex-grow-1"
          >
            Cancel
          </Button>
          <Button 
            variant="dark" 
            onClick={handleAdd}
            className="rounded-pill px-5 flex-grow-1"
          >
            Add
          </Button>
        </div>
      }
    >
      <div className="emergency-modal-body">
        <div className="row g-3">
          <div className="col-md-6">
            <Input
              label="Full name"
              placeholder="e.g. John Hancock"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={isNameInvalid ? "Full name is required" : ""}
              required
            />
          </div>

          <div className="col-md-6">
            <div className="form-group mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>Relationship</label>
              <select
                className="form-select rounded-3 shadow-none"
                style={{ height: "44px", fontSize: "14px" }}
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
              >
                <option value="">Select an option</option>
                <option value="Spouse">Spouse</option>
                <option value="Parent">Parent</option>
                <option value="Sibling">Sibling</option>
                <option value="Friend">Friend</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="col-md-6">
            <Input
              label="Email"
              type="email"
              placeholder="example@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={isEmailInvalid ? "Email is required" : ""}
            />
          </div>

          <div className="col-md-6">
            <div className="form-group mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>Phone Number</label>
              <div className="d-flex gap-2">
                <select
                  className="form-select rounded-3 shadow-none"
                  style={{ width: "90px", height: "44px", fontSize: "14px", flexShrink: 0 }}
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value)}
                >
                  {PHONE_CODES.map((p) => (
                    <option key={p.label} value={p.code}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <input
                  className={`form-control rounded-3 shadow-none ${isPhoneInvalid ? "is-invalid" : ""}`}
                  style={{ height: "44px", fontSize: "14px" }}
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    if (val.length <= 10) setPhone(val);
                  }}
                />
              </div>
              {isPhoneInvalid && (
                <div className="text-danger mt-1" style={{ fontSize: "12px" }}>
                  Phone number must be exactly 10 digits
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
