import { pearl } from "@/components/auth/pearl/tokens";
import { AppLayout } from "@/constants/layout";
import type { ThemeColors } from '@/constants/theme';
import { DashboardSpacing as Spacing } from "@/constants/theme";
import { StyleSheet } from 'react-native';

export const createBookingFormStyles = (Colors: ThemeColors) => StyleSheet.create({
  bookingScreen: {
    backgroundColor: "transparent",
  },
  bookingBottomBar: {
    backgroundColor: "transparent",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  bookingContent: {
    paddingBottom: 24,
    backgroundColor: "transparent",
  },
  bookingBottomLabel: {
    color: pearl.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  bookingBottomMeta: {
    color: pearl.ink,
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
    color: pearl.ink,
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
    backgroundColor: pearl.glass,
    borderRadius: 22,
    padding: 18,
  },
  appointmentDeliveryTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  appointmentDeliveryTitle: {
    color: pearl.ink,
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
    color: pearl.ink,
    fontSize: 14,
    fontWeight: "500",
  },
  bookingPrimaryButton: {
    alignItems: "center",
    backgroundColor: pearl.accent,
    borderRadius: 16,
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
    backgroundColor: pearl.glass,
    borderColor: pearl.glassBorder,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
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
    color: pearl.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  bookingSectionHeading: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 160 },
  bookingSectionCopy: { flex: 1 },
  bookingSectionIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.dashboardAppointmentBg, alignItems: "center", justifyContent: "center" },
  bookingSectionSubtitle: { color: pearl.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  bookingScheduleRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  bookingScheduleField: { flex: 1, minWidth: 100 },
  bookingAddService: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderWidth: 1, borderStyle: "dashed", borderColor: Colors.appointmentAccent, borderRadius: 16, backgroundColor: Colors.appointmentAccentSoft, minHeight: 88 },
  bookingAddServiceCopy: { flex: 1 },
  bookingTwoColumnSection: {
    gap: Spacing.md,
  }
});
