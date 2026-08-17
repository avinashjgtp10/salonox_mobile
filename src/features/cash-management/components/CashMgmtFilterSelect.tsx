import Dropdown from "../../../components/ui/Dropdown";

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

// Shared filter dropdown — used by the Transactions tab's Status filter and
// the Expenses tab's Expense Type filter, so both stay visually and
// behaviorally identical instead of each tab hand-rolling its own copy of the
// same markup. Built on the app's own custom Dropdown rather than a native
// <select>: a native select's open/focus state (the highlighted-text look)
// is rendered by the OS/browser and can't be restyled away with CSS, which
// made it look like a text field with selected text instead of a dropdown.
export default function CashMgmtFilterSelect({ value, options, onChange, className = "" }: Props) {
  return (
    <Dropdown
      className={`cash-mgmt__field cash-mgmt__filter-select ${className}`}
      searchable={false}
      value={value}
      options={options.map((option) => ({ id: option.value, name: option.label }))}
      onChange={onChange}
    />
  );
}
