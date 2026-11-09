import { InvoiceDetailsView } from "@/features/quickSale/components/InvoiceDetailsView";
import type { PearlColors as ThemeColors } from "@/components/auth/pearl/usePearlColors";
import { AppBackButton } from "@/components/ui/AppBackButton";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text } from "@/components/ui/AppTypography";
import { appAlert as Alert } from "@/services/appAlert";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";
import { useAppToast } from "@/hooks/useAppToast";
import { deleteSaleThunk, fetchSaleByIdThunk } from "@/middleware/sales/sales.thunk";
import {
  selectSaleDeletingIds,
  selectSaleDetail,
  selectSaleDetailError,
  selectSaleDetailLoading,
} from "@/store/sales/sales.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { usePearlColors } from "@/components/auth/pearl/usePearlColors";
import { formatInvoiceNumber } from "@/utils/receipt";

function getRejectedMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

export default function SaleDetailsScreen() {
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const dispatch = useAppDispatch();
  const toast = useAppToast();

  const detail = useAppSelector(selectSaleDetail);
  const detailLoading = useAppSelector(selectSaleDetailLoading);
  const detailError = useAppSelector(selectSaleDetailError);
  const deletingSaleIds = useAppSelector(selectSaleDeletingIds);

  useEffect(() => {
    if (id) {
      void dispatch(fetchSaleByIdThunk(id));
    }
  }, [id, dispatch]);

  const sale = detail && detail.id === id ? detail : null;
  const isDeleting = Boolean(id && deletingSaleIds.includes(id));

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/sales" as Href);
  };

  const handleConfirmDelete = async () => {
    if (!id) {
      return;
    }

    const resultAction = await dispatch(deleteSaleThunk(id));

    if (deleteSaleThunk.rejected.match(resultAction)) {
      Alert.alert(
        "Unable to delete sale",
        getRejectedMessage(resultAction.payload, "Something went wrong. Please try again."),
      );
      return;
    }

    toast.showSuccess("Sale deleted successfully.");
    handleBack();
  };

  const handleDelete = () => {
    if (!sale) {
      return;
    }

    Alert.alert(
      "Delete Sale",
      `Are you sure you want to delete "${formatInvoiceNumber(sale.receiptNumber) ?? "this sale"}"? This action cannot be undone.`,
      [
        { style: "cancel", text: "Cancel" },
        { onPress: () => void handleConfirmDelete(), style: "destructive", text: "Delete" },
      ],
    );
  };

  const renderHeader = (showActions = false) => (
    <View style={styles.headerRow}>
      <AppBackButton activeOpacity={0.8} hitSlop={AppLayout.headerActionHitSlop} onPress={handleBack} />
      <Text translate style={styles.headerTitle}>Sale Invoice</Text>
      {showActions ? (
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={isDeleting}
          onPress={handleDelete}
          style={styles.backButton}
        >
          {isDeleting ? (
            <ActivityIndicator color={Colors.error} size="small" />
          ) : (
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.backButtonPlaceholder} />
      )}
    </View>
  );

  if (detailLoading && !sale) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.notFoundWrap}>
          {renderHeader()}
          <View style={styles.centeredContent}>
            <ActivityIndicator size="large" color={Colors.primaryText} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (detailError && !sale) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.notFoundWrap}>
          {renderHeader()}
          <View style={styles.notFoundCard}>
            <Text translate style={styles.notFoundTitle}>Unable to load sale</Text>
            <Text style={styles.notFoundSubtitle}>{detailError}</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => id && dispatch(fetchSaleByIdThunk(id))}
              style={styles.retryButton}
            >
              <Text translate style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!sale) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.notFoundWrap}>
          {renderHeader()}
          <View style={styles.notFoundCard}>
            <Text translate style={styles.notFoundTitle}>Sale not found</Text>
            <Text translate style={styles.notFoundSubtitle}>This sale could not be found.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return <InvoiceDetailsView sale={sale} onBack={handleBack} onDelete={handleDelete} deleting={isDeleting} />;

}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  content: {
    paddingBottom: AppLayout.contentBottomPadding,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: AppLayout.headerMarginBottom,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    height: AppLayout.headerActionSize,
    justifyContent: "center",
    width: AppLayout.headerActionSize,
  },
  backButtonPlaceholder: {
    width: AppLayout.headerActionSize,
  },
  headerTitle: {
    color: Colors.heading,
    fontSize: AppLayout.headerTitleFontSize,
    fontWeight: AppLayout.screenTitleFontWeight,
  },
  heroCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    padding: AppLayout.cardPadding + Spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: 34,
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  receiptNumber: {
    color: Colors.heading,
    fontSize: 22,
    fontWeight: "800",
    marginTop: Spacing.md,
    textAlign: "center",
  },
  clientName: {
    color: Colors.text2,
    fontSize: 13,
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: Radius.full,
    marginTop: Spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusBadgeActive: {
    backgroundColor: Colors.successBg,
  },
  statusBadgeInactive: {
    backgroundColor: Colors.errorBg,
  },
  statusBadgePending: {
    backgroundColor: Colors.warningBg,
  },
  statusBadgeText: {
    color: Colors.heading,
    fontSize: 11,
    fontWeight: "800",
  },
  continueButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: AppRadius.pill,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: Spacing.md,
    minHeight: 50,
  },
  continueButtonText: {
    color: Colors.onPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: Spacing.md,
  },
  lineItemRow: {
    alignItems: "center",
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  lineItemCopy: {
    flex: 1,
    marginRight: Spacing.md,
  },
  lineItemName: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "700",
  },
  lineItemMeta: {
    color: Colors.text2,
    fontSize: 11,
    marginTop: 4,
  },
  lineItemPrice: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
  },
  emptyLineItemsText: {
    color: Colors.text2,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  detailRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  detailLabel: {
    color: Colors.text2,
    fontSize: 13,
  },
  detailValue: {
    color: Colors.heading,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: Spacing.md,
    textAlign: "right",
  },
  notesText: {
    color: Colors.text,
    fontSize: 13,
    lineHeight: 20,
  },
  notFoundWrap: {
    flex: 1,
    padding: Spacing.lg,
  },
  notFoundCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  notFoundTitle: {
    color: Colors.heading,
    fontSize: 20,
    fontWeight: "800",
  },
  notFoundSubtitle: {
    color: Colors.text2,
    fontSize: 13,
    lineHeight: 20,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    justifyContent: "center",
    marginTop: Spacing.lg,
    minHeight: 46,
    paddingHorizontal: Spacing.xl,
  },
  retryButtonText: {
    color: Colors.onPrimary,
    fontSize: 13,
    fontWeight: "800",
  },
  centeredContent: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
});
