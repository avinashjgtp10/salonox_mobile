import React, { useState } from "react";
import { XLg } from "react-bootstrap-icons";
import "../styles/PayRunsPage.scss";

interface AddAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    memberName: string;
}

const AddAdjustmentModal: React.FC<AddAdjustmentModalProps> = ({ isOpen, onClose, memberName }) => {
    const [type, setType] = useState("Earnings");
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");

    if (!isOpen) return null;

    return (
        <div className="pr-modal-overlay" onClick={onClose}>
            <div className="pr-adjustment-modal" onClick={(e) => e.stopPropagation()}>
                <div className="pr-adjustment-modal__header">
                    <h3>Add adjustment</h3>
                    <button className="close-btn" onClick={onClose}><XLg /></button>
                </div>

                <div className="pr-adjustment-modal__body">
                    <p className="subtitle">Add a one-off adjustment for <strong>{memberName}</strong> for the current pay run period.</p>

                    <div className="form-group">
                        <label>Adjustment type</label>
                        <select value={type} onChange={(e) => setType(e.target.value)}>
                            <option value="Earnings">Earnings</option>
                            <option value="Deduction">Deduction</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Amount</label>
                        <div className="amount-input-wrap">
                            <span className="currency-symbol">₮</span>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Reason (optional)</label>
                        <textarea
                            placeholder="e.g. Performance bonus"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                </div>

                <div className="pr-adjustment-modal__footer">
                    <button className="pr-page__btn pr-page__btn--white" onClick={onClose}>Cancel</button>
                    <button className="pr-page__btn pr-page__btn--dark" onClick={() => {
                        console.log("Saving adjustment:", { type, amount, reason });
                        onClose();
                    }}>Save</button>
                </div>
            </div>
        </div>
    );
};

export default AddAdjustmentModal;
