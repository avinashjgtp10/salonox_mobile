import { Text } from "@/components/ui/AppTypography";
import { SearchableFilterDropdown } from "@/components/ui/SearchableFilterDropdown";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";
import {
  CONSUMABLE_PRODUCT_TYPE_OPTIONS,
  CONSUMABLE_STATUS_OPTIONS,
  CONSUMABLE_UNIT_OPTIONS,
  DURATION_RANGE_OPTIONS,
  emptyCatalogFilterForTab,
  MEMBERSHIP_APPLIES_TO_OPTIONS,
  MEMBERSHIP_PRICING_TYPE_OPTIONS,
  ONLINE_BOOKING_OPTIONS,
  PACKAGE_STATUS_OPTIONS,
  PRODUCT_STOCK_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  type CatalogFilterOption,
  type CatalogFilterValue,
  type CatalogTab,
  type ConsumableCatalogFilters,
  type MembershipCatalogFilters,
  type PackageCatalogFilters,
  type ProductCatalogFilters,
  type ServiceCatalogFilters,
} from "../utils/catalogFilters";

type Props = {
  brands: string[];
  categories: string[];
  label: string;
  onApply: (value: CatalogFilterValue) => void;
  onClose: () => void;
  onReset: () => void;
  serviceOptions: string[];
  suppliers: string[];
  tab: CatalogTab;
  validForOptions: string[];
  value: CatalogFilterValue;
  visible: boolean;
};

const toggleInList = (items: string[], item: string) =>
  items.includes(item) ? items.filter((value) => value !== item) : [...items, item];

/** Tapping a selected single-select option clears it back to "All". */
const toggleSingle = (current: string, item: string) => (current === item ? "" : item);

export function CatalogFilterSheet({ brands, categories, label, onApply, onClose, onReset, serviceOptions, suppliers, tab, validForOptions, value, visible }: Props) {
  const insets = useSafeAreaInsets();
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [draft, setDraft] = useState(value);
  const [isPresented, setIsPresented] = useState(visible);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setDraft(value);
      setIsPresented(true);
      progress.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    } else if (isPresented) {
      progress.value = withTiming(0, { duration: 160, easing: Easing.in(Easing.cubic) });
      const timer = setTimeout(() => setIsPresented(false), 160);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, visible]);

  const popupStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.92 + progress.value * 0.08 }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const handleReset = () => {
    const empty = emptyCatalogFilterForTab(tab);
    setDraft(empty);
    onReset();
    onClose();
  };

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  if (!isPresented) {
    return null;
  }

  return (
    <Modal animationType="none" onRequestClose={onClose} transparent visible={isPresented}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} pointerEvents="box-none" style={[styles.centerWrap, { paddingTop: Math.max(24, insets.top), paddingBottom: Math.max(24, insets.bottom) }]}>
          <Animated.View style={[styles.popup, popupStyle]}>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>{`Filter ${label}`}</Text>
                <Text style={styles.subtitle}>{`Combine filters to narrow your ${label.toLowerCase()}.`}</Text>
              </View>
              <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={18} color={Colors.primaryText} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" style={styles.body} contentContainerStyle={styles.bodyContent}>
              {tab === "services" ? (
                <ServiceFilterFields
                  categories={categories}
                  Colors={Colors}
                  draft={draft as ServiceCatalogFilters}
                  setDraft={setDraft as (updater: (current: ServiceCatalogFilters) => ServiceCatalogFilters) => void}
                  styles={styles}
                />
              ) : null}
              {tab === "products" ? (
                <ProductFilterFields
                  Colors={Colors}
                  brands={brands}
                  categories={categories}
                  draft={draft as ProductCatalogFilters}
                  setDraft={setDraft as (updater: (current: ProductCatalogFilters) => ProductCatalogFilters) => void}
                  styles={styles}
                />
              ) : null}
              {tab === "packages" ? (
                <PackageFilterFields
                  Colors={Colors}
                  categories={categories}
                  draft={draft as PackageCatalogFilters}
                  setDraft={setDraft as (updater: (current: PackageCatalogFilters) => PackageCatalogFilters) => void}
                  styles={styles}
                />
              ) : null}
              {tab === "memberships" ? (
                <MembershipFilterFields
                  Colors={Colors}
                  draft={draft as MembershipCatalogFilters}
                  setDraft={setDraft as (updater: (current: MembershipCatalogFilters) => MembershipCatalogFilters) => void}
                  styles={styles}
                  validForOptions={validForOptions}
                />
              ) : null}
              {tab === "consumables" ? (
                <ConsumableFilterFields
                  Colors={Colors}
                  brands={brands}
                  categories={categories}
                  draft={draft as ConsumableCatalogFilters}
                  serviceOptions={serviceOptions}
                  setDraft={setDraft as (updater: (current: ConsumableCatalogFilters) => ConsumableCatalogFilters) => void}
                  styles={styles}
                  suppliers={suppliers}
                />
              ) : null}
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity accessibilityRole="button" activeOpacity={0.84} onPress={handleReset} style={styles.resetButton}>
                <Text style={styles.resetText}>Clear / Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" activeOpacity={0.84} onPress={handleApply} style={styles.applyButton}>
                <Text style={styles.applyText}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

