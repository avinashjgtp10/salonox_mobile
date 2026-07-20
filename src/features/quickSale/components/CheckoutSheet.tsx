import { Ionicons } from "@expo/vector-icons";
import { memo, useEffect, useMemo, useRef, useState } from "react";
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
import type { QuickSaleClient, CartItem } from "@/features/quickSale/types";
import type { BillTotals } from "@/features/quickSale/utils/calculations";
import { formatCurrency, parseAmount } from "@/features/quickSale/utils/money";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ValidateCouponResult } from "@/types/coupon";
import type { CheckoutSaleSplitEntry, SalePaymentMethod } from "@/types/sales";

const CHECKOUT_ANIMATION_MS = 250;

const PAYMENT_METHODS: { icon: keyof typeof Ionicons.glyphMap; label: string; value: SalePaymentMethod }[] = [
  { icon: "cash-outline", label: "Cash", value: "cash" },
  { icon: "card-outline", label: "Card", value: "card" },
  { icon: "phone-portrait-outline", label: "UPI", value: "upi" },
  { icon: "git-branch-outline", label: "Split", value: "split" },
];

const SPLIT_METHODS = PAYMENT_METHODS.filter((method) => method.value !== "split");
type CheckoutStep = "review" | "payment";

type CheckoutSheetProps = {
  appliedCoupon: ValidateCouponResult | null;
  couponCode: string;
  couponError: string | null;
  couponValidating: boolean;
  hasItems: boolean;
  initialStep: CheckoutStep;
  isCheckingOut: boolean;
  isSaving: boolean;
  isSuccess: boolean;
  items: CartItem[];
  notes: string;
  onAddMore: () => void;
  onApplyCoupon: () => void;
  onChangeCouponCode: (value: string) => void;
  onChangeCustomer: () => void;
  onChangeNotes: (value: string) => void;
  onChangeOverallDiscount: (value: string) => void;
  onChangeTax: (value: string) => void;
  onChangeTip: (value: string) => void;
  onClose: () => void;
  onCompleteSale: (payment: { method: SalePaymentMethod; splitEntries?: CheckoutSaleSplitEntry[] }) => void;
  onRemoveCoupon: () => void;
  onRemoveItem: (lineId: string) => void;
  onSavePending: () => void;
  onSetQuantity: (lineId: string, quantity: number) => void;
  overallDiscountInput: string;
  selectedClient: QuickSaleClient;
  submitError: string | null;
  taxInput: string;
  tipInput: string;
  totals: BillTotals;
  visible: boolean;
};

