import React from "react";
import { COUNTRIES, type CountryDef } from "../../config/countries";
import { SearchableSelect } from "./SearchableSelect";

interface CountrySelectProps {
  value: string;
  onChange: (code: string) => void;
  className?: string;
  disabled?: boolean;
}

const CountrySelect: React.FC<CountrySelectProps> = ({ value, onChange, className, disabled }) => (
  <SearchableSelect<CountryDef>
    value={value}
    onChange={onChange}
    options={COUNTRIES}
    getKey={(c) => c.code}
    getLabel={(c) => c.name}
    getSearchText={(c) => `${c.code} ${c.name}`}
    placeholder="Select country"
    searchPlaceholder="Search country…"
    className={className}
    disabled={disabled}
  />
);

export default CountrySelect;
