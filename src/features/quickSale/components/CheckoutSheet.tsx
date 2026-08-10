import { Ionicons } from "@expo/vector-icons";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Easing,
  KeyboardAvoidingView,
  LayoutAnimation,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Portal } from "@/components/ui/Portal";
import { AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { StaffPickerSheet } from "@/features/quickSale/components/StaffPickerSheet";
import type { QuickSaleClient, CartItem } from "@/features/quickSale/types";
import { getCartItemBillableQuantity, type BillTotals } from "@/features/quickSale/utils/calculations";
import { getPackageCoveredQuantity } from "@/features/quickSale/utils/packageCoverage";
import { formatCurrency, parseAmount } from "@/features/quickSale/utils/money";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ValidateCouponResult } from "@/types/coupon";
import type { CheckoutSaleSplitEntry, PosStaffMember, SalePaymentMethod } from "@/types/sales";

const CHECKOUT_ANIMATION_MS = 250;

const PAYMENT_METHODS: { icon: keyof typeof Ionicons.glyphMap; label: string; value: SalePaymentMethod }[] = [
  { icon: "cash-outline", label: "Cash", value: "cash" },
  { icon: "card-outline", label: "Card", value: "card" },
  { icon: "phone-portrait-outline", label: "UPI", value: "upi" },
  { icon: "git-branch-outline", label: "Split", value: "split" },
];

const SPLIT_METHODS = PAYMENT_METHODS.filter((method) => method.value !== "split");
type CheckoutStep = "review" | "charges" | "payment";
type DiscountMode = "amount" | "percent";

type ExtraChargeKey = "convenienceFee" | "otherCharges" | "serviceCharge";

type CheckoutSheetProps = {
  appliedCoupon: ValidateCouponResult | null;
  couponCode: string;
  couponError: string | null;
  extraCharges: Record<ExtraChargeKey, string>;
  gstPreviewAmount: number;
  hasItems: boolean;
  includeGst: boolean;
  initialStep: CheckoutStep;
  initialStaffValidationAttempted?: boolean;
  isApplyingCoupon: boolean;
  isCheckingOut: boolean;
  isSaving: boolean;
  isSuccess: boolean;
  items: CartItem[];
  onAddMore: () => void;
  onApplyCoupon: () => void;
  onAssignStaff: (lineId: string, staffId: string | null, staffName: string | null) => void;
  onChangeCouponCode: (value: string) => void;
  onChangeCustomer: () => void;
  onChangeExtraCharge: (key: ExtraChargeKey, value: string) => void;
  onChangeOverallDiscount: (
    value: string,
    type: "flat" | "percentage",
    percentage: number,
  ) => void;
  onChangeTip: (value: string) => void;
  onClose: () => void;
  onCompleteSale: (payment: { method: SalePaymentMethod; splitEntries?: CheckoutSaleSplitEntry[] }) => void;
  onRemoveCoupon: () => void;
  onRemoveItem: (lineId: string) => void;
  onSavePending: () => void;
  onSetQuantity: (lineId: string, quantity: number) => void;
  onToggleIncludeGst: () => void;
  overallDiscountInput: string;
  overallDiscountPercent: number;
  overallDiscountType: "flat" | "percentage";
  productStockErrors: Record<string, string>;
  selectedClient: QuickSaleClient;
  staffOptions: PosStaffMember[];
  submitError: string | null;
  tipInput: string;
  totals: BillTotals;
  visible: boolean;
};

