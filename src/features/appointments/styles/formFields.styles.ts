import { AppRadius } from "@/constants/layout";
import type { ThemeColors } from '@/constants/theme';
import { DashboardSpacing as Spacing } from "@/constants/theme";
import { StyleSheet } from 'react-native';

export const createFormFieldsStyles = (Colors: ThemeColors) => StyleSheet.create({
  timeDropdownButton: {
    alignItems: "center",
    backgroundColor: Colors.appointmentSurface,
    borderColor: Colors.appointmentBorder,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: Spacing.md,
  },
  timeDropdownMenu: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    elevation: 8,
    marginTop: Spacing.sm,
    maxHeight: 220,
    overflow: "hidden",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  timeDropdownOption: {
    alignItems: "center",
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: Spacing.md,
  },
  timeDropdownOptionActive: {
    backgroundColor: Colors.appointmentAccentSoft,
  },
  timeDropdownOptionText: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
  },
  timeDropdownOptionTextActive: {
    color: Colors.appointmentAccentDark,
    fontWeight: "700",
  },
  timeDropdownPlaceholder: {
    color: Colors.placeholder,
  },
  timeDropdownValue: {
    color: Colors.appointmentText,
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
  },
  timeDropdownWrap: {
    position: "relative",
  },
  textArea: {
    minHeight: 96,
    paddingTop: Spacing.md,
    textAlignVertical: "top",
  },
  validationSectionError: {
    borderColor: Colors.error,
    borderRadius: AppRadius.control,
    borderWidth: 1.5,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  dateInput: {
    color: Colors.heading,
    flex: 1,
    fontSize: 14,
    textAlignVertical: "center",
  },
  dateInputRow: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
  },
  fieldError: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
  fieldHint: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
    marginTop: Spacing.sm,
  },
  fieldHintError: {
    color: Colors.error,
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  fieldHintRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: Spacing.sm,
  },
  dateButton: {
    alignItems: "center",
    backgroundColor: Colors.appointmentSurface,
    borderColor: Colors.appointmentBorder,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: "row",
    gap: 3,
    minHeight: 48,
    paddingHorizontal: 6,
  },
  dateButtonText: {
    color: Colors.appointmentText,
    flex: 1,
    fontSize: 10,
    fontWeight: "600",
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputDisabled: {
    opacity: 0.55,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputActionText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  inputLabel: {
    color: Colors.appointmentText,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  inputLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  }
});
