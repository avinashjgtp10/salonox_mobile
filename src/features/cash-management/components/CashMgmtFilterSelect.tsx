import { ChevronDown } from "react-bootstrap-icons";

export interface CashMgmtFilterOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  options: CashMgmtFilterOption[];
  onChange: (value: string) => void;
  className?: string;
}

// Shared "native select + chevron" filter dropdown — used by the
// Transactions tab's Status filter and the Expenses tab's Expense Type
// filter, so both stay visually and behaviorally identical instead of each
// tab hand-rolling its own copy of the same markup.
export default function CashMgmtFilterSelect({ value, options, onChange, className = "" }: Props) {
  return (
    <div className="cash-mgmt__shared-filter-select-wrap">
      <select
        className={`cash-mgmt__field cash-mgmt__filter-select ${className}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={12} className="cash-mgmt__shared-filter-select-icon" />
    </div>
  );
}
