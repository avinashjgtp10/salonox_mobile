import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardColors as Colors,
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";
import { deleteSaleThunk, fetchSaleByIdThunk } from "@/middleware/sales/sales.thunk";
import {
  selectSaleDeletingIds,
  selectSaleDetail,
  selectSaleDetailError,
  selectSaleDetailLoading,
} from "@/store/sales/sales.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { SaleLineItem } from "@/types/sales";

function formatCurrency(amount: number) {
  return `Rs. ${amount.toLocaleString("en-IN")}`;
}

function getRejectedMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function LineItemRow({ item }: { item: SaleLineItem }) {
  return (
    <View style={styles.lineItemRow}>
      <View style={styles.lineItemCopy}>
        <Text style={styles.lineItemName}>{item.name}</Text>
        <Text style={styles.lineItemMeta}>
          {item.category === "service" ? item.duration ?? "Service" : "Product"}
          {item.staffName ? ` · ${item.staffName}` : ""} · Qty {item.quantity}
        </Text>
      </View>
      <Text style={styles.lineItemPrice}>{formatCurrency(item.price * item.quantity)}</Text>
    </View>
  );
}

export default function SaleDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const dispatch = useAppDispatch();

  const detail = useAppSelector(selectSaleDetail);
  const detailLoading = useAppSelector(selectSaleDetailLoading);
  const detailError = useAppSelector(selectSaleDetailError);
  const deletingSaleIds = useAppSelector(selectSaleDeletingIds);

  useEffect(() => {
    if (id) {
      void dispatch(fetchSaleByIdThunk(id));
    }
  }, [id, dispatch]);

  // Only trust the loaded detail when it matches the requested id.
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

    Alert.alert("Sale deleted", resultAction.payload.message ?? "Sale deleted successfully.");
    handleBack();
  };

  const handleDelete = () => {
    if (!sale) {
      return;
    }

    Alert.alert(
      "Delete Sale",
      `Are you sure you want to delete "${sale.receiptNumber}"? This action cannot be undone.`,
      [
        { style: "cancel", text: "Cancel" },
        { onPress: () => void handleConfirmDelete(), style: "destructive", text: "Delete" },
      ],
    );
  };

  const renderHeader = (showActions = false) => (
    <View style={styles.headerRow}>
      <TouchableOpacity activeOpacity={0.8} onPress={handleBack} style={styles.backButton}>
        <Ionicons name="chevron-back" size={18} color={Colors.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Sale Invoice</Text>
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
        <View style={[styles.backButton, { opacity: 0 }]} />
      )}
    </View>
  );

  if (detailLoading && !sale) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
        <View style={styles.notFoundWrap}>
          {renderHeader()}
          <View style={styles.centeredContent}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (detailError && !sale) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
        <View style={styles.notFoundWrap}>
          {renderHeader()}
          <View style={styles.notFoundCard}>
            <Text style={styles.notFoundTitle}>Unable to load sale</Text>
            <Text style={styles.notFoundSubtitle}>{detailError}</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => id && dispatch(fetchSaleByIdThunk(id))}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!sale) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
        <View style={styles.notFoundWrap}>
          {renderHeader()}
          <View style={styles.notFoundCard}>
            <Text style={styles.notFoundTitle}>Sale not found</Text>
            <Text style={styles.notFoundSubtitle}>This sale could not be found.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const isDraft = sale.status.toLowerCase() === "draft" || sale.status.toLowerCase() === "pending";

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {renderHeader(true)}

        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <Ionicons name="receipt-outline" size={28} color={Colors.primaryDark} />
          </View>
          <Text style={styles.receiptNumber}>{sale.receiptNumber}</Text>
          <Text style={styles.clientName}>{sale.clientName}</Text>
          <View
            style={[
              styles.statusBadge,
              sale.status.toLowerCase() === "completed"
                ? styles.statusBadgeActive
                : sale.status.toLowerCase() === "cancelled"
                  ? styles.statusBadgeInactive
                  : styles.statusBadgePending,
            ]}
          >
            <Text style={styles.statusBadgeText}>
              {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatCurrency(sale.total)}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatCurrency(sale.amountPaid)}</Text>
              <Text style={styles.statLabel}>Paid</Text>
            </View>
          </View>
        </View>

        {isDraft ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push(`/quick-sale?draftId=${sale.id}` as Href)}
            style={styles.continueButton}
          >
            <Ionicons name="create-outline" size={18} color="#FFFFFF" />
            <Text style={styles.continueButtonText}>Continue Editing</Text>
          </TouchableOpacity>
        ) : null}

        <Section title="Items">
          {sale.lineItems.length === 0 ? (
            <Text style={styles.emptyLineItemsText}>No items recorded for this sale.</Text>
          ) : (
            sale.lineItems.map((item) => <LineItemRow key={item.id} item={item} />)
          )}
        </Section>

        <Section title="Billing Summary">
          <DetailRow label="Subtotal" value={formatCurrency(sale.subtotal)} />
          <DetailRow label="Discount" value={`- ${formatCurrency(sale.discountAmount)}`} />
          <DetailRow label="Tax" value={formatCurrency(sale.taxAmount)} />
          <DetailRow label="Total" value={formatCurrency(sale.total)} />
          <DetailRow label="Amount Paid" value={formatCurrency(sale.amountPaid)} />
          {sale.outstandingAmount > 0 ? (
            <DetailRow label="Outstanding" value={formatCurrency(sale.outstandingAmount)} />
          ) : null}
        </Section>

        <Section title="Payment & Client">
          <DetailRow label="Client" value={sale.clientName} />
          <DetailRow label="Phone" value={sale.clientPhone} />
          <DetailRow label="Payment Method" value={sale.paymentMethod} />
          <DetailRow label="Created" value={sale.createdDateLabel} />
        </Section>

        {sale.notes ? (
          <Section title="Notes">
            <Text style={styles.notesText}>{sale.notes}</Text>
          </Section>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    shadowColor: Colors.primaryDark,
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
    backgroundColor: "#EAF5EF",
  },
  statusBadgeInactive: {
    backgroundColor: "#FEECEC",
  },
  statusBadgePending: {
    backgroundColor: "#FBF3E5",
  },
  statusBadgeText: {
    color: Colors.heading,
    fontSize: 11,
    fontWeight: "800",
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  statCard: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  statValue: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: "800",
  },
  statLabel: {
    color: Colors.text2,
    fontSize: 11,
    marginTop: 4,
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
    color: "#FFFFFF",
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
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  centeredContent: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
});
