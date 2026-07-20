import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { CartList } from "@/features/quickSale/components/CartList";
import { ChangeServiceModal } from "@/features/quickSale/components/ChangeServiceModal";
import { CheckoutSheet } from "@/features/quickSale/components/CheckoutSheet";
import { ClientPickerSheet } from "@/features/quickSale/components/ClientPickerSheet";
import { ClientSummaryCard } from "@/features/quickSale/components/ClientSummaryCard";
import { ErrorState } from "@/features/quickSale/components/StateViews";
import { GlobalSearchBar } from "@/features/quickSale/components/GlobalSearchBar";
import { MiniBillBar } from "@/features/quickSale/components/MiniBillBar";
import { ProductCatalogTab } from "@/features/quickSale/components/ProductCatalogTab";
import { QuickSaleSearchPanel } from "@/features/quickSale/components/QuickSaleSearchPanel";
import { ServiceCatalogTab } from "@/features/quickSale/components/ServiceCatalogTab";
import { useCart } from "@/features/quickSale/hooks/useCart";
import { WALK_IN_CLIENT, type QuickSaleClient } from "@/features/quickSale/types";
import { calculateBillTotals } from "@/features/quickSale/utils/calculations";
import { formatCurrency, parseAmount } from "@/features/quickSale/utils/money";
import { couponService } from "@/services/coupon.service";
import { fetchClientHistoryThunk } from "@/middleware/client/client.thunk";
import { fetchDashboardThunk } from "@/middleware/dashboard/dashboard.thunk";
import { fetchUnreadCountThunk } from "@/middleware/notification/notification.thunk";
import {
  checkoutSaleThunk,
  createSaleThunk,
  fetchSaleByIdThunk,
  fetchSalesInitThunk,
  updateSaleThunk,
} from "@/middleware/sales/sales.thunk";
import {
  selectSaleCheckingOut,
  selectSaleCheckoutError,
  selectSaleSaveError,
  selectSaleSaving,
  selectSalesInitData,
  selectSalesInitError,
  selectSalesInitLoading,
} from "@/store/sales/sales.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import { selectCurrentUser } from "@/store/user/user.slice";
import type { ClientListItem } from "@/types/client";
import type { Product } from "@/types/product";
import type { ValidateCouponResult } from "@/types/coupon";
import type { CheckoutSaleSplitEntry, SalePaymentMethod } from "@/types/sales";
import type { ServiceListItem } from "@/types/service";

type CatalogTab = "services" | "products" | "bill";
type CheckoutInitialStep = "review" | "payment";

const PRIVILEGED_ROLES = new Set(["salon_owner", "admin"]);

const clientFromListItem = (client: ClientListItem): QuickSaleClient => ({
  avatarBg: "#F2EFE9",
  avatarColor: "#726A63",
  id: client.id,
  initials: client.initials,
  membership: client.membership,
  name: client.fullName,
  phone: client.phone,
});

const getRejectedMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
};

