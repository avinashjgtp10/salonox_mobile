import { useState } from "react";
import Modal from "../../../../components/ui/Modal";
import Input from "../../../../components/ui/Input";
import Button from "../../../../components/ui/Button";
import ClientSelect from "../../../clients/components/ClientSelect";

export interface StaffOption {
  id: string;
  name: string;
  role: string;
  avatar: string;
  color: string;
}

interface Props {
  staffOptions: StaffOption[];
  onSave: (values: {
    staffId: string;
    base_salary: number;
    commission: number;
    tips: number;
    bonus: number;
    salary_advance: number;
    deductions: number;
  }) => void;
  onClose: () => void;
}

const EMPTY_AMOUNTS = { base_salary: "", commission: "", tips: "", bonus: "", salary_advance: "", deductions: "" };

export default function AddPayrollEntryModal({ staffOptions, onSave, onClose }: Props) {
  const [staffId, setStaffId] = useState("");
  const [amounts, setAmounts] = useState(EMPTY_AMOUNTS);
  const [submitted, setSubmitted] = useState(false);

  const patch = (key: keyof typeof amounts) => (value: string) =>
    setAmounts((prev) => ({ ...prev, [key]: value }));

  const isStaffValid = staffId.trim() !== "";
  const baseSalaryNum = Number(amounts.base_salary);
  const isBaseSalaryValid = amounts.base_salary.trim() !== "" && Number.isFinite(baseSalaryNum) && baseSalaryNum >= 0;

  const showStaffError = submitted && !isStaffValid;
  const showBaseSalaryError = submitted && !isBaseSalaryValid;

  const handleSave = () => {
    setSubmitted(true);
    if (!isStaffValid || !isBaseSalaryValid) return;

    onSave({
      staffId,
      base_salary: baseSalaryNum,
      commission: Number(amounts.commission) || 0,
      tips: Number(amounts.tips) || 0,
      bonus: Number(amounts.bonus) || 0,
      salary_advance: Number(amounts.salary_advance) || 0,
      deductions: Number(amounts.deductions) || 0,
    });
  };

  return (
    <Modal show onClose={onClose} title="Add Payroll Entry" size="md">
      <div className="d-flex flex-column gap-3">
        <div>
          <label className="form-label fw-semibold mb-1">
            Employee <span className="text-danger">*</span>
          </label>
          <ClientSelect
            value={staffId}
            onChange={setStaffId}
            options={staffOptions.map((s) => ({ value: s.id, label: `${s.name} · ${s.role}` }))}
            placeholder="Select employee"
            searchPlaceholder="Search employee..."
            invalid={showStaffError}
          />
          {showStaffError && <span className="text-danger small">Please select an employee</span>}
        </div>

        <Input
          label="Base Salary"
          type="number"
          min={0}
          step="0.01"
          placeholder="0"
          value={amounts.base_salary}
          onChange={(e) => patch("base_salary")(e.target.value)}
          error={showBaseSalaryError ? "Please enter a valid amount" : undefined}
          containerClass="mb-0"
        />

        <div className="d-flex gap-3">
          <Input
            label="Commission"
            type="number"
            min={0}
            step="0.01"
            placeholder="0"
            value={amounts.commission}
            onChange={(e) => patch("commission")(e.target.value)}
            containerClass="mb-0 flex-fill"
          />
          <Input
            label="Tips"
            type="number"
            min={0}
            step="0.01"
            placeholder="0"
            value={amounts.tips}
            onChange={(e) => patch("tips")(e.target.value)}
            containerClass="mb-0 flex-fill"
          />
        </div>

        <div className="d-flex gap-3">
          <Input
            label="Bonus / Incentive"
            type="number"
            min={0}
            step="0.01"
            placeholder="0"
            value={amounts.bonus}
            onChange={(e) => patch("bonus")(e.target.value)}
            containerClass="mb-0 flex-fill"
          />
          <Input
            label="Salary Advance"
            type="number"
            min={0}
            step="0.01"
            placeholder="0"
            value={amounts.salary_advance}
            onChange={(e) => patch("salary_advance")(e.target.value)}
            containerClass="mb-0 flex-fill"
          />
        </div>

        <Input
          label="Deductions"
          type="number"
          min={0}
          step="0.01"
          placeholder="0"
          value={amounts.deductions}
          onChange={(e) => patch("deductions")(e.target.value)}
          containerClass="mb-0"
        />
      </div>

      <div className="d-flex flex-column gap-2 w-100 mt-4">
        <Button variant="dark" fullWidth onClick={handleSave}>
          Add Entry
        </Button>
        <Button variant="outline-dark" fullWidth onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
