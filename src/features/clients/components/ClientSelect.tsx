import React from "react";
import SearchableSelect from "../../../components/ui/SearchableSelect";

export interface SelectOption {
  value: string;
  label: string;
}

export interface ClientSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  invalid?: boolean;
  disabled?: boolean;
}

export const ClientSelect: React.FC<ClientSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  className = "form-select",
  invalid = false,
  disabled = false,
}) => {
  return (
    <SearchableSelect<SelectOption>
      value={value}
      onChange={onChange}
      options={options}
      getKey={(opt) => opt.value}
      getLabel={(opt) => opt.label}
      getSearchText={(opt) => `${opt.label} ${opt.value}`}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      className={`${className} ${invalid ? "border-danger" : ""}`}
      disabled={disabled}
    />
  );
};

export default ClientSelect;