type FieldStyles = ReturnType<typeof createStyles>;

function ChipGroup({
  onToggle,
  options,
  selected,
  styles,
}: {
  onToggle: (id: string) => void;
  options: CatalogFilterOption[];
  selected: string[];
  styles: FieldStyles;
}) {
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const isSelected = selected.includes(option.id);
        return (
          <TouchableOpacity
            key={option.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            activeOpacity={0.84}
            onPress={() => onToggle(option.id)}
            style={[styles.chip, isSelected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}


function OptionDropdown({ Colors: _colors, styles: _styles, ...props }: Parameters<typeof SearchableFilterDropdown>[0] & { Colors: ThemeColors; styles: FieldStyles }) {
  return <SearchableFilterDropdown {...props} />;
}

function FieldLabel({ children, styles }: { children: string; styles: FieldStyles }) {
  return <Text style={styles.title}>{children}</Text>;
}

function ServiceFilterFields({
  categories,
  Colors,
  draft,
  setDraft,
  styles,
}: {
  categories: string[];
  Colors: ThemeColors;
  draft: ServiceCatalogFilters;
  setDraft: (updater: (current: ServiceCatalogFilters) => ServiceCatalogFilters) => void;
  styles: FieldStyles;
}) {
  return (
    <>
      <FieldLabel styles={styles}>Category</FieldLabel>
      <OptionDropdown Colors={Colors} multi onToggle={(id) => setDraft((current) => ({ ...current, category: toggleInList(current.category, id) }))} options={categories} placeholder="All categories" selected={draft.category} styles={styles} />
      <FieldLabel styles={styles}>Duration</FieldLabel>
      <ChipGroup
        onToggle={(id) => setDraft((current) => ({ ...current, durationRange: toggleInList(current.durationRange, id) }))}
        options={DURATION_RANGE_OPTIONS}
        selected={draft.durationRange}
        styles={styles}
      />
      <Text style={styles.hint}>Select one or more. None selected means all durations.</Text>

      <FieldLabel styles={styles}>Online booking</FieldLabel>
      <ChipGroup
        onToggle={(id) => setDraft((current) => ({ ...current, onlineBooking: toggleInList(current.onlineBooking, id) }))}
        options={ONLINE_BOOKING_OPTIONS}
        selected={draft.onlineBooking}
        styles={styles}
      />
      <Text style={styles.hint}>Pick one side to narrow; picking both is the same as no filter.</Text>
    </>
  );
}

function ProductFilterFields({
  Colors,
  brands,
  categories,
  draft,
  setDraft,
  styles,
}: {
  Colors: ThemeColors;
  brands: string[];
  categories: string[];
  draft: ProductCatalogFilters;
  setDraft: (updater: (current: ProductCatalogFilters) => ProductCatalogFilters) => void;
  styles: FieldStyles;
}) {
  return (
    <>
      <FieldLabel styles={styles}>Category</FieldLabel>
      <OptionDropdown
        Colors={Colors}
        multi={false}
        onToggle={(id) => setDraft((current) => ({ ...current, category: toggleSingle(current.category, id) }))}
        options={categories}
        placeholder="All categories"
        selected={draft.category ? [draft.category] : []}
        styles={styles}
      />

      <FieldLabel styles={styles}>Brand</FieldLabel>
      <OptionDropdown
        Colors={Colors}
        multi={false}
        onToggle={(id) => setDraft((current) => ({ ...current, brand: toggleSingle(current.brand, id) }))}
        options={brands}
        placeholder="All brands"
        selected={draft.brand ? [draft.brand] : []}
        styles={styles}
      />

      <FieldLabel styles={styles}>Stock</FieldLabel>
      <ChipGroup
        onToggle={(id) => setDraft((current) => ({ ...current, stock: toggleSingle(current.stock, id) }))}
        options={PRODUCT_STOCK_OPTIONS}
        selected={draft.stock ? [draft.stock] : []}
        styles={styles}
      />

      <FieldLabel styles={styles}>Product type</FieldLabel>
      <ChipGroup
        onToggle={(id) => setDraft((current) => ({ ...current, productType: toggleSingle(current.productType, id) }))}
        options={PRODUCT_TYPE_OPTIONS}
        selected={draft.productType ? [draft.productType] : []}
        styles={styles}
      />
    </>
  );
}

function PackageFilterFields({
  Colors,
  categories,
  draft,
  setDraft,
  styles,
}: {
  Colors: ThemeColors;
  categories: string[];
  draft: PackageCatalogFilters;
  setDraft: (updater: (current: PackageCatalogFilters) => PackageCatalogFilters) => void;
  styles: FieldStyles;
}) {
  return (
    <>
      <FieldLabel styles={styles}>Category</FieldLabel>
      <OptionDropdown
        Colors={Colors}
        multi={false}
        onToggle={(id) => setDraft((current) => ({ ...current, category: toggleSingle(current.category, id) }))}
        options={categories}
        placeholder="All categories"
        selected={draft.category ? [draft.category] : []}
        styles={styles}
      />

      <FieldLabel styles={styles}>Status</FieldLabel>
      <ChipGroup
        onToggle={(id) => setDraft((current) => ({ ...current, status: toggleSingle(current.status, id) }))}
        options={PACKAGE_STATUS_OPTIONS}
        selected={draft.status ? [draft.status] : []}
        styles={styles}
      />
    </>
  );
}

function MembershipFilterFields({
  Colors,
  draft,
  setDraft,
  styles,
  validForOptions,
}: {
  Colors: ThemeColors;
  draft: MembershipCatalogFilters;
  setDraft: (updater: (current: MembershipCatalogFilters) => MembershipCatalogFilters) => void;
  styles: FieldStyles;
  validForOptions: string[];
}) {
  return (
    <>
      <FieldLabel styles={styles}>Membership Type</FieldLabel>
      <ChipGroup
        onToggle={(id) => setDraft((current) => ({ ...current, pricingType: toggleInList(current.pricingType, id) }))}
        options={MEMBERSHIP_PRICING_TYPE_OPTIONS}
        selected={draft.pricingType}
        styles={styles}
      />

      <FieldLabel styles={styles}>Applies To</FieldLabel>
      <ChipGroup
        onToggle={(id) => setDraft((current) => ({ ...current, appliesTo: toggleInList(current.appliesTo, id) }))}
        options={MEMBERSHIP_APPLIES_TO_OPTIONS}
        selected={draft.appliesTo}
        styles={styles}
      />

      <FieldLabel styles={styles}>Expiry</FieldLabel>
      <OptionDropdown
        Colors={Colors}
        multi
        onToggle={(id) => setDraft((current) => ({ ...current, validFor: toggleInList(current.validFor, id) }))}
        options={validForOptions}
        placeholder="All durations"
        selected={draft.validFor}
        styles={styles}
      />
    </>
  );
}

function ConsumableFilterFields({
  Colors,
  brands,
  categories,
  draft,
  serviceOptions,
  setDraft,
  styles,
  suppliers,
}: {
  Colors: ThemeColors;
  brands: string[];
  categories: string[];
  draft: ConsumableCatalogFilters;
  serviceOptions: string[];
  setDraft: (updater: (current: ConsumableCatalogFilters) => ConsumableCatalogFilters) => void;
  styles: FieldStyles;
  suppliers: string[];
}) {
  return (
    <>
      <FieldLabel styles={styles}>Category</FieldLabel>
      <OptionDropdown
        Colors={Colors}
        multi
        onToggle={(id) => setDraft((current) => ({ ...current, category: toggleInList(current.category, id) }))}
        options={categories}
        placeholder="All categories"
        selected={draft.category}
        styles={styles}
      />

      <FieldLabel styles={styles}>Brand</FieldLabel>
      <OptionDropdown
        Colors={Colors}
        multi
        onToggle={(id) => setDraft((current) => ({ ...current, brand: toggleInList(current.brand, id) }))}
        options={brands}
        placeholder="All brands"
        selected={draft.brand}
        styles={styles}
      />

      <FieldLabel styles={styles}>Supplier</FieldLabel>
      <OptionDropdown
        Colors={Colors}
        multi
        onToggle={(id) => setDraft((current) => ({ ...current, supplier: toggleInList(current.supplier, id) }))}
        options={suppliers}
        placeholder="All suppliers"
        selected={draft.supplier}
        styles={styles}
      />

      <FieldLabel styles={styles}>Assigned Service</FieldLabel>
      <OptionDropdown
        Colors={Colors}
        multi
        onToggle={(id) => setDraft((current) => ({ ...current, service: toggleInList(current.service, id) }))}
        options={serviceOptions}
        placeholder="All services"
        selected={draft.service}
        styles={styles}
      />

      <FieldLabel styles={styles}>Stock Status</FieldLabel>
      <ChipGroup
        onToggle={(id) => setDraft((current) => ({ ...current, status: toggleInList(current.status, id) }))}
        options={CONSUMABLE_STATUS_OPTIONS}
        selected={draft.status}
        styles={styles}
      />

      <FieldLabel styles={styles}>Base Unit</FieldLabel>
      <ChipGroup
        onToggle={(id) => setDraft((current) => ({ ...current, unit: toggleInList(current.unit, id) }))}
        options={CONSUMABLE_UNIT_OPTIONS}
        selected={draft.unit}
        styles={styles}
      />

      <FieldLabel styles={styles}>Product Type</FieldLabel>
      <ChipGroup
        onToggle={(id) => setDraft((current) => ({ ...current, productType: toggleInList(current.productType, id) }))}
        options={CONSUMABLE_PRODUCT_TYPE_OPTIONS}
        selected={draft.productType}
        styles={styles}
      />
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1 },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(20, 18, 16, 0.46)" },
    centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, paddingVertical: 24 },
    popup: {
      backgroundColor: colors.card,
      borderRadius: Radius.lg,
      maxHeight: "86%",
      maxWidth: 480,
      width: "100%",
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.18,
      shadowRadius: 28,
      elevation: 16,
    },
    header: { alignItems: "flex-start", flexDirection: "row", gap: 12, justifyContent: "space-between", padding: Spacing.lg, paddingBottom: Spacing.sm },
    headerCopy: { flex: 1 },
    closeButton: { alignItems: "center", backgroundColor: colors.backgroundElement, borderRadius: AppRadius.control, height: 36, justifyContent: "center", width: 36 },
    body: { paddingHorizontal: Spacing.lg, flexShrink: 1 },
    bodyContent: { paddingBottom: Spacing.md },
    title: { color: colors.heading, fontSize: 12, fontWeight: "800", marginTop: Spacing.md, marginBottom: Spacing.sm },
    subtitle: { color: colors.text2, fontSize: 12, lineHeight: 18, marginTop: 4 },
    hint: { color: colors.text2, fontSize: 12, marginBottom: Spacing.sm },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
    chip: { backgroundColor: colors.bg2, borderColor: colors.border, borderWidth: 1, borderRadius: AppRadius.pill, paddingHorizontal: 13, paddingVertical: 8 },
    chipSelected: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
    chipText: { color: colors.text2, fontSize: 12, fontWeight: "700" },
    chipTextSelected: { color: colors.onPrimary },
    footer: { flexDirection: "row", gap: 10, padding: Spacing.lg, paddingTop: Spacing.md },
    resetButton: { flex: 1, alignItems: "center", justifyContent: "center", borderColor: colors.border, borderWidth: 1, borderRadius: Radius.md, backgroundColor: colors.bg2, paddingVertical: 13 },
    applyButton: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: colors.primaryDark, paddingVertical: 13 },
    resetText: { color: colors.heading, fontSize: 13, fontWeight: "800" },
    applyText: { color: colors.onPrimary, fontSize: 13, fontWeight: "800" },
  });
