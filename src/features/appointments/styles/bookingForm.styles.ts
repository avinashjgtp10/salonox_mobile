import { AppLayout } from "@/constants/layout";
import type { ThemeColors } from '@/constants/theme';
import { DashboardSpacing as Spacing } from "@/constants/theme";
import { StyleSheet } from 'react-native';

export const createBookingFormStyles = (Colors: ThemeColors) => StyleSheet.create({
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
    paddingBottom: 150,
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
    gap: 0,
  },
  appointmentDeliverySection: {
    borderBottomColor: Colors.appointmentDivider,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 18,
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
    minHeight: 32,
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
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  bookingSection: {
    backgroundColor: Colors.appointmentSurface,
    borderBottomColor: Colors.appointmentDivider,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    overflow: "visible",
    paddingHorizontal: 0,
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
    color: Colors.appointmentAccent,
    fontSize: 13,
    fontWeight: "900",
  },
  bookingSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  bookingSectionTitle: {
    color: Colors.appointmentText,
    fontSize: 16,
    fontWeight: "700",
  },
  bookingTwoColumnSection: {
    gap: Spacing.md,
  }
});
