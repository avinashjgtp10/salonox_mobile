import { Ionicons } from "@expo/vector-icons";
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  type Href,
} from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { ChangeServiceModal } from "@/features/quickSale/components/ChangeServiceModal";
import { CheckoutSheet } from "@/features/quickSale/components/CheckoutSheet";
import { ClientPickerSheet } from "@/features/quickSale/components/ClientPickerSheet";
import { ClientOptionRow } from "@/features/quickSale/components/ClientOptionRow";
import { CategoryChips, type CategoryChipOption } from "@/features/quickSale/components/CategoryChips";
import { ErrorState } from "@/features/quickSale/components/StateViews";
import { GlobalSearchBar } from "@/features/quickSale/components/GlobalSearchBar";
import { MembershipCatalogTab } from "@/features/quickSale/components/MembershipCatalogTab";
import { MiniBillBar } from "@/features/quickSale/components/MiniBillBar";
import { PackageCatalogTab } from "@/features/quickSale/components/PackageCatalogTab";
import { ProductCatalogTab } from "@/features/quickSale/components/ProductCatalogTab";
import { ServiceCatalogTab } from "@/features/quickSale/components/ServiceCatalogTab";
import { useCart } from "@/features/quickSale/hooks/useCart";
import { useCheckoutSubmissionController } from "@/features/quickSale/hooks/useCheckoutSubmissionController";
import { useDebouncedValue } from "@/features/quickSale/hooks/useDebouncedValue";
import { useRedemptions } from "@/features/quickSale/hooks/useRedemptions";
import { WALK_IN_CLIENT, type CartItem, type QuickSaleClient } from "@/features/quickSale/types";
import { adaptPricingResponseToBillTotals } from "@/features/quickSale/utils/calculations";
import { toConsumableUsagePayload } from "@/features/quickSale/utils/consumables";
import { pricingService } from "@/services/pricing.service";
import type { CalculateTotalsResponse, LineItem as ApiLineItem } from "@/types/pricing";
import {
  EMPTY_QUICK_SALE_DIRTY_SIGNATURE,
  getQuickSaleDirtySignature,
} from "@/features/quickSale/utils/dirtyState";
import { formatCurrency, parseAmount } from "@/features/quickSale/utils/money";
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
import { paymentService } from "@/services/payment.service";
import { productService } from "@/services/product.service";
import { clientService } from "@/services/client.service";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ClientListItem } from "@/types/client";
import type { Product } from "@/types/product";
import type { ClientPackage, PackageListItem } from "@/types/package";
import type { ValidateCouponResult } from "@/types/coupon";
import type {
  CheckoutSaleSplitEntry,
  CreateSaleRequest,
  SaleDetail,
  SalePaymentMethod,
} from "@/types/sales";
import type { ServiceListItem } from "@/types/service";
import type { CreateAppointmentRequest } from "@/types/appointment";
import type { Membership } from "@/types/membership";
import type { CreatePaymentRequest } from "@/types/payment";

type CatalogTab = "services" | "products" | "packages" | "membership";
type CheckoutInitialStep = "review" | "payment";
type ClientPackageLoadStatus = "idle" | "loading" | "loaded" | "error";

type ClientPackageLoadState = {
  clientId: string;
  error: string | null;
  isRetrying: boolean;
  status: ClientPackageLoadStatus;
};

const ITEM_TYPE_CHIPS: CategoryChipOption[] = [
  { id: "services", label: "Services" },
  { id: "products", label: "Products" },
  { id: "packages", label: "Packages" },
  { id: "membership", label: "Memberships" },
];

const clientFromListItem = (client: ClientListItem): QuickSaleClient => ({
  avatarBg: "#e4edf9",
  avatarColor: "#7488a0",
  id: client.id,
  initials: client.initials,
  membership: client.membership,
  name: client.fullName,
  phone: client.phone,
});

const getClientInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "WI";

