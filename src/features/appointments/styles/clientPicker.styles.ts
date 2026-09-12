import { AppLayout, AppRadius } from "@/constants/layout";
import type { ThemeColors } from '@/constants/theme';
import { DashboardSpacing as Spacing } from "@/constants/theme";
import { AUTOCOMPLETE_DROPDOWN_GAP } from "@/features/appointments/constants/appointmentConstants";
import { StyleSheet } from 'react-native';

export const createClientPickerStyles = (Colors: ThemeColors) => StyleSheet.create({
  stickySearchDropdown: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    elevation: 24,
    left: 0,
    maxHeight: 360,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    top: AppLayout.searchBarHeight + AUTOCOMPLETE_DROPDOWN_GAP,
    zIndex: 80,
  },
  clientBlock: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: Spacing.md,
  },
  clientCopy: {
    flex: 1,
  },
  clientActionChip: {
    alignItems: "center",
    backgroundColor: Colors.appointmentSurface,
    borderColor: Colors.appointmentBorder,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  clientActionChipActive: {
    backgroundColor: Colors.appointmentAccentSoft,
    borderColor: Colors.appointmentAccent,
  },
  clientActionText: {
    color: Colors.appointmentTextSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  clientActionTextActive: {
    color: Colors.appointmentAccentDark,
  },
  clientDropdown: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    elevation: 7,
    left: 0,
    marginTop: 6,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    top: 184,
    zIndex: 6,
  },
  clientModeHint: {
    color: Colors.primary,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: Spacing.sm,
    maxWidth: "60%",
  },
  clientOptionRow: {
    alignItems: "center",
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: Spacing.md,
    minHeight: 58,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  clientQuickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  clientSearchGroup: {
    position: "relative",
    zIndex: 6,
  },
  clientSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  }
});
