import { AppLayout } from "@/constants/layout";
import type { ThemeColors } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const createCalendarListStyles = (Colors: ThemeColors) => StyleSheet.create({
  dinggListView: {
    backgroundColor: Colors.appointmentSurface,
    marginHorizontal: -AppLayout.contentHorizontalPadding,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dinggListTimelineRow: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: 10,
    minHeight: 250,
  },
  dinggListTimeRail: {
    alignItems: "center",
    width: 54,
  },
  dinggListHour: {
    color: Colors.appointmentTextSecondary,
    fontSize: 13,
    marginBottom: 7,
  },
  dinggListRailLine: {
    backgroundColor: Colors.appointmentDivider,
    flex: 1,
    width: 1,
  },
  dinggListAppointment: {
    backgroundColor: "#E8F8FA",
    borderLeftColor: "#2AA7B2",
    borderLeftWidth: 6,
    borderRadius: 8,
    flex: 1,
    marginBottom: 18,
    padding: 18,
  },
  dinggListCompleted: {
    backgroundColor: "#E9FAE8",
    borderLeftColor: "#35B64A",
  },
  dinggListConfirmed: {
    backgroundColor: "#FFF4E8",
    borderLeftColor: "#F08A24",
  },
  dinggListCopy: {
    display: "none",
  },
  dinggListClientRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  dinggListAvatar: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  dinggListClientCopy: {
    flex: 1,
    minWidth: 0,
  },
  dinggListClientName: {
    color: Colors.appointmentAccent,
    fontSize: 20,
    fontWeight: "900",
  },
  dinggListPhone: {
    color: Colors.appointmentText,
    fontSize: 14,
    marginTop: 3,
  },
  dinggListDetailRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  dinggListService: {
    color: Colors.appointmentAccent,
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
  },
  dinggListTimeRange: {
    color: Colors.appointmentAccent,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  dinggListStaffWrap: {
    marginLeft: "auto",
    maxWidth: "34%",
  },
  dinggListWith: {
    color: Colors.appointmentTextSecondary,
    fontSize: 12,
  },
  dinggListStaff: {
    color: Colors.appointmentText,
    fontSize: 15,
    fontWeight: "800",
  },
  dinggListStatusRow: {
    alignItems: "center",
    borderTopColor: Colors.appointmentDivider,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 16,
    paddingTop: 12,
  },
  dinggListStatusDot: {
    backgroundColor: Colors.appointmentAccent,
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  dinggListStatus: {
    color: Colors.appointmentText,
    fontSize: 17,
  }
});
