import { AppLayout } from "@/constants/layout";
import type { ThemeColors } from '@/constants/theme';
import { DashboardSpacing as Spacing } from "@/constants/theme";
import { StyleSheet } from 'react-native';

export const createCalendarGridStyles = (Colors: ThemeColors) => StyleSheet.create({
  dinggAddButton: {
    alignItems: "center",
    backgroundColor: Colors.appointmentAccent,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  dinggWeekStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dinggWeekDay: {
    alignItems: "center",
    flex: 1,
    gap: 4,
  },
  dinggWeekLabel: {
    color: Colors.appointmentMuted,
    fontSize: 9,
  },
  dinggWeekNumberWrap: {
    alignItems: "center",
    borderRadius: 17,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  dinggWeekNumberActive: {
    backgroundColor: Colors.appointmentAccent,
  },
  dinggWeekNumber: {
    color: Colors.appointmentText,
    fontSize: 13,
    fontWeight: "700",
  },
  dinggWeekNumberTextActive: {
    color: "#FFFFFF",
  },
  dinggSelectedDateRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 34,
  },
  dinggSelectedDate: {
    color: Colors.appointmentAccent,
    fontSize: 11,
    fontWeight: "700",
  },
  dinggCalendar: {
    backgroundColor: Colors.appointmentSurface,
    flex: 1,
    marginHorizontal: -AppLayout.contentHorizontalPadding,
  },
  calendarActionPrimary: {
    backgroundColor: Colors.appointmentAccentSoft,
    borderTopColor: Colors.appointmentDivider,
    borderTopWidth: 1,
    justifyContent: "center",
    minHeight: 68,
    paddingHorizontal: 20,
  },
  calendarActionRow: {
    borderTopColor: Colors.appointmentDivider,
    borderTopWidth: 1,
    justifyContent: "center",
    minHeight: 68,
    paddingHorizontal: 20,
  },
  calendarActionText: {
    color: Colors.appointmentText,
    fontSize: 20,
    fontWeight: "500",
  },
  calendarMenuBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    flex: 1,
    justifyContent: "center",
    padding: 28,
  },
  calendarMenuCard: {
    backgroundColor: Colors.appointmentSurface,
    borderRadius: 7,
    padding: 10,
    width: "82%",
  },
  calendarMenuOption: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 10,
  },
  calendarMenuOptionActive: {
    backgroundColor: Colors.appointmentAccentSoft,
  },
  calendarMenuText: {
    color: Colors.appointmentText,
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  calendarEmpty: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "600",
    paddingVertical: Spacing.lg,
    textAlign: "center",
  },
  dinggStatusCompleted: {
    backgroundColor: "#35B64A",
  },
  dinggStatusConfirmed: {
    backgroundColor: "#F08A24",
  },
  dinggCalendarHeader: {
    borderBottomColor: Colors.appointmentBorder,
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 38,
  },
  dinggHorizontalScroller: {
    flex: 1,
  },
  dinggVerticalScroller: {
    flex: 1,
  },
  dinggTimeHeader: {
    alignItems: "center",
    borderRightColor: "#8A838A",
    borderRightWidth: 1.5,
    justifyContent: "center",
    width: 54,
  },
  dinggDayHeader: {
    alignItems: "center",
    borderRightColor: "#8A838A",
    borderRightWidth: 1.5,
    color: Colors.appointmentTextSecondary,
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  dinggDayHeaderText: {
    color: Colors.appointmentTextSecondary,
    flexShrink: 1,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  dinggGridBody: {
    flexDirection: "row",
  },
  dinggTimeColumn: {
    borderRightColor: "#8A838A",
    borderRightWidth: 1.5,
    width: 54,
  },
  dinggTimeCell: {
    borderBottomColor: "#8A838A",
    borderBottomWidth: 1.5,
    paddingRight: 5,
    justifyContent: "flex-start",
    paddingTop: 2,
  },
  dinggTimeText: {
    color: Colors.appointmentMuted,
    fontSize: 10,
    textAlign: "right",
  },
  dinggHourText: {
    color: Colors.appointmentText,
    fontSize: 13,
    fontWeight: "800",
  },
  dinggDayColumn: {
    borderRightColor: "#8A838A",
    borderRightWidth: 1.5,
    position: "relative",
  },
  dinggQuickSaleSlot: {
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 1,
  },
  dinggColumnAvailable: {
    backgroundColor: "#FFFBE4",
  },
  dinggColumnUnavailable: {
    backgroundColor: "#FCF7FA",
  },
  dinggHourCell: {
    borderBottomColor: "#8A838A",
    borderBottomWidth: 1.5,
    position: "relative",
  },
  dinggQuarterLine: {
    backgroundColor: "#8A838A",
    height: StyleSheet.hairlineWidth,
    left: 0,
    opacity: 0.75,
    position: "absolute",
    right: 0,
  },
  dinggPaidText: {
    alignSelf: "flex-end",
    backgroundColor: "#25A83A",
    borderRadius: 3,
    color: "#FFFFFF",
    fontSize: 7,
    fontWeight: "800",
    marginTop: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  calendarActionsModal: {
    backgroundColor: Colors.appointmentSurface,
    borderRadius: 16,
    elevation: 20,
    overflow: "hidden",
    shadowColor: Colors.shadow,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    width: "100%",
  },
  calendarActionsHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 66,
    paddingHorizontal: 20,
  },
  calendarActionsTitle: {
    color: Colors.appointmentText,
    fontSize: 25,
    fontWeight: "900",
  },
  calendarActionsClose: {
    alignItems: "center",
    height: 38,
    justifyContent: "center",
    width: 38,
  }
});
