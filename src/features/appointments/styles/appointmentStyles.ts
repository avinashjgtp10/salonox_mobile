import type { ThemeColors } from '@/constants/theme';
import { createAppointmentDetailsStyles } from './appointmentDetails.styles';
import { createBookingFormStyles } from './bookingForm.styles';
import { createCalendarAppointmentsStyles } from './calendarAppointments.styles';
import { createCalendarControlsStyles } from './calendarControls.styles';
import { createCalendarGridStyles } from './calendarGrid.styles';
import { createCalendarListStyles } from './calendarList.styles';
import { createClientPickerStyles } from './clientPicker.styles';
import { createFormFieldsStyles } from './formFields.styles';
import { createListFiltersStyles } from './listFilters.styles';
import { createOverlaysStyles } from './overlays.styles';
import { createServicePickerStyles } from './servicePicker.styles';
import { createSharedStyles } from './shared.styles';
import { createStaffAvailabilityStyles } from './staffAvailability.styles';

export const createStyles = (Colors: ThemeColors) => ({
  ...createSharedStyles(Colors),
  ...createCalendarControlsStyles(Colors),
  ...createCalendarGridStyles(Colors),
  ...createCalendarListStyles(Colors),
  ...createAppointmentDetailsStyles(Colors),
  ...createServicePickerStyles(Colors),
  ...createStaffAvailabilityStyles(Colors),
  ...createBookingFormStyles(Colors),
  ...createCalendarAppointmentsStyles(Colors),
  ...createOverlaysStyles(Colors),
  ...createListFiltersStyles(Colors),
  ...createFormFieldsStyles(Colors),
  ...createClientPickerStyles(Colors),
});