const getActionError = (payload: unknown, fallback: string) => {
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
  const [isClientStepComplete, setIsClientStepComplete] = useState(Boolean(params.draftId));
  const [hasClientStepSelection, setHasClientStepSelection] = useState(Boolean(params.draftId));
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [quickSaleClientOptions, setQuickSaleClientOptions] = useState<ClientListItem[]>([]);
  const [quickSaleClientsLoading, setQuickSaleClientsLoading] = useState(false);
  const [quickSaleClientsError, setQuickSaleClientsError] = useState<string | null>(null);
  const [quickSaleClientsReloadKey, setQuickSaleClientsReloadKey] = useState(0);
  const [isClientPickerVisible, setIsClientPickerVisible] = useState(false);
  const [clientPickerStartsInCreateMode, setClientPickerStartsInCreateMode] = useState(false);
  const [changeServiceLineId, setChangeServiceLineId] = useState<string | null>(null);
  const [activeClientPackages, setActiveClientPackages] = useState<ClientPackage[]>([]);
  const [activeClientPackagesClientId, setActiveClientPackagesClientId] = useState("");
  const [clientPackageLoadState, setClientPackageLoadState] = useState<ClientPackageLoadState>({
    clientId: "",
    error: null,
    isRetrying: false,
    status: "loaded",
  });
  const [isCheckoutVisible, setIsCheckoutVisible] = useState(false);
  const [checkoutInitialStep, setCheckoutInitialStep] = useState<CheckoutInitialStep>("payment");
  const [shouldShowCheckoutStaffValidation, setShouldShowCheckoutStaffValidation] = useState(false);
  const [isDeletingDraft, setIsDeletingDraft] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(Boolean(params.draftId));
  const [draftLoadError, setDraftLoadError] = useState<string | null>(null);
  const [draftDiscountType, setDraftDiscountType] = useState<"flat" | "percentage">("percentage");
  const [draftDiscountPercent, setDraftDiscountPercent] = useState(0);
  const [isDiscardDialogVisible, setIsDiscardDialogVisible] = useState(false);
  const [undoNotice, setUndoNotice] = useState<{ item: import("@/features/quickSale/types").CartItem; index: number } | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clientPickerOpenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clientPackageRequestIdRef = useRef(0);
  const clientPackageRequestClientIdRef = useRef<string | null>(null);
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
  // Consumable recipe items only carry a productId — this fills in display
  // names for the Actual Qty UI by reusing the existing product-by-id
  // lookup (same call `verifyProductStock` already makes), not a new API.
  const [consumableProductNames, setConsumableProductNames] = useState<Record<string, string>>({});
  const requestedConsumableProductIdsRef = useRef<Set<string>>(new Set());
  const debouncedClientSearchQuery = useDebouncedValue(clientSearchQuery, 260);
  const trimmedClientSearchQuery = debouncedClientSearchQuery.trim();
  const visibleClientOptions = useMemo(
    () => quickSaleClientOptions.slice(0, trimmedClientSearchQuery ? 8 : 3),
    [quickSaleClientOptions, trimmedClientSearchQuery],
  );
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

      clientPackageRequestIdRef.current += 1;
      clientPackageRequestClientIdRef.current = null;
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

    const restoredItems: CartItem[] = sale.lineItems.map((item) => ({
      availableStock: item.itemType === "product" ? 0 : undefined,
      category: null,
      discountAmount: item.discountAmount,
      itemId: item.itemId ?? "",
      itemType:
        item.itemType === "gift_card"
          ? "quick"
          : item.itemType,
      lineId: item.id,
      name: item.name,
      note: "",
      originalUnitPrice: item.unitPrice,
      quantity: item.quantity,
      staffId: item.staffId,
      staffName: item.staffName ?? null,
      taxAmount: item.taxableAmount > 0 ? undefined : item.taxAmount,
      taxRate: item.taxableAmount > 0 ? (item.taxAmount / item.taxableAmount) * 100 : undefined,
      unitPrice: item.unitPrice,
    }));

    hydrateCart(restoredItems);
    setSelectedClient(
      sale.clientId
        ? {
            avatarBg: "#e4edf9",
            avatarColor: "#7488a0",
            id: sale.clientId,
            initials: getClientInitials(sale.clientName),
            membership: null,
            name: sale.clientName,
            phone: sale.clientPhone,
          }
        : WALK_IN_CLIENT,
    );
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
        ? `${sale.couponCode.toUpperCase()}|${Math.max(0, sale.subtotal - restoredOverallDiscount)}`
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

  useEffect(() => {
    let isSubscribed = true;

    if (isClientStepComplete || isClientPickerVisible) {
      return () => {
        isSubscribed = false;
      };
    }

    const query = {
      inactive: false,
      limit: trimmedClientSearchQuery ? 8 : 3,
      offset: 0,
      search: trimmedClientSearchQuery,
      sort_by: "created_at",
      sort_order: "desc" as const,
    };

    setQuickSaleClientsLoading(true);
    setQuickSaleClientsError(null);

    const request = trimmedClientSearchQuery
      ? clientService.searchClients(query, salonId)
      : clientService.getClients(query, salonId);

    request
      .then((response) => {
        if (!isSubscribed) return;
        setQuickSaleClientOptions(response.clients);
      })
      .catch((error) => {
        if (!isSubscribed) return;
        setQuickSaleClientsError(error instanceof Error ? error.message : "Unable to load clients.");
        setQuickSaleClientOptions([]);
      })
      .finally(() => {
        if (isSubscribed) {
          setQuickSaleClientsLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [isClientPickerVisible, isClientStepComplete, quickSaleClientsReloadKey, salonId, trimmedClientSearchQuery]);

  const loadClientPackages = useCallback(
    async (clientId: string, retry = false) => {
      if (!clientId) {
        clientPackageRequestIdRef.current += 1;
        clientPackageRequestClientIdRef.current = null;
        setActiveClientPackages([]);
        setActiveClientPackagesClientId("");
        setClientPackageLoadState({
          clientId: "",
          error: null,
          isRetrying: false,
          status: "loaded",
        });
        recalculatePackageCoverage([]);
        return;
      }

      // A retry button can be tapped rapidly. Reuse the active request for
      // this client instead of starting parallel eligibility checks.
      if (clientPackageRequestClientIdRef.current === clientId) {
        return;
      }

      const requestId = ++clientPackageRequestIdRef.current;
      clientPackageRequestClientIdRef.current = clientId;
      setClientPackageLoadState({
        clientId,
        error: null,
        isRetrying: retry,
        status: "loading",
      });

      try {
        const packages = await packageService.getClientPackages(clientId, salonId);
        if (requestId !== clientPackageRequestIdRef.current) {
          return;
        }

        setActiveClientPackages(packages);
        setActiveClientPackagesClientId(clientId);
        recalculatePackageCoverage(packages);
        setClientPackageLoadState({
          clientId,
          error: null,
          isRetrying: false,
          status: "loaded",
        });
      } catch (error) {
        if (requestId !== clientPackageRequestIdRef.current) {
          return;
        }

        // Keep the last successfully priced cart intact. An error is not
        // equivalent to a verified empty package list, so never recalculate
        // coverage here.
        setClientPackageLoadState({
          clientId,
          error: getApiErrorMessage(error),
          isRetrying: false,
          status: "error",
        });
      } finally {
        if (requestId === clientPackageRequestIdRef.current) {
          clientPackageRequestClientIdRef.current = null;
        }
      }
    },
    [recalculatePackageCoverage, salonId],
  );

  useEffect(() => {
    void loadClientPackages(selectedClient.id);
  }, [loadClientPackages, selectedClient.id]);

  const isClientPackageDataReliable =
    !selectedClient.id ||
    (clientPackageLoadState.clientId === selectedClient.id &&
      clientPackageLoadState.status === "loaded" &&
      activeClientPackagesClientId === selectedClient.id);
  const currentClientPackageLoadStatus: ClientPackageLoadStatus =
    clientPackageLoadState.clientId === selectedClient.id
      ? clientPackageLoadState.status
      : "loading";
  const visibleActiveClientPackages = useMemo(
    () => (activeClientPackagesClientId === selectedClient.id ? activeClientPackages : []),
    [activeClientPackages, activeClientPackagesClientId, selectedClient.id],
  );

  const resetQuickSaleSession = useCallback(() => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }

    if (clientPickerOpenTimeoutRef.current) {
      clearTimeout(clientPickerOpenTimeoutRef.current);
      clientPickerOpenTimeoutRef.current = null;
    }

    clientPackageRequestIdRef.current += 1;
    clientPackageRequestClientIdRef.current = null;
    couponValidationRequestRef.current += 1;
    lastValidatedCouponContextRef.current = null;
    couponClientIdRef.current = null;
    dirtyBaselineRef.current = EMPTY_QUICK_SALE_DIRTY_SIGNATURE;
    discardDialogVisibleRef.current = false;
    pendingDiscardRef.current = null;

    clearCart();
    resetCheckoutSubmission();
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
    setActiveClientPackages([]);
    setActiveClientPackagesClientId("");
    setClientPackageLoadState({
      clientId: "",
      error: null,
      isRetrying: false,
      status: "loaded",
    });
    setIsCheckoutVisible(false);
    setCheckoutInitialStep("payment");
    setShouldShowCheckoutStaffValidation(false);
    setDraftLoadError(null);
    setDraftDiscountType("percentage");
    setDraftDiscountPercent(0);
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
    setConsumableProductNames({});
    requestedConsumableProductIdsRef.current = new Set();
    setBackendTotalsResponse(null);
    setIsPricingLoading(false);
    setPricingError(null);
  }, [clearCart, resetCheckoutSubmission]);

  // Matches the existing "New Sale" flow from the receipt screen, which
  // navigates back here with a fresh resetSale value to force a clean slate.
  useEffect(() => {
    if (params.resetSale) {
      allowExpectedExitRef.current = false;
      resetQuickSaleSession();
    }
  }, [params.resetSale, resetQuickSaleSession]);

  const [backendTotalsResponse, setBackendTotalsResponse] = useState<CalculateTotalsResponse | null>(null);
  const [isPricingLoading, setIsPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);

  const extraChargesTotal = useMemo(
    () => parseAmount(serviceChargeInput) + parseAmount(convenienceFeeInput) + parseAmount(otherChargesInput),
    [convenienceFeeInput, otherChargesInput, serviceChargeInput],
  );

  useEffect(() => {
    let isSubscribed = true;

    if (cart.items.length === 0) {
      setBackendTotalsResponse(null);
      setIsPricingLoading(false);
      setPricingError(null);
      return;
    }

    // Mark pricing as stale for the whole debounce + in-flight window (not
    // just once the request starts) so a rapid redemption toggle followed by
    // an immediate "Complete Sale" tap can't submit against a stale total.
    setIsPricingLoading(true);
    setPricingError(null);

    const timer = setTimeout(async () => {
      try {
        const serviceRows: ApiLineItem[] = [];
        const productRows: ApiLineItem[] = [];
        const packageRows: ApiLineItem[] = [];
        const membershipRows: ApiLineItem[] = [];

        cart.items.forEach((item) => {
          const qty = Math.max(1, item.quantity);
          const line: ApiLineItem = {
            price: item.unitPrice,
            qty,
            discount: item.discountAmount,
            total: item.unitPrice * qty - item.discountAmount,
          };
          if (item.itemType === "service") serviceRows.push(line);
          else if (item.itemType === "product") productRows.push(line);
          else if (item.itemType === "package") packageRows.push(line);
          else if (item.itemType === "membership") membershipRows.push(line);
        });

        const response = await pricingService.calculateTotals({
          client_id: selectedClient.id || undefined,
          serviceRows,
          packageRows,
          productRows,
          membershipRows,
          discountType: draftDiscountType === "percentage" ? "percentage" : "flat",
          discountValue: parseAmount(overallDiscountInput),
          couponCode: appliedCoupon?.valid ? appliedCoupon.couponCode : undefined,
          exCharges: extraChargesTotal,
          tip: parseAmount(tipInput),
          includeGst,
          ...redemptions.buildPricingFlags(),
        });

        if (isSubscribed) {
          setBackendTotalsResponse(response);
          setIsPricingLoading(false);
        }
      } catch (err) {
        if (isSubscribed) {
          setPricingError(err instanceof Error ? err.message : "Unable to calculate pricing.");
          setIsPricingLoading(false);
        }
      }
    }, 500);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
    // redemptions is a fresh object every render; only its memoized
    // buildPricingFlags identity matters for re-running this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    cart.items,
    selectedClient.id,
    draftDiscountType,
    overallDiscountInput,
    appliedCoupon,
    extraChargesTotal,
    tipInput,
    includeGst,
    redemptions.buildPricingFlags,
  ]);

  const totals = useMemo(() => {
    if (backendTotalsResponse) {
      return adaptPricingResponseToBillTotals(backendTotalsResponse, {
        couponDiscount: appliedCoupon?.valid ? appliedCoupon.discountAmount : 0,
        exCharges: extraChargesTotal,
        overallDiscount: parseAmount(overallDiscountInput),
        tipAmount: parseAmount(tipInput),
      });
    }

    return {
      appliedEWallet: 0,
      appliedMembershipDiscount: 0,
      appliedMembershipWallet: 0,
      appliedReferralCredit: 0,
      appliedRewardPointsValue: 0,
      couponDiscount: appliedCoupon?.valid ? appliedCoupon.discountAmount : 0,
      exCharges: extraChargesTotal,
      grandTotal: 0,
      itemDiscountTotal: 0,
      lineSubtotal: 0,
      overallDiscount: parseAmount(overallDiscountInput),
      subtotal: 0,
      taxAmount: 0,
      taxableAmount: 0,
      roundOff: 0,
      tipAmount: parseAmount(tipInput),
      taxBreakdown: [],
    };
  }, [backendTotalsResponse, appliedCoupon, extraChargesTotal, overallDiscountInput, tipInput]);
  // The coupon API accepts only `orderAmount`. Tax, tips, and extra charges
  // are deliberately excluded because the backend cannot use them for
  // eligibility. An overall discount reduces the amount the coupon applies
  // to, so changing it must revalidate the coupon.
  const couponOrderAmount = useMemo(
    () => Math.max(0, totals.subtotal - parseAmount(overallDiscountInput)),
    [overallDiscountInput, totals.subtotal],
  );

  // Staff assignment is per line item (matches web), never a silent
  // fallback to "whoever's first in the branch." The one case that skips the
  // picker is when there's truly nothing to choose between.
  const singleEligibleStaff = initData?.staff.length === 1 ? initData.staff[0] : null;

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

  useEffect(() => {
    if (isCheckoutVisible && !isClientPackageDataReliable) {
      setIsCheckoutVisible(false);
      setSubmitError("Package eligibility must be verified before checkout.");
    }
  }, [isCheckoutVisible, isClientPackageDataReliable]);

  // Resolve consumable product names lazily as recipes appear in the cart —
  // never blocks adding a service, and never refetches a name already seen.
  useEffect(() => {
    const missingIds = new Set<string>();

    cart.items.forEach((item) => {
      item.consumables?.forEach((consumable) => {
        if (!requestedConsumableProductIdsRef.current.has(consumable.productId)) {
          missingIds.add(consumable.productId);
        }
      });
    });

    if (missingIds.size === 0) {
      return;
    }

    const idsToFetch = Array.from(missingIds);
    idsToFetch.forEach((id) => requestedConsumableProductIdsRef.current.add(id));

    let isSubscribed = true;

    void Promise.allSettled(idsToFetch.map((id) => productService.fetchProductById(id))).then((results) => {
      if (!isSubscribed) {
        return;
      }

      setConsumableProductNames((current) => {
        const next = { ...current };
        results.forEach((result, index) => {
          const id = idsToFetch[index];
          next[id] = result.status === "fulfilled" ? result.value.name : id;
        });
        return next;
      });
    });

    return () => {
      isSubscribed = false;
    };
  }, [cart.items]);

  const handleSelectProductResult = useCallback(
    (product: Product) => {
      if (product.stockQuantity <= 0) {
        return;
      }

      cart.addItem({
        availableStock: product.stockQuantity,
        category: product.category,
        defaultStaffId: singleEligibleStaff?.id ?? null,
        defaultStaffName: singleEligibleStaff?.name ?? null,
        itemId: product.id,
        itemType: "product",
        name: product.name,
        unitPrice: product.price,
      });
    },
    [cart, singleEligibleStaff],
  );

  const handleSelectPackageResult = useCallback(
    (item: PackageListItem) => {
      cart.addItem({
        category: item.category,
        defaultStaffId: singleEligibleStaff?.id ?? null,
        defaultStaffName: singleEligibleStaff?.name ?? null,
        duration: item.durationMinutes ? `${item.durationMinutes} min` : undefined,
        itemId: item.id,
        itemType: "package",
        name: item.name,
        unitPrice: item.basePrice,
      });
    },
    [cart, singleEligibleStaff],
  );

  const handleSelectMembershipResult = useCallback(
    (item: Membership) => {
      cart.addItem({
        category: item.sessionType,
        defaultStaffId: singleEligibleStaff?.id ?? null,
        defaultStaffName: singleEligibleStaff?.name ?? null,
        itemId: item.id,
        itemType: "membership",
        name: item.name,
        taxRate: item.taxRate,
        unitPrice: item.price,
      });
    },
    [cart, singleEligibleStaff],
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
  }, [appliedCoupon, couponOrderAmount]);

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
    if (!isClientPackageDataReliable) {
      setSubmitError(
        currentClientPackageLoadStatus === "error"
          ? "Package eligibility could not be verified. Retry package loading before checkout."
          : "Package eligibility is still being verified. Please wait.",
      );
      return;
    }

    resetCheckoutSubmission();
    setSubmitError(null);
    setProductStockErrors({});
    const hasServicesMissingStaff = cart.items.some((item) => item.itemType === "service" && !item.staffId);
    setShouldShowCheckoutStaffValidation(hasServicesMissingStaff);
    setCheckoutInitialStep(hasServicesMissingStaff ? "review" : step);
    setIsCheckoutVisible(true);
  }, [cart.items, currentClientPackageLoadStatus, isClientPackageDataReliable, resetCheckoutSubmission]);

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
        consumables: service.consumablesUsed,
        defaultStaffId: singleEligibleStaff?.id ?? null,
        defaultStaffName: singleEligibleStaff?.name ?? null,
        duration: service.durationMinutes ? `${service.durationMinutes} min` : undefined,
        itemId: service.id,
        itemType: "service",
        name: service.name,
        taxAmount: service.taxAmount,
        taxRate: service.taxRate,
        unitPrice: service.price,
      });
      if (isClientPackageDataReliable) {
        recalculatePackageCoverage(visibleActiveClientPackages);
      }
    },
    [
      cart,
      handleRemoveItem,
      isClientPackageDataReliable,
      recalculatePackageCoverage,
      singleEligibleStaff,
      visibleActiveClientPackages,
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

  const getQuickSaleStaff = useCallback(() => {
    const firstServiceStaff = cart.items.find((item) => item.itemType === "service" && item.staffId)?.staffId;
    return firstServiceStaff ?? cart.items.find((item) => item.staffId)?.staffId ?? null;
  }, [cart.items]);

  const getQuickSaleDurationMinutes = useCallback(() => {
    const serviceDuration = cart.items.reduce((total, item) => {
      if (item.itemType !== "service") {
        return total;
      }

      const minutes = item.duration?.match(/\d+/)?.[0];
      return total + (minutes ? Number(minutes) * item.quantity : 0);
    }, 0);

    return Math.max(1, serviceDuration || 30);
  }, [cart.items]);

  const buildSaleDraftPayload = useCallback((): CreateSaleRequest | null => {
    const staffId = getQuickSaleStaff();

    if (!isClientPackageDataReliable) {
      setSubmitError(
        currentClientPackageLoadStatus === "error"
          ? "Package eligibility could not be verified. Retry package loading before saving."
          : "Updating client package coverage. Please wait.",
      );
      return null;
    }

    return {
      clientId: selectedClient.id || (params.draftId ? null : undefined),
      couponCode: appliedCoupon?.valid
        ? appliedCoupon.couponCode
        : params.draftId
          ? null
          : undefined,
      discountAmount: totals.overallDiscount + totals.couponDiscount,
      discountPercent: draftDiscountType === "percentage" ? draftDiscountPercent : undefined,
      discountType: draftDiscountType,
      exCharges: totals.exCharges,
      items: cart.toSaleLineItemRequests(),
      notes: saleNotes.trim() || (params.draftId ? null : undefined),
      staffId: staffId ?? undefined,
      status: "draft",
      taxAmount: totals.taxAmount,
      tipAmount: totals.tipAmount,
    };
  }, [
    appliedCoupon,
    cart,
    draftDiscountPercent,
    draftDiscountType,
    getQuickSaleStaff,
    currentClientPackageLoadStatus,
    isClientPackageDataReliable,
    params.draftId,
    saleNotes,
    selectedClient.id,
    totals.couponDiscount,
    totals.exCharges,
    totals.overallDiscount,
    totals.taxAmount,
    totals.tipAmount,
  ]);

  const buildAppointmentPayload = useCallback((): CreateAppointmentRequest | null => {
    const staffId = getQuickSaleStaff();

    if (!isClientPackageDataReliable) {
      setSubmitError(
        currentClientPackageLoadStatus === "error"
          ? "Package eligibility could not be verified. Retry package loading before checkout."
          : "Updating client package coverage. Please wait.",
      );
      return null;
    }

    const durationMinutes = getQuickSaleDurationMinutes();
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationMinutes * 60_000);
    const serviceItems = cart.items.filter((item) => item.itemType === "service");
    const packageItems = cart.items.filter((item) => item.itemType === "package");
    const productItems = cart.items.filter((item) => item.itemType === "product");
    const membershipItems = cart.items.filter((item) => item.itemType === "membership");
    const firstService = serviceItems[0];

    return {
      ...(selectedClient.id ? { client_id: selectedClient.id } : {}),
      discount_type: "flat",
      discount_value: totals.overallDiscount + totals.couponDiscount,
      duration_minutes: durationMinutes,
      end_time: endDate.toISOString(),
      ex_charges: totals.exCharges,
      // Blended effective rate actually charged on this bill (real tax ÷ real
      // taxable base), not a typed-in figure — 0 whenever GST is toggled off.
      gst_percent: totals.subtotal > 0 ? Math.min(100, (totals.taxAmount / totals.subtotal) * 100) : 0,
      notes: saleNotes.trim() || undefined,
      package_items: packageItems.map((item) => ({
        name: item.name,
        package_id: item.itemId,
        price: item.unitPrice,
        quantity: item.quantity,
        staff_id: item.staffId ?? undefined,
        staff_name: item.staffName,
        start_time: startDate.toISOString(),
      })),
      product_items: productItems.map((item) => ({
        name: item.name,
        price: item.unitPrice,
        product_id: item.itemId,
        quantity: item.quantity,
        staff_id: item.staffId ?? undefined,
        staff_name: item.staffName,
        start_time: startDate.toISOString(),
      })),
      salon_id: salonId ?? undefined,
      scheduled_at: startDate.toISOString(),
      service_id: firstService?.itemId,
      service_name: firstService?.name,
      services: serviceItems.map((item) => ({
        consumables: toConsumableUsagePayload(item.consumables),
        is_package_service: getPackageCoveredQuantity(item) === item.quantity || undefined,
        name: item.name,
        price: item.unitPrice,
        quantity: item.quantity,
        service_id: item.itemId,
        staff_id: item.staffId ?? undefined,
        staff_name: item.staffName,
        time: startDate.toISOString(),
        total: item.unitPrice * Math.max(0, item.quantity - getPackageCoveredQuantity(item)),
      })),
      membership_items: membershipItems.map((item) => ({
        membership_id: item.itemId,
        name: item.name,
        price: item.unitPrice,
        quantity: item.quantity,
        staff_id: item.staffId ?? undefined,
        staff_name: item.staffName,
        start_time: startDate.toISOString(),
      })),
      ...(staffId ? { staff_id: staffId } : {}),
      start_time: startDate.toISOString(),
      status: "booked",
      tip_amount: totals.tipAmount,
    };
  }, [
    cart.items,
    getQuickSaleDurationMinutes,
    getQuickSaleStaff,
    currentClientPackageLoadStatus,
    isClientPackageDataReliable,
    saleNotes,
    salonId,
    selectedClient.id,
    totals.couponDiscount,
    totals.exCharges,
    totals.overallDiscount,
    totals.subtotal,
    totals.taxAmount,
    totals.tipAmount,
  ]);

  const createQuickSaleAppointment = useCallback(async () => {
    const payload = buildAppointmentPayload();

    if (!payload) {
      return null;
    }

    try {
      return await appointmentService.createAppointment(payload);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create appointment.");
      return null;
    }
  }, [buildAppointmentPayload]);

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

  const markPackageSessions = useCallback(
    async (appointmentId?: string) => {
      for (const consumption of packageSessionConsumptions) {
        for (let session = 0; session < consumption.quantity; session += 1) {
          await packageService.completeClientPackageSession(consumption.clientPackageId, {
            appointmentId,
            serviceId: consumption.serviceId,
            staffName: consumption.staffName,
          });
        }
      }
    },
    [packageSessionConsumptions],
  );

  const markPackageSessionsAfterCheckout = useCallback(
    async (appointmentId?: string) => {
      if (packageSessionConsumptions.length === 0) {
        return;
      }

      try {
        await markPackageSessions(appointmentId);
      } catch (error) {
        console.error("[Quick Sale] Package session consumption failed after checkout", {
          message: error instanceof Error ? error.message : "Unknown package completion error",
        });
      }
    },
    [markPackageSessions, packageSessionConsumptions.length],
  );

  const buildPaymentPayload = useCallback(
    (
      appointmentId: string,
      payment: { method: SalePaymentMethod; paidAmount?: number; splitEntries?: CheckoutSaleSplitEntry[] },
    ): CreatePaymentRequest => {
      const paidAmount = isFullyPackageCoveredSale
        ? 0
        : Math.max(0, Math.min(payment.paidAmount ?? totals.grandTotal, totals.grandTotal));
      const dueAmount = isFullyPackageCoveredSale ? 0 : Math.max(0, totals.grandTotal - paidAmount);
      const methodLabel =
        isFullyPackageCoveredSale
          ? "Package"
          : payment.method === "split"
          ? "Split"
          : payment.method === "upi"
            ? "UPI"
            : payment.method === "card"
              ? "Card"
              : "Cash";
      const splitDetails =
        isFullyPackageCoveredSale
          ? { Package: packageCatalogTotal }
          : payment.method === "split" && payment.splitEntries?.length
          ? Object.fromEntries(
              payment.splitEntries.map((entry) => [
                entry.method === "upi" ? "UPI" : entry.method === "card" ? "Card" : "Cash",
                entry.amount,
              ]),
            )
          : { [methodLabel]: paidAmount };
      const redemptionFlags = redemptions.buildPricingFlags();

      return {
        appointment_id: appointmentId,
        ...(redemptionFlags.applyLoyaltyDiscount ? { apply_loyalty_discount: true } : {}),
        ...(redemptionFlags.applyMembershipDiscount ? { apply_membership_discount: true } : {}),
        ...(redemptionFlags.applyMembershipWallet
          ? { apply_membership_wallet: true, membership_wallet_requested: redemptionFlags.membershipWalletRequested }
          : {}),
        client_id: selectedClient.id || undefined,
        coupon_code: appliedCoupon?.valid ? appliedCoupon.couponCode : undefined,
        coupon_discount_amount: totals.couponDiscount || undefined,
        discount_amount: totals.overallDiscount + totals.couponDiscount,
        due_amount: dueAmount,
        ...(redemptionFlags.applyEwallet ? { ewallet_used: totals.appliedEWallet } : {}),
        gross_amount: isFullyPackageCoveredSale ? packageCatalogTotal : totals.lineSubtotal,
        include_gst: includeGst,
        manual_discount_amount: totals.overallDiscount || undefined,
        net_amount: isFullyPackageCoveredSale ? 0 : totals.grandTotal,
        notes: saleNotes.trim() || undefined,
        ...(isFullyPackageCoveredSale ? { package_covered_amount: packageCatalogTotal } : {}),
        paid_amount: paidAmount,
        payment_method: methodLabel,
        ...(redemptionFlags.applyReferralCredit ? { referral_credit_used: totals.appliedReferralCredit } : {}),
        ...(redemptionFlags.applyRewardPoints
          ? {
              reward_points_used: redemptionFlags.rewardPointsToRedeem,
              reward_points_value: totals.appliedRewardPointsValue,
            }
          : {}),
        salon_id: salonId ?? undefined,
        split_details: splitDetails,
        status: dueAmount > 0 ? "partial" : "completed",
      };
    },
    [
      appliedCoupon,
      includeGst,
      isFullyPackageCoveredSale,
      packageCatalogTotal,
      redemptions,
      saleNotes,
      salonId,
      selectedClient.id,
      totals.appliedEWallet,
      totals.appliedReferralCredit,
      totals.appliedRewardPointsValue,
      totals.couponDiscount,
      totals.grandTotal,
      totals.lineSubtotal,
      totals.overallDiscount,
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
      if (!payload) {
        return;
      }

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

  const handleCompleteSale = async (payment: {
    method: SalePaymentMethod;
    paidAmount?: number;
    splitEntries?: CheckoutSaleSplitEntry[];
  }) => {
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

      if (params.draftId) {
        const draftPayload = buildSaleDraftPayload();
        if (!draftPayload) {
          return;
        }

        const updateAction = await dispatch(
          updateSaleThunk({ saleId: params.draftId, updates: draftPayload }),
        );
        if (!updateSaleThunk.fulfilled.match(updateAction)) {
          setSubmitError(getActionError(updateAction.payload, "Unable to update this draft."));
          return;
        }

        const checkoutAction = await dispatch(
          checkoutSaleThunk({
            payload: {
              amountPaid: totals.grandTotal,
              paymentMethod: payment.method,
              splitEntries: payment.splitEntries,
            },
            saleId: params.draftId,
          }),
        );
        if (!checkoutSaleThunk.fulfilled.match(checkoutAction)) {
          setSubmitError(getActionError(checkoutAction.payload, "Unable to complete checkout."));
          return;
        }

        await markPackageSessionsAfterCheckout();

        const completedSale = checkoutAction.payload.sale;
        if (!checkoutSubmission.commitSuccess()) {
          return;
        }
        setIsSaleFinalized(true);
        if (!completedSale.id) {
          setIsCheckoutVisible(false);
          Alert.alert(
            "Sale completed",
            "The sale completed successfully, but the response did not include a valid sale ID. Receipt navigation was stopped to prevent loading the wrong sale.",
          );
          return;
        }
        allowExpectedExitRef.current = true;
        setIsCheckoutVisible(false);
        cart.clearCart();
        setSelectedClient(WALK_IN_CLIENT);
        setIsClientStepComplete(false);
        setHasClientStepSelection(false);
        setClientSearchQuery("");
        setSaleNotes("");

        router.replace({
          params: {
            amountPaid: String(completedSale.amountPaid || totals.grandTotal),
            paymentMethod: payment.method,
            saleId: completedSale.id,
            total: String(completedSale.total || totals.grandTotal),
          },
          pathname: "/quick-sale/checkout",
        });
        return;
      }

      const appointment = await createQuickSaleAppointment();

      if (!appointment) {
        return;
      }

      const appointmentId = appointment.appointment.id;
      const paymentBody = buildPaymentPayload(appointmentId, payment);
      await paymentService.createPayment(paymentBody);
      void redemptions.refreshBalances();

      const finishAsIncomplete = (message: string) => {
        if (!checkoutSubmission.commitSuccess()) {
          return;
        }
        setIsSaleFinalized(true);
        allowExpectedExitRef.current = true;
        setIsCheckoutVisible(false);
        cart.clearCart();
        setSelectedClient(WALK_IN_CLIENT);
        setIsClientStepComplete(false);
        setHasClientStepSelection(false);
        setClientSearchQuery("");
        setSaleNotes("");
        Alert.alert("Payment recorded", message);
      };

      // Web parity: a partial payment (due_amount > 0) only creates the
      // payment record. Checkout is a separate step that only happens once
      // the full amount has been collected.
      if (paymentBody.status !== "completed") {
        finishAsIncomplete(
          `${formatCurrency(paymentBody.paid_amount)} collected. ${formatCurrency(paymentBody.due_amount)} remains due for this appointment.`,
        );
        return;
      }

      let checkout: Awaited<ReturnType<typeof appointmentService.checkoutAppointment>>;
      try {
        checkout = await appointmentService.checkoutAppointment(appointmentId);
      } catch (checkoutError) {
        // Payment already succeeded — do not report this as a payment
        // failure. There is no retry-checkout surface yet, so we log for
        // diagnosis and tell the operator where to follow up.
        console.error("[Quick Sale] Checkout failed after a successful payment", {
          appointmentId,
          message: checkoutError instanceof Error ? checkoutError.message : "Unknown checkout error",
        });
        finishAsIncomplete(
          "The payment was saved, but the sale could not be finalized automatically. Check Sales History for this client to finish it.",
        );
        return;
      }

      await markPackageSessionsAfterCheckout(appointmentId);

      if (!checkoutSubmission.commitSuccess()) {
        return;
      }
      setIsSaleFinalized(true);

      void dispatch(fetchDashboardThunk());
      void dispatch(fetchUnreadCountThunk());

      if (selectedClient.id) {
        void dispatch(fetchClientHistoryThunk(selectedClient.id));
      }
      if (!checkout.saleId) {
        setIsCheckoutVisible(false);
        Alert.alert(
          "Sale completed",
          "The sale completed successfully, but the response did not include a valid sale ID. Receipt navigation was stopped to prevent loading the wrong sale.",
        );
        return;
      }
      allowExpectedExitRef.current = true;

      setIsCheckoutVisible(false);
      cart.clearCart();
      setSelectedClient(WALK_IN_CLIENT);
      setIsClientStepComplete(false);
      setHasClientStepSelection(false);
      setClientSearchQuery("");
      setSaleNotes("");

      router.replace({
        params: {
          amountPaid: String(totals.grandTotal),
          appointmentId,
          paymentMethod: payment.method,
          saleId: checkout.saleId,
          total: String(totals.grandTotal),
        },
        pathname: "/quick-sale/checkout",
      });
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
    } finally {
      checkoutSubmission.finish();
    }
  };

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

    if (isClientStepComplete && !params.draftId) {
      setIsClientStepComplete(false);
      return;
    }

    confirmDiscardQuickSale(leaveQuickSaleRoute);
  }, [
    confirmDiscardQuickSale,
    globalSearchQuery,
    handleClearGlobalSearch,
    isClientStepComplete,
    leaveQuickSaleRoute,
    params.draftId,
  ]);

  useEffect(() => {
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
  }, [confirmDiscardQuickSale, hasUnsavedQuickSale, navigation]);

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
          <View style={styles.header}>
            <TouchableOpacity activeOpacity={0.84} hitSlop={12} onPress={handleBack} style={styles.iconButton}>
              <Ionicons name="chevron-back" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Draft</Text>
            <View style={styles.headerSpacer} />
          </View>
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
          <View style={styles.header}>
            <TouchableOpacity activeOpacity={0.84} hitSlop={12} onPress={handleBack} style={styles.iconButton}>
              <Ionicons name="chevron-back" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Draft</Text>
            <View style={styles.headerSpacer} />
          </View>
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

        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.84} hitSlop={12} onPress={handleBack} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quick Sale</Text>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => router.push("/sales" as Href)}
            style={styles.iconButton}
          >
            <Ionicons name="receipt-outline" size={17} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.clientStepContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.clientSearchWrap}>
            <Ionicons name="search-outline" size={16} color={Colors.text2} />
            <TextInput
              autoCapitalize="none"
              onChangeText={setClientSearchQuery}
              placeholder="Search client by name or mobile number"
              placeholderTextColor={Colors.placeholder}
              returnKeyType="search"
              style={styles.clientSearchInput}
              value={clientSearchQuery}
            />
            {clientSearchQuery ? (
              <TouchableOpacity activeOpacity={0.74} onPress={() => setClientSearchQuery("")}>
                <Ionicons name="close-circle" size={16} color={Colors.text2} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.clientSectionHeader}>
            <Text style={styles.clientSectionTitle}>
              {trimmedClientSearchQuery ? "Search Results" : "Recent Clients"}
            </Text>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => {
                setClientPickerStartsInCreateMode(false);
                setIsClientPickerVisible(true);
              }}
            >
              <Text style={styles.clientSectionAction}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.recentClientsCard}>
            {quickSaleClientsError && visibleClientOptions.length === 0 ? (
              <View style={styles.clientStateBlock}>
                <Text style={styles.clientStateTitle}>Unable to load clients</Text>
                <TouchableOpacity
                  activeOpacity={0.84}
                  onPress={() => setQuickSaleClientsReloadKey((current) => current + 1)}
                >
                  <Text style={styles.clientSectionAction}>Try again</Text>
                </TouchableOpacity>
              </View>
            ) : quickSaleClientsLoading && visibleClientOptions.length === 0 ? (
              <View style={styles.clientStateBlock}>
                <ActivityIndicator color={Colors.primary} size="small" />
                <Text style={styles.clientStateText}>Loading clients...</Text>
              </View>
            ) : visibleClientOptions.length === 0 ? (
              <View style={styles.clientStateBlock}>
                <Text style={styles.clientStateTitle}>
                  {trimmedClientSearchQuery ? "No matching client" : "No recent clients"}
                </Text>
                <Text style={styles.clientStateText}>Use Walk-In or add a new client to continue.</Text>
              </View>
            ) : (
              visibleClientOptions.map((client, index) => {
                const isSelected = hasClientStepSelection && selectedClient.id === client.id;

                return (
                  <ClientOptionRow
                    key={`quick-sale-client-${client.id}`}
                    initials={client.initials}
                    isSelected={isSelected}
                    onPress={() => handleSelectClientForStep(client)}
                    phone={client.phone}
                    title={client.fullName}
                    withBorder={index < visibleClientOptions.length - 1}
                  />
                );
              })
            )}
          </View>

          <View style={styles.clientQuickActions}>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => handleSelectClientForStep(null)}
              style={[
                styles.clientActionCard,
                hasClientStepSelection && !selectedClient.id && styles.clientOptionSelected,
              ]}
            >
              <View style={styles.clientActionIcon}>
                <Ionicons name="walk-outline" size={20} color={Colors.primaryDark} />
              </View>
              <Text style={styles.clientActionTitle}>Walk-In</Text>
              <Text style={styles.clientActionText}>Create bill for walk-in client</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => {
                setClientPickerStartsInCreateMode(true);
                setIsClientPickerVisible(true);
              }}
              style={styles.clientActionCard}
            >
              <View style={styles.clientActionIcon}>
                <Ionicons name="person-add-outline" size={20} color={Colors.primaryDark} />
              </View>
              <Text style={styles.clientActionTitle}>Add New Client</Text>
              <Text style={styles.clientActionText}>Add and select a new client</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.clientStepFooter}>
          <TouchableOpacity
            activeOpacity={0.88}
            disabled={!hasClientStepSelection}
            onPress={() => setIsClientStepComplete(true)}
            style={[styles.clientContinueButton, !hasClientStepSelection && styles.clientContinueButtonDisabled]}
          >
            <Text style={styles.clientContinueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

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
    isCheckoutVisible || isClientPickerVisible || Boolean(changeServiceLineId);

  if (initError && !initData) {
    return (
      <>
        <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
          <AppStatusBar />
          <View style={styles.header}>
            <TouchableOpacity activeOpacity={0.84} hitSlop={12} onPress={handleBack} style={styles.iconButton}>
              <Ionicons name="chevron-back" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Quick Sale</Text>
            <View style={styles.headerSpacer} />
          </View>
          <ErrorState message={initError} onRetry={() => void dispatch(fetchSalesInitThunk())} />
        </SafeAreaView>
        {discardConfirmationModal}
      </>
    );
  }

  return (
    <>
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />

      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.84} hitSlop={12} onPress={handleBack} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{params.draftId ? "Edit Draft" : "Select Services"}</Text>
        {params.draftId ? (
          <TouchableOpacity
            activeOpacity={isDeletingDraft ? 1 : 0.84}
            disabled={isDeletingDraft}
            onPress={handleDeleteDraft}
            style={styles.iconButton}
          >
            {isDeletingDraft ? (
              <ActivityIndicator color={Colors.error} size="small" />
            ) : (
              <Ionicons name="trash-outline" size={17} color={Colors.error} />
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={cart.items.length === 0 ? 1 : 0.84}
            disabled={cart.items.length === 0 || !isClientPackageDataReliable}
            onPress={() => openCheckout("review")}
            style={[
              styles.iconButton,
              (cart.items.length === 0 || !isClientPackageDataReliable) && styles.iconButtonDisabled,
            ]}
          >
            <Ionicons name="receipt-outline" size={17} color={Colors.primary} />
            {cart.itemCount > 0 ? (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{cart.itemCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.topSection}>
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

      {selectedClient.id && currentClientPackageLoadStatus !== "loaded" ? (
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.packageStatus,
            currentClientPackageLoadStatus === "error"
              ? styles.packageStatusError
              : styles.packageStatusLoading,
          ]}
        >
          {currentClientPackageLoadStatus === "loading" ? (
            <ActivityIndicator color={Colors.warning} size="small" />
          ) : (
            <Ionicons
              color={Colors.error}
              name="alert-circle-outline"
              size={18}
            />
          )}
          <View style={styles.packageStatusCopy}>
            <Text style={styles.packageStatusTitle}>
              {currentClientPackageLoadStatus === "error"
                ? "Package eligibility unavailable"
                : clientPackageLoadState.isRetrying
                  ? "Retrying package verification"
                  : "Checking package eligibility"}
            </Text>
            <Text style={styles.packageStatusMessage}>
              {currentClientPackageLoadStatus === "error"
                ? "Package pricing could not be verified. Checkout is blocked until you retry."
                : "Current totals are preserved until package data is available."}
            </Text>
            {currentClientPackageLoadStatus === "error" && clientPackageLoadState.error ? (
              <Text numberOfLines={2} style={styles.packageStatusDetail}>
                {clientPackageLoadState.error}
              </Text>
            ) : null}
          </View>
          {currentClientPackageLoadStatus === "error" ? (
            <TouchableOpacity
              accessibilityLabel="Retry package verification"
              activeOpacity={0.84}
              onPress={() => void loadClientPackages(selectedClient.id, true)}
              style={styles.packageRetryButton}
            >
              <Ionicons color={Colors.onPrimary} name="refresh" size={15} />
              <Text style={styles.packageRetryText}>Retry</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

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
                activeClientPackages={visibleActiveClientPackages}
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
        <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(120)} style={styles.undoToast}>
          <Text style={styles.undoToastText}>Item removed</Text>
          <TouchableOpacity onPress={handleUndoRemove}>
            <Text style={styles.undoToastAction}>Undo</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : null}

      {!isOverlayActive ? (
        <MiniBillBar
          disabled={cart.items.length === 0 || !isClientPackageDataReliable}
          grandTotal={totals.grandTotal}
          itemCount={cart.itemCount}
          onCheckout={() => openCheckout("payment")}
          onReview={() => openCheckout("review")}
        />
      ) : null}

      <ClientPickerSheet
        onClose={() => setIsClientPickerVisible(false)}
        onSelect={handleClientPickerSelect}
        selectedClientId={hasClientStepSelection ? selectedClient.id : null}
        startInCreateMode={clientPickerStartsInCreateMode}
        visible={isClientPickerVisible}
      />

      <ChangeServiceModal
        onClose={() => setChangeServiceLineId(null)}
        onSelect={(service) => {
          if (changeServiceLineId) {
            cart.replaceItem(changeServiceLineId, {
              category: service.category,
              consumables: service.consumablesUsed,
              duration: service.durationMinutes ? `${service.durationMinutes} min` : undefined,
              itemId: service.id,
              itemType: "service",
              name: service.name,
              taxAmount: service.taxAmount,
              taxRate: service.taxRate,
              unitPrice: service.price,
            });
            if (isClientPackageDataReliable) {
              recalculatePackageCoverage(visibleActiveClientPackages);
            }
          }
        }}
        visible={Boolean(changeServiceLineId)}
      />

      <CheckoutSheet
        appliedCoupon={appliedCoupon}
        couponCode={couponCode}
        couponError={couponError}
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
        onSavePending={() => void handleSavePending()}
        onSetConsumableActualQty={handleSetConsumableActualQty}
        onSetQuantity={handleSetQuantity}
        onToggleIncludeGst={() => setIncludeGst((current) => !current)}
        overallDiscountInput={overallDiscountInput}
        overallDiscountPercent={draftDiscountPercent}
        overallDiscountType={draftDiscountType}
        redemptions={redemptions}
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
  iconButtonDisabled: {
    opacity: 0.5,
  },
  headerBadge: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderColor: Colors.card,
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 17,
    justifyContent: "center",
    minWidth: 17,
    paddingHorizontal: 4,
    position: "absolute",
    right: -4,
    top: -4,
  },
  headerBadgeText: {
    color: Colors.onPrimary,
    fontSize: 9,
    fontWeight: "900",
  },
  // Balances the back button so the title stays centered, but must stay
  // invisible Ã¢â‚¬â€ it previously reused iconButton's card background/border/
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
  clientStepContent: {
    paddingBottom: 120,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingTop: Spacing.lg,
  },
  clientSearchWrap: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.035,
    shadowRadius: 14,
    elevation: 1,
  },
  clientSearchInput: {
    color: Colors.heading,
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  clientSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  clientSectionTitle: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
  },
  clientSectionAction: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  recentClientsCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 1,
  },
  clientOptionSelected: {
    backgroundColor: Colors.bg2,
  },
  clientStateBlock: {
    alignItems: "center",
    gap: 6,
    minHeight: 96,
    justifyContent: "center",
    padding: Spacing.lg,
  },
  clientStateTitle: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  clientStateText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  clientQuickActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  clientActionCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    flex: 1,
    minHeight: 118,
    padding: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.035,
    shadowRadius: 16,
    elevation: 1,
  },
  clientActionIcon: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    height: 38,
    justifyContent: "center",
    marginBottom: Spacing.sm,
    width: 38,
  },
  clientActionTitle: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  clientActionText: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    marginTop: 4,
    textAlign: "center",
  },
  clientStepFooter: {
    backgroundColor: Colors.bg,
    borderTopColor: Colors.divider,
    borderTopWidth: 1,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  clientContinueButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: AppRadius.control,
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "center",
    minHeight: 52,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 3,
  },
  clientContinueButtonDisabled: {
    opacity: 0.45,
  },
  clientContinueButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
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
  packageStatus: {
    alignItems: "center",
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginHorizontal: AppLayout.contentHorizontalPadding,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  packageStatusCopy: {
    flex: 1,
  },
  packageStatusDetail: {
    color: Colors.text2,
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 14,
    marginTop: 3,
  },
  packageStatusError: {
    backgroundColor: Colors.errorBg,
    borderColor: Colors.error,
  },
  packageStatusLoaded: {
    backgroundColor: Colors.successBg,
    borderColor: Colors.success,
  },
  packageStatusLoading: {
    backgroundColor: Colors.warningBg,
    borderColor: Colors.warning,
  },
  packageStatusMessage: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
    marginTop: 2,
  },
  packageStatusTitle: {
    color: Colors.heading,
    fontSize: 12,
    fontWeight: "900",
  },
  packageRetryButton: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.full,
    flexDirection: "row",
    gap: 5,
    minHeight: 36,
    paddingHorizontal: 12,
  },
  packageRetryText: {
    color: Colors.onPrimary,
    fontSize: 11,
    fontWeight: "900",
  },
  content: {
    flex: 1,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingTop: Spacing.sm,
  },
  contentPane: {
    flex: 1,
  },
  comingSoonPane: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    gap: Spacing.sm,
    justifyContent: "center",
    marginTop: Spacing.sm,
    minHeight: 180,
    padding: Spacing.xl,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 1,
  },
  comingSoonTitle: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  comingSoonText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    textAlign: "center",
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