export default function QuickSaleScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ draftId?: string; resetSale?: string }>();
  const currentUser = useAppSelector(selectCurrentUser);
  const allowPriceOverride = PRIVILEGED_ROLES.has(currentUser?.role ?? "");

  const initData = useAppSelector(selectSalesInitData);
  const initLoading = useAppSelector(selectSalesInitLoading);
  const initError = useAppSelector(selectSalesInitError);
  const saving = useAppSelector(selectSaleSaving);
  const saveError = useAppSelector(selectSaleSaveError);
  const checkingOut = useAppSelector(selectSaleCheckingOut);
  const checkoutError = useAppSelector(selectSaleCheckoutError);

  const cart = useCart();
  const [activeTab, setActiveTab] = useState<CatalogTab>("services");
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [isGlobalSearchLoading, setIsGlobalSearchLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<QuickSaleClient>(WALK_IN_CLIENT);
  const [isClientPickerVisible, setIsClientPickerVisible] = useState(false);
  const [clientPickerStartsInCreateMode, setClientPickerStartsInCreateMode] = useState(false);
  const [changeServiceLineId, setChangeServiceLineId] = useState<string | null>(null);
  const [isCheckoutVisible, setIsCheckoutVisible] = useState(false);
  const [checkoutInitialStep, setCheckoutInitialStep] = useState<CheckoutInitialStep>("payment");
  const [checkoutSucceeded, setCheckoutSucceeded] = useState(false);
  const [existingSaleId, setExistingSaleId] = useState<string | null>(null);
  const [undoNotice, setUndoNotice] = useState<{ item: import("@/features/quickSale/types").CartItem; index: number } | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Redux's isSaving/isCheckingOut flags only flip disabled=true after the
  // next render commits; a fast double-tap can fire twice before that
  // happens. This ref is checked+set synchronously so a second tap in the
  // same tick is always a no-op regardless of render timing.
  const isSubmittingRef = useRef(false);

  const [overallDiscountInput, setOverallDiscountInput] = useState("");
  const [taxInput, setTaxInput] = useState("");
  const [tipInput, setTipInput] = useState("");
  const [saleNotes, setSaleNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<ValidateCouponResult | null>(null);
  const [couponValidating, setCouponValidating] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    void dispatch(fetchSalesInitThunk());
  }, [dispatch]);

  // Matches the existing "New Sale" flow from the receipt screen, which
  // navigates back here with a fresh resetSale value to force a clean slate.
  useEffect(() => {
    if (params.resetSale) {
      cart.clearCart();
      setSelectedClient(WALK_IN_CLIENT);
      setExistingSaleId(null);
      setOverallDiscountInput("");
      setTaxInput("");
      setTipInput("");
      setSaleNotes("");
      setCouponCode("");
      setAppliedCoupon(null);
    }
    // Only ever react to the resetSale value changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.resetSale]);

  useEffect(() => {
    if (!params.draftId) {
      return;
    }

    setExistingSaleId(params.draftId);

    dispatch(fetchSaleByIdThunk(params.draftId))
      .unwrap()
      .then((sale) => {
        if (sale.clientId) {
          setSelectedClient({
            avatarBg: "#F2EFE9",
            avatarColor: "#726A63",
            id: sale.clientId,
            initials: sale.clientName.slice(0, 2).toUpperCase(),
            membership: null,
            name: sale.clientName,
            phone: sale.clientPhone,
          });
        }

        sale.lineItems.forEach((lineItem) => {
          if (lineItem.itemType !== "service" && lineItem.itemType !== "product") {
            return;
          }

          cart.addItem({
            itemId: lineItem.itemId ?? lineItem.id,
            itemType: lineItem.itemType,
            name: lineItem.name,
            unitPrice: lineItem.unitPrice,
          });
        });

        setTaxInput(sale.taxAmount ? String(sale.taxAmount) : "");
        setTipInput(sale.tipAmount ? String(sale.tipAmount) : "");
        setOverallDiscountInput(sale.discountAmount ? String(sale.discountAmount) : "");
        setSaleNotes(sale.notes ?? "");
      })
      .catch(() => {
        // Draft may have been completed/removed elsewhere — starting a fresh
        // sale is the safe fallback rather than blocking the screen.
      });
    // Only run when the draftId param itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.draftId]);

  const totals = useMemo(
    () =>
      calculateBillTotals(cart.items, {
        couponDiscount: appliedCoupon?.valid ? appliedCoupon.discountAmount : 0,
        overallDiscount: parseAmount(overallDiscountInput),
        taxAmount: parseAmount(taxInput),
        tipAmount: parseAmount(tipInput),
      }),
    [appliedCoupon, cart.items, overallDiscountInput, taxInput, tipInput],
  );

  const selectedServiceIds = useMemo(
    () =>
      cart.items.reduce<Set<string>>((selectedIds, item) => {
        if (item.itemType === "service") {
          selectedIds.add(item.itemId);
        }

        return selectedIds;
      }, new Set<string>()),
    [cart.items],
  );

  // Cart items can be removed (trash icon, undo-timeout expiry) while the
  // checkout sheet is open; a sheet showing "Charge Rs. 0" for an empty cart
  // would violate "cannot checkout without at least one item," so close it
  // the moment the cart empties out from under it.
  useEffect(() => {
    if (isCheckoutVisible && cart.items.length === 0) {
      setIsCheckoutVisible(false);
    }
  }, [cart.items.length, isCheckoutVisible]);

  const handleSelectServiceResult = useCallback(
    (service: ServiceListItem) => {
      const existing = cart.items.find((item) => item.itemType === "service" && item.itemId === service.id);

      if (existing) {
        return;
      }

      cart.addItem({
        category: service.category,
        duration: service.durationMinutes ? `${service.durationMinutes} min` : undefined,
        itemId: service.id,
        itemType: "service",
        name: service.name,
        unitPrice: service.price,
      });
    },
    [cart],
  );

  const handleSelectProductResult = useCallback(
    (product: Product) => {
      if (product.stockQuantity <= 0) {
        return;
      }

      cart.addItem({
        category: product.category,
        itemId: product.id,
        itemType: "product",
        name: product.name,
        unitPrice: product.price,
      });
    },
    [cart],
  );

  const handleSelectClientResult = useCallback((client: ClientListItem) => {
    setSelectedClient(clientFromListItem(client));
  }, []);

  const handleClearGlobalSearch = useCallback(() => {
    setGlobalSearchQuery("");
    setIsGlobalSearchLoading(false);
    Keyboard.dismiss();
  }, []);

  const handleRemoveItem = useCallback((lineId: string) => {
    const removed = cart.removeItem(lineId);

    if (!removed) {
      return;
    }

    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }

    setUndoNotice(removed);
    undoTimeoutRef.current = setTimeout(() => setUndoNotice(null), 4000);
  }, [cart]);

  const handleToggleServiceSelection = useCallback(
    (service: ServiceListItem) => {
      const existing = cart.items.find((item) => item.itemType === "service" && item.itemId === service.id);

      if (existing) {
        handleRemoveItem(existing.lineId);
        return;
      }

      cart.addItem({
        category: service.category,
        duration: service.durationMinutes ? `${service.durationMinutes} min` : undefined,
        itemId: service.id,
        itemType: "service",
        name: service.name,
        unitPrice: service.price,
      });
    },
    [cart, handleRemoveItem],
  );


  const handleUndoRemove = () => {
    if (undoNotice) {
      cart.restoreItem(undoNotice.item, undoNotice.index);
    }

    setUndoNotice(null);

    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
  };

  const handleApplyCoupon = async () => {
    const trimmedCode = couponCode.trim();

    if (!trimmedCode) {
      return;
    }

    setCouponValidating(true);
    setCouponError(null);

    try {
      const orderAmount = Math.max(0, totals.subtotal - parseAmount(overallDiscountInput));
      const result = await couponService.validateCoupon({ code: trimmedCode, orderAmount });

      if (!result.valid) {
        setCouponError(result.message ?? "This coupon is not valid for this bill.");
        setAppliedCoupon(null);
        return;
      }

      setAppliedCoupon(result);
    } catch (error) {
      setCouponError(error instanceof Error ? error.message : "Unable to validate coupon.");
      setAppliedCoupon(null);
    } finally {
      setCouponValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
  };

  const buildSavePayload = useCallback(
    () => ({
      // Defensive fallback — selectedClient is typed non-nullable, but a null
      // client must never silently reach the request body.
      clientId: (selectedClient ?? WALK_IN_CLIENT).id || undefined,
      discountAmount: totals.overallDiscount + totals.couponDiscount,
      items: cart.toSaleLineItemRequests(),
      notes: saleNotes.trim() || undefined,
      status: "draft" as const,
      taxAmount: totals.taxAmount,
      tipAmount: totals.tipAmount,
    }),
    [cart, saleNotes, selectedClient, totals],
  );

  const persistDraft = useCallback(async () => {
    const payload = buildSavePayload();
    const action = existingSaleId
      ? await dispatch(updateSaleThunk({ saleId: existingSaleId, updates: payload }))
      : await dispatch(createSaleThunk(payload));

    if (createSaleThunk.rejected.match(action) || updateSaleThunk.rejected.match(action)) {
      setSubmitError(getRejectedMessage(action.payload, "Unable to save this sale."));
      return null;
    }

    setExistingSaleId(action.payload.sale.id);
    return action.payload.sale;
  }, [buildSavePayload, dispatch, existingSaleId]);

  const handleSavePending = async () => {
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setSubmitError(null);

    try {
      const sale = await persistDraft();

      if (!sale) {
        return;
      }

      setIsCheckoutVisible(false);
      setCheckoutSucceeded(false);
      router.push({
        params: {
          mode: "preview",
          receipt: sale.receiptNumber,
          saleId: sale.id,
          total: String(totals.grandTotal),
        },
        pathname: "/quick-sale/checkout",
      });
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleCompleteSale = async (payment: { method: SalePaymentMethod; splitEntries?: CheckoutSaleSplitEntry[] }) => {
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setSubmitError(null);

    try {
      const sale = await persistDraft();

      if (!sale) {
        return;
      }

      const checkoutAction = await dispatch(
        checkoutSaleThunk({
          payload: {
            amountPaid: totals.grandTotal,
            paymentMethod: payment.method,
            ...(payment.splitEntries ? { splitEntries: payment.splitEntries } : {}),
          },
          saleId: sale.id,
        }),
      );

      if (checkoutSaleThunk.rejected.match(checkoutAction)) {
        setSubmitError(getRejectedMessage(checkoutAction.payload, "Unable to complete checkout."));
        return;
      }

      void dispatch(fetchDashboardThunk());
      void dispatch(fetchUnreadCountThunk());

      if (selectedClient.id) {
        void dispatch(fetchClientHistoryThunk(selectedClient.id));
      }

      setCheckoutSucceeded(true);
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 520);
      });

      setIsCheckoutVisible(false);
      cart.clearCart();
      setSelectedClient(WALK_IN_CLIENT);
      setExistingSaleId(null);
      setSaleNotes("");
      setCheckoutSucceeded(false);

      router.push({
        params: {
          amountPaid: String(totals.grandTotal),
          paymentMethod: payment.method,
          receipt: checkoutAction.payload.sale.receiptNumber,
          saleId: checkoutAction.payload.sale.id,
          total: String(totals.grandTotal),
        },
        pathname: "/quick-sale/checkout",
      });
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleBack = () => {
    if (globalSearchQuery.trim()) {
      handleClearGlobalSearch();
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/dashboard" as Href);
  };

  const isGlobalSearchActive = globalSearchQuery.trim().length > 0;
  // Checkout/Choose Client/Change Service render above the working screen, so
  // the floating checkout card gets out of the way while any overlay is open.
  const isOverlayActive =
    isGlobalSearchActive || isCheckoutVisible || isClientPickerVisible || Boolean(changeServiceLineId);

  if (initError && !initData) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.84} onPress={handleBack} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quick Sale</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ErrorState message={initError} onRetry={() => void dispatch(fetchSalesInitThunk())} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />

      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.84} onPress={handleBack} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quick Sale</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.topSection}>
        {!isGlobalSearchActive ? (
          <>
            <ClientSummaryCard
              client={selectedClient}
              onPress={() => {
                setClientPickerStartsInCreateMode(false);
                setIsClientPickerVisible(true);
              }}
            />
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => {
                setClientPickerStartsInCreateMode(true);
                setIsClientPickerVisible(true);
              }}
              style={styles.newClientShortcut}
            >
              <Ionicons name="person-add-outline" size={15} color={Colors.primaryDark} />
              <Text style={styles.newClientShortcutText}>New Client</Text>
            </TouchableOpacity>
          </>
        ) : null}

        <View style={styles.searchSpacing}>
          <GlobalSearchBar
            isActive={isGlobalSearchActive}
            isLoading={isGlobalSearchLoading}
            onChangeQuery={setGlobalSearchQuery}
            onClear={handleClearGlobalSearch}
            onFocus={() => undefined}
            query={globalSearchQuery}
          />
        </View>

        {!isGlobalSearchActive ? (
          <>
            <View style={styles.tabRow}>
              {(
                [
                  { key: "services", label: "Services" },
                  { key: "products", label: "Products" },
                  { key: "bill", label: `Bill (${cart.itemCount})` },
                  // Packages has no backend integration yet — shown for
                  // layout parity only, never selectable, never given a
                  // reachable content branch below.
                  { disabled: true, key: "packages", label: "Packages" },
                ] as { disabled?: boolean; key: CatalogTab | "packages"; label: string }[]
              ).map((tab) => {
                const isActive = tab.key === activeTab;

                return (
                  <TouchableOpacity
                    key={tab.key}
                    activeOpacity={tab.disabled ? 1 : 0.84}
                    disabled={tab.disabled}
                    onPress={() => {
                      if (!tab.disabled) {
                        setActiveTab(tab.key as CatalogTab);
                      }
                    }}
                    style={[styles.tab, isActive && styles.tabActive, tab.disabled && styles.tabDisabled]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[styles.tabText, isActive && styles.tabTextActive, tab.disabled && styles.tabTextDisabled]}
                    >
                      {tab.label}
                    </Text>
                    {tab.disabled ? (
                      <View style={styles.comingSoonBadge}>
                        <Text style={styles.comingSoonBadgeText}>Soon</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>

          </>
        ) : null}
      </View>

      <View style={[styles.content, isGlobalSearchActive && styles.searchContent]}>
        {isGlobalSearchActive ? (
          <View style={styles.contentPane}>
            <QuickSaleSearchPanel
              onClear={handleClearGlobalSearch}
              onLoadingChange={setIsGlobalSearchLoading}
              onSelectClient={handleSelectClientResult}
              onSelectProduct={handleSelectProductResult}
              onSelectService={handleSelectServiceResult}
              query={globalSearchQuery}
            />
          </View>
        ) : (
          <View style={styles.contentPane}>
            {initLoading && !initData ? (
              <View style={styles.initLoader}>
                <ActivityIndicator color={Colors.primary} size="large" />
                <Text style={styles.initLoaderText}>Preparing checkout...</Text>
              </View>
            ) : activeTab === "services" ? (
              <ServiceCatalogTab
                onToggle={handleToggleServiceSelection}
                search=""
                selectedServiceIds={selectedServiceIds}
              />
            ) : activeTab === "products" ? (
              <ProductCatalogTab onSelect={handleSelectProductResult} search="" />
            ) : (
              <ScrollView
                contentContainerStyle={styles.billScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.billScroll}
              >
                <CartList
                  allowPriceOverride={allowPriceOverride}
                  items={cart.items}
                  onChangeService={setChangeServiceLineId}
                  onDuplicate={cart.duplicateItem}
                  onRemove={handleRemoveItem}
                  onSetDiscount={cart.setDiscount}
                  onSetNote={cart.setNote}
                  onSetPrice={cart.setPrice}
                  onSetQuantity={cart.setQuantity}
                  onSetStaff={cart.setStaff}
                  staffOptions={initData?.staff ?? []}
                />
                {cart.items.length > 0 ? (
                  <View style={styles.billFooterSummary}>
                    <View style={styles.billFooterRow}>
                      <Text style={styles.billFooterLabel}>Subtotal</Text>
                      <Text style={styles.billFooterValue}>{formatCurrency(totals.lineSubtotal)}</Text>
                    </View>
                    {totals.itemDiscountTotal > 0 ? (
                      <View style={styles.billFooterRow}>
                        <Text style={styles.billFooterLabel}>Item Discount</Text>
                        <Text style={styles.billFooterValueDiscount}>- {formatCurrency(totals.itemDiscountTotal)}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </ScrollView>
            )}
          </View>
        )}
      </View>

      {undoNotice && !isGlobalSearchActive ? (
        <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(120)} style={styles.undoToast}>
          <Text style={styles.undoToastText}>Item removed</Text>
          <TouchableOpacity onPress={handleUndoRemove}>
            <Text style={styles.undoToastAction}>Undo</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : null}

      {!isOverlayActive ? (
        <MiniBillBar
          disabled={cart.items.length === 0}
          grandTotal={totals.grandTotal}
          itemCount={cart.itemCount}
          onCheckout={() => {
            setCheckoutInitialStep("payment");
            setCheckoutSucceeded(false);
            setIsCheckoutVisible(true);
          }}
          onReview={() => {
            setCheckoutInitialStep("review");
            setCheckoutSucceeded(false);
            setIsCheckoutVisible(true);
          }}
        />
      ) : null}

      <ClientPickerSheet
        onClose={() => setIsClientPickerVisible(false)}
        onSelect={(client) => setSelectedClient(client ? clientFromListItem(client) : WALK_IN_CLIENT)}
        startInCreateMode={clientPickerStartsInCreateMode}
        visible={isClientPickerVisible}
      />

      <ChangeServiceModal
        onClose={() => setChangeServiceLineId(null)}
        onSelect={(service) => {
          if (changeServiceLineId) {
            cart.replaceItem(changeServiceLineId, {
              category: service.category,
              duration: service.durationMinutes ? `${service.durationMinutes} min` : undefined,
              itemId: service.id,
              itemType: "service",
              name: service.name,
              unitPrice: service.price,
            });
          }
        }}
        visible={Boolean(changeServiceLineId)}
      />

      <CheckoutSheet
        appliedCoupon={appliedCoupon}
        couponCode={couponCode}
        couponError={couponError}
        couponValidating={couponValidating}
        hasItems={cart.items.length > 0}
        initialStep={checkoutInitialStep}
        isCheckingOut={checkingOut}
        isSaving={saving}
        isSuccess={checkoutSucceeded}
        items={cart.items}
        notes={saleNotes}
        onAddMore={() => setIsCheckoutVisible(false)}
        onApplyCoupon={() => void handleApplyCoupon()}
        onChangeCouponCode={setCouponCode}
        onChangeCustomer={() => {
          setIsCheckoutVisible(false);
          setTimeout(() => setIsClientPickerVisible(true), 280);
        }}
        onChangeNotes={setSaleNotes}
        onChangeOverallDiscount={setOverallDiscountInput}
        onChangeTax={setTaxInput}
        onChangeTip={setTipInput}
        onClose={() => setIsCheckoutVisible(false)}
        onCompleteSale={(payment) => void handleCompleteSale(payment)}
        onRemoveCoupon={handleRemoveCoupon}
        onRemoveItem={handleRemoveItem}
        onSavePending={() => void handleSavePending()}
        onSetQuantity={cart.setQuantity}
        overallDiscountInput={overallDiscountInput}
        selectedClient={selectedClient}
        submitError={submitError ?? saveError ?? checkoutError}
        taxInput={taxInput}
        tipInput={tipInput}
        totals={totals}
        visible={isCheckoutVisible}
      />
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingTop: Spacing.sm,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    height: AppLayout.headerActionSize,
    justifyContent: "center",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    width: AppLayout.headerActionSize,
  },
  // Balances the back button so the title stays centered, but must stay
  // invisible — it previously reused iconButton's card background/border/
  // shadow, which painted a blank white box on the header's right side.
  headerSpacer: {
    height: AppLayout.headerActionSize,
    width: AppLayout.headerActionSize,
  },
  headerTitle: {
    color: Colors.heading,
    fontSize: AppLayout.headerTitleFontSize,
    fontWeight: AppLayout.screenTitleFontWeight,
  },
  topSection: {
    gap: Spacing.sm,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingTop: Spacing.md,
    zIndex: 20,
  },
  searchSpacing: {
    zIndex: 25,
  },
  newClientShortcut: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  newClientShortcutText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
  },
  tabRow: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    flexDirection: "row",
    padding: 4,
  },
  tab: {
    alignItems: "center",
    borderRadius: Radius.full,
    flex: 1,
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    minHeight: 40,
    paddingVertical: 9,
  },
  tabActive: {
    backgroundColor: Colors.card,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  tabDisabled: {
    opacity: 0.6,
  },
  tabText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
  },
  tabTextActive: {
    color: Colors.primaryDark,
  },
  tabTextDisabled: {
    color: Colors.text2,
  },
  comingSoonBadge: {
    backgroundColor: Colors.bg,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  comingSoonBadgeText: {
    color: Colors.text2,
    fontSize: 8,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  content: {
    flex: 1,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingTop: Spacing.sm,
  },
  searchContent: {
    paddingBottom: Spacing.lg,
  },
  contentPane: {
    flex: 1,
  },
  initLoader: {
    alignItems: "center",
    gap: Spacing.sm,
    justifyContent: "center",
    marginTop: Spacing.xxl,
  },
  initLoaderText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
  },
  billScroll: {
    flex: 1,
  },
  // Same MiniBillBar clearance as the Services/Products tabs — without this
  // the last cart line and the discount summary scroll up underneath it.
  billScrollContent: {
    paddingBottom: 132,
  },
  billFooterSummary: {
    backgroundColor: Colors.card,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    marginTop: Spacing.sm,
    borderRadius: AppRadius.card,
    borderColor: Colors.border,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  billFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  billFooterLabel: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "600",
  },
  billFooterValue: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
  },
  billFooterValueDiscount: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: "800",
  },
  undoToast: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.full,
    bottom: 96,
    flexDirection: "row",
    gap: Spacing.md,
    justifyContent: "space-between",
    left: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    position: "absolute",
    right: Spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    zIndex: 40,
  },
  undoToastText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  undoToastAction: {
    color: Colors.gold,
    fontSize: 12,
    fontWeight: "900",
  },
});
