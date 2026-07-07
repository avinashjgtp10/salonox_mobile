import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardColors as Colors,
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";
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
  selectSaleDetail,
  selectSaleSaveError,
  selectSaleSaving,
  selectSalesInitData,
  selectSalesInitError,
  selectSalesInitLoading,
  selectSalesInitRefreshing,
  selectSalesInitStatus,
} from "@/store/sales/sales.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type {
  CreateSaleRequest,
  PosCatalogItem,
  PosClient,
  PosDiscountType,
  PosPaymentMethod,
  SaleDetail,
} from "@/types/sales";

type CartItem = {
  catalogId: string;
  category: "service" | "product";
  duration?: string;
  lineId: string;
  name: string;
  price: number;
  quantity: number;
  staffId?: string;
};

type SheetMode = "client" | "menu" | "settings" | null;
type SplitPayment = {
  amount: string;
  method: Exclude<PosPaymentMethod, "Split Payment">;
};

const INITIAL_SPLIT_PAYMENTS: SplitPayment[] = [
  { method: "Cash", amount: "" },
  { method: "UPI", amount: "" },
];

function formatCurrency(amount: number) {
  return `Rs. ${amount.toLocaleString("en-IN")}`;
}

function parseAmount(value: string) {
  const numeric = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
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

function buildLineItem(item: PosCatalogItem, index: number, defaultStaffId?: string): CartItem {
  return {
    lineId: `${item.id}-${index}`,
    catalogId: item.id,
    category: item.category,
    duration: item.duration,
    name: item.name,
    price: item.price,
    quantity: 1,
    staffId: item.category === "service" ? defaultStaffId : undefined,
  };
}

function PaymentMethodCard({
  isActive,
  label,
  onPress,
}: {
  isActive: boolean;
  label: PosPaymentMethod;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={[styles.paymentCard, isActive && styles.paymentCardActive]}
    >
      <Text style={[styles.paymentCardText, isActive && styles.paymentCardTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function DiscountOptionCard({
  isActive,
  label,
  onPress,
}: {
  isActive: boolean;
  label: PosDiscountType;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={[styles.discountTypeCard, isActive && styles.discountTypeCardActive]}
    >
      <Text
        numberOfLines={2}
        style={[styles.discountTypeText, isActive && styles.discountTypeTextActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SectionCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function QuickSaleScreen() {
  const params = useLocalSearchParams<{ draftId?: string; resetSale?: string }>();
  const dispatch = useAppDispatch();
  const initData = useAppSelector(selectSalesInitData);
  const initError = useAppSelector(selectSalesInitError);
  const initLoading = useAppSelector(selectSalesInitLoading);
  const initRefreshing = useAppSelector(selectSalesInitRefreshing);
  const initStatus = useAppSelector(selectSalesInitStatus);
  const saleDetail = useAppSelector(selectSaleDetail);
  const saleSaving = useAppSelector(selectSaleSaving);
  const saleSaveError = useAppSelector(selectSaleSaveError);
  const saleCheckingOut = useAppSelector(selectSaleCheckingOut);
  const saleCheckoutError = useAppSelector(selectSaleCheckoutError);

  const clients = useMemo(() => initData?.clients ?? [], [initData]);
  const catalog = useMemo(() => initData?.catalog ?? [], [initData]);
  const staffMembers = useMemo(() => initData?.staff ?? [], [initData]);
  const coupons = useMemo(() => initData?.coupons ?? [], [initData]);
  const paymentMethods = initData?.paymentMethods ?? [];
  const discountTypes = initData?.discountTypes ?? [];
  const posSettings = initData?.settings ?? [];
  const receiptNumber = initData?.receiptNumber ?? "QS-0001";
  const taxRate = initData?.taxRate ?? 18;

  useEffect(() => {
    if (initStatus === "idle") {
      void dispatch(fetchSalesInitThunk());
    }
  }, [dispatch, initStatus]);

  const [activeDiscountType, setActiveDiscountType] = useState<PosDiscountType>("Percentage Discount");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [clientQuery, setClientQuery] = useState("");
  const [checkoutHeight, setCheckoutHeight] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [currentSaleId, setCurrentSaleId] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [fixedDiscountValue, setFixedDiscountValue] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>("Cash");
  const [percentageDiscountValue, setPercentageDiscountValue] = useState("10");
  const [saleSearch, setSaleSearch] = useState("");
  const [saveErrorBanner, setSaveErrorBanner] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState("walk-in");
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>(INITIAL_SPLIT_PAYMENTS);
  const deferredClientQuery = useDeferredValue(clientQuery);
  const deferredSaleSearch = useDeferredValue(saleSearch);
  const appliedDraftIdRef = useRef<string | null>(null);

  const resetSaleState = () => {
    setCartItems([]);
    setSelectedClientId("walk-in");
    setNotes("");
    setPaymentMethod("Cash");
    setActiveDiscountType("Percentage Discount");
    setPercentageDiscountValue("10");
    setFixedDiscountValue("");
    setCouponCode("");
    setDraftSavedAt(null);
    setSplitPayments(INITIAL_SPLIT_PAYMENTS);
    setCurrentSaleId(null);
    setSaveErrorBanner(null);
    appliedDraftIdRef.current = null;
  };

  // Resume an existing draft/pending sale passed in as ?draftId=...
  useEffect(() => {
    if (params.draftId && appliedDraftIdRef.current !== params.draftId) {
      void dispatch(fetchSaleByIdThunk(params.draftId));
    }
  }, [dispatch, params.draftId]);

  useEffect(() => {
    if (
      !params.draftId ||
      !saleDetail ||
      saleDetail.id !== params.draftId ||
      appliedDraftIdRef.current === params.draftId ||
      !initData
    ) {
      return;
    }

    appliedDraftIdRef.current = params.draftId;
    setCurrentSaleId(saleDetail.id);

    const matchedClient = clients.find(
      (client) =>
        client.name === saleDetail.clientName || client.mobileNumber === saleDetail.clientPhone,
    );
    setSelectedClientId(matchedClient?.id ?? "walk-in");

    setCartItems(
      saleDetail.lineItems.map((lineItem, index) => ({
        catalogId: lineItem.id,
        category: lineItem.category,
        duration: lineItem.duration,
        lineId: `${lineItem.id}-${index}`,
        name: lineItem.name,
        price: lineItem.price,
        quantity: lineItem.quantity,
        staffId: lineItem.staffName
          ? staffMembers.find((staff) => staff.name === lineItem.staffName)?.id
          : undefined,
      })),
    );
    setNotes(saleDetail.notes ?? "");
    setPaymentMethod(saleDetail.paymentMethod || "Cash");

    // The API only echoes back the resulting discount amount, not the original
    // type/coupon configuration, so resuming a draft approximates it as a fixed
    // rupee discount rather than perfectly restoring percentage/coupon state.
    if (saleDetail.discountAmount > 0) {
      setActiveDiscountType("Fixed Amount Discount");
      setFixedDiscountValue(String(saleDetail.discountAmount));
    }
  }, [clients, initData, params.draftId, saleDetail, staffMembers]);

  useEffect(() => {
    if (!params.resetSale) {
      return;
    }

    const timeoutId = setTimeout(() => {
      resetSaleState();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [params.resetSale]);

  const selectedClient = useMemo<PosClient | undefined>(
    () => clients.find((client) => client.id === selectedClientId),
    [clients, selectedClientId],
  );

  const filteredClients = useMemo(() => {
    const query = deferredClientQuery.trim().toLowerCase();

    if (!query) {
      return clients;
    }

    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        client.mobileNumber.toLowerCase().includes(query),
    );
  }, [clients, deferredClientQuery]);

  const popularItems = useMemo(
    () => catalog.filter((item) => item.isQuickChip),
    [catalog],
  );

  const filteredCatalog = useMemo(() => {
    const query = deferredSaleSearch.trim().toLowerCase();

    if (!query) {
      return catalog;
    }

    return catalog.filter((item) => item.name.toLowerCase().includes(query));
  }, [catalog, deferredSaleSearch]);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  );

  const membershipDiscountPercentage = selectedClient?.membership
    ? selectedClient.membership.includes("VIP")
      ? 15
      : selectedClient.membership.includes("Gold")
        ? 10
        : 7
    : 0;

  const couponMatch = useMemo(
    () => coupons.find((coupon) => coupon.code === couponCode.trim().toUpperCase()),
    [couponCode, coupons],
  );

  const discountAmount = useMemo(() => {
    switch (activeDiscountType) {
      case "Percentage Discount":
        return (subtotal * parseAmount(percentageDiscountValue)) / 100;
      case "Fixed Amount Discount":
        return parseAmount(fixedDiscountValue);
      case "Coupon Code":
        if (!couponMatch) {
          return 0;
        }

        return couponMatch.type === "percentage"
          ? (subtotal * couponMatch.value) / 100
          : couponMatch.value;
      case "Membership Discount":
        return selectedClientId === "walk-in"
          ? 0
          : (subtotal * membershipDiscountPercentage) / 100;
      default:
        return 0;
    }
  }, [
    activeDiscountType,
    couponMatch,
    fixedDiscountValue,
    membershipDiscountPercentage,
    percentageDiscountValue,
    selectedClientId,
    subtotal,
  ]);

  const taxableAmount = Math.max(subtotal - discountAmount, 0);
  const taxAmount = Math.round(taxableAmount * (taxRate / 100));
  const grandTotal = taxableAmount + taxAmount;
  const splitPaidAmount = splitPayments.reduce(
    (sum, payment) => sum + parseAmount(payment.amount),
    0,
  );
  const paidAmount = paymentMethod === "Split Payment" ? splitPaidAmount : grandTotal;
  const outstandingAmount = Math.max(grandTotal - paidAmount, 0);

  const handleBack = () => {
    router.navigate("/dashboard" as Href);
  };

  const addToCart = (item: PosCatalogItem) => {
    startTransition(() => {
      setCartItems((current) => [
        ...current,
        buildLineItem(item, current.length + 1, staffMembers[0]?.id),
      ]);
      setSaleSearch("");
    });
  };

  const updateQuantity = (lineId: string, delta: number) => {
    startTransition(() => {
      setCartItems((current) =>
        current
          .map((item) =>
            item.lineId === lineId
              ? { ...item, quantity: Math.max(item.quantity + delta, 0) }
              : item,
          )
          .filter((item) => item.quantity > 0),
      );
    });
  };

  const removeLineItem = (lineId: string) => {
    startTransition(() => {
      setCartItems((current) => current.filter((item) => item.lineId !== lineId));
    });
  };

  const updateStaffAssignment = (lineId: string, staffId: string) => {
    startTransition(() => {
      setCartItems((current) =>
        current.map((item) => (item.lineId === lineId ? { ...item, staffId } : item)),
      );
    });
  };

  const clearCart = () => {
    setCartItems([]);
    setNotes("");
    setCouponCode("");
    setFixedDiscountValue("");
    setSplitPayments(INITIAL_SPLIT_PAYMENTS);
    setDraftSavedAt(null);
    setSheetMode(null);
  };

  const buildSalePayload = (status: "draft" | "pending"): CreateSaleRequest => ({
    clientId: selectedClientId,
    discount:
      discountAmount > 0
        ? {
            type: activeDiscountType,
            value:
              activeDiscountType === "Percentage Discount"
                ? parseAmount(percentageDiscountValue)
                : discountAmount,
            ...(activeDiscountType === "Coupon Code" && couponCode.trim()
              ? { couponCode: couponCode.trim().toUpperCase() }
              : {}),
          }
        : undefined,
    items: cartItems.map((item) => ({
      catalogId: item.catalogId,
      category: item.category,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      ...(item.staffId ? { staffId: item.staffId } : {}),
    })),
    notes: notes.trim() || undefined,
    status,
  });

  type SaveSaleResult =
    | { kind: "error"; message: string }
    | { kind: "success"; sale: SaleDetail };

  const saveSale = async (status: "draft" | "pending"): Promise<SaveSaleResult> => {
    const payload = buildSalePayload(status);

    if (currentSaleId) {
      const resultAction = await dispatch(updateSaleThunk({ saleId: currentSaleId, updates: payload }));

      if (updateSaleThunk.rejected.match(resultAction)) {
        return {
          kind: "error",
          message: getRejectedMessage(resultAction.payload, "Unable to save sale."),
        };
      }

      setCurrentSaleId(resultAction.payload.sale.id);
      return { kind: "success", sale: resultAction.payload.sale };
    }

    const resultAction = await dispatch(createSaleThunk(payload));

    if (createSaleThunk.rejected.match(resultAction)) {
      return {
        kind: "error",
        message: getRejectedMessage(resultAction.payload, "Unable to save sale."),
      };
    }

    setCurrentSaleId(resultAction.payload.sale.id);
    return { kind: "success", sale: resultAction.payload.sale };
  };

  const handleSaveDraft = async () => {
    if (cartItems.length === 0) {
      setSaveErrorBanner("Add at least one item before saving a draft.");
      setSheetMode(null);
      return;
    }

    setSaveErrorBanner(null);
    setSheetMode(null);

    const result = await saveSale("draft");

    if (result.kind === "error") {
      setSaveErrorBanner(result.message);
      return;
    }

    const now = new Date();
    setDraftSavedAt(
      new Intl.DateTimeFormat("en-IN", {
        hour: "numeric",
        minute: "2-digit",
      }).format(now),
    );
  };

  const handleSelectPaymentMethod = (method: PosPaymentMethod) => {
    setPaymentMethod(method);

    if (method === "Split Payment" && splitPayments.length === 0) {
      setSplitPayments(INITIAL_SPLIT_PAYMENTS);
    }
  };

  const handleCompleteSale = async (mode: "completed" | "preview") => {
    if (cartItems.length === 0) {
      return;
    }

    setSaveErrorBanner(null);

    const paymentLabel =
      paymentMethod === "Split Payment"
        ? splitPayments
            .filter((payment) => parseAmount(payment.amount) > 0)
            .map((payment) => `${payment.method} ${formatCurrency(parseAmount(payment.amount))}`)
            .join(" + ") || "Split Payment"
        : paymentMethod;

    const saveResult = await saveSale("pending");

    if (saveResult.kind === "error") {
      setSaveErrorBanner(saveResult.message);
      return;
    }

    const savedSale = saveResult.sale;

    if (mode === "completed") {
      const checkoutAction = await dispatch(
        checkoutSaleThunk({
          payload: {
            amountPaid: Math.min(paidAmount, grandTotal),
            outstandingAmount,
            paymentMethod,
            ...(paymentMethod === "Split Payment"
              ? {
                  splitPayments: splitPayments
                    .filter((payment) => parseAmount(payment.amount) > 0)
                    .map((payment) => ({
                      amount: parseAmount(payment.amount),
                      method: payment.method,
                    })),
                }
              : {}),
          },
          saleId: savedSale.id,
        }),
      );

      if (checkoutSaleThunk.rejected.match(checkoutAction)) {
        setSaveErrorBanner(
          getRejectedMessage(checkoutAction.payload, "Unable to complete checkout."),
        );
        return;
      }
    }

    router.push({
      pathname: "/quick-sale/checkout",
      params: {
        mode,
        receipt: savedSale.receiptNumber || receiptNumber,
        amountPaid: String(Math.min(paidAmount, grandTotal)),
        paymentMethod: paymentLabel,
        saleId: savedSale.id,
        total: String(grandTotal),
      },
    });
  };

  if (initLoading && !initData) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
        <View style={styles.initStateWrap}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.initStateSubtitle}>Preparing your point of sale...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (initError && !initData) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
        <View style={styles.initStateWrap}>
          <View style={styles.initStateCard}>
            <Ionicons name="cloud-offline-outline" size={26} color={Colors.error} />
            <Text style={styles.initStateTitle}>Unable to load Quick Sale</Text>
            <Text style={styles.initStateSubtitle}>{initError}</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => void dispatch(fetchSalesInitThunk())}
              style={styles.initStateButton}
            >
              <Text style={styles.initStateButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardWrap}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(checkoutHeight - Spacing.md, Spacing.md) },
          ]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              colors={[Colors.primary]}
              onRefresh={() => void dispatch(fetchSalesInitThunk({ refresh: true }))}
              refreshing={initRefreshing}
              tintColor={Colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.headerRow}>
          <TouchableOpacity activeOpacity={0.84} onPress={handleBack} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={18} color={Colors.primary} />
          </TouchableOpacity>

          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Quick Sale</Text>
            <Text style={styles.receiptText}>Receipt #{receiptNumber}</Text>
            {draftSavedAt ? (
              <Text style={styles.draftText}>Draft saved at {draftSavedAt}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => setSheetMode("menu")}
            style={styles.headerButton}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={Colors.heading} />
          </TouchableOpacity>
        </View>

        {saveErrorBanner || saleSaveError || saleCheckoutError ? (
          <View style={styles.saleErrorBanner} accessibilityRole="alert">
            <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
            <Text style={styles.saleErrorBannerText}>
              {saveErrorBanner ?? saleSaveError ?? saleCheckoutError}
            </Text>
          </View>
        ) : null}

        <SectionCard title="Client">
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => setSheetMode("client")}
            style={styles.clientSearchRow}
          >
            <Ionicons name="search-outline" size={18} color={Colors.text2} />
            <Text style={styles.clientSearchText}>Search Client</Text>
          </TouchableOpacity>

          <View style={styles.selectedClientCard}>
            <View style={[styles.clientAvatar, { backgroundColor: selectedClient?.avatarBg ?? "#EEF4F1" }]}>
              <Text style={[styles.clientAvatarText, { color: selectedClient?.avatarColor ?? Colors.primaryDark }]}>
                {selectedClient?.initials ?? "WI"}
              </Text>
            </View>

            <View style={styles.selectedClientCopy}>
              <Text style={styles.selectedClientName}>
                {selectedClient?.name ?? "Walk-in Customer"}
              </Text>
              <Text style={styles.selectedClientPhone}>
                {selectedClient?.mobileNumber ?? "No client selected"}
              </Text>

              {selectedClient?.membership ? (
                <View style={styles.clientMetaRow}>
                  <View style={styles.membershipBadge}>
                    <Ionicons name="diamond-outline" size={12} color={Colors.goldDark} />
                    <Text style={styles.membershipText}>{selectedClient.membership}</Text>
                  </View>
                  <Text style={styles.clientMetaText}>
                    {selectedClient.loyaltyPoints} pts
                  </Text>
                  {selectedClient.walletBalance ? (
                    <Text style={styles.clientMetaText}>
                      Wallet {formatCurrency(selectedClient.walletBalance)}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.clientMetaText}>Default option</Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => router.push("/clients/new")}
            style={styles.inlineButton}
          >
            <Ionicons name="person-add-outline" size={16} color={Colors.primary} />
            <Text style={styles.inlineButtonText}>Add New Client</Text>
          </TouchableOpacity>
        </SectionCard>

        <SectionCard title="Services & Products">
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={18} color={Colors.text2} />
            <TextInput
              onChangeText={setSaleSearch}
              placeholder="Search services or products..."
              placeholderTextColor={Colors.placeholder}
              style={styles.searchInput}
              value={saleSearch}
            />
          </View>

          <View style={styles.quickChipRow}>
            {popularItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.84}
                onPress={() => addToCart(item)}
                style={styles.quickChip}
              >
                <Text style={styles.quickChipText}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {deferredSaleSearch.trim().length > 0 ? (
            <View style={styles.suggestionList}>
              {filteredCatalog.slice(0, 4).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.84}
                  onPress={() => addToCart(item)}
                  style={styles.suggestionRow}
                >
                  <View>
                    <Text style={styles.suggestionName}>{item.name}</Text>
                    <Text style={styles.suggestionMeta}>
                      {item.category === "service" ? item.duration : "Retail product"}
                    </Text>
                  </View>
                  <Text style={styles.suggestionPrice}>{formatCurrency(item.price)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {cartItems.length === 0 ? (
            <View style={styles.emptyCartCard}>
              <Ionicons name="sparkles-outline" size={22} color={Colors.primary} />
              <Text style={styles.emptyCartTitle}>Start a quick sale</Text>
              <Text style={styles.emptyCartSubtitle}>
                Tap a quick chip or search for services and products to build the cart.
              </Text>
            </View>
          ) : (
            <View style={styles.cartList}>
              {cartItems.map((item, index) => {
                const assignedStaff = staffMembers.find((staff) => staff.id === item.staffId);

                return (
                  <Animated.View
                    key={item.lineId}
                    entering={FadeInDown.duration(220)}
                    layout={LinearTransition.duration(180)}
                    style={[styles.cartCard, index > 0 && styles.cartCardSpaced]}
                  >
                    <View style={styles.cartTopRow}>
                      <View style={styles.cartItemCopy}>
                        <Text style={styles.cartItemName}>{item.name}</Text>
                        <Text style={styles.cartItemMeta}>
                          {item.category === "service" ? item.duration : "Retail product"}
                        </Text>
                      </View>
                      <TouchableOpacity
                        activeOpacity={0.84}
                        onPress={() => removeLineItem(item.lineId)}
                        style={styles.deleteButton}
                      >
                        <Ionicons name="trash-outline" size={16} color={Colors.error} />
                      </TouchableOpacity>
                    </View>

                    {item.category === "service" ? (
                      <View style={styles.staffSection}>
                        <Text style={styles.staffLabel}>Assigned Staff</Text>
                        <ScrollView
                          contentContainerStyle={styles.staffChipRow}
                          horizontal
                          showsHorizontalScrollIndicator={false}
                        >
                          {staffMembers.map((staff) => {
                            const isActive = staff.id === item.staffId;

                            return (
                              <TouchableOpacity
                                key={`${item.lineId}-${staff.id}`}
                                activeOpacity={0.84}
                                onPress={() => updateStaffAssignment(item.lineId, staff.id)}
                                style={[styles.staffChip, isActive && styles.staffChipActive]}
                              >
                                <Text
                                  style={[
                                    styles.staffChipText,
                                    isActive && styles.staffChipTextActive,
                                  ]}
                                >
                                  {staff.name.split(" ")[0]}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                        {assignedStaff ? (
                          <Text style={styles.assignedStaffMeta}>{assignedStaff.status}</Text>
                        ) : null}
                      </View>
                    ) : null}

                    <View style={styles.cartBottomRow}>
                      <View style={styles.quantityStepper}>
                        <TouchableOpacity
                          activeOpacity={0.84}
                          onPress={() => updateQuantity(item.lineId, -1)}
                          style={styles.stepperButton}
                        >
                          <Ionicons name="remove" size={16} color={Colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                        <TouchableOpacity
                          activeOpacity={0.84}
                          onPress={() => updateQuantity(item.lineId, 1)}
                          style={styles.stepperButton}
                        >
                          <Ionicons name="add" size={16} color={Colors.primary} />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.lineItemPrice}>
                        {formatCurrency(item.price * item.quantity)}
                      </Text>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </SectionCard>

        <SectionCard title="Discount">
          <View style={styles.discountGrid}>
            {discountTypes.map((discountType) => (
              <DiscountOptionCard
                key={discountType}
                isActive={discountType === activeDiscountType}
                label={discountType}
                onPress={() => setActiveDiscountType(discountType)}
              />
            ))}
          </View>

          {activeDiscountType === "Percentage Discount" ? (
            <View style={styles.discountInputWrap}>
              <Text style={styles.discountHelper}>Apply a quick percentage off the subtotal.</Text>
              <TextInput
                keyboardType="numeric"
                onChangeText={setPercentageDiscountValue}
                placeholder="10"
                placeholderTextColor={Colors.placeholder}
                style={styles.discountInput}
                value={percentageDiscountValue}
              />
            </View>
          ) : null}

          {activeDiscountType === "Fixed Amount Discount" ? (
            <View style={styles.discountInputWrap}>
              <Text style={styles.discountHelper}>Enter a fixed rupee amount to deduct.</Text>
              <TextInput
                keyboardType="numeric"
                onChangeText={setFixedDiscountValue}
                placeholder="150"
                placeholderTextColor={Colors.placeholder}
                style={styles.discountInput}
                value={fixedDiscountValue}
              />
            </View>
          ) : null}

          {activeDiscountType === "Coupon Code" ? (
            <View style={styles.discountInputWrap}>
              <Text style={styles.discountHelper}>Try `GLOW10` or `NEW150`.</Text>
              <TextInput
                autoCapitalize="characters"
                onChangeText={setCouponCode}
                placeholder="Enter coupon code"
                placeholderTextColor={Colors.placeholder}
                style={styles.discountInput}
                value={couponCode}
              />
            </View>
          ) : null}

          {activeDiscountType === "Membership Discount" ? (
            <View style={styles.discountInputWrap}>
              <Text style={styles.discountHelper}>
                {selectedClientId === "walk-in"
                  ? "Select a registered client to unlock membership pricing."
                  : `${selectedClient?.membership} discount applied at ${membershipDiscountPercentage}%`}
              </Text>
            </View>
          ) : null}
        </SectionCard>

        <SectionCard title="Payment Method">
          <View style={styles.paymentGrid}>
            {paymentMethods.map((method) => (
              <PaymentMethodCard
                key={method}
                isActive={paymentMethod === method}
                label={method}
                onPress={() => handleSelectPaymentMethod(method)}
              />
            ))}
          </View>

          {paymentMethod === "Split Payment" ? (
            <View style={styles.splitPaymentList}>
              {splitPayments.map((payment, index) => (
                <View key={`${payment.method}-${index}`} style={styles.splitPaymentRow}>
                  <Text style={styles.splitPaymentMethod}>{payment.method}</Text>
                  <TextInput
                    keyboardType="numeric"
                    onChangeText={(amount) =>
                      setSplitPayments((current) =>
                        current.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, amount } : entry,
                        ),
                      )
                    }
                    placeholder="0"
                    placeholderTextColor={Colors.placeholder}
                    style={styles.splitPaymentInput}
                    value={payment.amount}
                  />
                </View>
              ))}
            </View>
          ) : null}
        </SectionCard>

        <SectionCard title="Notes">
          <TextInput
            multiline
            onChangeText={setNotes}
            placeholder="Add internal notes..."
            placeholderTextColor={Colors.placeholder}
            style={styles.notesInput}
            textAlignVertical="top"
            value={notes}
          />
        </SectionCard>
        <SectionCard title="Payment Summary">
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Discount</Text>
            <Text style={styles.summaryValue}>- {formatCurrency(discountAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>{formatCurrency(taxAmount)}</Text>
          </View>
          {paymentMethod === "Split Payment" ? (
            <>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Outstanding Amount</Text>
                <Text style={styles.summaryValue}>{formatCurrency(outstandingAmount)}</Text>
              </View>
            </>
          ) : null}
        </SectionCard>

      </ScrollView>

        <View
          onLayout={(event) => {
            const nextHeight = Math.ceil(event.nativeEvent.layout.height);

            if (nextHeight !== checkoutHeight) {
              setCheckoutHeight(nextHeight);
            }
          }}
          style={styles.stickyCheckoutWrap}
        >
          <View style={styles.checkoutSection}>
            <View style={styles.checkoutSummary}>
              <Text style={styles.checkoutLabel}>Grand Total</Text>
              <View style={styles.checkoutAmountRow}>
                <Text numberOfLines={1} style={styles.checkoutAmount}>
                  {formatCurrency(grandTotal)}
                </Text>
                <View style={styles.checkoutChevron}>
                  <Ionicons name="chevron-down" size={16} color={Colors.primaryDark} />
                </View>
              </View>
            </View>

            <View style={styles.checkoutActions}>
              <TouchableOpacity
                activeOpacity={0.84}
                disabled={cartItems.length === 0 || saleSaving || saleCheckingOut}
                onPress={() => void handleCompleteSale("preview")}
                style={[
                  styles.printCheckoutButton,
                  (cartItems.length === 0 || saleSaving || saleCheckingOut) && styles.buttonDisabled,
                ]}
              >
                {saleSaving ? (
                  <ActivityIndicator color={Colors.primaryDark} size="small" />
                ) : (
                  <Ionicons name="print-outline" size={22} color={Colors.primaryDark} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.88}
                disabled={cartItems.length === 0 || saleSaving || saleCheckingOut}
                onPress={() => void handleCompleteSale("completed")}
                style={[
                  styles.primaryCheckoutButton,
                  (cartItems.length === 0 || saleSaving || saleCheckingOut) && styles.buttonDisabled,
                ]}
              >
                {saleCheckingOut ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text numberOfLines={1} style={styles.primaryCheckoutButtonText}>
                      Complete Sale
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        animationType="fade"
        onRequestClose={() => setSheetMode(null)}
        transparent
        visible={sheetMode !== null}
      >
        <Pressable onPress={() => setSheetMode(null)} style={styles.modalOverlay}>
          <Pressable style={styles.sheetCard}>
            {sheetMode === "menu" ? (
              <>
                <Text style={styles.sheetTitle}>Quick Actions</Text>
                <TouchableOpacity
                  activeOpacity={0.84}
                  disabled={saleSaving}
                  onPress={() => void handleSaveDraft()}
                  style={styles.sheetAction}
                >
                  <Text style={styles.sheetActionText}>
                    {saleSaving ? "Saving..." : "Save as Draft"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.84} onPress={clearCart} style={styles.sheetAction}>
                  <Text style={styles.sheetActionText}>Clear Cart</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.84}
                  onPress={() => {
                    setSheetMode(null);
                    router.push("/sales" as Href);
                  }}
                  style={styles.sheetAction}
                >
                  <Text style={styles.sheetActionText}>View Sales History</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.84}
                  onPress={() => setSheetMode("settings")}
                  style={styles.sheetAction}
                >
                  <Text style={styles.sheetActionText}>Settings</Text>
                </TouchableOpacity>
              </>
            ) : null}

            {sheetMode === "client" ? (
              <>
                <Text style={styles.sheetTitle}>Select Client</Text>
                <View style={styles.sheetSearchWrap}>
                  <Ionicons name="search-outline" size={18} color={Colors.text2} />
                  <TextInput
                    onChangeText={setClientQuery}
                    placeholder="Search Client"
                    placeholderTextColor={Colors.placeholder}
                    style={styles.sheetSearchInput}
                    value={clientQuery}
                  />
                </View>
                <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
                  {filteredClients.map((client) => (
                    <TouchableOpacity
                      key={client.id}
                      activeOpacity={0.84}
                      onPress={() => {
                        setSelectedClientId(client.id);
                        setSheetMode(null);
                      }}
                      style={styles.clientOptionRow}
                    >
                      <View style={[styles.clientAvatar, { backgroundColor: client.avatarBg }]}>
                        <Text style={[styles.clientAvatarText, { color: client.avatarColor }]}>
                          {client.initials}
                        </Text>
                      </View>
                      <View style={styles.clientOptionCopy}>
                        <Text style={styles.clientOptionName}>{client.name}</Text>
                        <Text style={styles.clientOptionMeta}>{client.mobileNumber}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  activeOpacity={0.84}
                  onPress={() => {
                    setSheetMode(null);
                    router.push("/clients/new");
                  }}
                  style={styles.inlineButton}
                >
                  <Ionicons name="person-add-outline" size={16} color={Colors.primary} />
                  <Text style={styles.inlineButtonText}>Add New Client</Text>
                </TouchableOpacity>
              </>
            ) : null}

            {sheetMode === "settings" ? (
              <>
                <Text style={styles.sheetTitle}>POS Settings</Text>
                {posSettings.map((setting) => (
                  <View key={setting.id} style={styles.settingRow}>
                    <Text style={styles.settingLabel}>{setting.label}</Text>
                    <Text style={styles.settingValue}>{setting.value}</Text>
                  </View>
                ))}
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  keyboardWrap: {
    flex: 1,
  },
  initStateWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: AppLayout.contentHorizontalPadding,
  },
  initStateCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
    width: "100%",
  },
  initStateTitle: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "800",
    marginTop: Spacing.md,
  },
  initStateSubtitle: {
    color: Colors.text2,
    fontSize: 13,
    lineHeight: 20,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  initStateButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    justifyContent: "center",
    marginTop: Spacing.lg,
    minHeight: 46,
    paddingHorizontal: Spacing.xl,
  },
  initStateButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  sheetEmptyText: {
    color: Colors.text2,
    fontSize: 13,
    lineHeight: 20,
    paddingVertical: Spacing.md,
    textAlign: "center",
  },
  saleErrorBanner: {
    alignItems: "center",
    backgroundColor: Colors.errorBg,
    borderColor: "rgba(214, 91, 91, 0.22)",
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: AppLayout.sectionGap,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  saleErrorBannerText: {
    color: Colors.error,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  content: {
    paddingHorizontal: AppLayout.contentHorizontalPadding,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: AppLayout.headerMarginBottom,
  },
  headerButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    height: AppLayout.headerActionSize,
    justifyContent: "center",
    width: AppLayout.headerActionSize,
  },
  headerCopy: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  headerTitle: {
    color: Colors.heading,
    fontSize: AppLayout.headerTitleFontSize,
    fontWeight: AppLayout.screenTitleFontWeight,
  },
  receiptText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
  draftText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    marginBottom: AppLayout.sectionGap,
    padding: AppLayout.cardPadding,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  sectionTitle: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: Spacing.md,
  },
  clientSearchRow: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: AppRadius.search,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  clientSearchText: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "600",
  },
  selectedClientCard: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    padding: Spacing.md,
  },
  clientAvatar: {
    alignItems: "center",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  clientAvatarText: {
    fontSize: 14,
    fontWeight: "800",
  },
  selectedClientCopy: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  selectedClientName: {
    color: Colors.heading,
    fontSize: 15,
    fontWeight: "800",
  },
  selectedClientPhone: {
    color: Colors.text2,
    fontSize: 12,
    marginTop: 4,
  },
  clientMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  membershipBadge: {
    alignItems: "center",
    backgroundColor: "#FBF3E5",
    borderRadius: Radius.full,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  membershipText: {
    color: Colors.goldDark,
    fontSize: 11,
    fontWeight: "700",
  },
  clientMetaText: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "600",
  },
  inlineButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 6,
    marginTop: Spacing.md,
  },
  inlineButtonText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  searchWrap: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: AppLayout.sectionGap,
    minHeight: AppLayout.searchBarHeight,
    paddingHorizontal: AppLayout.searchBarPaddingX,
  },
  searchInput: {
    color: Colors.heading,
    flex: 1,
    fontSize: 14,
    minHeight: AppLayout.searchBarHeight,
  },
  quickChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingBottom: 2,
    paddingRight: 2,
  },
  quickChip: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  quickChipText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
  },
  suggestionList: {
    marginBottom: Spacing.md,
  },
  suggestionRow: {
    alignItems: "center",
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  suggestionName: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "700",
  },
  suggestionMeta: {
    color: Colors.text2,
    fontSize: 11,
    marginTop: 4,
  },
  suggestionPrice: {
    color: Colors.heading,
    fontSize: 12,
    fontWeight: "700",
  },
  emptyCartCard: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderStyle: "dashed",
    borderWidth: 1,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  emptyCartTitle: {
    color: Colors.heading,
    fontSize: 15,
    fontWeight: "800",
    marginTop: Spacing.sm,
  },
  emptyCartSubtitle: {
    color: Colors.text2,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    textAlign: "center",
  },
  cartList: {
    marginTop: Spacing.md,
  },
  cartCard: {
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  cartCardSpaced: {
    marginTop: Spacing.sm,
  },
  cartTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cartItemCopy: {
    flex: 1,
    marginRight: Spacing.md,
  },
  cartItemName: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "800",
  },
  cartItemMeta: {
    color: Colors.text2,
    fontSize: 11,
    marginTop: 4,
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: "#FEECEC",
    borderRadius: Radius.full,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  staffSection: {
    marginTop: Spacing.md,
  },
  staffLabel: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  staffChipRow: {
    gap: 8,
  },
  staffChip: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  staffChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  staffChipText: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "700",
  },
  staffChipTextActive: {
    color: "#FFFFFF",
  },
  assignedStaffMeta: {
    color: Colors.text2,
    fontSize: 11,
    marginTop: 8,
  },
  cartBottomRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.md,
  },
  quantityStepper: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  stepperButton: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  quantityText: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
    minWidth: 24,
    textAlign: "center",
  },
  lineItemPrice: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "800",
  },
  discountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 2,
  },
  discountTypeCard: {
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: Spacing.sm,
    minHeight: 64,
    paddingHorizontal: 10,
    paddingVertical: 12,
    width: "48.5%",
  },
  discountTypeCardActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  discountTypeText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    textAlign: "center",
  },
  discountTypeTextActive: {
    color: "#FFFFFF",
  },
  discountInputWrap: {
    marginTop: Spacing.md,
  },
  discountHelper: {
    color: Colors.text2,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  discountInput: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    color: Colors.heading,
    minHeight: 46,
    paddingHorizontal: Spacing.md,
  },
  summaryRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
  },
  summaryLabel: {
    color: Colors.text2,
    fontSize: 13,
  },
  summaryValue: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "700",
  },
  summaryDivider: {
    backgroundColor: Colors.border,
    height: 1,
    marginVertical: 8,
  },
  grandTotalLabel: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "800",
  },
  grandTotalValue: {
    color: Colors.primaryDark,
    fontSize: 24,
    fontWeight: "800",
  },
  paymentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  paymentCard: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    minWidth: "30%",
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  paymentCardActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  paymentCardText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
  },
  paymentCardTextActive: {
    color: "#FFFFFF",
  },
  splitPaymentList: {
    marginTop: Spacing.md,
  },
  splitPaymentRow: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  splitPaymentMethod: {
    color: Colors.heading,
    fontSize: 12,
    fontWeight: "700",
  },
  splitPaymentInput: {
    color: Colors.heading,
    minWidth: 96,
    textAlign: "right",
  },
  notesInput: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    color: Colors.heading,
    minHeight: 96,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  stickyCheckoutWrap: {
    bottom: 0,
    left: 0,
    paddingHorizontal: Spacing.lg,
    position: "absolute",
    right: 0,
  },
  checkoutSection: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 10,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  checkoutSummary: {
    flex: 1.22,
    minWidth: 0,
  },
  checkoutLabel: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
  },
  checkoutAmountRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
    minWidth: 0,
  },
  checkoutAmount: {
    color: Colors.heading,
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
  },
  checkoutChevron: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  checkoutActions: {
    flexDirection: "row",
    flex: 1.28,
    gap: 10,
    minWidth: 0,
  },
  printCheckoutButton: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  primaryCheckoutButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    flex: 0.82,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 56,
    minWidth: 0,
    paddingHorizontal: 14,
  },
  primaryCheckoutButtonText: {
    color: "#FFFFFF",
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  modalOverlay: {
    backgroundColor: "rgba(36, 59, 52, 0.22)",
    flex: 1,
    justifyContent: "flex-end",
    padding: Spacing.lg,
  },
  sheetCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    maxHeight: "78%",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sheetTitle: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: Spacing.sm,
  },
  sheetAction: {
    paddingVertical: 14,
  },
  sheetActionText: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "600",
  },
  sheetSearchWrap: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: Spacing.md,
  },
  sheetSearchInput: {
    color: Colors.heading,
    flex: 1,
    minHeight: 44,
  },
  sheetList: {
    marginTop: Spacing.md,
  },
  clientOptionRow: {
    alignItems: "center",
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    paddingVertical: 12,
  },
  clientOptionCopy: {
    marginLeft: Spacing.md,
  },
  clientOptionName: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "700",
  },
  clientOptionMeta: {
    color: Colors.text2,
    fontSize: 12,
    marginTop: 4,
  },
  previousSaleRow: {
    alignItems: "center",
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  previousSaleId: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
  },
  previousSaleMeta: {
    color: Colors.text2,
    fontSize: 11,
    marginTop: 4,
  },
  previousSaleRight: {
    alignItems: "flex-end",
  },
  previousSaleAmount: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
  },
  settingRow: {
    alignItems: "center",
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  settingLabel: {
    color: Colors.text2,
    fontSize: 13,
  },
  settingValue: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "700",
  },
});
