import { Text } from "@/components/ui/AppTypography";
import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { isStaffExperienceUser, STAFF_HOME_ROUTE } from "@/utils/routeResolver";
import { appAlert as Alert } from "@/services/appAlert";
import { ToastOverlay } from "@/components/ui/ToastOverlay";
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  type Href,
} from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Keyboard, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLayout } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { ChangeServiceModal } from "@/features/quickSale/components/ChangeServiceModal";
import {
  CheckoutSheet,
  type DiscountApplyTarget,
} from "@/features/quickSale/components/CheckoutSheet";
import { ClientPickerSheet } from "@/features/quickSale/components/ClientPickerSheet";
import { ClientStep } from "@/features/quickSale/components/ClientStep";
import { CategoryChips } from "@/features/quickSale/components/CategoryChips";
import { EmbeddedClientBar } from "@/features/quickSale/components/EmbeddedClientBar";
import { ErrorState } from "@/features/quickSale/components/StateViews";
import { GlobalSearchBar } from "@/features/quickSale/components/GlobalSearchBar";
import { MembershipCatalogTab } from "@/features/quickSale/components/MembershipCatalogTab";
import { MiniBillBar } from "@/features/quickSale/components/MiniBillBar";
import { PackageCatalogTab } from "@/features/quickSale/components/PackageCatalogTab";
import { PackageEligibilityBanner } from "@/features/quickSale/components/PackageEligibilityBanner";
import { ProductCatalogTab } from "@/features/quickSale/components/ProductCatalogTab";
import {
  QuickSaleHeader,
  QuickSaleHeaderAction,
} from "@/features/quickSale/components/QuickSaleHeader";
import { ServiceCatalogTab } from "@/features/quickSale/components/ServiceCatalogTab";
import { StaffPickerSheet } from "@/features/quickSale/components/StaffPickerSheet";
import { StaffSection } from "@/features/quickSale/components/StaffSection";
import { useCart } from "@/features/quickSale/hooks/useCart";
import { useCheckoutSubmissionController } from "@/features/quickSale/hooks/useCheckoutSubmissionController";
import { useClientPackages } from "@/features/quickSale/hooks/useClientPackages";
import { useConsumableProductNames } from "@/features/quickSale/hooks/useConsumableProductNames";
import { useQuickSalePricing } from "@/features/quickSale/hooks/useQuickSalePricing";
import { useRecentClients } from "@/features/quickSale/hooks/useRecentClients";
import { useRedemptions } from "@/features/quickSale/hooks/useRedemptions";
import {
  WALK_IN_CLIENT,
  type CheckoutInitialStep,
  type PendingCheckoutPayment,
  type QuickSaleClient,
  type QuickSaleScreenProps,
} from "@/features/quickSale/types";
import { ITEM_TYPE_CHIPS, type CatalogTab } from "@/features/quickSale/constants";
import { clientFromListItem } from "@/features/quickSale/utils/client";
import {
  runAppointmentCheckout,
  runDraftCheckout,
  type CheckoutOutcome,
} from "@/features/quickSale/utils/checkoutFlow";
import { consumePackageSessions } from "@/features/quickSale/utils/consumePackageSessions";
import { getActionError } from "@/features/quickSale/utils/errors";
import {
  mapDraftSaleToCartItems,
  mapDraftSaleToClient,
  mapDraftSaleToStaff,
} from "@/features/quickSale/utils/draftHydration";
import {
  EMPTY_QUICK_SALE_DIRTY_SIGNATURE,
  getQuickSaleDirtySignature,
} from "@/features/quickSale/utils/dirtyState";
import { amountsReconcile } from "@/features/quickSale/utils/money";
import {
  type ProductStockErrors,
  validateProductStock,
} from "@/features/quickSale/utils/stock";
import { fetchClientHistoryThunk } from "@/middleware/client/client.thunk";
import { fetchDashboardThunk } from "@/middleware/dashboard/dashboard.thunk";
import { fetchUnreadCountThunk } from "@/middleware/notification/notification.thunk";
import {
  checkoutSaleThunk,
  createSaleThunk,
  deleteSaleThunk,
  fetchSaleByIdThunk,
  fetchSalesInitThunk,
  updateSaleThunk,
} from "@/middleware/sales/sales.thunk";
import {
  selectSalesInitData,
  selectSalesInitError,
  selectSalesInitLoading,
} from "@/store/sales/sales.slice";
import { appointmentService } from "@/services/appointment.service";
import { getApiErrorMessage } from "@/services/api";
import { couponService } from "@/services/coupon.service";
import { packageService } from "@/services/package.service";
import {
  getPackageCoveredQuantity,
  getPackageSessionConsumptions,
} from "@/features/quickSale/utils/packageCoverage";
import {
  buildAppointmentPayload as mapAppointmentPayload,
  buildPaymentPayload as mapPaymentPayload,
  buildSaleDraftPayload as mapSaleDraftPayload,
  getQuickSaleStaffId,
} from "@/features/quickSale/utils/quickSalePayloads";
import { paymentService } from "@/services/payment.service";
import { productService } from "@/services/product.service";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ClientListItem } from "@/types/client";
import type { Product } from "@/types/product";
import type { PackageListItem } from "@/types/package";
import type { ValidateCouponResult } from "@/types/coupon";
import type {
  PosStaffMember,
  SaleDetail,
} from "@/types/sales";
import type { ServiceListItem } from "@/types/service";
import type { Membership } from "@/types/membership";

export type { QuickSaleSlot } from "@/features/quickSale/types";

export default function QuickSaleScreen(props: QuickSaleScreenProps = {}) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Redirect href="/login" />;
  if (isStaffExperienceUser(user)) return <Redirect href={STAFF_HOME_ROUTE} />;
  return <OwnerQuickSaleScreen {...props} />;
}

