import { AppLayout, AppRadius } from "@/constants/layout";
import type { ThemeColors } from '@/constants/theme';
import { DashboardRadius as Radius, DashboardSpacing as Spacing } from "@/constants/theme";
import { StyleSheet } from 'react-native';

export const createListFiltersStyles = (Colors: ThemeColors) => StyleSheet.create({
  filterToggleButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    height: AppLayout.searchBarHeight,
    justifyContent: "center",
    width: AppLayout.searchBarHeight,
  },
  filterToggleButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stateCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    padding: AppLayout.cardPadding,
  },
  stateMessage: {
    color: Colors.text2,
    fontSize: 13,
    lineHeight: 20,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  stateTitle: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "900",
    marginTop: Spacing.md,
    textAlign: "center",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: AppLayout.sectionGap,
  },
  summaryIcon: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  summaryLabel: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  summaryTile: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    minHeight: 122,
    padding: Spacing.md,
  },
  summaryTileWrap: {
    minWidth: 150,
  },
  summaryValue: {
    color: Colors.heading,
    fontSize: 20,
    fontWeight: "900",
    marginTop: Spacing.md,
  },
  chip: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  chipText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "800",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  filterPanel: {
    gap: Spacing.md,
    marginBottom: AppLayout.sectionGap,
  },
  weekStripRow: {
    gap: Spacing.sm,
    paddingBottom: 2,
  },
  weekDayPill: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    minWidth: 46,
    paddingVertical: Spacing.sm,
  },
  weekDayPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  weekDayLabel: {
    color: Colors.text2,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  weekDayLabelActive: {
    color: "rgba(255,255,255,0.78)",
  },
  weekDayNumber: {
    color: Colors.heading,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 3,
  },
  weekDayNumberActive: {
    color: "#FFFFFF",
  },
  statusModalCard: {
    backgroundColor: Colors.appointmentSurface,
    borderRadius: 8,
    marginHorizontal: 24,
    padding: 18,
    width: "86%",
  },
  statusOptionRow: {
    alignItems: "center",
    borderBottomColor: Colors.appointmentDivider,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: 4,
  },
  statusOptionText: {
    color: Colors.appointmentTextSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  statusOptionTextActive: {
    color: Colors.appointmentAccent,
  }
});
