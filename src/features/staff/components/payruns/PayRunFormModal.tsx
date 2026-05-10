import React, { useState, useEffect } from "react";
import Modal from "../../../../components/ui/Modal";
import Input from "../../../../components/ui/Input";
import Button from "../../../../components/ui/Button";
import type { PayRun } from "../../../../types/payRun.types";
import { useAppDispatch, useAppSelector } from "../../../../hooks/useAppRedux";
import { fetchStaffThunk } from "../../../../middleware/staff/staff.thunk";

interface PayRunFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<PayRun & { staffId?: string | number }>) => void;
  initialData?: PayRun;
  loading?: boolean;
}

const PayRunFormModal: React.FC<PayRunFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading,
}) => {
  const dispatch = useAppDispatch();
  const { items: staffMembers } = useAppSelector((state) => state.staff);

  const [formData, setFormData] = useState({
    staffId: "",
    employeeName: "",
    payPeriodStart: new Date().toISOString().split("T")[0],
    payPeriodEnd: new Date().toISOString().split("T")[0],
    earnings: 0,
    deductions: 0,
    other: 0,
    paymentMethod: "Bank Transfer",
    notes: "",
  });

  useEffect(() => {
    if (!isOpen) return;
    dispatch(fetchStaffThunk());

    if (initialData) {
      // Edit mode — populate from existing record
      setFormData({
        staffId: (initialData as any).staffId || "",
        employeeName: initialData.employeeName || "",
        payPeriodStart: initialData.payPeriodStart || new Date().toISOString().split("T")[0],
        payPeriodEnd: initialData.payPeriodEnd || new Date().toISOString().split("T")[0],
        earnings: initialData.earnings || 0,
        deductions: initialData.deductions || 0,
        other: initialData.other || 0,
        paymentMethod: initialData.paymentMethod || "Bank Transfer",
        notes: initialData.notes || "",
      });
    } else {
      // New record — always reset to blank defaults
      setFormData({
        staffId: "",
        employeeName: "",
        payPeriodStart: new Date().toISOString().split("T")[0],
        payPeriodEnd: new Date().toISOString().split("T")[0],
        earnings: 0,
        deductions: 0,
        other: 0,
        paymentMethod: "Bank Transfer",
        notes: "",
      });
    }
  }, [isOpen, initialData, dispatch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === "staffId") {
      const selectedStaff = staffMembers.find(s => s.id.toString() === value);
      const employeeName = selectedStaff
        ? (selectedStaff.fullName ||
           `${selectedStaff.first_name || ""} ${selectedStaff.last_name || ""}`.trim() ||
           "Unnamed Staff")
        : "";
      setFormData(prev => ({
        ...prev,
        staffId: value,
        employeeName,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: e.target.type === "number" ? parseFloat(value) || 0 : value,
      }));
    }
  };

  const calculateNetSalary = () => {
    return formData.earnings + formData.other - formData.deductions;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      total: calculateNetSalary(),
      toPay: calculateNetSalary(),
    });
  };

  return (
    <Modal show={isOpen} onClose={onClose} title={initialData?.id ? "Edit Pay Run" : "Add Pay Adjustment"}>
      <form onSubmit={handleSubmit} className="p-1">
        <div className="row g-4">
          <div className="col-md-12">
            <div className="form-group">
              <label className="form-label fw-bold text-dark mb-2">Select Employee</label>
              <select
                name="staffId"
                className="form-select border rounded-3 py-2 px-3 shadow-sm"
                style={{ height: '45px', fontSize: '14px' }}
                value={formData.staffId}
                onChange={handleChange}
                required
                disabled={!!initialData?.id}
              >
                <option value="">Choose a team member...</option>
                {staffMembers.map((staff) => {
                  const name = staff.fullName || `${staff.first_name || ""} ${staff.last_name || ""}`.trim() || "Unnamed Staff";
                  return (
                    <option key={staff.id} value={staff.id}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          
          <div className="col-md-6">
            <Input
              label="Pay Period Start"
              name="payPeriodStart"
              type="date"
              value={formData.payPeriodStart}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="col-md-6">
            <Input
              label="Pay Period End"
              name="payPeriodEnd"
              type="date"
              value={formData.payPeriodEnd}
              onChange={handleChange}
              required
            />
          </div>

          <div className="col-md-12">
            <div className="form-group mb-0">
              <label className="form-label fw-bold text-dark mb-2">Payment Method</label>
              <select
                name="paymentMethod"
                className="form-select border rounded-3 py-2 px-3 shadow-sm focus-ring"
                style={{ height: '45px', fontSize: '14px' }}
                value={formData.paymentMethod}
                onChange={handleChange}
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Check">Check</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-light rounded-4 border border-dashed">
          <h6 className="fw-black text-dark text-uppercase small tracking-wider mb-4">Salary Details</h6>
          <div className="row g-3">
            <div className="col-md-4">
              <Input
                label="Earnings (₹)"
                name="earnings"
                type="number"
                value={formData.earnings}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>
            <div className="col-md-4">
              <Input
                label="Other (₹)"
                name="other"
                type="number"
                value={formData.other}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>
            <div className="col-md-4">
              <Input
                label="Deductions (₹)"
                name="deductions"
                type="number"
                value={formData.deductions}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 rounded-4 bg-dark text-white d-flex align-items-center justify-content-between">
          <div>
            <div className="small fw-bold text-uppercase opacity-75">Net Salary</div>
            <div className="h3 fw-black mb-0">
              ₹{calculateNetSalary().toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="text-end opacity-50 small">
            Automatically calculated
          </div>
        </div>

        <div className="mt-4">
          <label className="form-label fw-bold text-dark mb-2">Notes (Optional)</label>
          <textarea
            name="notes"
            rows={2}
            className="form-control border rounded-3 p-3 shadow-sm"
            placeholder="Add any specific instructions or notes..."
            style={{ fontSize: '14px', resize: 'none' }}
            value={formData.notes}
            onChange={handleChange}
          />
        </div>

        <div className="d-flex justify-content-end gap-2 mt-5">
          <Button variant="outline" type="button" className="px-4 rounded-pill border" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="dark" type="submit" className="px-5 rounded-pill fw-bold shadow" loading={loading}>
            {initialData?.id ? "Update Pay Run" : "Save Adjustment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PayRunFormModal;