function CheckoutSheetComponent({
  appliedCoupon,
  couponCode,
  couponError,
  couponValidating,
  hasItems,
  initialStep,
  isCheckingOut,
  isSaving,
  isSuccess,
  items,
  notes,
  onAddMore,
  onApplyCoupon,
  onChangeCouponCode,
  onChangeCustomer,
  onChangeNotes,
  onChangeOverallDiscount,
  onChangeTax,
  onChangeTip,
  onClose,
  onCompleteSale,
  onRemoveCoupon,
  onRemoveItem,
  onSavePending,
  onSetQuantity,
  overallDiscountInput,
  selectedClient,
  submitError,
  taxInput,
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
  const [discountMode, setDiscountMode] = useState<"amount" | "percent">("amount");
  const [discountDraft, setDiscountDraft] = useState(overallDiscountInput);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(initialStep);

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
      setCheckoutStep(initialStep);
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
  const discountExceedsSubtotal = totals.overallDiscount + totals.couponDiscount > totals.subtotal + 0.005;
  const isBusy = isSaving || isCheckingOut || isSuccess;
  const canCompleteSale =
    hasItems &&
    !discountExceedsSubtotal &&
    (paymentMethod === "split"
      ? splitEntries.length > 0 && !splitMismatch
      : paymentMethod === "cash"
        ? !cashInsufficient
        : totals.grandTotal >= 0);

  const groupedItems = useMemo(
    () => [
      { data: items.filter((item) => item.itemType === "service"), key: "service", title: "Services" },
      { data: items.filter((item) => item.itemType === "product"), key: "product", title: "Products" },
      { data: items.filter((item) => item.itemType === "quick"), key: "quick", title: "Other" },
    ].filter((group) => group.data.length > 0),
    [items],
  );

  const handleDiscountChange = (value: string) => {
    setDiscountDraft(value);

    if (discountMode === "percent") {
      const percent = Math.min(100, parseAmount(value));
      onChangeOverallDiscount(String(Math.round(totals.subtotal * percent) / 100));
      return;
    }

    onChangeOverallDiscount(value);
  };

  const handleDiscountModeChange = (mode: "amount" | "percent") => {
    setDiscountMode(mode);

    if (mode === "percent") {
      const percent = totals.subtotal > 0 ? (parseAmount(overallDiscountInput) / totals.subtotal) * 100 : 0;
      setDiscountDraft(percent ? String(Math.round(percent * 100) / 100) : "");
      return;
    }

    setDiscountDraft(overallDiscountInput);
  };

  const handleComplete = () => {
    if (isBusy || !canCompleteSale) {
      return;
    }

    if (paymentMethod === "split") {
      onCompleteSale({ method: paymentMethod, splitEntries });
      return;
    }

    onCompleteSale({ method: paymentMethod });
  };

  const handleContinueToPayment = () => {
    if (!hasItems || discountExceedsSubtotal) {
      return;
    }

    setCheckoutStep("payment");
  };

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
                <Text style={styles.title}>{checkoutStep === "review" ? "Review Sale" : "Checkout"}</Text>
                <Text style={styles.subtitle}>
                  {checkoutStep === "review"
                    ? `${items.length} line item${items.length === 1 ? "" : "s"} ready`
                    : `Payment due ${formatCurrency(totals.grandTotal)}`}
                </Text>
              </View>
              <TouchableOpacity activeOpacity={0.84} onPress={requestClose} style={styles.closeButton}>
                <Ionicons name="close" size={20} color={Colors.heading} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
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
                            onDecrease={() => handleDecreaseQuantity(item)}
                            onIncrease={() => handleIncreaseQuantity(item)}
                            onRemove={() => {
                              animateItemLayout();
                              onRemoveItem(item.lineId);
                            }}
                          />
                        ))}
                      </View>
                    ))
                  )}

                  <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>Discount</Text>
                    <View style={styles.discountModeRow}>
                      <ModeButton active={discountMode === "amount"} label="Rs." onPress={() => handleDiscountModeChange("amount")} />
                      <ModeButton active={discountMode === "percent"} label="%" onPress={() => handleDiscountModeChange("percent")} />
                    </View>
                    <TextInput
                      keyboardType="decimal-pad"
                      onChangeText={handleDiscountChange}
                      placeholder={discountMode === "percent" ? "0%" : "0"}
                      placeholderTextColor={Colors.placeholder}
                      style={styles.input}
                      value={discountDraft}
                    />
                    {discountExceedsSubtotal ? (
                      <Text style={styles.errorText}>Discount cannot exceed subtotal ({formatCurrency(totals.subtotal)}).</Text>
                    ) : null}

                    <View style={styles.couponRow}>
                      <TextInput
                        autoCapitalize="characters"
                        editable={!appliedCoupon?.valid}
                        onChangeText={onChangeCouponCode}
                        placeholder="Coupon code"
                        placeholderTextColor={Colors.placeholder}
                        style={styles.couponInput}
                        value={couponCode}
                      />
                      {appliedCoupon?.valid ? (
                        <TouchableOpacity activeOpacity={0.84} onPress={onRemoveCoupon} style={styles.secondaryPill}>
                          <Text style={styles.secondaryPillText}>Remove</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          activeOpacity={0.84}
                          disabled={couponValidating || !couponCode.trim()}
                          onPress={onApplyCoupon}
                          style={[styles.secondaryPill, (couponValidating || !couponCode.trim()) && styles.buttonDisabled]}
                        >
                          {couponValidating ? (
                            <ActivityIndicator color={Colors.primaryDark} size="small" />
                          ) : (
                            <Text style={styles.secondaryPillText}>Apply</Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                    {couponError ? <Text style={styles.errorText}>{couponError}</Text> : null}
                  </View>

                  <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>Tax & Notes</Text>
                    <View style={styles.twoColumnRow}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Tax</Text>
                        <TextInput
                          keyboardType="decimal-pad"
                          onChangeText={onChangeTax}
                          placeholder="0"
                          placeholderTextColor={Colors.placeholder}
                          style={styles.input}
                          value={taxInput}
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Tip</Text>
                        <TextInput
                          keyboardType="decimal-pad"
                          onChangeText={onChangeTip}
                          placeholder="0"
                          placeholderTextColor={Colors.placeholder}
                          style={styles.input}
                          value={tipInput}
                        />
                      </View>
                    </View>
                    <Text style={styles.inputLabel}>Notes</Text>
                    <TextInput
                      multiline
                      onChangeText={onChangeNotes}
                      placeholder="Optional note for this sale"
                      placeholderTextColor={Colors.placeholder}
                      style={[styles.input, styles.notesInput]}
                      value={notes}
                    />
                  </View>
                </>
              ) : (
                <View style={styles.paymentDueCard}>
                  <View style={styles.paymentDueIcon}>
                    <Ionicons name="receipt-outline" size={20} color={Colors.primaryDark} />
                  </View>
                  <View style={styles.paymentDueCopy}>
                    <Text style={styles.paymentDueLabel}>Payment Due</Text>
                    <Text style={styles.paymentDueValue}>{formatCurrency(totals.grandTotal)}</Text>
                  </View>
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

                {paymentMethod === "cash" ? (
                  <View style={styles.paymentDetailCard}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Amount Received</Text>
                      <TextInput
                        keyboardType="decimal-pad"
                        onChangeText={setAmountReceivedInput}
                        placeholder="0"
                        placeholderTextColor={Colors.placeholder}
                        style={styles.inlineInput}
                        value={amountReceivedInput}
                      />
                    </View>
                    {amountReceivedInput.trim() ? (
                      cashInsufficient ? (
                        <Text style={styles.errorText}>
                          Amount received must be at least {formatCurrency(totals.grandTotal)}.
                        </Text>
                      ) : (
                        <SummaryRow label="Change Due" value={formatCurrency(changeDue)} />
                      )
                    ) : null}
                  </View>
                ) : null}

                {paymentMethod === "split" ? (
                  <View style={styles.paymentDetailCard}>
                    {SPLIT_METHODS.map((method) => (
                      <View key={`split-${method.value}`} style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{method.label}</Text>
                        <TextInput
                          keyboardType="decimal-pad"
                          onChangeText={(value) => setSplitAmounts((current) => ({ ...current, [method.value]: value }))}
                          placeholder="0"
                          placeholderTextColor={Colors.placeholder}
                          style={styles.inlineInput}
                          value={splitAmounts[method.value] ?? ""}
                        />
                      </View>
                    ))}
                    <Text style={[styles.splitTotalText, splitMismatch && styles.errorText]}>
                      {formatCurrency(splitTotal)} of {formatCurrency(totals.grandTotal)} allocated
                    </Text>
                  </View>
                ) : null}
                </View>
              ) : null}

              <View style={styles.summaryCard}>
                <Text style={styles.sectionTitle}>Summary</Text>
                <SummaryRow label="Subtotal" value={formatCurrency(totals.lineSubtotal)} />
                {totals.itemDiscountTotal > 0 ? (
                  <SummaryRow label="Item Discount" tone="discount" value={`- ${formatCurrency(totals.itemDiscountTotal)}`} />
                ) : null}
                {totals.overallDiscount > 0 ? (
                  <SummaryRow label="Discount" tone="discount" value={`- ${formatCurrency(totals.overallDiscount)}`} />
                ) : null}
                {totals.couponDiscount > 0 ? (
                  <SummaryRow label={`Coupon (${appliedCoupon?.couponCode ?? "Applied"})`} tone="discount" value={`- ${formatCurrency(totals.couponDiscount)}`} />
                ) : null}
                {totals.taxAmount > 0 ? <SummaryRow label="Tax" value={formatCurrency(totals.taxAmount)} /> : null}
                {totals.tipAmount > 0 ? <SummaryRow label="Tip" value={formatCurrency(totals.tipAmount)} /> : null}
                <View style={styles.grandTotalRow}>
                  <Text style={styles.grandTotalLabel}>Grand Total</Text>
                  <Text style={styles.grandTotalValue}>{formatCurrency(totals.grandTotal)}</Text>
                </View>
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
                    onPress={() => setCheckoutStep("review")}
                    style={[styles.pendingButton, isBusy && styles.buttonDisabled]}
                  >
                    <Text style={styles.pendingButtonText}>Review</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.84}
                    disabled={isBusy || !hasItems || discountExceedsSubtotal}
                    onPress={onSavePending}
                    style={[styles.pendingButton, (isBusy || !hasItems || discountExceedsSubtotal) && styles.buttonDisabled]}
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
                      : isBusy || !hasItems || discountExceedsSubtotal
                  }
                  onPress={checkoutStep === "payment" ? handleComplete : handleContinueToPayment}
                  style={[
                    styles.completeButton,
                    !isSuccess &&
                      (checkoutStep === "payment"
                        ? isBusy || !canCompleteSale
                        : isBusy || !hasItems || discountExceedsSubtotal) &&
                      styles.buttonDisabled,
                    isSuccess && styles.completeButtonSuccess,
                  ]}
                >
                  {isCheckingOut ? (
                    <ActivityIndicator color={Colors.onPrimary} size="small" />
                  ) : isSuccess ? (
                    <>
                      <Text style={styles.completeButtonText}>Completed</Text>
                      <Ionicons name="checkmark-circle" size={18} color={Colors.onPrimary} />
                    </>
                  ) : (
                    <>
                      <Text style={styles.completeButtonText}>
                        {checkoutStep === "payment" ? "Complete Sale" : "Checkout"}
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

const CheckoutItemCard = memo(function CheckoutItemCard({
  item,
  onDecrease,
  onIncrease,
  onRemove,
}: {
  item: CartItem;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const scale = useRef(new Animated.Value(1)).current;
  const lineTotal = item.unitPrice * item.quantity - item.discountAmount;

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
    <Animated.View style={[styles.itemCard, { transform: [{ scale }] }]}>
      <View style={styles.itemMedia}>
        <Ionicons
          name={item.itemType === "service" ? "cut-outline" : "cube-outline"}
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
          {[item.itemType === "service" ? item.staffName ?? "No staff assigned" : null, item.duration]
            .filter(Boolean)
            .join(" - ")}
        </Text>
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
              activeOpacity={0.82}
              onPress={onIncrease}
              style={styles.stepperButton}
            >
              <Ionicons name="add" size={14} color={Colors.primaryDark} />
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
  inputLabel: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  twoColumnRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  inputGroup: {
    flex: 1,
  },
  notesInput: {
    minHeight: 82,
    paddingTop: 12,
    textAlignVertical: "top",
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
  paymentDetailCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
  paymentDueCard: {
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
  paymentDueCopy: {
    flex: 1,
  },
  paymentDueIcon: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  paymentDueLabel: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  paymentDueValue: {
    color: Colors.heading,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 2,
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
  inlineInput: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "900",
    minHeight: 40,
    minWidth: 106,
    paddingHorizontal: 10,
    textAlign: "right",
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
