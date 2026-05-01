import React, { useState, useEffect } from "react";
import Modal from "../../../../components/ui/Modal";
import Input from "../../../../components/ui/Input";
import Button from "../../../../components/ui/Button";
import type { PayRun } from "../../../../types/payRun.types";

interface PayRunFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<PayRun>) => void;
  initialData?: Partial<PayRun>;
  loading?: boolean;
}

const PayRunFormModal: React.FC<PayRunFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading,
}) => {
  const [formData, setFormData] = useState<Partial<PayRun>>({
    employeeName: "",
    payPeriodStart: new Date().toISOString().split('T')[0],
    payPeriodEnd: new Date().toISOString().split('T')[0],
    earnings: 0,
    deductions: 0,
    other: 0,
    paymentMethod: "Bank Transfer",
    notes: "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({ ...formData, ...initialData });
    }
  }, [initialData, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const val = ["earnings", "deductions", "other"].includes(name) ? parseFloat(value) || 0 : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
  };

  const calculateNetSalary = () => {
    const earnings = Number(formData.earnings || 0);
    const other = Number(formData.other || 0);
    const deductions = Number(formData.deductions || 0);
    return earnings + other - deductions;
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
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Employee Name"
            name="employeeName"
            value={formData.employeeName}
            onChange={handleChange}
            required
            disabled={!!initialData?.id}
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Payment Method</label>
            <select
              name="paymentMethod"
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              value={formData.paymentMethod}
              onChange={handleChange}
            >
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Check">Check</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Pay Period Start"
            name="payPeriodStart"
            type="date"
            value={formData.payPeriodStart}
            onChange={handleChange}
            required
          />
          <Input
            label="Pay Period End"
            name="payPeriodEnd"
            type="date"
            value={formData.payPeriodEnd}
            onChange={handleChange}
            required
          />
        </div>

        <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-100">
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Salary Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Earnings (₮)"
              name="earnings"
              type="number"
              value={formData.earnings}
              onChange={handleChange}
              placeholder="0.00"
            />
            <Input
              label="Other (₮)"
              name="other"
              type="number"
              value={formData.other}
              onChange={handleChange}
              placeholder="0.00"
            />
            <Input
              label="Deductions (₮)"
              name="deductions"
              type="number"
              value={formData.deductions}
              onChange={handleChange}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
          <span className="text-sm font-bold text-blue-900 uppercase">Net Salary</span>
          <span className="text-2xl font-black text-blue-600">
            ₮{calculateNetSalary().toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Notes (Optional)</label>
          <textarea
            name="notes"
            rows={3}
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none"
            placeholder="Add any specific instructions or notes..."
            value={formData.notes}
            onChange={handleChange}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {initialData?.id ? "Update Pay Run" : "Save Adjustment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PayRunFormModal;
