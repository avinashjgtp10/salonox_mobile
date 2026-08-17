import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { ErrorState } from "@/components/ui/StateViews";
import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { AdjustStockSheet, type AdjustStockSubmission } from "@/features/consumables/components/AdjustStockSheet";
import { UnitConversionsSheet } from "@/features/consumables/components/UnitConversionsSheet";
import {
  adjustConsumableStockThunk,
  fetchAssignedServicesThunk,
  fetchConsumableByIdThunk,
  fetchUnitConversionsThunk,
  saveUnitConversionsThunk,
} from "@/middleware/consumable/consumable.thunk";
import {
  clearAdjustError,
  clearCurrentConsumable,
  clearUnitConversionsSaveError,
} from "@/store/consumable/consumable.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ConsumableUnitConversionRequestItem } from "@/types/consumable";
import { canAdjustConsumableStock, canViewConsumableInventory } from "@/utils/permissions";

const money = (value: number) => `Rs. ${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function ConsumableDetailScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUser = useAppSelector(selectCurrentUser);
  const canView = canViewConsumableInventory(currentUser);
  const canAdjust = canAdjustConsumableStock(currentUser);
  const state = useAppSelector((root) => root.consumable);
  const [isAdjustSheetVisible, setIsAdjustSheetVisible] = useState(false);
  const [isUnitConversionsSheetVisible, setIsUnitConversionsSheetVisible] = useState(false);

  useEffect(() => {
    if (!id || !canView) {
      return;
    }

    void dispatch(fetchConsumableByIdThunk(id));
    void dispatch(fetchAssignedServicesThunk(id));
    void dispatch(fetchUnitConversionsThunk(id));

    return () => {
      dispatch(clearCurrentConsumable());
    };
  }, [canView, dispatch, id]);

  const consumable = state.currentConsumable;
  // Prefer the backend-computed status over re-deriving it client-side —
  // see index.tsx's ConsumableCard for the same convention.
  const outOfStock = Boolean(
    consumable && (consumable.status ? consumable.status === "out_of_stock" : consumable.amount <= 0),
  );
  const lowStock = Boolean(
    consumable &&
      (consumable.status ? consumable.status === "low_stock" : !outOfStock && consumable.amount <= consumable.qtyAlert),
  );

  const handleAdjustSubmit = async (value: AdjustStockSubmission) => {
    if (!id) {
      return;
    }

    const action = await dispatch(
      adjustConsumableStockThunk({
        id,
        payload: {
          direction: value.direction,
          note: value.note || undefined,
          qty: value.qty,
          reason: value.reason,
        },
      }),
    );

    if (adjustConsumableStockThunk.fulfilled.match(action)) {
      setIsAdjustSheetVisible(false);
    }
  };

  const handleSaveUnitConversions = async (items: ConsumableUnitConversionRequestItem[]) => {
    if (!id) {
      return;
    }

    const action = await dispatch(saveUnitConversionsThunk({ id, payload: { unit_conversions: items } }));

    if (saveUnitConversionsThunk.fulfilled.match(action)) {
      setIsUnitConversionsSheetVisible(false);
    }
  };

  const header = (
    <View style={styles.header}>
      <TouchableOpacity
        hitSlop={12}
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/consumables" as Href))}
        style={styles.iconButton}
      >
        <Ionicons name="chevron-back" size={19} color={Colors.primary} />
      </TouchableOpacity>
      <Text numberOfLines={1} style={styles.title}>
        {consumable?.name ?? "Consumable"}
      </Text>
      <TouchableOpacity
        accessibilityLabel="Usage history"
        onPress={() =>
          router.push({ params: { productId: id }, pathname: "/consumables/usage-history" } as unknown as Href)
        }
        style={styles.iconButton}
      >
        <Ionicons name="time-outline" size={19} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );

  if (!canView) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <AppStatusBar />
        {header}
        <ErrorState message="You don't have permission to view this consumable." onRetry={() => router.back()} />
      </SafeAreaView>
    );
  }

  if (state.detailsLoading && !consumable) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <AppStatusBar />
        {header}
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (state.detailsError && !consumable) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <AppStatusBar />
        {header}
        <ErrorState message={state.detailsError} onRetry={() => id && void dispatch(fetchConsumableByIdThunk(id))} />
      </SafeAreaView>
    );
  }

  if (!consumable) {
    return null;
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />
      {header}

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="flask-outline" size={26} color={Colors.primaryDark} />
          </View>
          <Text style={styles.heroName}>{consumable.name}</Text>
          <Text style={styles.heroMeta}>
            {[consumable.brandName, consumable.categoryName, consumable.productType].filter(Boolean).join("  |  ") ||
              "Uncategorized"}
          </Text>
          <View style={styles.stockRow}>
            <Text style={[styles.stockValue, (lowStock || outOfStock) && styles.warningText]}>
              {consumable.amount} {consumable.measureUnit ?? ""}
            </Text>
            {outOfStock ? (
              <View style={[styles.stockBadge, styles.errorBadge]}>
                <Text style={styles.errorBadgeText}>Out of stock</Text>
              </View>
            ) : lowStock ? (
              <View style={[styles.stockBadge, styles.warningBadge]}>
                <Text style={styles.warningBadgeText}>Low stock</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.thresholdText}>Low-stock alert at {consumable.qtyAlert} {consumable.measureUnit ?? ""}</Text>

          {canAdjust ? (
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => setIsAdjustSheetVisible(true)}
              style={styles.adjustButton}
            >
              <Ionicons name="swap-vertical-outline" size={16} color="#FFFFFF" />
              <Text style={styles.adjustButtonText}>Adjust Stock</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Product Details</Text>
          <InfoRow label="Product type" value={consumable.productType ?? "—"} />
          <InfoRow label="Measure unit" value={consumable.measureUnit ?? "—"} />
          <InfoRow label="Bottle size" value={consumable.bottleSize != null ? String(consumable.bottleSize) : "—"} />
          <InfoRow label="Supplier" value={consumable.supplierName ?? "—"} />
          <InfoRow label="Supply price" value={consumable.supplyPrice != null ? money(consumable.supplyPrice) : "—"} />
          <InfoRow label="Retail price" value={consumable.retailPrice != null ? money(consumable.retailPrice) : "—"} />
          <InfoRow
            label="Markup"
            value={consumable.markupPercentage != null ? `${consumable.markupPercentage}%` : "—"}
          />
          <InfoRow label="Status" value={consumable.isActive ? "Active" : "Inactive"} />
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Assigned Services</Text>
          </View>
          {state.assignedServicesLoading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : state.assignedServicesError ? (
            <Text style={styles.errorInlineText}>{state.assignedServicesError}</Text>
          ) : state.assignedServices.length === 0 ? (
            <Text style={styles.emptySectionText}>No services currently use this consumable.</Text>
          ) : (
            state.assignedServices.map((service) => (
              <View key={service.serviceId} style={styles.listRow}>
                <Text numberOfLines={1} style={styles.listRowTitle}>
                  {service.serviceName}
                </Text>
                <Text style={styles.listRowValue}>
                  {service.qty} {service.unit}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Unit Conversions</Text>
            {canAdjust ? (
              <TouchableOpacity onPress={() => setIsUnitConversionsSheetVisible(true)}>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {state.unitConversionsLoading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : state.unitConversionsError ? (
            <Text style={styles.errorInlineText}>{state.unitConversionsError}</Text>
          ) : state.unitConversions.length === 0 ? (
            <Text style={styles.emptySectionText}>No unit conversions configured for this consumable.</Text>
          ) : (
            state.unitConversions.map((conversion) => (
              <View key={conversion.unitName} style={styles.listRow}>
                <Text numberOfLines={1} style={styles.listRowTitle}>
                  {conversion.unitName}
                </Text>
                <Text style={styles.listRowValue}>
                  1 {conversion.unitName} = {conversion.conversionToBase} {consumable.measureUnit ?? ""}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <AdjustStockSheet
        consumable={consumable}
        error={state.adjustError}
        onClose={() => {
          setIsAdjustSheetVisible(false);
          dispatch(clearAdjustError());
        }}
        onSubmit={(value) => void handleAdjustSubmit(value)}
        submitting={state.adjusting}
        visible={isAdjustSheetVisible}
      />

      <UnitConversionsSheet
        baseUnit={consumable.measureUnit}
        conversions={state.unitConversions}
        error={state.unitConversionsSaveError}
        loading={state.unitConversionsLoading}
        onClose={() => {
          setIsUnitConversionsSheetVisible(false);
          dispatch(clearUnitConversionsSaveError());
        }}
        onSave={(items) => void handleSaveUnitConversions(items)}
        saving={state.unitConversionsSaving}
        visible={isUnitConversionsSheetVisible}
      />
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: { backgroundColor: Colors.bg, flex: 1 },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
    },
    iconButton: {
      alignItems: "center",
      backgroundColor: Colors.card,
      borderColor: Colors.border,
      borderRadius: AppRadius.control,
      borderWidth: 1,
      height: AppLayout.headerActionSize,
      justifyContent: "center",
      width: AppLayout.headerActionSize,
    },
    title: { color: Colors.heading, flex: 1, fontSize: 18, fontWeight: "800", marginHorizontal: Spacing.sm, textAlign: "center" },
    loadingWrap: { alignItems: "center", flex: 1, justifyContent: "center" },
    content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
    heroCard: {
      alignItems: "center",
      backgroundColor: Colors.card,
      borderColor: Colors.border,
      borderRadius: AppRadius.card,
      borderWidth: 1,
      marginBottom: Spacing.md,
      padding: Spacing.lg,
    },
    heroIcon: {
      alignItems: "center",
      backgroundColor: Colors.bg2,
      borderRadius: Radius.full,
      height: 58,
      justifyContent: "center",
      marginBottom: Spacing.sm,
      width: 58,
    },
    heroName: { color: Colors.heading, fontSize: 18, fontWeight: "800", textAlign: "center" },
    heroMeta: { color: Colors.text2, fontSize: 12, marginTop: 4, textAlign: "center" },
    stockRow: { alignItems: "center", flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.md },
    stockValue: { color: Colors.heading, fontSize: 22, fontWeight: "800" },
    warningText: { color: Colors.warning },
    stockBadge: { borderRadius: AppRadius.pill, paddingHorizontal: 10, paddingVertical: 4 },
    warningBadge: { backgroundColor: Colors.warningBg },
    warningBadgeText: { color: Colors.warning, fontSize: 10, fontWeight: "800" },
    errorBadge: { backgroundColor: Colors.errorBg },
    errorBadgeText: { color: Colors.error, fontSize: 10, fontWeight: "800" },
    thresholdText: { color: Colors.text2, fontSize: 11, marginTop: 4 },
    adjustButton: {
      alignItems: "center",
      backgroundColor: Colors.primaryDark,
      borderRadius: AppRadius.pill,
      flexDirection: "row",
      gap: Spacing.sm,
      justifyContent: "center",
      marginTop: Spacing.lg,
      paddingHorizontal: 22,
      paddingVertical: 12,
    },
    adjustButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
    card: {
      backgroundColor: Colors.card,
      borderColor: Colors.border,
      borderRadius: AppRadius.card,
      borderWidth: 1,
      marginBottom: Spacing.md,
      padding: Spacing.lg,
    },
    sectionHeaderRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.sm },
    sectionTitle: { color: Colors.heading, fontSize: 14, fontWeight: "800", marginBottom: Spacing.sm },
    editLink: { color: Colors.primaryDark, fontSize: 12, fontWeight: "800" },
    infoRow: {
      alignItems: "center",
      borderTopColor: Colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 10,
    },
    infoLabel: { color: Colors.text2, fontSize: 12, fontWeight: "600" },
    infoValue: { color: Colors.heading, flex: 1, fontSize: 12, fontWeight: "700", marginLeft: Spacing.md, textAlign: "right" },
    listRow: {
      alignItems: "center",
      borderTopColor: Colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 10,
    },
    listRowTitle: { color: Colors.heading, flex: 1, fontSize: 13, fontWeight: "700" },
    listRowValue: { color: Colors.text2, fontSize: 12, fontWeight: "700", marginLeft: Spacing.md },
    emptySectionText: { color: Colors.text2, fontSize: 12 },
    errorInlineText: { color: Colors.error, fontSize: 12, fontWeight: "700" },
  });
