import { AppLayout, AppRadius } from "@/constants/layout";
import type { ThemeColors } from '@/constants/theme';
import { DashboardSpacing as Spacing } from "@/constants/theme";
import { StyleSheet } from 'react-native';

export const createOverlaysStyles = (Colors: ThemeColors) => StyleSheet.create({
  quickSaleModalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.58)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 28,
  },
  quickSaleModalSurface: {
    backgroundColor: Colors.bg,
    borderRadius: 8,
    elevation: 6,
    height: "94%",
    maxWidth: 620,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    width: "100%",
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 32, 0.42)",
    flex: 1,
    justifyContent: "center",
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: Colors.card,
    borderRadius: AppRadius.card,
    padding: AppLayout.cardPadding,
    width: "100%",
  },
  modalTitle: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "900",
  }
});
