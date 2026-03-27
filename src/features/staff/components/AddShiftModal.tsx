import React, { useState, useEffect } from "react";
import { X, Trash3, Plus } from "react-bootstrap-icons";
import "../../staff/styles/AddShiftModal.scss";

export interface ShiftTime {
    start: string;
    end: string;
}

interface AddShiftModalProps {
    show: boolean;
    onClose: () => void;
    onSave: (memberId: number, date: string, shifts: ShiftTime[]) => void;
    member: { id: number; name: string } | null;
    date: string | null;
    initialShifts?: ShiftTime[];
}

const TIME_OPTIONS = [
    "12:00 AM", "1:00 AM", "2:00 AM", "3:00 AM", "4:00 AM", "5:00 AM", "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
    "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM"
];

const AddShiftModal: React.FC<AddShiftModalProps> = ({ show, onClose, onSave, member, date, initialShifts }) => {
    const [shifts, setShifts] = useState<ShiftTime[]>([]);

    useEffect(() => {
        if (show) {
            setShifts(initialShifts && initialShifts.length > 0 ? initialShifts : [{ start: "10:00 AM", end: "7:00 PM" }]);
        }
    }, [show, initialShifts]);

    if (!show || !member || !date) return null;

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const handleAddShift = () => {
        setShifts([...shifts, { start: "10:00 AM", end: "7:00 PM" }]);
    };

    const handleRemoveShift = (index: number) => {
        setShifts(shifts.filter((_, i) => i !== index));
    };

    const handleChange = (index: number, field: keyof ShiftTime, value: string) => {
        const newShifts = [...shifts];
        newShifts[index][field] = value;
        setShifts(newShifts);
    };

    // Calculate total duration (naive approximation for UI)
    const calculateDuration = () => {
        // This is a simplified version. Real duration would need proper time parsing.
        return shifts.length * 9; // assuming 9h per shift for demo
    };

    return (
        <div className="add-shift-modal-overlay">
            <div className="add-shift-modal">
                <button className="close-btn" onClick={onClose}><X size={24} /></button>
                
                <div className="modal-header-custom">
                    <h3>{member.name}'s shift {formatDate(date)}</h3>
                    <p>
                        You are editing this day's shifts only. To set repeating shifts, 
                        <span className="link-style"> go to scheduled shifts</span>.
                    </p>
                </div>

                <div className="modal-body">
                    {shifts.map((shift, index) => (
                        <div key={index} className="shift-row">
                            <div className="time-select-group">
                                <div className="input-wrap">
                                    <label>Start time</label>
                                    <select 
                                        value={shift.start} 
                                        onChange={(e) => handleChange(index, 'start', e.target.value)}
                                    >
                                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="input-wrap">
                                    <label>End time</label>
                                    <select 
                                        value={shift.end} 
                                        onChange={(e) => handleChange(index, 'end', e.target.value)}
                                    >
                                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <button className="row-delete-btn" onClick={() => handleRemoveShift(index)}>
                                <Trash3 size={18} />
                            </button>
                        </div>
                    ))}

                    <div className="modal-inner-footer">
                        <button className="btn-add-another" onClick={handleAddShift}>
                            <Plus size={20} /> Add shift
                        </button>
                        <span className="total-duration">Total shift duration: {calculateDuration()} hr</span>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-footer-delete" onClick={() => { onSave(member.id, date, []); onClose(); }}>
                        <Trash3 size={20} />
                    </button>
                    <div className="footer-right">
                        <button className="btn-cancel" onClick={onClose}>Cancel</button>
                        <button className="btn-save" onClick={() => { onSave(member.id, date, shifts); onClose(); }}>Save</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddShiftModal;
