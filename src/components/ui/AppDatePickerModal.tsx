/**
 * The app's one date picker.
 *
 * Every "choose a day" control in App 2.0 — Quick Sale, Calendar, the booking
 * form, appointment filters — opens this, so the calendar grid, selected-day
 * highlight, month arrows, colours, type and buttons are identical everywhere.
 * It is the single-date face of DateRangePickerSheet; use that one directly
 * only when a from/to range is genuinely needed.
 *
 * `renderInline` must be true when the opener already sits inside a React
 * Native <Modal>: a portalled sheet would render behind that modal's window
 * and the tap would look like it did nothing.
 */
import { memo } from "react";

import { DateRangePickerSheet } from "@/components/ui/DateRangePickerSheet";

export type AppDatePickerModalProps = {
  /** Currently chosen day, ISO yyyy-mm-dd, or null when nothing is set yet. */
  value: string | null;
  /** Called with the chosen day; the modal closes itself afterwards. */
  onChange: (date: string) => void;
  onClose: () => void;
  visible: boolean;
  title?: string;
  subtitle?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  /** True when rendered inside a React Native <Modal>. */
  renderInline?: boolean;
};

export const AppDatePickerModal = memo(function AppDatePickerModal({
  value,
  onChange,
  onClose,
  visible,
  title = "Select date",
  subtitle = "Tap the day you want.",
  minimumDate,
  maximumDate,
  renderInline = false,
}: AppDatePickerModalProps) {
  return (
    <DateRangePickerSheet
      pearlStyle
      centered={false}
      mode="single"
      renderInline={renderInline}
      title={title}
      subtitle={subtitle}
      visible={visible}
      startDate={value}
      endDate={null}
      minimumDate={minimumDate}
      maximumDate={maximumDate}
      onClose={onClose}
      onApply={(selected) => {
        if (selected) onChange(selected);
        onClose();
      }}
    />
  );
});