function CheckoutSheetComponent({
  appliedCoupon,
  couponCode,
  couponError,
  extraCharges,
  gstPreviewAmount,
  hasItems,
  includeGst,
  initialStep,
  initialStaffValidationAttempted = false,
  isApplyingCoupon,
  isCheckingOut,
  isSaving,
  isSuccess,
  items,
  onAddMore,
  onApplyCoupon,
  onAssignStaff,
  onChangeCouponCode,
  onChangeCustomer,
  onChangeExtraCharge,
  onChangeOverallDiscount,
  onChangeTip,
  onClose,
  onCompleteSale,
  onRemoveCoupon,
  onRemoveItem,
  onSavePending,
  onSetQuantity,
  onToggleIncludeGst,
  overallDiscountInput,
  overallDiscountPercent,
  overallDiscountType,
  productStockErrors,
  selectedClient,
  staffOptions,
  submitError,
  tipInput,
  totals,
  visible,
}: CheckoutSheetProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(height)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [isMounted, setIsMounted] = useState(visible);
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>("cash");
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({});
  const [amountReceivedInput, setAmountReceivedInput] = useState("");
  const [discountMode, setDiscountMode] = useState<DiscountMode>(
    overallDiscountType === "percentage" ? "percent" : "amount",
  );
  const [discountDraft, setDiscountDraft] = useState(
    overallDiscountType === "percentage" ? String(overallDiscountPercent || "") : overallDiscountInput,
  );
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(initialStep);
  const [customTipVisible, setCustomTipVisible] = useState(Boolean(tipInput));
  const [staffPickerLineId, setStaffPickerLineId] = useState<string | null>(null);
  const [staffValidationAttempted, setStaffValidationAttempted] = useState(false);

  const resetCheckoutState = useCallback(() => {
    setPaymentMethod("cash");
    setSplitAmounts({});
    setAmountReceivedInput("");
    setDiscountMode(overallDiscountType === "percentage" ? "percent" : "amount");
    setDiscountDraft(
      overallDiscountType === "percentage"
        ? String(overallDiscountPercent || "")
        : overallDiscountInput,
    );
    setCheckoutStep(initialStep);
    setCustomTipVisible(Boolean(tipInput));
    setStaffPickerLineId(null);
    setStaffValidationAttempted(initialStaffValidationAttempted);
  }, [
    initialStep,
    initialStaffValidationAttempted,
    overallDiscountInput,
    overallDiscountPercent,
    overallDiscountType,
    tipInput,
  ]);

  useEffect(() => {
    if (discountMode === "amount") {
      setDiscountDraft(overallDiscountInput);
    }
  }, [discountMode, overallDiscountInput]);

  useEffect(() => {
    if (Platform.OS === "android") {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  const runOpen = () => {
    translateY.setValue(height);
    backdropOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        duration: CHECKOUT_ANIMATION_MS,
        easing: Easing.inOut(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        duration: CHECKOUT_ANIMATION_MS,
        easing: Easing.inOut(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const runClose = (afterClose?: () => void) => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        duration: CHECKOUT_ANIMATION_MS,
        easing: Easing.inOut(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        duration: CHECKOUT_ANIMATION_MS,
        easing: Easing.inOut(Easing.cubic),
        toValue: height,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
        afterClose?.();
      }
    });
  };

  useEffect(() => {
    if (visible) {
      resetCheckoutState();
      setIsMounted(true);
      requestAnimationFrame(runOpen);
      return;
    }

    if (isMounted) {
      runClose();
    }
    // Intentionally depends on `visible` only; height changes are handled by
    // the transform's next open cycle and should not restart the animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialStep]);

  useEffect(() => {
    if (!isMounted) {
      return undefined;
    }

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      requestClose();
      return true;
    });

    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, isCheckingOut, isSaving, isSuccess]);

  const requestClose = () => {
    if (isCheckingOut || isSaving || isSuccess) {
      return;
    }

    runClose(onClose);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8 && gesture.dy > 0,
        onPanResponderMove: (_, gesture) => {
          const nextTranslateY = Math.max(0, gesture.dy);
          translateY.setValue(nextTranslateY);
          backdropOpacity.setValue(Math.max(0.35, 1 - nextTranslateY / height));
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 90 || gesture.vy > 0.8) {
            requestClose();
            return;
          }

          Animated.parallel([
            Animated.timing(backdropOpacity, {
              duration: CHECKOUT_ANIMATION_MS,
              easing: Easing.inOut(Easing.cubic),
              toValue: 1,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              duration: CHECKOUT_ANIMATION_MS,
              easing: Easing.inOut(Easing.cubic),
              toValue: 0,
              useNativeDriver: true,
            }),
          ]).start();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [backdropOpacity, height, isCheckingOut, isSaving, translateY],
  );

  const splitEntries = useMemo<CheckoutSaleSplitEntry[]>(
    () =>
      SPLIT_METHODS.map((method) => ({
        amount: parseAmount(splitAmounts[method.value] ?? ""),
        method: method.value as CheckoutSaleSplitEntry["method"],
      })).filter((entry) => entry.amount > 0),
    [splitAmounts],
  );

  const splitTotal = splitEntries.reduce((total, entry) => total + entry.amount, 0);
  const splitMismatch = paymentMethod === "split" && Math.round(splitTotal * 100) !== Math.round(totals.grandTotal * 100);
  const amountReceived = parseAmount(amountReceivedInput);
  const changeDue = paymentMethod === "cash" ? Math.max(0, amountReceived - totals.grandTotal) : 0;
  const cashInsufficient = paymentMethod === "cash" && amountReceived < totals.grandTotal;
  const discountValue = parseAmount(discountDraft);
  const invalidDiscountPercentage = discountMode === "percent" && discountValue > 100;
  const discountExceedsSubtotal = totals.overallDiscount + totals.couponDiscount > totals.subtotal + 0.005;
  const customTipInvalid = customTipVisible && tipInput.trim().length === 0;
  const chargesInvalid = discountExceedsSubtotal || invalidDiscountPercentage || customTipInvalid;
  const isBusy = isSaving || isCheckingOut || isApplyingCoupon || isSuccess;
  const missingStaffCount = useMemo(
    () => items.filter((item) => item.itemType === "service" && !item.staffId).length,
    [items],
  );
  const missingStaffServiceNames = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .filter((item) => item.itemType === "service" && !item.staffId)
            .map((item) => item.name.trim())
            .filter(Boolean),
        ),
      ),
    [items],
  );
  const hasMissingStaff = missingStaffCount > 0;
  const showStaffValidation = staffValidationAttempted && hasMissingStaff;
  const activeStaffItem = useMemo(
    () => (staffPickerLineId ? items.find((item) => item.lineId === staffPickerLineId) ?? null : null),
    [items, staffPickerLineId],
  );
  const canCompleteSale =
    hasItems &&
    !chargesInvalid &&
    (paymentMethod === "split"
      ? splitEntries.length > 0 && !splitMismatch
      : paymentMethod === "cash"
        ? !cashInsufficient
        : totals.grandTotal >= 0);

  const groupedItems = useMemo(
    () => [
      { data: items.filter((item) => item.itemType === "service"), key: "service", title: "Services" },
      { data: items.filter((item) => item.itemType === "package"), key: "package", title: "Packages" },
      { data: items.filter((item) => item.itemType === "product"), key: "product", title: "Products" },
      { data: items.filter((item) => item.itemType === "membership"), key: "membership", title: "Memberships" },
      { data: items.filter((item) => item.itemType === "quick"), key: "quick", title: "Other" },
    ].filter((group) => group.data.length > 0),
    [items],
  );

  const handleDiscountChange = (value: string) => {
    setDiscountDraft(value);

    if (discountMode === "percent") {
      const percent = Math.min(100, parseAmount(value));
      onChangeOverallDiscount(
        String(Math.round(totals.subtotal * percent) / 100),
        "percentage",
        percent,
      );
      return;
    }

    onChangeOverallDiscount(value, "flat", 0);
  };

  const handleDiscountModeChange = (mode: "amount" | "percent") => {
    setDiscountMode(mode);

    if (mode === "percent") {
      const percent = totals.subtotal > 0 ? (parseAmount(overallDiscountInput) / totals.subtotal) * 100 : 0;
      setDiscountDraft(percent ? String(Math.round(percent * 100) / 100) : "");
      onChangeOverallDiscount(overallDiscountInput, "percentage", percent);
      return;
    }

    setDiscountDraft(overallDiscountInput);
    onChangeOverallDiscount(overallDiscountInput, "flat", 0);
  };

  const handleComplete = () => {
    if (isBusy || !canCompleteSale) {
      return;
    }

    if (hasMissingStaff) {
      setStaffValidationAttempted(true);
      setCheckoutStep("review");
      return;
    }

    if (paymentMethod === "split") {
      onCompleteSale({ method: paymentMethod, splitEntries });
      return;
    }

    onCompleteSale({ method: paymentMethod });
  };

  const handleContinueToPayment = () => {
    if (!hasItems || chargesInvalid) {
      return;
    }

    if (hasMissingStaff) {
      setStaffValidationAttempted(true);
      setCheckoutStep("review");
      return;
    }

    setCheckoutStep("payment");
  };

  const handleContinueToCharges = () => {
    if (!hasItems) {
      return;
    }

    if (hasMissingStaff) {
      setStaffValidationAttempted(true);
      return;
    }

    setCheckoutStep("charges");
  };

  useEffect(() => {
    if (staffValidationAttempted && !hasMissingStaff) {
      setStaffValidationAttempted(false);
    }
  }, [hasMissingStaff, staffValidationAttempted]);

  const animateItemLayout = () => {
    LayoutAnimation.configureNext({
      duration: 150,
      create: { property: LayoutAnimation.Properties.opacity, type: LayoutAnimation.Types.easeInEaseOut },
      delete: { property: LayoutAnimation.Properties.opacity, type: LayoutAnimation.Types.easeInEaseOut },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
    });
  };

  const handleIncreaseQuantity = (item: CartItem) => {
    animateItemLayout();
    onSetQuantity(item.lineId, item.quantity + 1);
  };

  const handleDecreaseQuantity = (item: CartItem) => {
    animateItemLayout();

    if (item.quantity <= 1) {
      onRemoveItem(item.lineId);
      return;
    }

    onSetQuantity(item.lineId, item.quantity - 1);
  };

  if (!isMounted) {
    return null;
  }

  return (
    <>
      <Portal>
        <View style={styles.modalRoot}>
        <Animated.View pointerEvents="none" style={[styles.backdrop, { opacity: backdropOpacity }]} />
        <Pressable accessibilityLabel="Close checkout" onPress={requestClose} style={styles.backdropPressTarget} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          pointerEvents="box-none"
          style={styles.keyboardAvoiding}
        >
          <Animated.View
            accessibilityState={{ busy: isBusy }}
            style={[
              styles.sheet,
              {
                maxHeight: Math.max(520, height * 0.9),
                paddingBottom: Math.max(insets.bottom, 10),
                transform: [{ translateY }],
              },
            ]}
          >
            <View style={styles.handleZone} {...panResponder.panHandlers}>
              <View style={styles.dragHandle} />
            </View>

            <View style={styles.header}>
              <View>
                <Text style={styles.title}>
                  {checkoutStep === "review"
                    ? "Review Cart"
                    : checkoutStep === "charges"
                      ? "Charges & Discounts"
                      : "Payment"}
                </Text>
                <Text style={styles.subtitle}>
                  {checkoutStep === "review"
                    ? `${items.length} line item${items.length === 1 ? "" : "s"} ready`
                    : checkoutStep === "charges"
                      ? `Adjustments for ${selectedClient.name}`
                    : `Payment due ${formatCurrency(totals.grandTotal)}`}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={isBusy ? 1 : 0.84}
                disabled={isBusy}
                onPress={requestClose}
                style={[styles.closeButton, isBusy && styles.buttonDisabled]}
              >
                <Ionicons name="close" size={20} color={Colors.heading} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              pointerEvents={isBusy ? "none" : "auto"}
              showsVerticalScrollIndicator={false}
              style={styles.scroll}
            >
              {checkoutStep === "review" ? (
                <>
                  <View style={styles.customerCard}>
                    <View style={styles.customerAvatar}>
                      <Text style={styles.customerAvatarText}>{selectedClient.initials}</Text>
                    </View>
                    <View style={styles.customerCopy}>
                      <Text numberOfLines={1} style={styles.customerName}>
                        {selectedClient.name}
                      </Text>
                      <Text numberOfLines={1} style={styles.customerPhone}>
                        {selectedClient.phone}
                      </Text>
                    </View>
                    <TouchableOpacity activeOpacity={0.84} onPress={onChangeCustomer} style={styles.customerChangeButton}>
                      <Text style={styles.customerChangeText}>Change</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Bill Items</Text>
                    <TouchableOpacity activeOpacity={0.84} onPress={onAddMore} style={styles.addMoreButton}>
                      <Ionicons name="add" size={15} color={Colors.primaryDark} />
                      <Text style={styles.addMoreText}>Add More</Text>
                    </TouchableOpacity>
                  </View>

                  {groupedItems.length === 0 ? (
                    <View style={styles.emptyBill}>
                      <Ionicons name="cart-outline" size={22} color={Colors.primary} />
                      <Text style={styles.emptyBillTitle}>No items in this sale</Text>
                      <Text style={styles.emptyBillText}>Add a service or product to continue checkout.</Text>
                    </View>
                  ) : (
                    groupedItems.map((group) => (
                      <View key={`checkout-group-${group.key}`} style={styles.itemGroup}>
                        <Text style={styles.itemGroupTitle}>{group.title}</Text>
                        {group.data.map((item) => (
                          <CheckoutItemCard
                            item={item}
                            key={`checkout-item-${item.lineId}`}
                            onClearStaff={() => onAssignStaff(item.lineId, null, null)}
                            onDecrease={() => handleDecreaseQuantity(item)}
                            onIncrease={() => handleIncreaseQuantity(item)}
                            onPressStaff={() => setStaffPickerLineId(item.lineId)}
                            onRemove={() => {
                              animateItemLayout();
                              onRemoveItem(item.lineId);
                            }}
                            showStaffError={showStaffValidation && item.itemType === "service" && !item.staffId}
                            stockError={productStockErrors[item.lineId]}
                          />
                        ))}
                      </View>
                    ))
                  )}
                  {showStaffValidation ? (
                    <View style={styles.staffWarningBanner}>
                      <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
                      <Text style={styles.staffWarningText}>
                        {`Please assign a staff member to every selected service before continuing.${
                          missingStaffServiceNames.length > 0
                            ? ` Missing: ${missingStaffServiceNames.join(", ")}.`
                            : ""
                        }`}
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : checkoutStep === "charges" ? (
                <>
                  <View style={styles.orderSummaryCard}>
                    <SummaryTile label="Client" value={selectedClient.name} />
                    <SummaryTile label="Items" value={String(items.length)} />
                    <SummaryTile label="Subtotal" value={formatCurrency(totals.subtotal)} />
                  </View>

                  <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>Discount</Text>
                    <Text style={styles.inputLabel}>Discount Type</Text>
                    <View style={styles.discountModeRow}>
                      <ModeButton active={discountMode === "percent"} label="Percentage (%)" onPress={() => handleDiscountModeChange("percent")} />
                      <ModeButton active={discountMode === "amount"} label="Flat Amount (₹)" onPress={() => handleDiscountModeChange("amount")} />
                    </View>
                    <Text style={styles.inputLabel}>Discount Value</Text>
                    <TextInput
                      keyboardType="decimal-pad"
                      onChangeText={handleDiscountChange}
                      placeholder={discountMode === "percent" ? "10%" : "₹200"}
                      placeholderTextColor={Colors.placeholder}
                      style={[
                        styles.input,
                        (discountExceedsSubtotal || invalidDiscountPercentage) && styles.inputError,
                      ]}
                      value={discountDraft}
                    />
                    {invalidDiscountPercentage ? (
                      <Text style={styles.errorText}>Percentage discount cannot exceed 100%.</Text>
                    ) : discountExceedsSubtotal ? (
                      <Text style={styles.errorText}>Discount cannot exceed subtotal ({formatCurrency(totals.subtotal)}).</Text>
                    ) : null}
                  </View>

                  {selectedClient.membership ? (
                    <View style={styles.formCard}>
                      <Text style={styles.sectionTitle}>Membership Discount</Text>
                      <View style={styles.membershipRow}>
                        <View>
                          <Text style={styles.membershipStatus}>Applied Automatically</Text>
                          <Text style={styles.membershipName}>{selectedClient.membership}</Text>
                        </View>
                        <Text style={styles.membershipSavings}>{formatCurrency(0)}</Text>
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>Coupon</Text>
                    {appliedCoupon?.valid ? (
                      <View style={styles.membershipRow}>
                        <View>
                          <Text style={styles.membershipStatus}>{appliedCoupon.couponCode}</Text>
                          <Text style={styles.membershipName}>
                            {appliedCoupon.discountType === "percentage"
                              ? `${appliedCoupon.discountValue}% off`
                              : "Flat discount"}
                          </Text>
                        </View>
                        <View style={styles.couponAppliedRight}>
                          <Text style={styles.membershipSavings}>
                            - {formatCurrency(appliedCoupon.discountAmount)}
                          </Text>
                          <TouchableOpacity activeOpacity={0.84} onPress={onRemoveCoupon} style={styles.secondaryPill}>
                            <Text style={styles.secondaryPillText}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <>
                        <View style={styles.couponRow}>
                          <TextInput
                            autoCapitalize="characters"
                            editable={!isApplyingCoupon}
                            onChangeText={onChangeCouponCode}
                            placeholder="Enter Coupon Code"
                            placeholderTextColor={Colors.placeholder}
                            style={styles.couponInput}
                            value={couponCode}
                          />
                          <TouchableOpacity
                            activeOpacity={0.84}
                            disabled={isApplyingCoupon || !couponCode.trim()}
                            onPress={onApplyCoupon}
                            style={[
                              styles.secondaryPill,
                              (isApplyingCoupon || !couponCode.trim()) && styles.buttonDisabled,
                            ]}
                          >
                            {isApplyingCoupon ? (
                              <ActivityIndicator color={Colors.primaryDark} size="small" />
                            ) : (
                              <Text style={styles.secondaryPillText}>Apply</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                        {couponError ? <Text style={styles.errorText}>{couponError}</Text> : null}
                      </>
                    )}
                  </View>

                  {gstPreviewAmount > 0 ? (
                    <View style={styles.formCard}>
                      <Text style={styles.sectionTitle}>GST</Text>
                      <View style={styles.membershipRow}>
                        <View>
                          <Text style={styles.membershipStatus}>
                            {includeGst ? "Included in this bill" : "Excluded from this bill"}
                          </Text>
                          <Text style={styles.membershipName}>Calculated from catalog tax rates</Text>
                        </View>
                        <TouchableOpacity
                          activeOpacity={0.84}
                          onPress={onToggleIncludeGst}
                          style={[styles.quickChip, includeGst && styles.quickChipActive]}
                        >
                          <Text style={[styles.quickChipText, includeGst && styles.quickChipTextActive]}>
                            {includeGst ? "ON" : "OFF"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.gstPreviewText}>
                        GST {includeGst ? "applied" : "would be"}: {formatCurrency(gstPreviewAmount)}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>Tip</Text>
                    <View style={styles.quickChipRow}>
                      {["50", "100", "200"].map((tipValue) => {
                        const isActive = tipInput === tipValue && !customTipVisible;

                        return (
                          <TouchableOpacity
                            key={`tip-${tipValue}`}
                            activeOpacity={0.84}
                            onPress={() => {
                              setCustomTipVisible(false);
                              onChangeTip(tipValue);
                            }}
                            style={[styles.quickChip, isActive && styles.quickChipActive]}
                          >
                            <Text style={[styles.quickChipText, isActive && styles.quickChipTextActive]}>
                              {formatCurrency(Number(tipValue))}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                      <TouchableOpacity
                        activeOpacity={0.84}
                        onPress={() => {
                          setCustomTipVisible(true);
                          onChangeTip("");
                        }}
                        style={[styles.quickChip, customTipVisible && styles.quickChipActive]}
                      >
                        <Text style={[styles.quickChipText, customTipVisible && styles.quickChipTextActive]}>
                          Custom
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {customTipVisible ? (
                      <>
                        <TextInput
                          keyboardType="decimal-pad"
                          onChangeText={onChangeTip}
                          placeholder="Enter tip amount"
                          placeholderTextColor={Colors.placeholder}
                          style={[styles.input, customTipInvalid && styles.inputError]}
                          value={tipInput}
                        />
                        {customTipInvalid ? <Text style={styles.errorText}>Enter a custom tip amount.</Text> : null}
                      </>
                    ) : null}
                  </View>

                  <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>Extra Charges</Text>
                    {(
                      [
                        { key: "serviceCharge", label: "Service Charge" },
                        { key: "convenienceFee", label: "Convenience Fee" },
                        { key: "otherCharges", label: "Other Charges" },
                      ] as const
                    ).map(({ key, label }) => (
                      <View key={`extra-charge-${key}`} style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{label}</Text>
                        <TextInput
                          keyboardType="decimal-pad"
                          onChangeText={(value) => onChangeExtraCharge(key, value)}
                          placeholder="0"
                          placeholderTextColor={Colors.placeholder}
                          style={styles.input}
                          value={extraCharges[key]}
                        />
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <View style={styles.paymentSummaryCard}>
                  <SummaryTile label="Client" value={selectedClient.name} />
                  <SummaryTile label="Items" value={String(items.length)} />
                  <SummaryTile label="Grand Total" value={formatCurrency(totals.grandTotal)} />
                  <SummaryTile label="Outstanding" value={formatCurrency(0)} />
                </View>
              )}

              {checkoutStep === "payment" ? (
                <View style={styles.formCard}>
                  <Text style={styles.sectionTitle}>Payment Method</Text>
                  <View style={styles.methodGrid}>
                    {PAYMENT_METHODS.map((method) => {
                      const isActive = method.value === paymentMethod;

                      return (
                        <TouchableOpacity
                          key={`payment-${method.value}`}
                          activeOpacity={0.84}
                          onPress={() => setPaymentMethod(method.value)}
                          style={[styles.methodCard, isActive && styles.methodCardActive]}
                        >
                          <Ionicons name={method.icon} size={16} color={isActive ? Colors.onPrimary : Colors.primaryDark} />
                          <Text style={[styles.methodText, isActive && styles.methodTextActive]}>{method.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {selectedClient.membership ? (
                    <View style={styles.unavailableMethodCard}>
                      <Ionicons name="information-circle-outline" size={16} color={Colors.primaryDark} />
                      <Text style={styles.unavailableMethodText}>
                        Membership balance is not available in the current payment API.
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {checkoutStep === "payment" && paymentMethod === "cash" ? (
                <View style={styles.formCard}>
                  <Text style={styles.sectionTitle}>Cash Details</Text>
                  <View style={styles.paymentAmountCard}>
                    <Text style={styles.paymentAmountLabel}>Grand Total</Text>
                    <Text style={styles.paymentAmountValue}>{formatCurrency(totals.grandTotal)}</Text>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Amount Received</Text>
                    <TextInput
                      keyboardType="decimal-pad"
                      onChangeText={setAmountReceivedInput}
                      placeholder="0"
                      placeholderTextColor={Colors.placeholder}
                      style={[styles.input, cashInsufficient && amountReceivedInput.trim() && styles.inputError]}
                      value={amountReceivedInput}
                    />
                  </View>
                  {amountReceivedInput.trim() ? (
                    cashInsufficient ? (
                      <Text style={styles.errorText}>
                        Amount received must be at least {formatCurrency(totals.grandTotal)}.
                      </Text>
                    ) : (
                      <View style={styles.changeCard}>
                        <Text style={styles.changeLabel}>Change Return</Text>
                        <Text style={styles.changeValue}>{formatCurrency(changeDue)}</Text>
                      </View>
                    )
                  ) : null}
                </View>
              ) : null}

              {checkoutStep === "payment" && paymentMethod === "upi" ? (
                <View style={styles.formCard}>
                  <Text style={styles.sectionTitle}>UPI Details</Text>
                  <View style={styles.selectedPaymentCard}>
                    <Ionicons name="phone-portrait-outline" size={18} color={Colors.primaryDark} />
                    <Text style={styles.selectedPaymentText}>UPI Selected</Text>
                  </View>
                  <Text style={styles.inputLabel}>Reference Number (Optional)</Text>
                  <TextInput
                    editable={false}
                    placeholder="Not required"
                    placeholderTextColor={Colors.placeholder}
                    style={[styles.input, styles.inputDisabled]}
                    value=""
                  />
                </View>
              ) : null}

              {checkoutStep === "payment" && paymentMethod === "card" ? (
                <View style={styles.formCard}>
                  <Text style={styles.sectionTitle}>Card Details</Text>
                  <View style={styles.selectedPaymentCard}>
                    <Ionicons name="card-outline" size={18} color={Colors.primaryDark} />
                    <Text style={styles.selectedPaymentText}>Card Payment Selected</Text>
                  </View>
                  <Text style={styles.inputLabel}>Transaction Reference (Optional)</Text>
                  <TextInput
                    editable={false}
                    placeholder="Not required"
                    placeholderTextColor={Colors.placeholder}
                    style={[styles.input, styles.inputDisabled]}
                    value=""
                  />
                </View>
              ) : null}

              {checkoutStep === "payment" && paymentMethod === "split" ? (
                <View style={styles.formCard}>
                  <Text style={styles.sectionTitle}>Split Payment</Text>
                  <View style={styles.paymentDetailCard}>
                    {SPLIT_METHODS.map((method) => (
                      <View key={`split-${method.value}`} style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{method.label}</Text>
                        <TextInput
                          keyboardType="decimal-pad"
                          onChangeText={(value) => setSplitAmounts((current) => ({ ...current, [method.value]: value }))}
                          placeholder="0"
                          placeholderTextColor={Colors.placeholder}
                          style={styles.input}
                          value={splitAmounts[method.value] ?? ""}
                        />
                      </View>
                    ))}
                    <View style={styles.splitTotalRow}>
                      <Text style={styles.summaryLabel}>Total Paid</Text>
                      <Text style={[styles.splitTotalText, splitMismatch && styles.errorText]}>
                        {formatCurrency(splitTotal)} of {formatCurrency(totals.grandTotal)}
                      </Text>
                    </View>
                    {splitMismatch ? <Text style={styles.errorText}>Split total must match the grand total.</Text> : null}
                  </View>
                </View>
              ) : null}

              <View style={styles.summaryCard}>
                <Text style={styles.sectionTitle}>{checkoutStep === "payment" ? "Payment Summary" : "Summary"}</Text>
                <SummaryRow label="Subtotal" value={formatCurrency(totals.lineSubtotal)} />
                {totals.itemDiscountTotal > 0 ? (
                  <SummaryRow label="Item Discount" tone="discount" value={`- ${formatCurrency(totals.itemDiscountTotal)}`} />
                ) : null}
                {totals.overallDiscount > 0 ? (
                  <SummaryRow label="Discount" tone="discount" value={`- ${formatCurrency(totals.overallDiscount)}`} />
                ) : null}
                {selectedClient.membership ? (
                  <SummaryRow label="Membership Discount" tone="discount" value={`- ${formatCurrency(0)}`} />
                ) : null}
                {totals.couponDiscount > 0 ? (
                  <SummaryRow label={`Coupon (${appliedCoupon?.couponCode ?? "Applied"})`} tone="discount" value={`- ${formatCurrency(totals.couponDiscount)}`} />
                ) : null}
                {totals.exCharges > 0 ? (
                  <SummaryRow label="Extra Charges" value={formatCurrency(totals.exCharges)} />
                ) : null}
                {totals.taxableAmount > 0 && totals.taxBreakdown && totals.taxBreakdown.length > 0 ? (
                  <SummaryRow label="Taxable Amount" value={formatCurrency(totals.taxableAmount)} />
                ) : null}
                {totals.taxBreakdown && totals.taxBreakdown.length > 0 ? (
                  totals.taxBreakdown.map((tax, idx) => (
                    <SummaryRow
                      key={`${tax.name}-${idx}`}
                      label={`${tax.name} (${tax.rate}%)${tax.inclusive ? " (Incl.)" : ""}`}
                      value={formatCurrency(tax.amount)}
                    />
                  ))
                ) : totals.taxAmount > 0 ? (
                  <SummaryRow label="Tax" value={formatCurrency(totals.taxAmount)} />
                ) : null}
                {totals.tipAmount > 0 ? <SummaryRow label="Tip" value={formatCurrency(totals.tipAmount)} /> : null}
                {Math.abs(totals.roundOff) > 0.001 ? (
                  <SummaryRow
                    label="Round Off"
                    value={`${totals.roundOff > 0 ? "+" : "-"} ${formatCurrency(Math.abs(totals.roundOff))}`}
                  />
                ) : null}
                <View style={styles.grandTotalRow}>
                  <Text style={styles.grandTotalLabel}>Grand Total</Text>
                  <Text style={styles.grandTotalValue}>{formatCurrency(totals.grandTotal)}</Text>
                </View>
                {checkoutStep === "payment" ? (
                  <>
                    <SummaryRow
                      label="Paid Amount"
                      value={formatCurrency(
                        paymentMethod === "cash"
                          ? amountReceived
                          : paymentMethod === "split"
                            ? splitTotal
                            : totals.grandTotal,
                      )}
                    />
                    <SummaryRow
                      label="Balance"
                      value={formatCurrency(
                        Math.max(
                          0,
                          totals.grandTotal -
                            (paymentMethod === "cash"
                              ? amountReceived
                              : paymentMethod === "split"
                                ? splitTotal
                                : totals.grandTotal),
                        ),
                      )}
                    />
                  </>
                ) : null}
              </View>
            </ScrollView>

            <View style={styles.footer}>
              {submitError ? <Text style={styles.footerError}>{submitError}</Text> : null}
              {isSuccess ? (
                <View style={styles.successBanner}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                  <Text style={styles.successText}>Sale completed</Text>
                </View>
              ) : null}
              <View style={styles.footerActions}>
                {checkoutStep === "payment" ? (
                  <TouchableOpacity
                    activeOpacity={0.84}
                    disabled={isBusy}
                    onPress={() => setCheckoutStep("charges")}
                    style={[styles.pendingButton, isBusy && styles.buttonDisabled]}
                  >
                    <Text style={styles.pendingButtonText}>Back</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.84}
                    disabled={isBusy || !hasItems || chargesInvalid}
                    onPress={onSavePending}
                    style={[
                      styles.pendingButton,
                      (isBusy || !hasItems || chargesInvalid) && styles.buttonDisabled,
                    ]}
                  >
                    {isSaving ? (
                      <ActivityIndicator color={Colors.primaryDark} size="small" />
                    ) : (
                      <Text style={styles.pendingButtonText}>Save Pending</Text>
                    )}
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  activeOpacity={0.84}
                  disabled={
                    checkoutStep === "payment"
                      ? isBusy || !canCompleteSale
                      : isBusy || !hasItems || chargesInvalid || showStaffValidation
                  }
                  onPress={
                    checkoutStep === "payment"
                      ? handleComplete
                      : checkoutStep === "charges"
                        ? handleContinueToPayment
                        : handleContinueToCharges
                  }
                  style={[
                    styles.completeButton,
                    !isSuccess &&
                      (checkoutStep === "payment"
                        ? isBusy || !canCompleteSale
                        : isBusy || !hasItems || chargesInvalid || showStaffValidation) &&
                      styles.buttonDisabled,
                    isSuccess && styles.completeButtonSuccess,
                  ]}
                >
                  {isCheckingOut ? (
                    <>
                      <ActivityIndicator color={Colors.onPrimary} size="small" />
                      <Text style={styles.completeButtonText}>Processing sale...</Text>
                    </>
                  ) : isSuccess ? (
                    <>
                      <Text style={styles.completeButtonText}>Completed</Text>
                      <Ionicons name="checkmark-circle" size={18} color={Colors.onPrimary} />
                    </>
                  ) : (
                    <>
                      <Text style={styles.completeButtonText}>
                        {checkoutStep === "payment"
                          ? "Complete Sale"
                          : checkoutStep === "charges"
                            ? "Continue to Payment"
                            : "Continue"}
                      </Text>
                      <Ionicons
                        name={checkoutStep === "payment" ? "checkmark-circle" : "arrow-forward"}
                        size={18}
                        color={Colors.onPrimary}
                      />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
      </Portal>
      <StaffPickerSheet
        onClose={() => setStaffPickerLineId(null)}
        onSelect={(staffId, staffName) => {
          if (staffPickerLineId) {
            onAssignStaff(staffPickerLineId, staffId, staffName);
          }
          setStaffPickerLineId(null);
        }}
        selectedStaffId={activeStaffItem?.staffId ?? null}
        staff={staffOptions}
        visible={Boolean(staffPickerLineId)}
      />
    </>
  );
}

function ModeButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <TouchableOpacity activeOpacity={0.84} onPress={onPress} style={[styles.modeButton, active && styles.modeButtonActive]}>
      <Text style={[styles.modeButtonText, active && styles.modeButtonTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function StaffAssignmentChip({
  hasError,
  onClear,
  onPress,
  staffName,
}: {
  hasError: boolean;
  onClear?: () => void;
  onPress: () => void;
  staffName: string | null;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={[styles.staffChip, hasError && styles.staffChipError]}>
      <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={styles.staffChipBody}>
        <Ionicons name="person-outline" size={13} color={hasError ? Colors.error : Colors.primaryDark} />
        <Text numberOfLines={1} style={[styles.staffChipText, hasError && styles.staffChipTextError]}>
          {staffName ?? "Assign staff"}
        </Text>
        <Ionicons name="chevron-down" size={12} color={hasError ? Colors.error : Colors.text2} />
      </TouchableOpacity>
      {onClear ? (
        <TouchableOpacity
          accessibilityLabel="Clear staff assignment"
          activeOpacity={0.7}
          onPress={onClear}
          style={styles.staffChipClear}
        >
          <Ionicons name="close" size={12} color={Colors.text2} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const CheckoutItemCard = memo(function CheckoutItemCard({
  item,
  onClearStaff,
  onDecrease,
  onIncrease,
  onPressStaff,
  onRemove,
  showStaffError,
  stockError,
}: {
  item: CartItem;
  onClearStaff: () => void;
  onDecrease: () => void;
  onIncrease: () => void;
  onPressStaff: () => void;
  onRemove: () => void;
  showStaffError: boolean;
  stockError?: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const scale = useRef(new Animated.Value(1)).current;
  const lineTotal = item.unitPrice * getCartItemBillableQuantity(item) - item.discountAmount;
  const packageCoveredQuantity = getPackageCoveredQuantity(item);
  const increaseDisabled =
    item.itemType === "product" && item.quantity >= Math.max(0, item.availableStock ?? 0);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scale, {
        duration: 75,
        easing: Easing.out(Easing.cubic),
        toValue: 1.05,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        duration: 75,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [item.quantity, scale]);

  return (
    <Animated.View style={[styles.itemCard, (stockError || showStaffError) && styles.itemCardError, { transform: [{ scale }] }]}>
      <View style={styles.itemMedia}>
        <Ionicons
          name={item.itemType === "service" ? "cut-outline" : item.itemType === "membership" ? "card-outline" : "cube-outline"}
          size={18}
          color={Colors.primaryDark}
        />
      </View>

      <View style={styles.itemMain}>
        <View style={styles.itemTitleRow}>
          <Text numberOfLines={1} style={styles.itemName}>
            {item.name}
          </Text>
          <Text style={styles.itemTotal}>{formatCurrency(lineTotal)}</Text>
        </View>
        <Text numberOfLines={1} style={styles.itemMeta}>
          {[
            packageCoveredQuantity > 0
              ? packageCoveredQuantity === item.quantity
                ? "Package covered"
                : `${packageCoveredQuantity} of ${item.quantity} package covered`
              : null,
            item.duration,
          ].filter(Boolean).join(" - ")}
        </Text>
        {stockError ? <Text style={styles.stockErrorText}>{stockError}</Text> : null}
        {item.itemType !== "quick" ? (
          <StaffAssignmentChip
            hasError={showStaffError}
            onClear={item.staffId ? onClearStaff : undefined}
            onPress={onPressStaff}
            staffName={item.staffName}
          />
        ) : null}
        <View style={styles.itemBottomRow}>
          <Text style={styles.unitPrice}>{formatCurrency(item.unitPrice)} each</Text>
          <View style={styles.quantityStepper}>
            <TouchableOpacity
              accessibilityLabel={`Decrease ${item.name} quantity`}
              activeOpacity={0.82}
              onPress={onDecrease}
              style={styles.stepperButton}
            >
              <Ionicons name="remove" size={14} color={Colors.primaryDark} />
            </TouchableOpacity>
            <Text style={styles.quantityValue}>{item.quantity}</Text>
            <TouchableOpacity
              accessibilityLabel={`Increase ${item.name} quantity`}
              activeOpacity={increaseDisabled ? 1 : 0.82}
              disabled={increaseDisabled}
              onPress={onIncrease}
              style={[styles.stepperButton, increaseDisabled && styles.stepperButtonDisabled]}
            >
              <Ionicons
                name="add"
                size={14}
                color={increaseDisabled ? Colors.text2 : Colors.primaryDark}
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            accessibilityLabel={`Remove ${item.name}`}
            activeOpacity={0.82}
            onPress={onRemove}
            style={styles.removeIconButton}
          >
            <Ionicons name="trash-outline" size={15} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
});

function SummaryRow({ label, tone, value }: { label: string; tone?: "discount"; value: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, tone === "discount" && styles.summaryValueDiscount]}>{value}</Text>
    </View>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.summaryTile}>
      <Text style={styles.summaryTileLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.summaryTileValue}>{value}</Text>
    </View>
  );
}

export const CheckoutSheet = memo(CheckoutSheetComponent);

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  modalRoot: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20, 18, 16, 0.82)",
  },
  backdropPressTarget: {
    ...StyleSheet.absoluteFillObject,
  },
  keyboardAvoiding: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    alignSelf: "center",
    backgroundColor: Colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxWidth: 760,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    width: "100%",
    elevation: 20,
  },
  handleZone: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },
  dragHandle: {
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    height: 5,
    width: 46,
  },
  header: {
    alignItems: "center",
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  title: {
    color: Colors.heading,
    fontSize: 22,
    fontWeight: "900",
  },
  subtitle: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingBottom: 118,
  },
  customerCard: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
  },
  customerAvatar: {
    alignItems: "center",
    backgroundColor: Colors.successBg,
    borderRadius: Radius.lg,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  customerAvatarText: {
    color: Colors.primaryDark,
    fontSize: 14,
    fontWeight: "900",
  },
  customerCopy: {
    flex: 1,
  },
  customerName: {
    color: Colors.heading,
    fontSize: 15,
    fontWeight: "900",
  },
  customerPhone: {
    color: Colors.text2,
    fontSize: 12,
    marginTop: 3,
  },
  customerChangeButton: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  customerChangeText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
  },
  sectionHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: Spacing.sm,
  },
  addMoreButton: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    flexDirection: "row",
    gap: 5,
    minHeight: 36,
    paddingHorizontal: 12,
  },
  addMoreText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
  },
  emptyBill: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: AppRadius.card,
    marginBottom: Spacing.lg,
    padding: Spacing.xl,
  },
  emptyBillTitle: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "900",
    marginTop: Spacing.sm,
  },
  emptyBillText: {
    color: Colors.text2,
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  staffWarningBanner: {
    alignItems: "center",
    backgroundColor: Colors.errorBg,
    borderRadius: Radius.lg,
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    padding: Spacing.md,
  },
  staffWarningText: {
    color: Colors.error,
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
  },
  itemGroup: {
    marginBottom: Spacing.lg,
  },
  itemGroupTitle: {
    color: Colors.text2,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  itemCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    minHeight: 96,
    padding: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.035,
    shadowRadius: 14,
    elevation: 1,
  },
  itemCardError: {
    borderColor: Colors.error,
  },
  itemMedia: {
    alignItems: "center",
    backgroundColor: Colors.successBg,
    borderRadius: Radius.md,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  itemMain: {
    flex: 1,
    minWidth: 0,
  },
  itemTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "space-between",
  },
  itemName: {
    color: Colors.heading,
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
  },
  itemMeta: {
    color: Colors.text2,
    fontSize: 11,
    marginTop: 3,
  },
  stockErrorText: {
    color: Colors.error,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
  },
  staffChip: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: "row",
    marginTop: 6,
    maxWidth: "100%",
    paddingRight: 3,
  },
  staffChipError: {
    backgroundColor: Colors.errorBg,
    borderColor: Colors.error,
  },
  staffChipBody: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    flexShrink: 1,
    minHeight: 26,
    paddingLeft: 9,
    paddingRight: 5,
  },
  staffChipText: {
    color: Colors.primaryDark,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "800",
  },
  staffChipTextError: {
    color: Colors.error,
  },
  staffChipClear: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: Radius.full,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  itemBottomRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "space-between",
    marginTop: 10,
  },
  itemTotal: {
    color: Colors.primaryDark,
    fontSize: 14,
    fontWeight: "900",
  },
  unitPrice: {
    color: Colors.text2,
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
  },
  quantityStepper: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 34,
    paddingHorizontal: 4,
  },
  stepperButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: Radius.full,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  quantityValue: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "900",
    minWidth: 18,
    textAlign: "center",
  },
  stepperButtonDisabled: {
    opacity: 0.45,
  },
  removeIconButton: {
    alignItems: "center",
    backgroundColor: Colors.errorBg,
    borderRadius: Radius.full,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  formCard: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
  },
  orderSummaryCard: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
  },
  paymentSummaryCard: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
  },
  discountModeRow: {
    alignSelf: "flex-start",
    backgroundColor: Colors.card,
    borderRadius: Radius.full,
    flexDirection: "row",
    marginBottom: Spacing.sm,
    padding: 3,
  },
  modeButton: {
    alignItems: "center",
    borderRadius: Radius.full,
    justifyContent: "center",
    minHeight: 32,
    minWidth: 46,
  },
  modeButtonActive: {
    backgroundColor: Colors.primaryDark,
  },
  modeButtonText: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "900",
  },
  modeButtonTextActive: {
    color: Colors.onPrimary,
  },
  input: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputDisabled: {
    opacity: 0.55,
  },
  inputLabel: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  inputGroup: {
    flex: 1,
  },
  couponRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  couponInput: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    color: Colors.heading,
    flex: 1,
    fontSize: 13,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  secondaryPill: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 82,
  },
  secondaryPillText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
  },
  membershipRow: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: Spacing.md,
  },
  membershipStatus: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
  },
  membershipName: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  membershipSavings: {
    color: Colors.primaryDark,
    fontSize: 14,
    fontWeight: "900",
  },
  couponAppliedRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  gstPreviewText: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "700",
    marginTop: Spacing.sm,
  },
  quickChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  quickChip: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 14,
  },
  quickChipActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  quickChipText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
  },
  quickChipTextActive: {
    color: Colors.onPrimary,
  },
  methodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  methodCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 42,
    paddingHorizontal: 13,
  },
  methodCardActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  methodText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
  },
  methodTextActive: {
    color: Colors.onPrimary,
  },
  unavailableMethodCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
  unavailableMethodText: {
    color: Colors.text2,
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
  },
  paymentDetailCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
  paymentAmountCard: {
    backgroundColor: Colors.successBg,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  paymentAmountLabel: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  paymentAmountValue: {
    color: Colors.heading,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 2,
  },
  changeCard: {
    alignItems: "center",
    backgroundColor: Colors.successBg,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
  changeLabel: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "900",
  },
  changeValue: {
    color: Colors.primaryDark,
    fontSize: 18,
    fontWeight: "900",
  },
  selectedPaymentCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  selectedPaymentText: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "900",
  },
  splitTotalRow: {
    alignItems: "center",
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
  },
  summaryCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    padding: Spacing.md,
  },
  summaryRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  summaryLabel: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
  },
  summaryValue: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "900",
  },
  summaryValueDiscount: {
    color: Colors.error,
  },
  summaryTile: {
    flex: 1,
  },
  summaryTileLabel: {
    color: Colors.text2,
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  summaryTileValue: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "900",
  },
  splitTotalText: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "right",
  },
  grandTotalRow: {
    alignItems: "center",
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
  },
  grandTotalLabel: {
    color: Colors.heading,
    fontSize: 15,
    fontWeight: "900",
  },
  grandTotalValue: {
    color: Colors.primaryDark,
    fontSize: 24,
    fontWeight: "900",
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "800",
    marginTop: Spacing.sm,
  },
  footer: {
    backgroundColor: Colors.card,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  footerError: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: Spacing.sm,
  },
  successBanner: {
    alignItems: "center",
    backgroundColor: Colors.successBg,
    borderRadius: Radius.full,
    flexDirection: "row",
    gap: 6,
    marginBottom: Spacing.sm,
    minHeight: 34,
    paddingHorizontal: 12,
  },
  successText: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: "900",
  },
  footerActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  pendingButton: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    flex: 0.9,
    justifyContent: "center",
    minHeight: 54,
  },
  pendingButtonText: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: "900",
  },
  completeButton: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.full,
    flex: 1.35,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 54,
  },
  completeButtonSuccess: {
    backgroundColor: Colors.success,
  },
  completeButtonText: {
    color: Colors.onPrimary,
    fontSize: 14,
    fontWeight: "900",
  },
  buttonDisabled: {
    opacity: 0.48,
  },
});
