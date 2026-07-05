import React, { useEffect, useId, useMemo, useState } from "react";
import CountryPhoneSelect, { type CountryOption } from "./CountryPhoneSelect";
import { COUNTRIES } from "./countryData";
import {
  formatIncompletePhoneNumber,
  isPossiblePhoneNumber,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import "./styles/PhoneInput.scss";

const FALLBACK_COUNTRY = COUNTRIES.find((c) => c.cca2 === "IN") ?? COUNTRIES[0];

function findCountry(cca2: string): CountryOption {
  return COUNTRIES.find((c) => c.cca2 === cca2) ?? FALLBACK_COUNTRY;
}

/** Strips everything but digits from the selected country's dial code, e.g. "+91" -> "91". */
function dialDigits(country: CountryOption): string {
  return country.dialCode.replace(/\D/g, "");
}

/** Recovers the national-number digits (no dial code, no "+") from a stored E.164 value. */
function nationalDigitsFromE164(value: string, country: CountryOption): string {
  const digits = value.replace(/\D/g, "");
  const dial = dialDigits(country);
  return digits.startsWith(dial) ? digits.slice(dial.length) : digits;
}

export interface PhoneInputProps {
  /** Full phone number in E.164 format, e.g. "+919876543210". Empty string when unset. */
  value: string;
  /** Always called with the number in E.164 format ("" when the field is emptied). */
  onChange: (value: string) => void;
  /** Called whenever the current value's validity (per the selected country) changes. */
  onValidityChange?: (isValid: boolean) => void;
  onBlur?: () => void;
  /** ISO 3166-1 alpha-2 code used before the user (or an existing value) picks a country. */
  defaultCountry?: string;
  label?: React.ReactNode;
  /** Externally supplied error (e.g. "number already in use") takes priority over validation. */
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  containerClass?: string;
  name?: string;
  id?: string;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  onValidityChange,
  onBlur,
  defaultCountry = "IN",
  label,
  error,
  required = false,
  disabled = false,
  placeholder = "Mobile number",
  containerClass = "mb-3",
  name,
  id,
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  const [country, setCountry] = useState<CountryOption>(() => findCountry(defaultCountry));
  const [touched, setTouched] = useState(false);

  // Keep the picker in sync when `value` is set/changed from outside the
  // component (e.g. loading a saved record) rather than by typing here.
  useEffect(() => {
    if (!value) return;
    const parsed = parsePhoneNumberFromString(value);
    if (parsed?.country && parsed.country !== country.cca2) {
      setCountry(findCountry(parsed.country));
    }
    // Re-deriving on every `country` change would fight the user's own
    // country selection, so this only reacts to the external `value`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const nationalDigits = useMemo(() => nationalDigitsFromE164(value, country), [value, country]);

  const displayValue = useMemo(
    () => formatIncompletePhoneNumber(nationalDigits, country.cca2 as CountryCode),
    [nationalDigits, country],
  );

  const validationError = useMemo(() => {
    if (!nationalDigits) return required ? "Mobile number is required" : "";
    if (!isPossiblePhoneNumber(nationalDigits, country.cca2 as CountryCode)) {
      return "Enter a complete mobile number";
    }
    if (!isValidPhoneNumber(nationalDigits, country.cca2 as CountryCode)) {
      return `Enter a valid mobile number for ${country.name}`;
    }
    return "";
  }, [nationalDigits, country, required]);

  useEffect(() => {
    onValidityChange?.(!validationError);
    // Only the error string itself should retrigger this — not identity
    // changes of the callback prop on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validationError]);

  const emit = (digits: string, forCountry: CountryOption) => {
    onChange(digits ? `+${dialDigits(forCountry)}${digits}` : "");
  };

  const handleDigitsChange = (raw: string) => {
    emit(raw.replace(/\D/g, ""), country);
  };

  const handleCountryChange = (next: CountryOption) => {
    setCountry(next);
    emit(nationalDigits, next);
  };

  const handleBlur = () => {
    setTouched(true);
    onBlur?.();
  };

  const shownError = error || (touched ? validationError : "");

  return (
    <div className={containerClass}>
      {label && (
        <label htmlFor={inputId} className="form-label fw-semibold mb-0 ui-phone-input__label">
          {label}
          {required && <span className="ui-phone-input__required"> *</span>}
        </label>
      )}
      <div
        className={`form-control d-flex align-items-stretch p-0 ${shownError ? "is-invalid" : ""} ${disabled ? "bg-light" : ""}`}
      >
        <CountryPhoneSelect value={country.cca2} onChange={handleCountryChange} />
        <input
          id={inputId}
          type="tel"
          inputMode="tel"
          name={name}
          className="border-0 flex-grow-1 ui-phone-input__field"
          placeholder={placeholder}
          value={displayValue}
          disabled={disabled}
          onChange={(e) => handleDigitsChange(e.target.value)}
          onBlur={handleBlur}
          aria-invalid={!!shownError}
          aria-describedby={shownError ? `${inputId}-error` : undefined}
        />
      </div>
      {shownError && (
        <div id={`${inputId}-error`} className="text-danger mt-1 ui-phone-input__error" role="alert">
          {shownError}
        </div>
      )}
    </div>
  );
};

export default PhoneInput;
