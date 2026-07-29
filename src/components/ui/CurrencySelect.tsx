import React from "react";
import { SUPPORTED_CURRENCIES, type CurrencyDef } from "../../config/currencies";
import { SearchableSelect } from "./SearchableSelect";

interface CurrencySelectProps {
  value: string;
  onChange: (code: string) => void;
  className?: string;
  disabled?: boolean;
}

const CurrencySelect: React.FC<CurrencySelectProps> = ({ value, onChange, className, disabled }) => (
  <SearchableSelect<CurrencyDef>
    value={value}
    onChange={onChange}
    options={SUPPORTED_CURRENCIES}
    getKey={(c) => c.code}
    getLabel={(c) => `${c.label} (${c.symbol}) — ${c.code}`}
    getSearchText={(c) => `${c.code} ${c.label} ${c.symbol}`}
    placeholder="Select currency"
    searchPlaceholder="Search currency or code…"
    className={className}
    disabled={disabled}
  />
);

export default CurrencySelect;