function OwnerQuickSaleScreen({
  embedded = false,
  initialSlot = null,
  onRequestClose,
}: QuickSaleScreenProps = {}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ draftId?: string; resetSale?: string }>();

  const initData = useAppSelector(selectSalesInitData);
  const initLoading = useAppSelector(selectSalesInitLoading);
  const initError = useAppSelector(selectSalesInitError);
  const salonId = useAppSelector(selectActiveBranchId);

  const cart = useCart();
  const checkoutSubmission = useCheckoutSubmissionController();
  const clearCart = cart.clearCart;
  const hydrateCart = cart.hydrateCart;
  const recalculatePackageCoverage = cart.recalculatePackageCoverage;
  const resetCheckoutSubmission = checkoutSubmission.reset;
  const setProductStock = cart.setProductStock;
  const [activeTab, setActiveTab] = useState<CatalogTab>("services");
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [isGlobalSearchLoading, setIsGlobalSearchLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<QuickSaleClient>(WALK_IN_CLIENT);
  const redemptions = useRedemptions(selectedClient.id, salonId);
  const [isClientStepComplete, setIsClientStepComplete] = useState(Boolean(params.draftId) || embedded);
  const [hasClientStepSelection, setHasClientStepSelection] = useState(Boolean(params.draftId));
  const [selectedQuickSaleStaff, setSelectedQuickSaleStaff] = useState<PosStaffMember | null>(null);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [isClientPickerVisible, setIsClientPickerVisible] = useState(false);
  const [isEmbeddedStaffPickerVisible, setIsEmbeddedStaffPickerVisible] = useState(false);
  const [clientPickerStartsInCreateMode, setClientPickerStartsInCreateMode] = useState(false);
  const [changeServiceLineId, setChangeServiceLineId] = useState<string | null>(null);
  const [isCheckoutVisible, setIsCheckoutVisible] = useState(false);
  const [pendingCheckoutPayment, setPendingCheckoutPayment] = useState<PendingCheckoutPayment | null>(null);
  const [shouldResumeCheckoutAtCharges, setShouldResumeCheckoutAtCharges] = useState(false);
  const [checkoutInitialStep, setCheckoutInitialStep] = useState<CheckoutInitialStep>("payment");
  const [shouldShowCheckoutStaffValidation, setShouldShowCheckoutStaffValidation] = useState(false);
  const [isDeletingDraft, setIsDeletingDraft] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(Boolean(params.draftId));
  const [draftLoadError, setDraftLoadError] = useState<string | null>(null);
  const [draftDiscountType, setDraftDiscountType] = useState<"flat" | "percentage">("percentage");
  const [draftDiscountPercent, setDraftDiscountPercent] = useState(0);
  const [discountApplyTo, setDiscountApplyTo] = useState<DiscountApplyTarget[]>([
    "service",
    "product",
    "package",
    "membership",
  ]);
  const [isDiscardDialogVisible, setIsDiscardDialogVisible] = useState(false);
  const [undoNotice, setUndoNotice] = useState<{ item: import("@/features/quickSale/types").CartItem; index: number } | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clientPickerOpenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyBaselineRef = useRef<string | null>(
    params.draftId ? null : EMPTY_QUICK_SALE_DIRTY_SIGNATURE,
  );
  const discardDialogVisibleRef = useRef(false);
  const pendingDiscardRef = useRef<(() => void) | null>(null);
  const allowExpectedExitRef = useRef(false);
  const couponValidationRequestRef = useRef(0);
  const lastValidatedCouponContextRef = useRef<string | null>(null);
  const couponClientIdRef = useRef<string | null>(null);
  const [overallDiscountInput, setOverallDiscountInput] = useState("");
  const [tipInput, setTipInput] = useState("");
  const [saleNotes, setSaleNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<ValidateCouponResult | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  // GST is never typed in — it's computed from each cart item's own catalog
  // tax rate (see calculateCartTaxAmount), matching the web Quick Sale's
  // "Include GST" toggle rather than a free-entry amount.
  const [includeGst, setIncludeGst] = useState(true);
  const [serviceChargeInput, setServiceChargeInput] = useState("");
  const [convenienceFeeInput, setConvenienceFeeInput] = useState("");
  const [otherChargesInput, setOtherChargesInput] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [productStockErrors, setProductStockErrors] = useState<ProductStockErrors>({});
  const [isSaleFinalized, setIsSaleFinalized] = useState(false);
  const { consumableProductNames, resetConsumableProductNames } = useConsumableProductNames(cart.items);
  const recentClients = useRecentClients({
    enabled: !isClientStepComplete && !isClientPickerVisible,
    salonId,
    searchQuery: clientSearchQuery,
  });
  const clientPackages = useClientPackages({
    clientId: selectedClient.id,
    onPackagesLoaded: recalculatePackageCoverage,
    salonId,
  });
  const resetClientPackages = clientPackages.reset;
  const dirtySignature = useMemo(
    () =>
      getQuickSaleDirtySignature({
        appliedCouponCode: appliedCoupon?.valid ? appliedCoupon.couponCode : couponCode,
        cartItems: cart.items,
        convenienceFeeInput,
        draftDiscountPercent,
        draftDiscountType,
        hasClientSelection: hasClientStepSelection,
        includeGst,
        otherChargesInput,
        overallDiscountInput,
        saleNotes,
        selectedStaffId: selectedQuickSaleStaff?.id ?? "",
        selectedClientId: selectedClient.id,
        serviceChargeInput,
        tipInput,
      }),
    [
      appliedCoupon,
      cart.items,
      convenienceFeeInput,
      couponCode,
      draftDiscountPercent,
      draftDiscountType,
      hasClientStepSelection,
      includeGst,
      otherChargesInput,
      overallDiscountInput,
      saleNotes,
      selectedQuickSaleStaff?.id,
      selectedClient.id,
      serviceChargeInput,
      tipInput,
    ],
  );
  const hasUnsavedQuickSale =
    !isSaleFinalized &&
    dirtyBaselineRef.current !== null &&
    dirtySignature !== dirtyBaselineRef.current;

  useEffect(() => {
    void dispatch(fetchSalesInitThunk());
  }, [dispatch]);

  useEffect(() => {
    if (!embedded || !initialSlot?.staffName || selectedQuickSaleStaff || !initData?.staff.length) {
      return;
    }

    const normalizedName = initialSlot.staffName.trim().toLowerCase();
    const matchingStaff = initData.staff.find(
      (staffMember) => staffMember.name.trim().toLowerCase() === normalizedName,
    );
    if (matchingStaff) {
      setSelectedQuickSaleStaff(matchingStaff);
    }
  }, [embedded, initData?.staff, initialSlot?.staffName, selectedQuickSaleStaff]);

  useEffect(
    () => () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
        undoTimeoutRef.current = null;
      }

      if (clientPickerOpenTimeoutRef.current) {
        clearTimeout(clientPickerOpenTimeoutRef.current);
        clientPickerOpenTimeoutRef.current = null;
      }

      couponValidationRequestRef.current += 1;
    },
    [],
  );

  const loadDraft = useCallback(async () => {
    const draftId = params.draftId;
    if (!draftId) {
      setIsLoadingDraft(false);
      setDraftLoadError(null);
      return;
    }

    setIsLoadingDraft(true);
    setDraftLoadError(null);

    const result = await dispatch(fetchSaleByIdThunk(draftId));
    if (fetchSaleByIdThunk.rejected.match(result)) {
      setDraftLoadError(getActionError(result.payload, "Unable to load this draft."));
      setIsLoadingDraft(false);
      return;
    }

    const sale: SaleDetail = result.payload;
    if (sale.status !== "draft") {
      setDraftLoadError("Only draft sales can be edited.");
      setIsLoadingDraft(false);
      return;
    }

    const restoredItems = mapDraftSaleToCartItems(sale);

    hydrateCart(restoredItems);
    setSelectedQuickSaleStaff(mapDraftSaleToStaff(sale));
    setSelectedClient(mapDraftSaleToClient(sale) ?? WALK_IN_CLIENT);
    setIsClientStepComplete(true);
    setHasClientStepSelection(true);
    setTipInput(String(sale.tipAmount || ""));
    setSaleNotes(sale.notes ?? "");
    setIncludeGst(sale.taxAmount > 0);
    setServiceChargeInput("");
    setConvenienceFeeInput("");
    setOtherChargesInput(String(sale.exCharges || ""));
    setDraftDiscountType(sale.discountType ?? "flat");
    setDraftDiscountPercent(sale.discountPercent);
    setCouponError(null);
    setAppliedCoupon(null);
    setCouponCode(sale.couponCode ?? "");

    let couponDiscount = 0;
    if (sale.couponCode) {
      try {
        const validation = await couponService.validateCoupon({
          code: sale.couponCode,
          orderAmount: sale.subtotal,
        });
        if (validation.valid) {
          couponDiscount = validation.discountAmount;
          setAppliedCoupon(validation);
          setCouponCode(validation.couponCode);
          couponClientIdRef.current = sale.clientId ?? "";
        } else {
          setCouponError(validation.message || "The saved coupon is no longer valid.");
        }
      } catch (error) {
        setCouponError(error instanceof Error ? error.message : "Unable to revalidate the saved coupon.");
      }
    }

    const restoredOverallDiscount = Math.max(0, sale.discountAmount - couponDiscount);
    setOverallDiscountInput(String(restoredOverallDiscount || ""));
    lastValidatedCouponContextRef.current =
      sale.couponCode && couponDiscount > 0
        ? `${sale.couponCode.toUpperCase()}|${Math.max(0, sale.subtotal)}`
        : null;

    const productIds = restoredItems
      .filter((item) => item.itemType === "product" && item.itemId)
      .map((item) => item.itemId);
    if (productIds.length > 0) {
      const products = await Promise.allSettled(
        Array.from(new Set(productIds)).map((productId) => productService.fetchProductById(productId)),
      );
      setProductStock(
        Object.fromEntries(
          products.flatMap((product) =>
            product.status === "fulfilled"
              ? [[product.value.id, product.value.stockQuantity] as const]
              : [],
          ),
        ),
      );
    }

    setIsLoadingDraft(false);
  }, [dispatch, hydrateCart, params.draftId, setProductStock]);

  useEffect(() => {
    void loadDraft();
  }, [loadDraft]);

  useEffect(() => {
    if (
      params.draftId &&
      !isLoadingDraft &&
      !draftLoadError &&
      dirtyBaselineRef.current === null
    ) {
      dirtyBaselineRef.current = dirtySignature;
    }
  }, [dirtySignature, draftLoadError, isLoadingDraft, params.draftId]);

  const usesEntireBillDiscount = discountApplyTo.includes("entireBill");
  const effectiveDiscountType = draftDiscountType === "percentage" && usesEntireBillDiscount
    ? "percentage"
    : "flat";
  const {
    isPricingLoading,
    pricingError,
    resetPricing,
    totals,
  } = useQuickSalePricing({
    appliedCoupon,
    buildPricingFlags: redemptions.buildPricingFlags,
    cartItems: cart.items,
    convenienceFeeInput,
    discountPercent: draftDiscountPercent,
    discountType: draftDiscountType,
    discountApplyTo,
    includeGst,
    otherChargesInput,
    overallDiscountInput,
    selectedClientId: selectedClient.id,
    serviceChargeInput,
    tipInput,
  });

  const resetQuickSaleSession = useCallback(() => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }

    if (clientPickerOpenTimeoutRef.current) {
      clearTimeout(clientPickerOpenTimeoutRef.current);
      clientPickerOpenTimeoutRef.current = null;
    }

    couponValidationRequestRef.current += 1;
    lastValidatedCouponContextRef.current = null;
    couponClientIdRef.current = null;
    dirtyBaselineRef.current = EMPTY_QUICK_SALE_DIRTY_SIGNATURE;
    discardDialogVisibleRef.current = false;
    pendingDiscardRef.current = null;

    clearCart();
    resetCheckoutSubmission();
    resetClientPackages();
    resetConsumableProductNames();
    resetPricing();
    setActiveTab("services");
    setGlobalSearchQuery("");
    setIsGlobalSearchLoading(false);
    setSelectedClient(WALK_IN_CLIENT);
    setIsClientStepComplete(false);
    setHasClientStepSelection(false);
    setClientSearchQuery("");
    setIsClientPickerVisible(false);
    setClientPickerStartsInCreateMode(false);
    setChangeServiceLineId(null);
    setIsCheckoutVisible(false);
    setCheckoutInitialStep("payment");
    setShouldShowCheckoutStaffValidation(false);
    setDraftLoadError(null);
    setDraftDiscountType("percentage");
    setDraftDiscountPercent(0);
    setDiscountApplyTo(["service", "product", "package", "membership"]);
    setIsDiscardDialogVisible(false);
    setUndoNotice(null);
    setOverallDiscountInput("");
    setTipInput("");
    setSaleNotes("");
    setCouponCode("");
    setAppliedCoupon(null);
    setCouponError(null);
    setIsApplyingCoupon(false);
    setIncludeGst(true);
    setServiceChargeInput("");
    setConvenienceFeeInput("");
    setOtherChargesInput("");
    setSubmitError(null);
    setProductStockErrors({});
    setIsSaleFinalized(false);
  }, [
    clearCart,
    resetCheckoutSubmission,
    resetClientPackages,
    resetConsumableProductNames,
    resetPricing,
  ]);

  // Matches the existing "New Sale" flow from the receipt screen, which
  // navigates back here with a fresh resetSale value to force a clean slate.
  useEffect(() => {
    if (params.resetSale) {
      allowExpectedExitRef.current = false;
      resetQuickSaleSession();
    }
  }, [params.resetSale, resetQuickSaleSession]);
  const couponOrderAmount = Math.max(0, totals.subtotal);

  const staffOptions = useMemo(() => initData?.staff ?? [], [initData?.staff]);
  const singleEligibleStaff = staffOptions.length === 1 ? staffOptions[0] : null;
  const defaultLineStaff = selectedQuickSaleStaff ?? singleEligibleStaff;

  useEffect(() => {
    if (
      selectedQuickSaleStaff &&
      staffOptions.length > 0 &&
      !staffOptions.some((staffMember) => staffMember.id === selectedQuickSaleStaff.id)
    ) {
      setSelectedQuickSaleStaff(null);
    }
  }, [selectedQuickSaleStaff, staffOptions]);

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

  const handleSelectProductResult = useCallback(
    (product: Product) => {
      if (product.stockQuantity <= 0) {
        return;
      }

      cart.addItem({
        availableStock: product.stockQuantity,
        category: product.category,
        categoryId: product.categoryId,
        defaultStaffId: defaultLineStaff?.id ?? null,
        defaultStaffName: defaultLineStaff?.name ?? null,
        itemId: product.id,
        itemType: "product",
        name: product.name,
        unitPrice: product.price,
      });
    },
    [cart, defaultLineStaff],
  );

  const handleSelectPackageResult = useCallback(
    (item: PackageListItem) => {
      cart.addItem({
        category: item.category,
        defaultStaffId: defaultLineStaff?.id ?? null,
        defaultStaffName: defaultLineStaff?.name ?? null,
        duration: item.durationMinutes ? `${item.durationMinutes} min` : undefined,
        itemId: item.id,
        itemType: "package",
        name: item.name,
        unitPrice: item.basePrice,
      });
    },
    [cart, defaultLineStaff],
  );

  const handleSelectMembershipResult = useCallback(
    (item: Membership) => {
      cart.addItem({
        category: item.sessionType,
        defaultStaffId: defaultLineStaff?.id ?? null,
        defaultStaffName: defaultLineStaff?.name ?? null,
        itemId: item.id,
        itemType: "membership",
        name: item.name,
        taxRate: item.taxRate,
        unitPrice: item.price,
      });
    },
    [cart, defaultLineStaff],
  );

  const handleSelectClientForStep = useCallback((client: ClientListItem | null) => {
    resetCheckoutSubmission();
    setIsCheckoutVisible(false);
    setShouldShowCheckoutStaffValidation(false);
    setSubmitError(null);

    if (hasClientStepSelection && selectedClient.id === (client?.id ?? "")) {
      setSelectedClient(WALK_IN_CLIENT);
      setHasClientStepSelection(false);
      setClientSearchQuery("");
      return;
    }

    setSelectedClient(client ? clientFromListItem(client) : WALK_IN_CLIENT);
    setHasClientStepSelection(true);
    setClientSearchQuery("");
  }, [hasClientStepSelection, resetCheckoutSubmission, selectedClient.id]);

  const handleClientPickerSelect = useCallback((client: ClientListItem | null) => {
    resetCheckoutSubmission();
    setIsCheckoutVisible(false);
    setShouldShowCheckoutStaffValidation(false);
    setSubmitError(null);

    if (hasClientStepSelection && selectedClient.id === (client?.id ?? "")) {
      setSelectedClient(WALK_IN_CLIENT);
      setClientSearchQuery("");
      setHasClientStepSelection(false);
      return;
    }

    setSelectedClient(client ? clientFromListItem(client) : WALK_IN_CLIENT);
    setClientSearchQuery("");
    setHasClientStepSelection(true);
  }, [hasClientStepSelection, resetCheckoutSubmission, selectedClient.id]);

  const handleSelectQuickSaleStaff = useCallback(
    (staffMember: PosStaffMember) => {
      resetCheckoutSubmission();
      setIsCheckoutVisible(false);
      setShouldShowCheckoutStaffValidation(false);
      setSubmitError(null);
      setSelectedQuickSaleStaff(staffMember);
      cart.items.forEach((item) => {
        if (item.itemType !== "quick") {
          cart.setStaff(item.lineId, staffMember.id, staffMember.name);
        }
      });
      Keyboard.dismiss();
    },
    [cart, resetCheckoutSubmission],
  );

  const handleApplyCoupon = useCallback(async () => {
    const trimmedCode = couponCode.trim();

    if (!trimmedCode) {
      setCouponError("Enter a coupon code.");
      return;
    }

    setIsApplyingCoupon(true);
    setCouponError(null);
    const requestId = ++couponValidationRequestRef.current;

    try {
      const result = await couponService.validateCoupon({
        code: trimmedCode,
        orderAmount: couponOrderAmount,
      });

      if (requestId !== couponValidationRequestRef.current) {
        return;
      }

      if (!result.valid) {
        setAppliedCoupon(null);
        lastValidatedCouponContextRef.current = null;
        setCouponError(result.message || "This coupon isn't valid for this bill.");
        return;
      }

      setAppliedCoupon(result);
      setCouponCode(result.couponCode);
      couponClientIdRef.current = selectedClient.id;
      lastValidatedCouponContextRef.current =
        `${result.couponCode.toUpperCase()}|${couponOrderAmount}`;
    } catch (error) {
      if (requestId === couponValidationRequestRef.current) {
        setAppliedCoupon(null);
        lastValidatedCouponContextRef.current = null;
        setCouponError(error instanceof Error ? error.message : "Unable to validate coupon.");
      }
    } finally {
      if (requestId === couponValidationRequestRef.current) {
        setIsApplyingCoupon(false);
      }
    }
  }, [couponCode, couponOrderAmount, selectedClient.id]);

  const handleRemoveCoupon = useCallback(() => {
    couponValidationRequestRef.current += 1;
    lastValidatedCouponContextRef.current = null;
    couponClientIdRef.current = null;
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
    setIsApplyingCoupon(false);
  }, []);

  useEffect(() => {
    if (!appliedCoupon?.valid || couponClientIdRef.current === selectedClient.id) {
      return;
    }

    couponValidationRequestRef.current += 1;
    lastValidatedCouponContextRef.current = null;
    couponClientIdRef.current = null;
    setAppliedCoupon(null);
    setIsApplyingCoupon(false);
    setCouponError("Coupon removed because the selected client changed. Apply it again if eligible.");
  }, [appliedCoupon, selectedClient.id]);

  useEffect(() => {
    if (!appliedCoupon?.valid || couponClientIdRef.current !== selectedClient.id) {
      return;
    }

    const code = appliedCoupon.couponCode.trim();
    const context = `${code.toUpperCase()}|${couponOrderAmount}`;

    if (!code || context === lastValidatedCouponContextRef.current) {
      return;
    }

    const requestId = ++couponValidationRequestRef.current;
    const timeout = setTimeout(() => {
      setIsApplyingCoupon(true);
      setCouponError(null);

      couponService.validateCoupon({ code, orderAmount: couponOrderAmount })
        .then((result) => {
          if (requestId !== couponValidationRequestRef.current) {
            return;
          }

          if (!result.valid) {
            setAppliedCoupon(null);
            lastValidatedCouponContextRef.current = null;
            setCouponError(result.message || "Coupon removed because this bill is no longer eligible.");
            return;
          }

          setAppliedCoupon(result);
          setCouponCode(result.couponCode);
          lastValidatedCouponContextRef.current =
            `${result.couponCode.toUpperCase()}|${couponOrderAmount}`;
        })
        .catch((error) => {
          if (requestId !== couponValidationRequestRef.current) {
            return;
          }

          setAppliedCoupon(null);
          lastValidatedCouponContextRef.current = null;
          setCouponError(
            error instanceof Error
              ? `Coupon removed: ${error.message}`
              : "Coupon removed because it could not be revalidated.",
          );
        })
        .finally(() => {
          if (requestId === couponValidationRequestRef.current) {
            setIsApplyingCoupon(false);
          }
        });
    }, 300);

    return () => {
      clearTimeout(timeout);
      if (requestId === couponValidationRequestRef.current) {
        couponValidationRequestRef.current += 1;
        setIsApplyingCoupon(false);
      }
    };
  }, [appliedCoupon, couponOrderAmount, selectedClient.id]);

  const verifyAppliedCoupon = useCallback(async () => {
    if (!appliedCoupon?.valid) {
      return true;
    }

    const code = appliedCoupon.couponCode;
    const requestId = ++couponValidationRequestRef.current;
    setIsApplyingCoupon(true);
    setCouponError(null);

    try {
      const result = await couponService.validateCoupon({ code, orderAmount: couponOrderAmount });

      if (requestId !== couponValidationRequestRef.current) {
        return false;
      }

      if (!result.valid) {
        setAppliedCoupon(null);
        lastValidatedCouponContextRef.current = null;
        setCouponError(result.message || "Coupon removed because this bill is no longer eligible.");
        return false;
      }

      setAppliedCoupon(result);
      setCouponCode(result.couponCode);
      lastValidatedCouponContextRef.current =
        `${result.couponCode.toUpperCase()}|${couponOrderAmount}`;
      if (!amountsReconcile(result.discountAmount, totals.couponDiscount) || totals.couponRejectedReason) {
        setCouponError("Coupon pricing changed. Review the updated total before continuing.");
        return false;
      }
      return true;
    } catch (error) {
      if (requestId === couponValidationRequestRef.current) {
        setAppliedCoupon(null);
        lastValidatedCouponContextRef.current = null;
        setCouponError(
          error instanceof Error
            ? `Coupon removed: ${error.message}`
            : "Coupon removed because it could not be revalidated.",
        );
      }
      return false;
    } finally {
      if (requestId === couponValidationRequestRef.current) {
        setIsApplyingCoupon(false);
      }
    }
  }, [appliedCoupon, couponOrderAmount, totals.couponDiscount, totals.couponRejectedReason]);

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
    setProductStockErrors((current) => {
      if (!(lineId in current)) {
        return current;
      }

      const next = { ...current };
      delete next[lineId];
      return next;
    });
    undoTimeoutRef.current = setTimeout(() => setUndoNotice(null), 4000);
  }, [cart]);

  const handleSetQuantity = useCallback((lineId: string, quantity: number) => {
    cart.setQuantity(lineId, quantity);
    setProductStockErrors((current) => {
      if (!(lineId in current)) {
        return current;
      }

      const next = { ...current };
      delete next[lineId];
      return next;
    });
  }, [cart]);

  const handleSetConsumableActualQty = useCallback(
    (lineId: string, productId: string, actualQty: number) => {
      cart.setConsumableActualQty(lineId, productId, actualQty);
    },
    [cart],
  );

  const openCheckout = useCallback((step: CheckoutInitialStep) => {
    resetCheckoutSubmission();
    setSubmitError(null);
    setProductStockErrors({});
    if (selectedQuickSaleStaff) {
      cart.items.forEach((item) => {
        if (
          item.itemType !== "quick" &&
          (item.staffId !== selectedQuickSaleStaff.id || item.staffName !== selectedQuickSaleStaff.name)
        ) {
          cart.setStaff(item.lineId, selectedQuickSaleStaff.id, selectedQuickSaleStaff.name);
        }
      });
    }
    const hasServicesMissingStaff = !selectedQuickSaleStaff &&
      cart.items.some((item) => item.itemType === "service" && !item.staffId);
    setShouldShowCheckoutStaffValidation(hasServicesMissingStaff);
    setCheckoutInitialStep(hasServicesMissingStaff ? "review" : step);
    setIsCheckoutVisible(true);
  }, [cart, resetCheckoutSubmission, selectedQuickSaleStaff]);

  const closeCheckout = useCallback(() => {
    setIsCheckoutVisible(false);
    setShouldShowCheckoutStaffValidation(false);
    setSubmitError(null);
    setProductStockErrors({});
  }, []);

  const handleToggleServiceSelection = useCallback(
    (service: ServiceListItem) => {
      const existing = cart.items.find((item) => item.itemType === "service" && item.itemId === service.id);

      if (existing) {
        handleRemoveItem(existing.lineId);
        return;
      }

      cart.addItem({
        category: service.category,
        categoryId: service.categoryId,
        consumables: service.consumablesUsed,
        defaultStaffId: defaultLineStaff?.id ?? null,
        defaultStaffName: defaultLineStaff?.name ?? null,
        duration: service.durationMinutes ? `${service.durationMinutes} min` : undefined,
        itemId: service.id,
        itemType: "service",
        name: service.name,
        taxAmount: service.taxAmount,
        taxRate: service.taxRate,
        unitPrice: service.price,
      });
      if (clientPackages.isReliable) {
        recalculatePackageCoverage(clientPackages.packages);
      }
    },
    [
      cart,
      clientPackages.isReliable,
      clientPackages.packages,
      handleRemoveItem,
      recalculatePackageCoverage,
      defaultLineStaff,
    ],
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

  const getQuickSaleStaff = useCallback(
    () => getQuickSaleStaffId(cart.items, selectedQuickSaleStaff?.id),
    [cart.items, selectedQuickSaleStaff?.id],
  );

  const buildSaleDraftPayload = useCallback(() => {
    return mapSaleDraftPayload({
      appliedCoupon,
      clientId: selectedClient.id,
      discountPercent: draftDiscountPercent,
      discountType: effectiveDiscountType,
      draftId: params.draftId,
      items: cart.toSaleLineItemRequests(),
      notes: saleNotes,
      staffId: getQuickSaleStaff(),
      totals,
    });
  }, [
    appliedCoupon,
    cart,
    draftDiscountPercent,
    effectiveDiscountType,
    getQuickSaleStaff,
    params.draftId,
    saleNotes,
    selectedClient.id,
    totals,
  ]);

  const buildAppointmentPayload = useCallback(() => {
    return mapAppointmentPayload({
      cartItems: cart.items,
      clientId: selectedClient.id,
      discountApplyTo,
      initialSlot,
      notes: saleNotes,
      salonId,
      staffId: getQuickSaleStaff(),
      totals,
    });
  }, [
    cart.items,
    getQuickSaleStaff,
    discountApplyTo,
    initialSlot,
    saleNotes,
    salonId,
    selectedClient.id,
    totals,
  ]);

  const packageCoveredServiceItems = useMemo(
    () =>
      cart.items.filter(
        (item) =>
          item.itemType === "service" &&
          item.packageCoverageClientPackageId &&
          item.packageCoverageServiceId &&
          getPackageCoveredQuantity(item) === item.quantity,
      ),
    [cart.items],
  );
  const isFullyPackageCoveredSale =
    cart.items.length > 0 &&
    packageCoveredServiceItems.length > 0 &&
    packageCoveredServiceItems.length === cart.items.length &&
    totals.grandTotal === 0;
  const packageCatalogTotal = packageCoveredServiceItems.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  );
  const packageSessionConsumptions = useMemo(
    () => getPackageSessionConsumptions(cart.items),
    [cart.items],
  );

  const markPackageSessionsAfterCheckout = useCallback(
    (appointmentId?: string) => consumePackageSessions(packageSessionConsumptions, (consumption) =>
      packageService.completeClientPackageSession(consumption.clientPackageId, {
        appointmentId,
        serviceId: consumption.serviceId,
        staffName: consumption.staffName,
      }),
    ),
    [packageSessionConsumptions],
  );

  const buildPaymentPayload = useCallback(
    (appointmentId: string, payment: PendingCheckoutPayment) =>
      mapPaymentPayload({
        appointmentId,
        appliedCoupon,
        includeGst,
        isFullyPackageCoveredSale,
        notes: saleNotes,
        packageCatalogTotal,
        payment,
        pricingFlags: redemptions.buildPricingFlags(),
        salonId,
        selectedClientId: selectedClient.id,
        totals,
      }),
    [
      appliedCoupon,
      includeGst,
      isFullyPackageCoveredSale,
      packageCatalogTotal,
      redemptions,
      saleNotes,
      salonId,
      selectedClient.id,
      totals,
    ],
  );

  const verifyProductStock = useCallback(async () => {
    const productItems = cart.items.filter((item) => item.itemType === "product");

    if (productItems.length === 0) {
      setProductStockErrors({});
      return true;
    }

    try {
      const products = await Promise.all(
        Array.from(new Set(productItems.map((item) => item.itemId))).map((productId) =>
          productService.fetchProductById(productId),
        ),
      );
      const stockByProductId = Object.fromEntries(
        products.map((product) => [product.id, product.stockQuantity]),
      );
      const errors = validateProductStock(cart.items, stockByProductId);

      cart.setProductStock(stockByProductId);
      setProductStockErrors(errors);

      const firstError = Object.values(errors)[0];
      if (firstError) {
        setSubmitError(firstError);
        return false;
      }

      return true;
    } catch {
      const errors = Object.fromEntries(
        productItems.map((item) => [item.lineId, `Unable to verify stock for ${item.name}.`]),
      );

      setProductStockErrors(errors);
      setSubmitError("Unable to verify current product stock. Check your connection and try again.");
      return false;
    }
  }, [cart]);

  const handleSavePending = async () => {
    if (!checkoutSubmission.begin("saving")) {
      return;
    }

    setSubmitError(null);

    try {
      if (!(await verifyAppliedCoupon())) {
        return;
      }

      if (!(await verifyProductStock())) {
        return;
      }

      const payload = buildSaleDraftPayload();

      let savedSale: SaleDetail;
      if (params.draftId) {
        const action = await dispatch(updateSaleThunk({ saleId: params.draftId, updates: payload }));
        if (!updateSaleThunk.fulfilled.match(action)) {
          setSubmitError(getActionError(action.payload, "Unable to save this draft."));
          return;
        }
        savedSale = action.payload.sale;
      } else {
        const action = await dispatch(createSaleThunk(payload));
        if (!createSaleThunk.fulfilled.match(action)) {
          setSubmitError(getActionError(action.payload, "Unable to save this draft."));
          return;
        }
        savedSale = action.payload.sale;
      }
      setIsCheckoutVisible(false);
      if (!checkoutSubmission.commitSuccess()) {
        return;
      }
      setIsSaleFinalized(true);
      allowExpectedExitRef.current = true;
      router.replace({
        params: {
          draftId: savedSale.id,
          mode: "preview",
          saleId: savedSale.id,
          total: String(savedSale.total || totals.grandTotal),
        },
        pathname: "/quick-sale/checkout",
      });
    } finally {
      checkoutSubmission.finish();
    }
  };

  // After a finished (or payment-recorded) sale, start the next one from the
  // client step with an empty cart.
  const clearFinishedSale = () => {
    cart.clearCart();
    setSelectedClient(WALK_IN_CLIENT);
    setIsClientStepComplete(false);
    setHasClientStepSelection(false);
    setClientSearchQuery("");
    setSaleNotes("");
  };

  const applyCheckoutOutcome = (outcome: CheckoutOutcome) => {
    if (outcome.kind === "failed") {
      setSubmitError(outcome.message);
      return;
    }

    // Every other outcome means the backend already saved the sale or took
    // the payment. Always report it, even if the submission was reset while
    // the request was in flight: staying silent would leave the cart on
    // screen and invite charging the client a second time.
    checkoutSubmission.commitSuccess();
    setIsSaleFinalized(true);

    switch (outcome.kind) {
      case "savedNeedsReview":
        allowExpectedExitRef.current = true;
        setIsCheckoutVisible(false);
        Alert.alert(outcome.title, outcome.message);
        return;

      case "paymentRecordedNeedsFollowUp":
        allowExpectedExitRef.current = true;
        setIsCheckoutVisible(false);
        clearFinishedSale();
        Alert.alert("Payment recorded", outcome.message);
        return;

      case "completed":

        // checkoutSaleThunk already refreshes the dashboard for drafts.
        if (outcome.source === "appointment") {
          void dispatch(fetchDashboardThunk());
        }
        void dispatch(fetchUnreadCountThunk());
        if (selectedClient.id) {
          void dispatch(fetchClientHistoryThunk(selectedClient.id));
        }

        if (!outcome.receipt) {
          setIsCheckoutVisible(false);
          Alert.alert(
            "Sale completed",
            "The sale completed successfully, but the response did not include a valid sale ID. Receipt navigation was stopped to prevent loading the wrong sale.",
          );
          return;
        }

        allowExpectedExitRef.current = true;
        setIsCheckoutVisible(false);
        clearFinishedSale();
        router.replace({ params: outcome.receipt, pathname: "/quick-sale/checkout" });
        // Embedded means this screen lives inside the calendar's <Modal>, a
        // separate native window on Android. The receipt route above replaces
        // the screen UNDERNEATH it, so without closing the modal the operator
        // just sees Quick Sale again and assumes the sale failed.
        onRequestClose?.();
        return;
    }
  };

  const handleCompleteSale = async (payment: PendingCheckoutPayment) => {
    if (embedded && !selectedClient.id) {
      setPendingCheckoutPayment(payment);
      setIsCheckoutVisible(false);
      setClientPickerStartsInCreateMode(true);
      setIsClientPickerVisible(true);
      return;
    }

    if (!checkoutSubmission.begin("checkingOut")) {
      return;
    }

    setSubmitError(null);

    try {
      if (!(await verifyAppliedCoupon())) {
        return;
      }

      if (!(await verifyProductStock())) {
        return;
      }

      const outcome = params.draftId
        ? await runDraftCheckout(
            {
              draftId: params.draftId,
              draftPayload: buildSaleDraftPayload(),
              grandTotal: totals.grandTotal,
              payment,
            },
            {
              checkoutDraft: async (saleId, checkoutPayload) => {
                const action = await dispatch(checkoutSaleThunk({ payload: checkoutPayload, saleId }));
                return checkoutSaleThunk.fulfilled.match(action)
                  ? { ok: true, value: action.payload.sale }
                  : { error: action.payload, ok: false };
              },
              markPackageSessions: () => markPackageSessionsAfterCheckout(),
              updateDraft: async (saleId, updates) => {
                const action = await dispatch(updateSaleThunk({ saleId, updates }));
                return updateSaleThunk.fulfilled.match(action)
                  ? { ok: true, value: action.payload }
                  : { error: action.payload, ok: false };
              },
            },
          )
        : await runAppointmentCheckout(
            {
              appointmentPayload: buildAppointmentPayload(),
              buildPaymentPayload: (appointmentId) => buildPaymentPayload(appointmentId, payment),
              payment,
              totals,
            },
            {
              checkoutAppointment: appointmentService.checkoutAppointment,
              createAppointment: appointmentService.createAppointment,
              createPayment: paymentService.createPayment,
              fetchSaleTotal: async (saleId) => {
                const action = await dispatch(fetchSaleByIdThunk(saleId));
                return fetchSaleByIdThunk.fulfilled.match(action) ? action.payload.total : null;
              },
              markPackageSessions: markPackageSessionsAfterCheckout,
              onPaymentRecorded: () => void redemptions.refreshBalances(),
            },
          );

      applyCheckoutOutcome(outcome);
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
    } finally {
      checkoutSubmission.finish();
    }
  };

  useEffect(() => {
    if (!pendingCheckoutPayment || !selectedClient.id || isClientPickerVisible) {
      return;
    }

    const payment = pendingCheckoutPayment;
    setPendingCheckoutPayment(null);
    requestAnimationFrame(() => void handleCompleteSale(payment));
    // `handleCompleteSale` is deliberately omitted: this effect is driven by
    // the client/picker transition and uses the handler from that render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClientPickerVisible, pendingCheckoutPayment, selectedClient.id]);

  useEffect(() => {
    if (!shouldResumeCheckoutAtCharges || !selectedClient.id || isClientPickerVisible) {
      return;
    }

    setShouldResumeCheckoutAtCharges(false);
    setCheckoutInitialStep("charges");
    setIsCheckoutVisible(true);
  }, [isClientPickerVisible, selectedClient.id, shouldResumeCheckoutAtCharges]);

  const handleDeleteDraft = useCallback(() => {
    const draftId = params.draftId;
    if (!draftId || isDeletingDraft) {
      return;
    }

    Alert.alert(
      "Delete draft?",
      "This saved Quick Sale will be permanently deleted.",
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: () => {
            void (async () => {
              setIsDeletingDraft(true);
              const action = await dispatch(deleteSaleThunk(draftId));
              setIsDeletingDraft(false);

              if (action.meta.requestStatus === "rejected") {
                Alert.alert("Unable to delete draft", getActionError(action.payload, "Please try again."));
                return;
              }

              cart.clearCart();
              setIsSaleFinalized(true);
              allowExpectedExitRef.current = true;
              router.replace("/sales" as Href);
            })();
          },
          style: "destructive",
          text: "Delete",
        },
      ],
    );
  }, [cart, dispatch, isDeletingDraft, params.draftId]);

  const confirmDiscardQuickSale = useCallback(
    (onDiscard: () => void) => {
      if (!hasUnsavedQuickSale) {
        onDiscard();
        return;
      }

      if (discardDialogVisibleRef.current) {
        return;
      }

      discardDialogVisibleRef.current = true;
      pendingDiscardRef.current = onDiscard;
      setIsDiscardDialogVisible(true);
    },
    [hasUnsavedQuickSale],
  );

  const closeDiscardDialog = useCallback(() => {
    discardDialogVisibleRef.current = false;
    pendingDiscardRef.current = null;
    setIsDiscardDialogVisible(false);
  }, []);

  const handleConfirmDiscard = useCallback(() => {
    const onDiscard = pendingDiscardRef.current;

    resetQuickSaleSession();
    onDiscard?.();
  }, [resetQuickSaleSession]);

  const leaveQuickSaleRoute = useCallback(() => {
    allowExpectedExitRef.current = true;

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/dashboard" as Href);
  }, []);

  const handleBack = useCallback(() => {
    if (globalSearchQuery.trim()) {
      handleClearGlobalSearch();
      return;
    }

    if (embedded) {
      confirmDiscardQuickSale(onRequestClose ?? (() => undefined));
      return;
    }

    if (isClientStepComplete && !params.draftId) {
      setIsClientStepComplete(false);
      return;
    }

    confirmDiscardQuickSale(leaveQuickSaleRoute);
  }, [
    confirmDiscardQuickSale,
    embedded,
    globalSearchQuery,
    handleClearGlobalSearch,
    isClientStepComplete,
    leaveQuickSaleRoute,
    params.draftId,
    onRequestClose,
  ]);

  useEffect(() => {
    if (embedded) {
      return;
    }

    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (allowExpectedExitRef.current) {
        allowExpectedExitRef.current = false;
        return;
      }

      if (!hasUnsavedQuickSale) {
        return;
      }

      event.preventDefault();
      confirmDiscardQuickSale(() => {
        allowExpectedExitRef.current = true;
        navigation.dispatch(event.data.action);
      });
    });

    return unsubscribe;
  }, [confirmDiscardQuickSale, embedded, hasUnsavedQuickSale, navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        if (
          isCheckoutVisible ||
          isClientPickerVisible ||
          Boolean(changeServiceLineId)
        ) {
          return false;
        }

        handleBack();
        return true;
      });

      return () => subscription.remove();
    }, [
      changeServiceLineId,
      handleBack,
      isCheckoutVisible,
      isClientPickerVisible,
    ]),
  );

  const discardConfirmationModal = (
    <ConfirmationModal
      cancelLabel="Keep Editing"
      confirmLabel="Discard Sale"
      description={"Leaving now will discard the current Quick Sale.\n\nThis action cannot be undone."}
      onCancel={closeDiscardDialog}
      onConfirm={handleConfirmDiscard}
      title="Discard Quick Sale?"
      visible={isDiscardDialogVisible}
    />
  );

  if (params.draftId && isLoadingDraft) {
    return (
      <>
        <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
          <AppStatusBar />
          <QuickSaleHeader onBack={handleBack} title="Edit Draft" />
          <View style={styles.initLoader}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.initLoaderText}>Loading saved sale...</Text>
          </View>
        </SafeAreaView>
        {discardConfirmationModal}
      </>
    );
  }

  if (params.draftId && draftLoadError) {
    return (
      <>
        <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
          <AppStatusBar />
          <QuickSaleHeader onBack={handleBack} title="Edit Draft" />
          <ErrorState message={draftLoadError} onRetry={() => void loadDraft()} />
        </SafeAreaView>
        {discardConfirmationModal}
      </>
    );
  }

  if (!isClientStepComplete) {
    return (
      <>
        <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
          <AppStatusBar />
          <QuickSaleHeader
            onBack={handleBack}
            right={
              <QuickSaleHeaderAction
                icon="receipt-outline"
                onPress={() => router.push("/sales" as Href)}
              />
            }
            title="Quick Sale"
          />
          <ClientStep
            clients={recentClients.clients}
            error={recentClients.error}
            isLoading={recentClients.isLoading}
            isSearching={recentClients.isSearching}
            onAddNewClient={() => {
              setClientPickerStartsInCreateMode(true);
              setIsClientPickerVisible(true);
            }}
            onChangeSearchQuery={setClientSearchQuery}
            onContinue={() => setIsClientStepComplete(true)}
            onRetry={recentClients.reload}
            onSelectClient={handleSelectClientForStep}
            onViewAllClients={() => {
              setClientPickerStartsInCreateMode(false);
              setIsClientPickerVisible(true);
            }}
            searchQuery={clientSearchQuery}
            selectedClientId={hasClientStepSelection ? selectedClient.id : null}
          />
          <ClientPickerSheet
            onClose={() => setIsClientPickerVisible(false)}
            onSelect={handleClientPickerSelect}
            selectedClientId={hasClientStepSelection ? selectedClient.id : null}
            startInCreateMode={clientPickerStartsInCreateMode}
            visible={isClientPickerVisible}
          />
        </SafeAreaView>
        {discardConfirmationModal}
      </>
    );
  }

  const isGlobalSearchActive = globalSearchQuery.trim().length > 0;
  // Checkout/Choose Client/Change Service render above the working screen, so
  // the floating checkout card gets out of the way while any overlay is open.
  const isOverlayActive =
    isCheckoutVisible || isClientPickerVisible || isEmbeddedStaffPickerVisible || Boolean(changeServiceLineId);

  if (initError && !initData) {
    return (
      <>
        <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
          <AppStatusBar />
          <QuickSaleHeader onBack={handleBack} title="Quick Sale" />
          <ErrorState message={initError} onRetry={() => void dispatch(fetchSalesInitThunk())} />
        </SafeAreaView>
        {discardConfirmationModal}
      </>
    );
  }

  return (
    <>
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        {!embedded ? <AppStatusBar /> : null}

        <QuickSaleHeader
          embedded={embedded}
          layout="leading"
          onBack={handleBack}
          right={
            params.draftId ? (
              <QuickSaleHeaderAction
                color={Colors.error}
                disabled={isDeletingDraft}
                icon="trash-outline"
                isLoading={isDeletingDraft}
                onPress={handleDeleteDraft}
              />
            ) : (
              <QuickSaleHeaderAction
                badgeCount={cart.itemCount}
                disabled={cart.items.length === 0}
                icon="receipt-outline"
                onPress={() => openCheckout("review")}
              />
            )
          }
          subtitle={embedded && initialSlot ? `${initialSlot.date} at ${initialSlot.time}` : null}
          title={params.draftId ? "Edit Draft" : "Quick Sale"}
        />

        <View style={styles.topSection}>
          {embedded ? (
            <EmbeddedClientBar
              hasSelection={hasClientStepSelection}
              onAddClient={() => {
                setPendingCheckoutPayment(null);
                setShouldResumeCheckoutAtCharges(false);
                setClientPickerStartsInCreateMode(true);
                setIsClientPickerVisible(true);
              }}
              onSearchClient={() => {
                setPendingCheckoutPayment(null);
                setShouldResumeCheckoutAtCharges(false);
                setClientPickerStartsInCreateMode(false);
                setIsClientPickerVisible(true);
              }}
              onSelectWalkIn={() => {
                setSelectedClient(WALK_IN_CLIENT);
                setHasClientStepSelection(true);
              }}
              selectedClient={selectedClient}
            />
          ) : null}
          <View style={styles.searchSpacing}>
            <GlobalSearchBar
              isActive={isGlobalSearchActive}
              isLoading={isGlobalSearchLoading}
              onChangeQuery={setGlobalSearchQuery}
              onClear={handleClearGlobalSearch}
              onFocus={() => undefined}
              placeholder="Search service or item"
              query={globalSearchQuery}
            />
          </View>

          <CategoryChips
            onSelect={(nextTab) => setActiveTab((nextTab ?? "services") as CatalogTab)}
            options={ITEM_TYPE_CHIPS}
            selectedId={activeTab}
          />
        </View>

        {selectedClient.id && clientPackages.status === "error" ? (
          <PackageEligibilityBanner error={clientPackages.error} onRetry={clientPackages.retry} />
        ) : null}

        <StaffSection
          embedded={embedded}
          isLoading={initLoading}
          onOpenPicker={() => setIsEmbeddedStaffPickerVisible(true)}
          onSelect={handleSelectQuickSaleStaff}
          selectedStaff={selectedQuickSaleStaff}
          staff={staffOptions}
        />

        <View style={styles.content}>
          <View style={styles.contentPane}>
            {initLoading && !initData ? (
              <View style={styles.initLoader}>
                <ActivityIndicator color={Colors.primary} size="large" />
                <Text style={styles.initLoaderText}>Preparing checkout...</Text>
              </View>
            ) : activeTab === "services" ? (
              <ServiceCatalogTab
                onToggle={handleToggleServiceSelection}
                search={globalSearchQuery}
                selectedServiceIds={selectedServiceIds}
              />
            ) : activeTab === "products" ? (
              <ProductCatalogTab onSelect={handleSelectProductResult} search={globalSearchQuery} />
            ) : activeTab === "packages" ? (
              <PackageCatalogTab
                activeClientPackages={clientPackages.packages}
                onSelect={handleSelectPackageResult}
                salonId={salonId}
                search={globalSearchQuery}
              />
            ) : (
              <MembershipCatalogTab
                clientId={selectedClient.id}
                onSelect={handleSelectMembershipResult}
                salonId={salonId}
                search={globalSearchQuery}
              />
            )}
          </View>
        </View>

        {undoNotice && !isGlobalSearchActive ? (
          <ToastOverlay>
            <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(120)} style={styles.undoToast}>
              <Text style={styles.undoToastText}>Item removed</Text>
              <TouchableOpacity onPress={handleUndoRemove}>
                <Text style={styles.undoToastAction}>Undo</Text>
              </TouchableOpacity>
            </Animated.View>
          </ToastOverlay>
        ) : null}

        {!isOverlayActive ? (
          <MiniBillBar
            disabled={cart.items.length === 0}
            grandTotal={totals.grandTotal}
            itemCount={cart.itemCount}
            onCheckout={() => openCheckout("review")}
          />
        ) : null}

        <ClientPickerSheet
          onClose={() => setIsClientPickerVisible(false)}
          onSelect={handleClientPickerSelect}
          renderInline={embedded}
          selectedClientId={hasClientStepSelection ? selectedClient.id : null}
          startInCreateMode={clientPickerStartsInCreateMode}
          visible={isClientPickerVisible}
        />

        <StaffPickerSheet
          onClose={() => setIsEmbeddedStaffPickerVisible(false)}
          onSelect={(staffId) => {
            const staffMember = initData?.staff.find((item) => item.id === staffId);
            if (staffMember) handleSelectQuickSaleStaff(staffMember);
            setIsEmbeddedStaffPickerVisible(false);
          }}
          renderInline={embedded}
          selectedStaffId={selectedQuickSaleStaff?.id ?? null}
          staff={initData?.staff ?? []}
          visible={embedded && isEmbeddedStaffPickerVisible}
        />

        <ChangeServiceModal
          onClose={() => setChangeServiceLineId(null)}
          onSelect={(service) => {
            if (changeServiceLineId) {
              cart.replaceItem(changeServiceLineId, {
                category: service.category,
                categoryId: service.categoryId,
                consumables: service.consumablesUsed,
                duration: service.durationMinutes ? `${service.durationMinutes} min` : undefined,
                itemId: service.id,
                itemType: "service",
                name: service.name,
                taxAmount: service.taxAmount,
                taxRate: service.taxRate,
                unitPrice: service.price,
              });
              if (clientPackages.isReliable) {
                recalculatePackageCoverage(clientPackages.packages);
              }
            }
          }}
          visible={Boolean(changeServiceLineId)}
        />

        <CheckoutSheet
          appliedCoupon={appliedCoupon}
          couponCode={couponCode}
          couponError={couponError ?? totals.couponRejectedReason ?? null}
          discountApplyTo={discountApplyTo}
          extraCharges={{
            convenienceFee: convenienceFeeInput,
            otherCharges: otherChargesInput,
            serviceCharge: serviceChargeInput,
          }}
          gstPreviewAmount={totals.taxAmount}
          hasItems={cart.items.length > 0}
          includeGst={includeGst}
          initialStep={checkoutInitialStep}
          initialStaffValidationAttempted={shouldShowCheckoutStaffValidation}
          isApplyingCoupon={isApplyingCoupon}
          isCheckingOut={checkoutSubmission.isCheckingOut}
          isPricingLoading={isPricingLoading}
          pricingError={pricingError}
          isSaving={checkoutSubmission.isSaving}
          isSuccess={checkoutSubmission.isSuccess}
          consumableProductNames={consumableProductNames}
          items={cart.items}
          onAddMore={closeCheckout}
          onApplyCoupon={() => void handleApplyCoupon()}
          onAssignStaff={cart.setStaff}
          onChangeCouponCode={(value) => {
            setCouponCode(value);
            setCouponError(null);
          }}
          onChangeDiscountApplyTo={setDiscountApplyTo}
          onChangeCustomer={() => {
            closeCheckout();
            if (clientPickerOpenTimeoutRef.current) {
              clearTimeout(clientPickerOpenTimeoutRef.current);
            }
            clientPickerOpenTimeoutRef.current = setTimeout(() => {
              clientPickerOpenTimeoutRef.current = null;
              setIsClientPickerVisible(true);
            }, 280);
          }}
          onChangeExtraCharge={(key, value) => {
            if (key === "serviceCharge") setServiceChargeInput(value);
            else if (key === "convenienceFee") setConvenienceFeeInput(value);
            else setOtherChargesInput(value);
          }}
          onChangeOverallDiscount={(value, type, percentage) => {
            setOverallDiscountInput(value);
            setDraftDiscountType(type);
            setDraftDiscountPercent(percentage);
          }}
          onChangeTip={setTipInput}
          onClose={closeCheckout}
          onCompleteSale={(payment) => void handleCompleteSale(payment)}
          onRemoveCoupon={handleRemoveCoupon}
          onRemoveItem={handleRemoveItem}
          onRequireClientDetails={embedded
            ? () => {
                setShouldResumeCheckoutAtCharges(true);
                setIsCheckoutVisible(false);
                setClientPickerStartsInCreateMode(true);
                setIsClientPickerVisible(true);
              }
            : undefined}
          onSavePending={() => void handleSavePending()}
          onSetConsumableActualQty={handleSetConsumableActualQty}
          onSetQuantity={handleSetQuantity}
          onToggleIncludeGst={() => setIncludeGst((current) => !current)}
          overallDiscountInput={overallDiscountInput}
          overallDiscountPercent={draftDiscountPercent}
          overallDiscountType={draftDiscountType}
          redemptions={redemptions}
          renderInline={embedded}
          selectedClient={selectedClient}
          staffOptions={initData?.staff ?? []}
          productStockErrors={productStockErrors}
          submitError={submitError}
          tipInput={tipInput}
          totals={totals}
          visible={isCheckoutVisible}
        />
      </SafeAreaView>
      {discardConfirmationModal}
    </>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
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
  content: {
    flex: 1,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingTop: Spacing.sm,
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
  undoToast: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.full,
    flexDirection: "row",
    gap: Spacing.md,
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
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
