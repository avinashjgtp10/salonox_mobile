import type { ThemeColors } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const createCalendarAppointmentsStyles = (Colors: ThemeColors) => StyleSheet.create({
  dinggAppointmentCard: {
    borderColor: "transparent",
    borderWidth: 2,
    borderRadius: 5,
    left: 3,
    padding: 0,
    position: "absolute",
    right: 3,
    zIndex: 3,
  },
  dinggAppointmentGradient: {
    borderRadius: 3,
    flex: 1,
    overflow: "hidden",
    padding: 7,
  },
  dinggAppointmentOverlapping: {
    borderColor: "#ffffff",
  },
  dinggAppointmentHighlighted: {
    borderColor: "#7c3aed",
    borderWidth: 3,
  },
  dinggAppointmentDragging: {
    opacity: 0.92,
  },
  dinggAppointmentResizing: {
    elevation: 12,
    shadowColor: "#000000",
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    zIndex: 8,
  },
  dinggAppointmentDeleted: {
    opacity: 0.7,
  },
  dinggAppointmentIcons: {
    flexDirection: "row",
    gap: 4,
  },
  dinggAppointmentSummary: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 14,
    marginTop: 3,
  },
  dinggAppointmentName: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 15,
  },
  dinggAppointmentClient: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
    marginTop: 3,
  },
  dinggAppointmentMeta: {
    color: Colors.appointmentMuted,
    fontSize: 7,
    marginTop: 1,
  },
  dinggCurrentTime: {
    alignItems: "center",
    flexDirection: "row",
    left: 4,
    position: "absolute",
    right: 0,
    zIndex: 20,
  },
  dinggCurrentTimeLabel: {
    backgroundColor: "#E31B23",
    borderRadius: 4,
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 5,
    paddingVertical: 4,
  },
  dinggCurrentTimeDot: {
    backgroundColor: "#E31B23",
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  dinggCurrentTimeLine: {
    backgroundColor: "#E31B23",
    flex: 1,
    height: 2,
  }
});
