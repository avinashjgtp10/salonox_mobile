import { AppLayout } from "@/constants/layout";
import type { ThemeColors } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const createCalendarControlsStyles = (Colors: ThemeColors) => StyleSheet.create({
  dinggToolbar: {
    backgroundColor: Colors.appointmentSurface,
    borderBottomColor: Colors.appointmentDivider,
    borderBottomWidth: 1,
    marginHorizontal: -AppLayout.contentHorizontalPadding,
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  dinggToolbarActions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 42,
  },
  dinggTodayButton: {
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  dinggTodayText: {
    color: Colors.appointmentText,
    fontSize: 13,
    fontWeight: "700",
  },
  dinggToolbarIcons: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  dinggRangeControls: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 3,
    justifyContent: "center",
  },
  dinggRangeButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    minWidth: 108,
  },
  dinggRangeText: {
    color: Colors.appointmentText,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    textAlign: "center",
  },
  dinggStylistSummary: {
    alignItems: "center",
    borderTopColor: Colors.appointmentDivider,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 10,
  },
  dinggStylistLabel: {
    color: Colors.appointmentText,
    fontSize: 13,
    fontWeight: "800",
  },
  dinggStylistValue: {
    color: Colors.appointmentTextSecondary,
    fontSize: 13,
    maxWidth: "65%",
  },
  dinggSearchField: {
    alignItems: "center",
    backgroundColor: Colors.appointmentSurfaceMuted,
    borderRadius: 6,
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    minHeight: 40,
    paddingHorizontal: 10,
  },
  dinggSearchInput: {
    color: Colors.appointmentText,
    flex: 1,
    fontSize: 12,
    minHeight: 40,
  },
  dinggToolbarIcon: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  dinggStaffRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  dinggStaffChip: {
    borderColor: "transparent",
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 13,
  },
  dinggStaffChipActive: {
    backgroundColor: Colors.appointmentAccent,
    borderColor: Colors.appointmentAccent,
  },
  dinggStaffText: {
    color: Colors.appointmentText,
    fontSize: 11,
    fontWeight: "600",
  },
  dinggStaffTextActive: {
    color: "#FFFFFF",
  },
  dinggLegend: {
    backgroundColor: "transparent",
    bottom: 0,
    flexGrow: 0,
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 10,
  },
  dinggLegendContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  dinggLegendPill: {
    alignItems: "center",
    backgroundColor: Colors.appointmentSurface,
    borderRadius: 22,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 42,
    minWidth: 88,
    paddingHorizontal: 16,
  },
  dinggLegendActive: {
    backgroundColor: Colors.appointmentAccent,
  },
  dinggLegendDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  dinggLegendText: {
    color: Colors.appointmentText,
    fontSize: 11,
    fontWeight: "600",
  },
  dinggLegendTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  dinggStaffHeader: {
    color: Colors.appointmentText,
    fontSize: 10,
    fontWeight: "800",
  }
});
