import { AppLayout, AppRadius } from "@/constants/layout";
import type { ThemeColors } from '@/constants/theme';
import { DashboardSpacing as Spacing } from "@/constants/theme";
import { themedStyles } from "@/components/auth/pearl/themedStyles";

export const createOverlaysStyles = (Colors: ThemeColors) => themedStyles((p) => ({
  quickSaleModalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.58)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 28,
  },
  // The booking form is a bottom-attached sheet, like the appointment detail
  // overlay — not a floating card centred in the screen.
  bookingModalBackdrop: {
    backgroundColor: "rgba(35, 33, 52, 0.35)",
    flex: 1,
    justifyContent: "flex-end",
  },
  bookingModalSurface: {
    backgroundColor: p.bgMid,
    // Edge to edge and flush with the bottom: any side or bottom gap shows the
    // calendar behind, including its red "now" marker, which reads as a stray
    // red background once a sheet opens on top.
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    elevation: 6,
    // An explicit height, not maxHeight: the form inside is flex:1, so against a
    // bounded-but-unsized parent it would collapse to nothing.
    height: "94%",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { height: -8, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
  },
  quickSalePaymentOnly: {
    flex: 1,
    width: "100%",
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
}));
