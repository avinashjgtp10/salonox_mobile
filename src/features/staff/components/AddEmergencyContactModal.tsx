import { useState, useEffect } from "react";
import { X } from "react-bootstrap-icons";
import "../styles/AddEmergencyContactModal.scss";

interface Props {
    open: boolean;
    onClose: () => void;
    onSave: (contact: { name: string; relationship: string; email: string; phone: string }) => void;
}

export default function AddEmergencyContactModal({ open, onClose, onSave }: Props) {
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

    const handleAdd = () => {
        setAttemptedSubmit(true);
        if (name.trim() === "" || email.trim() === "") {
            return;
        }
        onSave({ name, relationship, email, phone: `${phoneCode} ${phone}` });
        onClose();
    };

    if (!open) return null;

    return (
        <div className="emergency-overlay">
            <div className="emergency-modal">
                {/* HEADER */}
                <div className="modal-header">
                    <h5 className="fw-bold mb-0">Add Emergency Contact</h5>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* BODY */}
                <div className="modal-body">
                    <div className="form-row">
                        <div className="form-group position-relative">
                            <label>Full name</label>
                            <input
                                placeholder="e.g. John Hancock"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className={`position-relative ${isNameInvalid ? "is-invalid pe-4" : ""}`}
                            />
                            {isNameInvalid && (
                                <i
                                    className="bi bi-exclamation-circle position-absolute text-danger"
                                    style={{ right: '10px', top: '35px', pointerEvents: 'none' }}
                                />
                            )}
                            {isNameInvalid && <span className="invalid-feedback-modal">Full name is required</span>}
                        </div>

                        <div className="form-group">
                            <label>Relationship</label>
                            <select
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

                    <div className="form-row">
                        <div className="form-group position-relative">
                            <label>Email</label>
                            <input
                                type="email"
                                placeholder="example@domain.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={`position-relative ${isEmailInvalid ? "is-invalid pe-4" : ""}`}
                            />
                            {isEmailInvalid && (
                                <i
                                    className="bi bi-exclamation-circle position-absolute text-danger"
                                    style={{ right: '10px', top: '35px', pointerEvents: 'none' }}
                                />
                            )}
                            {isEmailInvalid && <span className="invalid-feedback-modal">Email is required</span>}
                        </div>

                        <div className="form-group">
                            <label>Phone Number</label>
                            <div className="phone-group">
                                <select value={phoneCode} onChange={(e) => setPhoneCode(e.target.value)}>
                                    <option value="+91">+91</option>
                                    <option value="+1">+1</option>
                                    <option value="+44">+44</option>
                                    <option value="+61">+61</option>
                                </select>
                                <input
                                    type="text"
                                    placeholder="e.g. +1234 567 8901"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="modal-footer">
                    <button className="cancel-btn btn-cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="add-btn" onClick={handleAdd}>
                        Add
                    </button>
                </div>
            </div>
        </div>
    );
}
