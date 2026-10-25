import { AppLayout } from "@/constants/layout";
import type { ThemeColors } from '@/constants/theme';
import { DashboardSpacing as Spacing } from "@/constants/theme";
import { StyleSheet } from 'react-native';

export const createBookingFormStyles = (Colors: ThemeColors) => StyleSheet.create({
  bookingScreen: {
    backgroundColor: Colors.appointmentBackground,
  },
  bookingBottomBar: {
    backgroundColor: Colors.appointmentSurface,
    borderTopColor: Colors.appointmentDivider,
    borderTopWidth: 1,
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 12,
  },
  bookingContent: {
    paddingBottom: 24,
    backgroundColor: Colors.appointmentBackground,
  },
  bookingBottomLabel: {
    color: Colors.appointmentTextSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  bookingBottomMeta: {
    color: Colors.appointmentText,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  bookingBottomSummary: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bookingBottomTotal: {
    color: Colors.appointmentText,
    fontSize: 17,
    fontWeight: "700",
    marginTop: 1,
  },
  bookingBottomTotalWrap: {
    alignItems: "flex-end",
  },
  bookingFlow: {
    gap: 16,
  },
  appointmentDeliverySection: {
    backgroundColor: Colors.appointmentSurface,
    borderRadius: 20,
    padding: 18,
  },
  appointmentDeliveryTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  appointmentDeliveryTitle: {
    color: Colors.appointmentText,
    fontSize: 15,
    fontWeight: "700",
  },
  appointmentDeliveryOptions: {
    flexDirection: "row",
    gap: 28,
    marginTop: 14,
    paddingLeft: 2,
  },
  appointmentDeliveryOption: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    minHeight: 44,
  },
  appointmentDeliveryOptionText: {
    color: Colors.appointmentText,
    fontSize: 14,
    fontWeight: "500",
  },
  bookingPrimaryButton: {
    alignItems: "center",
    backgroundColor: Colors.appointmentAccent,
    borderRadius: 28,
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: AppLayout.cardPadding,
  },
  bookingPrimaryButtonText: {
    color: Colors.onPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  bookingSection: {
    backgroundColor: Colors.appointmentSurface,
    borderColor: Colors.appointmentBorder,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    overflow: "visible",
    paddingHorizontal: 16,
    paddingVertical: 18,
    shadowOpacity: 0,
    elevation: 0,
  },
  bookingSectionActionButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
    minHeight: 32,
    paddingHorizontal: 4,
  },
  bookingSectionAction: {
    color: Colors.primaryText,
    fontSize: 13,
    fontWeight: "900",
  },
  bookingSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
    flexWrap: "wrap",
    gap: 8,
  },
  bookingSectionTitle: {
    color: Colors.appointmentText,
    fontSize: 16,
    fontWeight: "700",
  },
  bookingSectionHeading: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 160 },
  bookingSectionCopy: { flex: 1 },
  bookingSectionIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.dashboardAppointmentBg, alignItems: "center", justifyContent: "center" },
  bookingSectionSubtitle: { color: Colors.appointmentTextSecondary, fontSize: 12, lineHeight: 18, marginTop: 3 },
  bookingScheduleRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  bookingScheduleField: { flex: 1, minWidth: 125 },
  bookingAddService: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderWidth: 1, borderStyle: "dashed", borderColor: Colors.appointmentAccent, borderRadius: 16, backgroundColor: Colors.appointmentAccentSoft, minHeight: 88 },
  bookingAddServiceCopy: { flex: 1 },
  bookingTwoColumnSection: {
    gap: Spacing.md,
  }
});
