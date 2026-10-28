import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { QuickSaleForm } from "../components/QuickSaleForm";
import { Text } from "@/components/ui/AppTypography";
import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { ScrollFooterContext } from "@/hooks/useScrollFooter";
import { isStaffExperienceUser, STAFF_CALENDAR_ROUTE, STAFF_HOME_ROUTE } from "@/utils/routeResolver";
import { canUseStaffQuickSale } from "@/utils/staffAccess";
import { formatAppDate, formatAppTime } from "@/utils/dateTime";
import { appAlert as Alert } from "@/services/appAlert";
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  type Href,
} from "expo-router";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { BackHandler, Keyboard, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { ChangeServiceModal } from "@/features/quickSale/components/ChangeServiceModal";
import {
  CheckoutSheet,
  type DiscountApplyTarget,
} from "@/features/quickSale/components/CheckoutSheet";
import { ClientDatesSheet } from "@/features/quickSale/components/ClientDatesSheet";
import { ClientPickerSheet } from "@/features/quickSale/components/ClientPickerSheet";
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
import { ServiceSearchDropdown } from "@/features/quickSale/components/ServiceSearchDropdown";
import { StaffPickerSheet } from "@/features/quickSale/components/StaffPickerSheet";
import { useStaffPresence } from "@/features/attendance/hooks/useStaffPresence";
import {
  breakAt,
  formatBreakTime,
  isCheckedOut,
  localTodayKey,
  NO_STAFF_PRESENCE,
  type StaffPresence,
} from "@/features/attendance/utils/staffPresence";
import { quickSaleStaffOptions } from "@/features/quickSale/utils/quickSaleStaff";
import { useCart } from "@/features/quickSale/hooks/useCart";
import { useCheckoutSubmissionController } from "@/features/quickSale/hooks/useCheckoutSubmissionController";
import { useClientPackages } from "@/features/quickSale/hooks/useClientPackages";
import { useConsumableProductNames } from "@/features/quickSale/hooks/useConsumableProductNames";
import { useQuickSalePricing } from "@/features/quickSale/hooks/useQuickSalePricing";
import { useRedemptions } from "@/features/quickSale/hooks/useRedemptions";
import {
  WALK_IN_CLIENT,
  type CartItem,
  type CheckoutInitialStep,
  type PendingCheckoutPayment,
  type QuickSaleClient,
  type QuickSaleScreenProps,
  type QuickSaleSlot,
} from "@/features/quickSale/types";
import {
  mapAppointmentToCartItems,
  mapAppointmentToClient,
  mapAppointmentToSlot,
  mapAppointmentToStaff,
  mergeWithAppointmentRows,
} from "@/features/quickSale/utils/appointmentHydration";
import type { AppointmentListItem } from "@/types/appointment";
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
import { fetchAppointmentByIdThunk } from "@/middleware/appointment/appointment.thunk";
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
  if (isStaffExperienceUser(user) && !canUseStaffQuickSale(user)) return <Redirect href={STAFF_HOME_ROUTE} />;
  if (props.embedded) return <EmbeddedQuickSaleScreen {...props} />;
  return <OwnerQuickSaleScreen {...props} />;
}

// Opened from the Calendar, Quick Sale renders inside the tab screen, so its
// lists would hide the tab bar behind the modal while scrolling. Show the tab
// bar once and stop the modal's scrolling from toggling it.
function EmbeddedQuickSaleScreen(props: QuickSaleScreenProps) {
  const setTabBarHidden = useContext(ScrollFooterContext);

  useEffect(() => {
    setTabBarHidden?.(false);
  }, [setTabBarHidden]);

  return (
    <ScrollFooterContext.Provider value={null}>
      <OwnerQuickSaleScreen {...props} />
    </ScrollFooterContext.Provider>
  );
}

