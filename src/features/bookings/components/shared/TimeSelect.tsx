import React from "react";
import { generateTimeSlots, formatTime12 } from "../../utils/timeUtils";
import type { IntervalOption } from "../../types/scheduler-types";

interface TimeSelectProps {
  value: string;
  onChange: (val: string) => void;
  interval?: IntervalOption;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

const TimeSelect: React.FC<TimeSelectProps> = ({
  value,
  onChange,
  interval = "15 Mins",
  className = "form-select",
  placeholder,
  disabled
}) => {
  const slots = generateTimeSlots(interval);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      disabled={disabled}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {slots.map((t) => (
        <option key={t} value={t}>
          {formatTime12(t)}
        </option>
      ))}
    </select>
  );
};

export default TimeSelect;
