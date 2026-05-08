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
  initialData?: any;
}

const PHONE_CODES = Country.getAllCountries()
  .map((c) => ({
    code: c.phonecode.startsWith("+") ? c.phonecode : `+${c.phonecode}`,
    label: `${c.isoCode} (${c.phonecode.startsWith("+") ? c.phonecode : `+${c.phonecode}`})`,
  }))
  .filter((v, i, a) => a.findIndex((t) => t.label === v.label) === i)
  .sort((a, b) => a.label.localeCompare(b.label));

export default function AddEmergencyContactModal({ open, onClose, onSave, initialData }: Props) {
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCode, setPhoneCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  useEffect(() => {
    if (open) {
      setAttemptedSubmit(false);
      if (initialData) {
        setName(initialData.full_name || "");
        setRelationship(initialData.relationship || "");
        setEmail(initialData.email || "");
        setPhoneCode(initialData.phone_country_code || "+91");
        setPhone(initialData.phone_number || "");
      } else {
        setName("");
        setRelationship("");
        setEmail("");
        setPhoneCode("+91");
        setPhone("");
      }
    }
  }, [open, initialData]);

  const isNameInvalid = attemptedSubmit && name.trim() === "";
  const isEmailInvalid = attemptedSubmit && email.trim() === "";
  const isPhoneInvalid =
    attemptedSubmit && phone.trim() !== "" && !/^\d{10,15}$/.test(phone.trim());

  const handleAdd = () => {
    setAttemptedSubmit(true);
    if (name.trim() === "" || email.trim() === "" || isPhoneInvalid) return;

    onSave({
      full_name: name,
      relationship,
      email,
      phone_number: phone,
      phone_country_code: phoneCode,
    });
    onClose();
  };

  return (
    <Modal
      show={open}
      onClose={onClose}
      title={initialData ? "Edit Emergency Contact" : "Add Emergency Contact"}
      size="md"
      centered
      footer={
        <div className="ec-modal-footer">
          <Button variant="outline-dark" onClick={onClose} className="rounded-pill px-5">
            Cancel
          </Button>
          <Button variant="dark" onClick={handleAdd} className="rounded-pill px-5">
            Add
          </Button>
        </div>
      }
    >
      <div className="ec-modal-body">

        <div className="ec-field">
          <Input
            label="Full name"
            placeholder="e.g. John Hancock"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={isNameInvalid ? "Full name is required" : ""}
            required
          />
        </div>

        <div className="ec-field">
          <label className="ec-label">Relationship</label>
          <select
            className="ec-select"
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

        <div className="ec-field">
          <Input
            label="Email"
            type="email"
            placeholder="example@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={isEmailInvalid ? "Email is required" : ""}
            required
          />
        </div>

        <div className="ec-field">
          <label className="ec-label">Phone number</label>
          <div className="ec-phone-group">
            <select
              className="ec-select ec-select--narrow"
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
              type="tel"
              className={`ec-input ec-input--flex${isPhoneInvalid ? " ec-input--invalid" : ""}`}
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                if (val.length <= 15) setPhone(val);
              }}
            />
          </div>
          {isPhoneInvalid && (
            <p className="ec-error">Phone number must be between 10 and 15 digits</p>
          )}
        </div>

      </div>
    </Modal>
  );
}