function OwnerQuickSaleScreen({
  appointmentId: appointmentIdProp,
  draftId: draftIdProp,
  embedded = false,
  initialSlot = null,
  onRequestClose,
  openPayment: openPaymentProp = false,
}: QuickSaleScreenProps = {}) {
  const Colors = useThemeColors();
  const { height: screenHeight } = useWindowDimensions();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const routeParams = useLocalSearchParams<{ appointmentId?: string; draftId?: string; openPayment?: string; resetSale?: string }>();
  // The Calendar opens a pending bill in its embedded Quick Sale via props.
  const params = {
    ...routeParams,
    appointmentId: appointmentIdProp ?? routeParams.appointmentId,
    draftId: draftIdProp ?? routeParams.draftId,
    openPayment: openPaymentProp ? "1" : routeParams.openPayment,
  };
  // Billing an already-booked appointment (no draft sale involved).
  const isExistingBill = Boolean(params.draftId || params.appointmentId);
  const { user } = useAuth();
  // Staff (Calendar & Quick Sale access) can't open the owner's Sales or
  // Dashboard screens, so their exits go back to their Calendar instead.
  const staffExitRoute = isStaffExperienceUser(user) ? STAFF_CALENDAR_ROUTE : null;

  const initData = useAppSelector(selectSalesInitData);
  const initLoading = useAppSelector(selectSalesInitLoading);
  const initError = useAppSelector(selectSalesInitError);
  const salonId = useAppSelector(selectActiveBranchId);

  const cart = useCart(initialSlot?.time);
  const checkoutSubmission = useCheckoutSubmissionController();
  const clearCart = cart.clearCart;
  const hydrateCart = cart.hydrateCart;
  const recalculatePackageCoverage = cart.recalculatePackageCoverage;
  const resetCheckoutSubmission = checkoutSubmission.reset;
  const setProductStock = cart.setProductStock;
  const [activeTab, setActiveTab] = useState<CatalogTab>("services");
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [isServiceSearchOpen, setIsServiceSearchOpen] = useState(false);
  const [isGlobalSearchLoading, setIsGlobalSearchLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<QuickSaleClient>(WALK_IN_CLIENT);
  const redemptions = useRedemptions(selectedClient.id, salonId);
  const [isCatalogVisible, setIsCatalogVisible] = useState(false);
  const [hasClientStepSelection, setHasClientStepSelection] = useState(isExistingBill);
  const [selectedQuickSaleStaff, setSelectedQuickSaleStaff] = useState<PosStaffMember | null>(null);
  // "Yes, continue" on the checked-out prompt holds for the rest of this sale (as on the web).
  const [checkedOutAcked, setCheckedOutAcked] = useState(false);
  const [isClientPickerVisible, setIsClientPickerVisible] = useState(false);
  const [isClientDatesVisible, setIsClientDatesVisible] = useState(false);
  const [isEmbeddedStaffPickerVisible, setIsEmbeddedStaffPickerVisible] = useState(false);
  const [clientPickerStartsInCreateMode, setClientPickerStartsInCreateMode] = useState(false);
  const [changeServiceLineId, setChangeServiceLineId] = useState<string | null>(null);
  const [isCheckoutVisible, setIsCheckoutVisible] = useState(false);
  const [pendingCheckoutPayment, setPendingCheckoutPayment] = useState<PendingCheckoutPayment | null>(null);
  const [shouldResumeCheckoutAtCharges, setShouldResumeCheckoutAtCharges] = useState(false);
  const [checkoutInitialStep, setCheckoutInitialStep] = useState<CheckoutInitialStep>("payment");
  const [shouldShowCheckoutStaffValidation, setShouldShowCheckoutStaffValidation] = useState(false);
  const [isDeletingDraft, setIsDeletingDraft] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(isExistingBill);
  // An existing appointment keeps its own booked slot when it is paid.
  const [appointmentSlot, setAppointmentSlot] = useState<QuickSaleSlot | null>(null);
  const loadedAppointmentRef = useRef<AppointmentListItem | null>(null);
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
  const clientPickerOpenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyBaselineRef = useRef<string | null>(
    isExistingBill ? null : EMPTY_QUICK_SALE_DIRTY_SIGNATURE,
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
  const [includeGst, setIncludeGst] = useState(true);
  const [serviceChargeInput, setServiceChargeInput] = useState("");
  const [convenienceFeeInput, setConvenienceFeeInput] = useState("");
  const [otherChargesInput, setOtherChargesInput] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [productStockErrors, setProductStockErrors] = useState<ProductStockErrors>({});
  const [isSaleFinalized, setIsSaleFinalized] = useState(false);
  const { consumableProductNames, resetConsumableProductNames } = useConsumableProductNames(cart.items);
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

      if (clientPickerOpenTimeoutRef.current) {
        clearTimeout(clientPickerOpenTimeoutRef.current);
        clientPickerOpenTimeoutRef.current = null;
      }

      couponValidationRequestRef.current += 1;
    },
    [],
  );

  const restoreProductStock = useCallback(async (items: CartItem[]) => {
    const productIds = items
      .filter((item) => item.itemType === "product" && item.itemId)
      .map((item) => item.itemId);
    if (productIds.length === 0) return;

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
  }, [setProductStock]);

  // Web "Continue to Payment": bill an existing booking. Its rows become the
  // cart (package / product / membership lines included) and checkout later
  // updates, pays and checks out this same appointment — never a draft sale.
  const loadAppointmentBill = useCallback(async (appointmentId: string) => {
    setIsLoadingDraft(true);
    setDraftLoadError(null);

    let appointment: AppointmentListItem;
    try {
      ({ appointment } = await appointmentService.getAppointment(appointmentId));
    } catch (error) {
      setDraftLoadError(getApiErrorMessage(error));
      setIsLoadingDraft(false);
      return;
    }

    const restoredItems = mapAppointmentToCartItems(appointment);
    loadedAppointmentRef.current = appointment;
    const { raw } = appointment;
    const discountValue = Math.max(0, Number(raw.discount_value) || 0);
    const discountType = String(raw.discount_type).toLowerCase() === "percentage" ? "percentage" : "flat";

    hydrateCart(restoredItems);
    setAppointmentSlot(mapAppointmentToSlot(appointment));
    setSelectedQuickSaleStaff(mapAppointmentToStaff(appointment));
    setSelectedClient(mapAppointmentToClient(appointment) ?? WALK_IN_CLIENT);
    setHasClientStepSelection(true);
    setSaleNotes(appointment.notes ?? "");
    setTipInput(String(Number(raw.tip_amount) || ""));
    setOtherChargesInput(String(Number(raw.ex_charges) || ""));
    setServiceChargeInput("");
    setConvenienceFeeInput("");
    // The bill's own "Include GST" choice — GST is added unless it was turned off.
    setIncludeGst(raw.include_gst !== false);
    setDraftDiscountType(discountType);
    setDraftDiscountPercent(discountType === "percentage" ? discountValue : 0);
    setOverallDiscountInput(discountType === "flat" && discountValue > 0 ? String(discountValue) : "");
    if (discountType === "percentage" && discountValue > 0) setDiscountApplyTo(["entireBill"]);
    setCouponError(null);
    setAppliedCoupon(null);
    setCouponCode("");

    await restoreProductStock(restoredItems);
    setIsLoadingDraft(false);
  }, [hydrateCart, restoreProductStock]);

  const loadDraft = useCallback(async () => {
    const draftId = params.draftId;
    if (!draftId) {
      if (params.appointmentId) {
        await loadAppointmentBill(params.appointmentId);
        return;
      }
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

    await restoreProductStock(restoredItems);
    setIsLoadingDraft(false);
  }, [dispatch, hydrateCart, loadAppointmentBill, params.appointmentId, params.draftId, restoreProductStock]);

  useEffect(() => {
    void loadDraft();
  }, [loadDraft]);

  useEffect(() => {
    if (
      isExistingBill &&
      !isLoadingDraft &&
      !draftLoadError &&
      dirtyBaselineRef.current === null
    ) {
      dirtyBaselineRef.current = dirtySignature;
    }
  }, [dirtySignature, draftLoadError, isExistingBill, isLoadingDraft]);

  const usesEntireBillDiscount = discountApplyTo.includes("entireBill");
  const effectiveDiscountType = draftDiscountType === "percentage" && usesEntireBillDiscount
    ? "percentage"
    : "flat";
  const {
    isPricingLoading,
    pricingError,
    resetPricing,
    resolvedPricingFlags,
    totals,
  } = useQuickSalePricing({
    appliedCoupon,
    buildPricingFlags: redemptions.buildPricingFlags,
    redemptionContext: redemptions.pricingContext,
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
    setIsCatalogVisible(false);
    setGlobalSearchQuery("");
    setIsGlobalSearchLoading(false);
    setSelectedClient(WALK_IN_CLIENT);
    setHasClientStepSelection(false);
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
    setCheckedOutAcked(false);
  }, [
    clearCart,
    resetCheckoutSubmission,
    resetClientPackages,
    resetConsumableProductNames,
    resetPricing,
  ]);

  useEffect(() => {
    if (params.resetSale) {
      allowExpectedExitRef.current = false;
      resetQuickSaleSession();
    }
  }, [params.resetSale, resetQuickSaleSession]);
  const couponOrderAmount = Math.max(0, totals.subtotal);

  // Staff rules from the web's Quick Sale (AppointmentModal + useStaffSchedule):
  // only staff who allow calendar bookings, in Reorder Staff order and — with
  // "show only checked-in staff" on — only those checked in today. Staff on
  // this bill's items always stay. Check-in only exists for today, so an
  // appointment on another date is not filtered.
  const { presence: staffPresence } = useStaffPresence();
  const saleDateKey = (appointmentSlot ?? initialSlot)?.date || localTodayKey();
  const isSaleToday = saleDateKey === localTodayKey();
  // "On the bill" = staff on the bill's items, as on the web (involvedStaff).
  const involvedStaff = useMemo(() => {
    const byId = new Map<string, string>();
    cart.items.forEach((item) => {
      if (item.staffId && !byId.has(item.staffId)) byId.set(item.staffId, item.staffName ?? "");
    });
    return [...byId].map(([id, name]) => ({ id, name }));
  }, [cart.items]);
  const staffOptions = useMemo(
    () => quickSaleStaffOptions(initData?.staff ?? [], staffPresence, involvedStaff.map((staff) => staff.id), saleDateKey),
    [initData?.staff, involvedStaff, saleDateKey, staffPresence],
  );
  const checkedOutStaff = useMemo(
    () => (isSaleToday ? involvedStaff.filter((staff) => isCheckedOut(staffPresence, staff.id)) : []),
    [involvedStaff, isSaleToday, staffPresence],
  );
  const checkedOutStaffNames = useMemo(() => checkedOutStaff.map((staff) => staff.name), [checkedOutStaff]);
  const onBreakStaff = useMemo(
    () => (isSaleToday ? involvedStaff.flatMap((staff) => {
      const onBreak = breakAt(staffPresence, staff.id, saleDateKey);
      return onBreak ? [{ ...staff, ...onBreak }] : [];
    }) : []),
    [involvedStaff, isSaleToday, saleDateKey, staffPresence],
  );

  // The dialogs' Cancel runs after later renders, so it reads the bill as it is then.
  const latestBillRef = useRef({ cart, checkedOutStaff });
  useEffect(() => { latestBillRef.current = { cart, checkedOutStaff }; });
  const unpickStaff = useCallback((staffIds: Set<string>) => {
    const { cart: currentCart } = latestBillRef.current;
    currentCart.items.forEach((item) => {
      if (item.staffId && staffIds.has(item.staffId)) currentCart.setStaff(item.lineId, null, null);
    });
    // The top staff pick would put them straight back on the items.
    setSelectedQuickSaleStaff((current) => (current && staffIds.has(current.id) ? null : current));
  }, []);

  // A staff member who is on a break, or (with check-in visibility on) has
  // checked out today, asks once they are NEWLY on the bill — whichever way
  // they got there — each in its own dialog, as on the web. The bill as it was
  // loaded (draft/appointment hydration, first attendance fetch) never asks.
  // Cancel on a break takes those staff off the bill; Cancel on a check-out
  // takes every checked-out staff member off it (web cancelCheckedOutPick).
  const promptBaselineRef = useRef<{ checkedOut: string[]; loading: boolean; onBreak: string[]; presence: StaffPresence } | null>(null);
  useEffect(() => {
    const previous = promptBaselineRef.current;
    promptBaselineRef.current = {
      checkedOut: checkedOutStaff.map((staff) => staff.id),
      loading: isLoadingDraft,
      onBreak: onBreakStaff.map((staff) => staff.id),
      presence: staffPresence,
    };
    if (!previous || isLoadingDraft || previous.loading || previous.presence === NO_STAFF_PRESENCE) return;

    const addedBreaks = onBreakStaff.filter((staff) => !previous.onBreak.includes(staff.id));
    if (addedBreaks.length > 0) {
      Alert.alert(
        "Staff is on break",
        `${addedBreaks.map((staff) => `${staff.name} (on break since ${formatBreakTime(staff.since)}, back by ${formatBreakTime(staff.until)})`).join(", ")}. Do you still want to book an appointment with ${addedBreaks.length > 1 ? "them" : "this staff member"} at this time?`,
        [
          { onPress: () => unpickStaff(new Set(addedBreaks.map((staff) => staff.id))), style: "cancel", text: "Cancel" },
          { text: "Yes, continue" },
        ],
      );
    }

    const addedCheckedOut = checkedOutStaff.filter((staff) => !previous.checkedOut.includes(staff.id));
    if (addedCheckedOut.length > 0) {
      setCheckedOutAcked(false);
      Alert.alert(
        "Staff has checked out",
        `${addedCheckedOut.map((staff) => staff.name).join(", ")} ${addedCheckedOut.length > 1 ? "have" : "has"} checked out for today. Do you still want to book or take payment on ${addedCheckedOut.length > 1 ? "them" : "this staff member"}?`,
        [
          { onPress: () => unpickStaff(new Set(latestBillRef.current.checkedOutStaff.map((staff) => staff.id))), style: "cancel", text: "Cancel" },
          { onPress: () => setCheckedOutAcked(true), text: "Yes, continue" },
        ],
      );
    }
  }, [checkedOutStaff, isLoadingDraft, onBreakStaff, staffPresence, unpickStaff]);

  // Pay, or saving a NEW bill, with a checked-out staff member on it asks once
  // per sale. Updating an existing bill doesn't ask (web handleUpdate isn't guarded).
  const guardCheckedOut = useCallback((action: () => void) => {
    if (checkedOutStaffNames.length === 0 || checkedOutAcked) { action(); return; }
    const many = checkedOutStaffNames.length > 1;
    Alert.alert(
      "Staff has checked out",
      `${checkedOutStaffNames.join(", ")} ${many ? "have" : "has"} checked out for today. Do you still want to book or take payment on ${many ? "them" : "this staff member"}?`,
      [
        { style: "cancel", text: "Cancel" },
        { onPress: () => { setCheckedOutAcked(true); action(); }, text: "Yes, continue" },
      ],
    );
  }, [checkedOutAcked, checkedOutStaffNames]);
  const guardSave = useCallback((save: () => void) => {
    if (isExistingBill) save(); else guardCheckedOut(save);
  }, [guardCheckedOut, isExistingBill]);

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
  // Ticks products, packages and memberships in their catalogs, like services.
  const selectedCatalogIds = useMemo(() => {
    const ids = { membership: new Set<string>(), package: new Set<string>(), product: new Set<string>() };
    cart.items.forEach((item) => {
      if (item.itemType === "product" || item.itemType === "package" || item.itemType === "membership") {
        ids[item.itemType].add(item.itemId);
      }
    });
    return ids;
  }, [cart.items]);

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

  const handleClientPickerSelect = useCallback((client: ClientListItem | null) => {
    resetCheckoutSubmission();
    setIsCheckoutVisible(false);
    setShouldShowCheckoutStaffValidation(false);
    setSubmitError(null);

    setSelectedClient(client ? clientFromListItem(client) : WALK_IN_CLIENT);
    setHasClientStepSelection(true);
  }, [resetCheckoutSubmission]);

  // There is no walk-in sale (same as the web): a bill needs a real client.
  const ensureClientSelected = useCallback(() => {
    if (selectedClient.id) return true;
    Alert.alert("Client required", "Search for a client or add a new one before continuing.");
    return false;
  }, [selectedClient.id]);

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
    setProductStockErrors((current) => {
      if (!(lineId in current)) {
        return current;
      }

      const next = { ...current };
      delete next[lineId];
      return next;
    });
  }, [cart]);

  // Catalog tap: adds the item, or removes it when it is already on the bill.
  const toggleCatalogLine = useCallback(
    (itemType: "product" | "package" | "membership", itemId: string, add: () => void) => {
      const existing = cart.items.find((item) => item.itemType === itemType && item.itemId === itemId);
      if (existing) {
        handleRemoveItem(existing.lineId);
        return;
      }
      add();
    },
    [cart.items, handleRemoveItem],
  );

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
          !item.staffId
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

  // "Continue to Payment" on a Calendar booking opens its pending bill
  // straight at the Payment screen, once the draft has loaded.
  const hasAutoOpenedPaymentRef = useRef(false);
  useEffect(() => {
    if (
      params.openPayment !== "1" ||
      hasAutoOpenedPaymentRef.current ||
      !isExistingBill ||
      isLoadingDraft ||
      draftLoadError ||
      !initData ||
      cart.items.length === 0
    ) {
      return;
    }

    hasAutoOpenedPaymentRef.current = true;
    openCheckout("payment");
  }, [cart.items.length, draftLoadError, initData, isExistingBill, isLoadingDraft, openCheckout, params.openPayment]);

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
    const payload = mapAppointmentPayload({
      cartItems: cart.items,
      clientId: selectedClient.id,
      discountApplyTo,
      initialSlot: appointmentSlot ?? initialSlot,
      notes: saleNotes,
      salonId,
      staffId: getQuickSaleStaff(),
      totals,
    });
    const existing = loadedAppointmentRef.current;
    if (!params.appointmentId || !existing) return payload;
    // Saving an existing booking: keep its status (never reset to "booked")
    // and lay each row over the stored one so unmodelled fields survive.
    // Only ever sent through updateAppointment (status is optional there).
    const { status: _status, ...withoutStatus } = mergeWithAppointmentRows(payload, existing);
    return withoutStatus as typeof payload;
  }, [
    params.appointmentId,
    appointmentSlot,
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
        pricingFlags: resolvedPricingFlags,
        salonId,
        selectedClientId: selectedClient.id,
        totals,
      }),
    [
      appliedCoupon,
      includeGst,
      isFullyPackageCoveredSale,
      packageCatalogTotal,
      resolvedPricingFlags,
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
        if (!isCheckoutVisible) {
          setSubmitError("The applied coupon changed. Open Checkout to review it before saving.");
        }
        return;
      }

      if (!(await verifyProductStock())) {
        return;
      }

      // Existing booking: "save" means saving the appointment itself (web
      // parity) — a draft sale is never created for it.
      if (params.appointmentId) {
        try {
          await appointmentService.updateAppointment(params.appointmentId, buildAppointmentPayload());
        } catch (error) {
          setSubmitError(getApiErrorMessage(error));
          return;
        }
        setIsCheckoutVisible(false);
        if (!checkoutSubmission.commitSuccess()) {
          return;
        }
        setIsSaleFinalized(true);
        allowExpectedExitRef.current = true;
        void dispatch(fetchAppointmentByIdThunk(params.appointmentId));
        if (onRequestClose) onRequestClose();
        else if (router.canGoBack()) router.back();
        return;
      }

      const payload = buildSaleDraftPayload();

      // Calendar Quick Sale (owner or staff): book the slot as an appointment and
      // link the pending sale to it, so the bill shows on the Calendar and can
      // be tapped later to take payment. Staff always book, since they have no
      // Sales screen to find drafts in.
      let appointmentId: string | undefined;
      if (!params.draftId && (embedded || isStaffExperienceUser(user))) {
        try {
          appointmentId = (await appointmentService.createAppointment(buildAppointmentPayload())).appointment.id;
        } catch (error) {
          setSubmitError(getApiErrorMessage(error));
          return;
        }
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
        const action = await dispatch(createSaleThunk(appointmentId ? { ...payload, appointmentId } : payload));
        if (!createSaleThunk.fulfilled.match(action)) {
          setSubmitError(appointmentId
            ? `The appointment is booked on the Calendar, but its pending bill could not be saved: ${getActionError(action.payload, "please try again.")}`
            : getActionError(action.payload, "Unable to save this draft."));
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
      if (appointmentId) {
        // Pull the new booking into the calendar store so the slot isn't empty.
        void dispatch(fetchAppointmentByIdThunk(appointmentId));
        void dispatch(fetchDashboardThunk());
      }
      router.replace({
        params: {
          draftId: savedSale.id,
          mode: "preview",
          saleId: savedSale.id,
          total: String(savedSale.total || totals.grandTotal),
        },
        pathname: "/quick-sale/checkout",
      });
      onRequestClose?.();
    } finally {
      checkoutSubmission.finish();
    }
  };

  // Save Pending can run from the bottom bar with the checkout sheet closed;
  // surface its errors here since the sheet's footer isn't on screen.
  useEffect(() => {
    if (submitError && !isCheckoutVisible) {
      Alert.alert("Unable to save sale", submitError);
      setSubmitError(null);
    }
  }, [isCheckoutVisible, submitError]);

  const clearFinishedSale = () => {
    cart.clearCart();
    setSelectedClient(WALK_IN_CLIENT);
    setHasClientStepSelection(false);
    setSaleNotes("");
  };

  const applyCheckoutOutcome = (outcome: CheckoutOutcome) => {
    if (outcome.kind === "failed") {
      setSubmitError(outcome.message);
      return;
    }

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
        onRequestClose?.();
        return;
    }
  };

  const handleCompleteSale = async (payment: PendingCheckoutPayment) => {
    if (isPricingLoading || pricingError) {
      setSubmitError(pricingError ?? "Wait for the updated total before completing the sale.");
      return;
    }
    // Saved drafts use /sales/:id/checkout, which currently has no redemption
    // contract. Do not pretend a preview deduction has been debited there.
    if (params.draftId && (resolvedPricingFlags.applyMembershipWallet || resolvedPricingFlags.applyMembershipDiscount || resolvedPricingFlags.applyLoyaltyDiscount || resolvedPricingFlags.applyEwallet || resolvedPricingFlags.applyRewardPoints || resolvedPricingFlags.applyReferralCredit)) {
      setSubmitError("Saved-draft checkout does not support client benefit redemption yet. Use a new Quick Sale to redeem benefits, or turn these benefits off for this draft.");
      return;
    }
    if (embedded && !selectedClient.id) {
      setPendingCheckoutPayment(payment);
      setIsCheckoutVisible(false);
      setClientPickerStartsInCreateMode(true);
      setIsClientPickerVisible(true);
      return;
    }

    if (!selectedClient.id) {
      setSubmitError("Select or add a client before taking payment.");
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
              // An existing booking is saved (its current cart) rather than
              // created again — same order as the web: save, pay, checkout.
              createAppointment: params.appointmentId
                ? (payload) => appointmentService.updateAppointment(params.appointmentId!, payload)
                : appointmentService.createAppointment,
              createPayment: paymentService.createPayment,
              fetchSaleTotal: async (saleId) => {
                const action = await dispatch(fetchSaleByIdThunk(saleId));
                return fetchSaleByIdThunk.fulfilled.match(action) ? action.payload.total : null;
              },
              markPackageSessions: markPackageSessionsAfterCheckout,
              onPaymentRecorded: (appointmentId) => {
                void redemptions.refreshBalances();
                // Pull the server's paid/due figures into the calendar store.
                void dispatch(fetchAppointmentByIdThunk(appointmentId));
              },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClientPickerVisible, pendingCheckoutPayment, selectedClient.id]);

  useEffect(() => {
    if (!shouldResumeCheckoutAtCharges || !selectedClient.id || isClientPickerVisible) {
      return;
    }

    setShouldResumeCheckoutAtCharges(false);
    setCheckoutInitialStep("payment");
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
              router.replace(staffExitRoute ?? ("/sales" as Href));
            })();
          },
          style: "destructive",
          text: "Delete",
        },
      ],
    );
  }, [cart, dispatch, isDeletingDraft, params.draftId, staffExitRoute]);

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

    router.replace(staffExitRoute ?? ("/dashboard" as Href));
  }, [staffExitRoute]);

  const handleBack = useCallback(() => {
    if (globalSearchQuery.trim()) {
      handleClearGlobalSearch();
      return;
    }

    if (embedded) {
      confirmDiscardQuickSale(onRequestClose ?? (() => undefined));
      return;
    }

    confirmDiscardQuickSale(leaveQuickSaleRoute);
  }, [
    confirmDiscardQuickSale,
    embedded,
    globalSearchQuery,
    handleClearGlobalSearch,
    leaveQuickSaleRoute,
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
          isCatalogVisible ||
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
      isCatalogVisible,
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
            <ActivityIndicator color={Colors.primaryText} size="large" />
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

  const isGlobalSearchActive = globalSearchQuery.trim().length > 0;
  const isOverlayActive =
    isCatalogVisible || isCheckoutVisible || isClientPickerVisible || isEmbeddedStaffPickerVisible || Boolean(changeServiceLineId);

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
          subtitle={initialSlot ? `${formatAppDate(`${initialSlot.date}T00:00:00`)} at ${formatAppTime(`${initialSlot.date}T${initialSlot.time}`, initialSlot.time)}` : formatAppDate(new Date())}
          title={params.draftId ? "Edit Draft" : "Quick Sale"}
        />

        {/* Opened from the dashboard: no calendar column picked the staff, so
            ask here. A slot tap keeps using its column's staff. */}
        {embedded && initialSlot?.pickStaff ? (
          <TouchableOpacity
            accessibilityLabel="Select staff"
            accessibilityRole="button"
            activeOpacity={0.84}
            onPress={() => { Keyboard.dismiss(); setIsEmbeddedStaffPickerVisible(true); }}
            style={[styles.staffSelect, shouldShowCheckoutStaffValidation && !selectedQuickSaleStaff && styles.staffSelectError]}
          >
            <Ionicons name="person-outline" size={18} color={Colors.primaryText} />
            <View style={styles.staffSelectCopy}>
              <Text style={styles.staffSelectCaption}>Staff</Text>
              <Text numberOfLines={1} style={[styles.staffSelectValue, !selectedQuickSaleStaff && styles.staffSelectPlaceholder]}>
                {selectedQuickSaleStaff?.name ?? "Select staff *"}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={Colors.text2} />
          </TouchableOpacity>
        ) : null}

        <QuickSaleForm
          defaultTime={(appointmentSlot ?? initialSlot)?.time}
          cart={cart} selectedClient={selectedClient} redemptions={redemptions}
          staffOptions={staffOptions} renderInline={embedded}
          notes={saleNotes} onChangeNotes={setSaleNotes}
          pricingError={pricingError} isPricingLoading={isPricingLoading}
          onAddClient={() => { setClientPickerStartsInCreateMode(true); setIsClientPickerVisible(true); }}
          onClearClient={() => { setSelectedClient(WALK_IN_CLIENT); setHasClientStepSelection(false); }}
          onSelectClient={handleClientPickerSelect}
          onEditClientDates={() => setIsClientDatesVisible(true)}
          onViewClientHistory={embedded ? undefined : () => router.push(`/clients/${selectedClient.id}` as Href)}
          onAdd={(tab) => { setActiveTab(tab); handleClearGlobalSearch(); setIsCatalogVisible(true); }}
          onSetQuantity={handleSetQuantity} onRemoveItem={handleRemoveItem} productStockErrors={productStockErrors}
          packageBanner={selectedClient.id && clientPackages.status === "error" ? <PackageEligibilityBanner error={clientPackages.error} onRetry={clientPackages.retry} /> : null}
        />
        <BottomSheet avoidKeyboard title={`Add ${ITEM_TYPE_CHIPS.find((item) => item.id === activeTab)?.label.toLowerCase() ?? "items"}`} visible={isCatalogVisible} onClose={() => { setIsCatalogVisible(false); handleClearGlobalSearch(); }} renderInline={embedded} scrollable={false}
          footer={<TouchableOpacity onPress={() => { setIsCatalogVisible(false); handleClearGlobalSearch(); }} style={styles.catalogDone}><Text style={styles.catalogDoneText}>Done · {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"}</Text></TouchableOpacity>}>
          <View style={{ height: Math.min(520, screenHeight * 0.55), flexShrink: 1, minHeight: 0 }}>
        <View style={styles.topSection}>
          <View style={styles.catalogHeading}>
            <Text style={styles.catalogTitle}>{ITEM_TYPE_CHIPS.find((item) => item.id === activeTab)?.label ?? "Items"}</Text>
            {cart.itemCount > 0 ? (
              <Text style={styles.catalogCount}>
                {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"}
              </Text>
            ) : null}
          </View>
          <View style={styles.searchSpacing}>
            <GlobalSearchBar
              isActive={isGlobalSearchActive}
              isLoading={isGlobalSearchLoading}
              onChangeQuery={(value) => {
                setGlobalSearchQuery(value);
                setIsServiceSearchOpen(true);
              }}
              onClear={handleClearGlobalSearch}
              onFocus={() => setIsServiceSearchOpen(true)}
              placeholder={`Search ${ITEM_TYPE_CHIPS.find((item) => item.id === activeTab)?.label.toLowerCase() ?? "items"}`}
              query={globalSearchQuery}
            />
          </View>

        </View>

        <View style={styles.content}>
          <View style={styles.contentPane}>
            {initLoading && !initData ? (
              <View style={styles.initLoader}>
                <ActivityIndicator color={Colors.primaryText} size="large" />
                <Text style={styles.initLoaderText}>Preparing checkout...</Text>
              </View>
            ) : activeTab === "services" && isGlobalSearchActive && isServiceSearchOpen ? (
              <ServiceSearchDropdown
                query={globalSearchQuery}
                salonId={salonId}
                selectedServiceIds={selectedServiceIds}
                onDismiss={() => setIsServiceSearchOpen(false)}
                onSelect={(service) => {
                  handleToggleServiceSelection(service);
                  setIsServiceSearchOpen(false);
                  handleClearGlobalSearch();
                }}
              />
            ) : activeTab === "services" ? (
              <ServiceCatalogTab
                visible={isCatalogVisible}
                onToggle={handleToggleServiceSelection}
                search=""
                selectedServiceIds={selectedServiceIds}
              />
            ) : activeTab === "products" ? (
              <ProductCatalogTab
                onSelect={(product) => toggleCatalogLine("product", product.id, () => handleSelectProductResult(product))}
                search={globalSearchQuery}
                selectedIds={selectedCatalogIds.product}
              />
            ) : activeTab === "packages" ? (
              <PackageCatalogTab
                activeClientPackages={clientPackages.packages}
                onSelect={(item) => toggleCatalogLine("package", item.id, () => handleSelectPackageResult(item))}
                salonId={salonId}
                search={globalSearchQuery}
                selectedIds={selectedCatalogIds.package}
              />
            ) : (
              <MembershipCatalogTab
                clientId={selectedClient.id}
                onSelect={(item) => toggleCatalogLine("membership", item.id, () => handleSelectMembershipResult(item))}
                salonId={salonId}
                search={globalSearchQuery}
                selectedIds={selectedCatalogIds.membership}
              />
            )}
          </View>
        </View>


          </View>
        </BottomSheet>


        {!isOverlayActive ? (
          <MiniBillBar
            embedded={embedded}
            isPricingLoading={isPricingLoading}
            disabled={cart.items.length === 0 || isPricingLoading || Boolean(pricingError) || cart.items.some(item => item.itemType === "service" && !item.staffId)}
            isSaving={checkoutSubmission.isSaving}
            itemCount={cart.itemCount}
            onCheckout={() => { if (ensureClientSelected()) openCheckout("payment"); }}
            onSavePending={() => { if (ensureClientSelected()) guardSave(() => void handleSavePending()); }}
            savePendingDisabled={cart.items.length === 0 || checkoutSubmission.isSaving || checkoutSubmission.isCheckingOut}
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

        {selectedClient.id ? (
          <ClientDatesSheet
            clientId={selectedClient.id}
            clientName={selectedClient.name}
            onClose={() => setIsClientDatesVisible(false)}
            renderInline={embedded}
            visible={isClientDatesVisible}
          />
        ) : null}

        <StaffPickerSheet
          onClose={() => setIsEmbeddedStaffPickerVisible(false)}
          onSelect={(staffId) => {
            const staffMember = staffOptions.find((item) => item.id === staffId);
            if (staffMember) handleSelectQuickSaleStaff(staffMember);
            setIsEmbeddedStaffPickerVisible(false);
          }}
          renderInline={embedded}
          selectedStaffId={selectedQuickSaleStaff?.id ?? null}
          staff={staffOptions}
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
          onCompleteSale={(payment) => guardCheckedOut(() => void handleCompleteSale(payment))}
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
          onSavePending={() => { if (ensureClientSelected()) guardSave(() => void handleSavePending()); }}
          onSetConsumableActualQty={handleSetConsumableActualQty}
          onSetQuantity={handleSetQuantity}
          onToggleIncludeGst={() => setIncludeGst((current) => !current)}
          overallDiscountInput={overallDiscountInput}
          overallDiscountPercent={draftDiscountPercent}
          overallDiscountType={draftDiscountType}
          redemptions={redemptions}
          renderInline={embedded}
          selectedClient={selectedClient}
          staffOptions={staffOptions}
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
  catalogDone: { alignItems: "center", backgroundColor: Colors.primary, borderRadius: 14, flex: 1, padding: 15 },
  catalogDoneText: { color: Colors.onPrimary, fontWeight: "700" },
  staffSelect: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    minHeight: 54,
    paddingHorizontal: 14,
  },
  staffSelectError: { borderColor: Colors.error },
  staffSelectCopy: { flex: 1 },
  staffSelectCaption: { color: Colors.text2, fontSize: 11, fontWeight: "700" },
  staffSelectValue: { color: Colors.heading, fontSize: 15, fontWeight: "800" },
  staffSelectPlaceholder: { color: Colors.text2, fontWeight: "600" },
  safeArea: {
    backgroundColor: "#FAF6F8",
    flex: 1,
  },
  topSection: {
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    zIndex: 20,
  },
  catalogHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    paddingTop: Spacing.xs,
  },
  catalogTitle: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: "900",
  },
  catalogCount: {
    color: Colors.primaryText,
    fontSize: 12,
    fontWeight: "800",
  },
  searchSpacing: {
    zIndex: 25,
  },
  content: {
    flex: 1,
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
});
