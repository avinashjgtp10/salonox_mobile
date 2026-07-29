import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { ChangeServiceModal } from "@/features/quickSale/components/ChangeServiceModal";
import { CheckoutSheet } from "@/features/quickSale/components/CheckoutSheet";
import { ClientPickerSheet } from "@/features/quickSale/components/ClientPickerSheet";
import { CategoryChips, type CategoryChipOption } from "@/features/quickSale/components/CategoryChips";
import { ErrorState } from "@/features/quickSale/components/StateViews";
import { GlobalSearchBar } from "@/features/quickSale/components/GlobalSearchBar";
import { MembershipCatalogTab } from "@/features/quickSale/components/MembershipCatalogTab";
import { MiniBillBar } from "@/features/quickSale/components/MiniBillBar";
import { PackageCatalogTab } from "@/features/quickSale/components/PackageCatalogTab";
import { ProductCatalogTab } from "@/features/quickSale/components/ProductCatalogTab";
import { ServiceCatalogTab } from "@/features/quickSale/components/ServiceCatalogTab";
import { useCart } from "@/features/quickSale/hooks/useCart";
import { useDebouncedValue } from "@/features/quickSale/hooks/useDebouncedValue";
import { WALK_IN_CLIENT, type QuickSaleClient } from "@/features/quickSale/types";
import { calculateBillTotals, calculateCartTaxAmount } from "@/features/quickSale/utils/calculations";
import { parseAmount } from "@/features/quickSale/utils/money";
import { fetchClientHistoryThunk, fetchClientsThunk, searchClientsThunk } from "@/middleware/client/client.thunk";
import { fetchDashboardThunk } from "@/middleware/dashboard/dashboard.thunk";
import { fetchUnreadCountThunk } from "@/middleware/notification/notification.thunk";
import { fetchSalesInitThunk } from "@/middleware/sales/sales.thunk";
import {
  selectSalesInitData,
  selectSalesInitError,
  selectSalesInitLoading,
} from "@/store/sales/sales.slice";
import { appointmentService } from "@/services/appointment.service";
import { couponService } from "@/services/coupon.service";
import { packageService } from "@/services/package.service";
import { paymentService } from "@/services/payment.service";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import {
  selectClients,
  selectClientsError,
  selectClientsLoading,
} from "@/store/client/client.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ClientListItem } from "@/types/client";
import type { Product } from "@/types/product";
import type { ClientPackage, PackageListItem } from "@/types/package";
import type { ValidateCouponResult } from "@/types/coupon";
import type { CheckoutSaleSplitEntry, SalePaymentMethod } from "@/types/sales";
import type { ServiceListItem } from "@/types/service";
import type { CreateAppointmentRequest } from "@/types/appointment";
import type { Membership } from "@/types/membership";
import type { CreatePaymentRequest } from "@/types/payment";

type CatalogTab = "services" | "products" | "packages" | "membership";
type CheckoutInitialStep = "review" | "payment";

const ITEM_TYPE_CHIPS: CategoryChipOption[] = [
  { id: "services", label: "Services" },
  { id: "products", label: "Products" },
  { id: "packages", label: "Packages" },
  { id: "membership", label: "Memberships" },
];

const clientFromListItem = (client: ClientListItem): QuickSaleClient => ({
  avatarBg: "#F2EFE9",
  avatarColor: "#726A63",
  id: client.id,
  initials: client.initials,
  membership: client.membership,
  name: client.fullName,
  phone: client.phone,
});

export default function QuickSaleScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ draftId?: string; resetSale?: string }>();

  const initData = useAppSelector(selectSalesInitData);
  const initLoading = useAppSelector(selectSalesInitLoading);
  const initError = useAppSelector(selectSalesInitError);
  const salonId = useAppSelector(selectActiveBranchId);
  const clients = useAppSelector(selectClients);
  const clientsLoading = useAppSelector(selectClientsLoading);
  const clientsError = useAppSelector(selectClientsError);

  const cart = useCart();
  const [activeTab, setActiveTab] = useState<CatalogTab>("services");
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [isGlobalSearchLoading, setIsGlobalSearchLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<QuickSaleClient>(WALK_IN_CLIENT);
  const [isClientStepComplete, setIsClientStepComplete] = useState(Boolean(params.draftId));
  const [hasClientStepSelection, setHasClientStepSelection] = useState(Boolean(params.draftId));
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [isClientPickerVisible, setIsClientPickerVisible] = useState(false);
  const [clientPickerStartsInCreateMode, setClientPickerStartsInCreateMode] = useState(false);
  const [changeServiceLineId, setChangeServiceLineId] = useState<string | null>(null);
  const [activeClientPackages, setActiveClientPackages] = useState<ClientPackage[]>([]);
  const [isCheckoutVisible, setIsCheckoutVisible] = useState(false);
  const [checkoutInitialStep, setCheckoutInitialStep] = useState<CheckoutInitialStep>("payment");
  const [checkoutSucceeded, setCheckoutSucceeded] = useState(false);
  const [isSavingPending, setIsSavingPending] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [undoNotice, setUndoNotice] = useState<{ item: import("@/features/quickSale/types").CartItem; index: number } | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Redux's isSaving/isCheckingOut flags only flip disabled=true after the
  // next render commits; a fast double-tap can fire twice before that
  // happens. This ref is checked+set synchronously so a second tap in the
  // same tick is always a no-op regardless of render timing.
  const isSubmittingRef = useRef(false);

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
  const debouncedClientSearchQuery = useDebouncedValue(clientSearchQuery, 260);
  const trimmedClientSearchQuery = debouncedClientSearchQuery.trim();
  const visibleClientOptions = useMemo(
    () => clients.slice(0, trimmedClientSearchQuery ? 8 : 3),
    [clients, trimmedClientSearchQuery],
  );

  useEffect(() => {
    void dispatch(fetchSalesInitThunk());
  }, [dispatch]);

  useEffect(() => {
    if (isClientStepComplete || isClientPickerVisible) {
      return;
    }

    if (trimmedClientSearchQuery) {
      void dispatch(searchClientsThunk({ limit: 8, reset: true, search: trimmedClientSearchQuery }));
      return;
    }

    void dispatch(fetchClientsThunk({ limit: 3, reset: true, sort_by: "created_at", sort_order: "desc" }));
  }, [dispatch, isClientPickerVisible, isClientStepComplete, trimmedClientSearchQuery]);

  useEffect(() => {
    if (!selectedClient.id) {
      setActiveClientPackages([]);
      return;
    }

    let cancelled = false;

    packageService.getClientPackages(selectedClient.id, salonId)
      .then((packages) => {
        if (!cancelled) {
          setActiveClientPackages(packages);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setActiveClientPackages([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [salonId, selectedClient.id]);

  // Matches the existing "New Sale" flow from the receipt screen, which
  // navigates back here with a fresh resetSale value to force a clean slate.
  useEffect(() => {
    if (params.resetSale) {
      cart.clearCart();
      setSelectedClient(WALK_IN_CLIENT);
      setIsClientStepComplete(false);
      setHasClientStepSelection(false);
      setClientSearchQuery("");
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
    }
    // Only ever react to the resetSale value changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.resetSale]);

  // Computed straight from each cart item's own catalog tax rate — never
  // typed in. Kept even while `includeGst` is off so the UI can still show
  // the user what GST *would* be.
  const gstPreviewAmount = useMemo(() => calculateCartTaxAmount(cart.items), [cart.items]);
  const extraChargesTotal = useMemo(
    () => parseAmount(serviceChargeInput) + parseAmount(convenienceFeeInput) + parseAmount(otherChargesInput),
    [convenienceFeeInput, otherChargesInput, serviceChargeInput],
  );

  const totals = useMemo(
    () =>
      calculateBillTotals(cart.items, {
        couponDiscount: appliedCoupon?.valid ? appliedCoupon.discountAmount : 0,
        exCharges: extraChargesTotal,
        overallDiscount: parseAmount(overallDiscountInput),
        taxAmount: includeGst ? gstPreviewAmount : 0,
        tipAmount: parseAmount(tipInput),
      }),
    [appliedCoupon, cart.items, extraChargesTotal, gstPreviewAmount, includeGst, overallDiscountInput, tipInput],
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

  const handleSelectProductResult = useCallback(
    (product: Product) => {
      if (product.stockQuantity <= 0) {
        return;
      }

      cart.addItem({
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

  const getPackageCoverageMatch = useCallback(
    (service: ServiceListItem) => {
      const normalizedServiceName = service.name.trim().toLowerCase();

      for (const clientPackage of activeClientPackages.filter((item) => item.status.toLowerCase() === "active")) {
        const packageServiceItem = clientPackage.services.find((serviceItem) => {
          if (serviceItem.catalogServiceId && serviceItem.catalogServiceId === service.id) {
            return true;
          }

          return serviceItem.serviceName.trim().toLowerCase() === normalizedServiceName;
        });

        if (packageServiceItem && packageServiceItem.remainingSessions > 0) {
          return {
            clientPackageId: clientPackage.id,
            remainingSessions: packageServiceItem.remainingSessions,
            serviceId: packageServiceItem.serviceId,
          };
        }
      }

      return null;
    },
    [activeClientPackages],
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
    setSelectedClient(client ? clientFromListItem(client) : WALK_IN_CLIENT);
    setHasClientStepSelection(true);
    setClientSearchQuery("");
  }, []);

  const handleClientPickerSelect = useCallback((client: ClientListItem | null) => {
    setSelectedClient(client ? clientFromListItem(client) : WALK_IN_CLIENT);
    setClientSearchQuery("");
    setHasClientStepSelection(true);
  }, []);

  const handleApplyCoupon = useCallback(async () => {
    const trimmedCode = couponCode.trim();

    if (!trimmedCode) {
      setCouponError("Enter a coupon code.");
      return;
    }

    setIsApplyingCoupon(true);
    setCouponError(null);

    try {
      const result = await couponService.validateCoupon({ code: trimmedCode, orderAmount: totals.subtotal });

      if (!result.valid) {
        setAppliedCoupon(null);
        setCouponError(result.message || "This coupon isn't valid for this bill.");
        return;
      }

      setAppliedCoupon(result);
      setCouponCode(result.couponCode);
    } catch (error) {
      setAppliedCoupon(null);
      setCouponError(error instanceof Error ? error.message : "Unable to validate coupon.");
    } finally {
      setIsApplyingCoupon(false);
    }
  }, [couponCode, totals.subtotal]);

  const handleRemoveCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
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

      const packageCoverage = getPackageCoverageMatch(service);

      cart.addItem({
        category: service.category,
        defaultStaffId: singleEligibleStaff?.id ?? null,
        defaultStaffName: singleEligibleStaff?.name ?? null,
        duration: service.durationMinutes ? `${service.durationMinutes} min` : undefined,
        itemId: service.id,
        itemType: "service",
        name: service.name,
        packageCoverageClientPackageId: packageCoverage?.clientPackageId,
        packageCoverageRemaining: packageCoverage?.remainingSessions,
        packageCoverageServiceId: packageCoverage?.serviceId,
        taxAmount: service.taxAmount,
        taxRate: service.taxRate,
        unitPrice: service.price,
      });
    },
    [cart, getPackageCoverageMatch, handleRemoveItem, singleEligibleStaff],
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

  // The appointment's top-level staff_id mirrors the web Quick Sale: the
  // first service's own assigned staff (falling back to the first assigned
  // item when the sale has no services), never a silent "first staff in the
  // branch" guess — every line is expected to already carry its own staffId
  // by the time this is called (CheckoutSheet blocks checkout otherwise).
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

  const buildAppointmentPayload = useCallback((): CreateAppointmentRequest | null => {
    const staffId = getQuickSaleStaff();

    if (!selectedClient.id) {
      setSubmitError("Client is required before checkout.");
      return null;
    }

    if (!staffId) {
      setSubmitError("Staff is required before checkout.");
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
      client_id: selectedClient.id,
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
        is_package_service: Boolean(
          item.packageCoverageRemaining && item.packageCoverageRemaining >= item.quantity,
        ) || undefined,
        name: item.name,
        price: item.unitPrice,
        quantity: item.quantity,
        service_id: item.itemId,
        staff_id: item.staffId ?? undefined,
        staff_name: item.staffName,
        time: startDate.toISOString(),
        total: item.unitPrice * Math.max(0, item.quantity - (item.packageCoverageRemaining ?? 0)),
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
      staff_id: staffId,
      start_time: startDate.toISOString(),
      status: "booked",
      tip_amount: totals.tipAmount,
    };
  }, [
    cart.items,
    getQuickSaleDurationMinutes,
    getQuickSaleStaff,
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
          item.packageCoverageRemaining &&
          item.packageCoverageRemaining >= item.quantity,
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

  const markPackageSessions = useCallback(
    async (appointmentId: string) => {
      await Promise.all(
        packageCoveredServiceItems.map((item) =>
          packageService.completeClientPackageSession(item.packageCoverageClientPackageId!, {
            appointmentId,
            serviceId: item.packageCoverageServiceId!,
            staffName: item.staffName ?? "Quick Sale",
          }),
        ),
      );
    },
    [packageCoveredServiceItems],
  );

  const buildPaymentPayload = useCallback(
    (
      appointmentId: string,
      payment: { method: SalePaymentMethod; splitEntries?: CheckoutSaleSplitEntry[] },
    ): CreatePaymentRequest => {
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
          : { [methodLabel]: totals.grandTotal };

      return {
        appointment_id: appointmentId,
        client_id: selectedClient.id || undefined,
        coupon_code: appliedCoupon?.valid ? appliedCoupon.couponCode : undefined,
        discount_amount: totals.overallDiscount + totals.couponDiscount,
        due_amount: 0,
        gross_amount: isFullyPackageCoveredSale ? packageCatalogTotal : totals.lineSubtotal,
        net_amount: isFullyPackageCoveredSale ? 0 : totals.grandTotal,
        paid_amount: isFullyPackageCoveredSale ? 0 : totals.grandTotal,
        payment_method: methodLabel,
        salon_id: salonId ?? undefined,
        split_details: splitDetails,
        status: "completed",
      };
    },
    [
      appliedCoupon,
      isFullyPackageCoveredSale,
      packageCatalogTotal,
      salonId,
      selectedClient.id,
      totals.couponDiscount,
      totals.grandTotal,
      totals.lineSubtotal,
      totals.overallDiscount,
    ],
  );

  const handleSavePending = async () => {
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSavingPending(true);
    setSubmitError(null);

    try {
      const appointment = await createQuickSaleAppointment();

      if (!appointment) {
        return;
      }

      setIsCheckoutVisible(false);
      setCheckoutSucceeded(false);
      router.push({
        params: {
          appointmentId: appointment.appointment.id,
          mode: "preview",
          total: String(totals.grandTotal),
        },
        pathname: "/quick-sale/checkout",
      });
    } finally {
      isSubmittingRef.current = false;
      setIsSavingPending(false);
    }
  };

  const handleCompleteSale = async (payment: { method: SalePaymentMethod; splitEntries?: CheckoutSaleSplitEntry[] }) => {
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setIsCheckingOut(true);
    setSubmitError(null);

    try {
      const appointment = await createQuickSaleAppointment();

      if (!appointment) {
        return;
      }

      const appointmentId = appointment.appointment.id;
      await paymentService.createPayment(buildPaymentPayload(appointmentId, payment));
      const checkout = await appointmentService.checkoutAppointment(appointmentId);

      if (isFullyPackageCoveredSale) {
        await markPackageSessions(appointmentId);
      }

      void dispatch(fetchDashboardThunk());
      void dispatch(fetchUnreadCountThunk());

      if (selectedClient.id) {
        void dispatch(fetchClientHistoryThunk(selectedClient.id));
      }

      setIsCheckoutVisible(false);
      cart.clearCart();
      setSelectedClient(WALK_IN_CLIENT);
      setIsClientStepComplete(false);
      setHasClientStepSelection(false);
      setClientSearchQuery("");
      setSaleNotes("");

      router.push({
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
      setSubmitError(error instanceof Error ? error.message : "Unable to complete checkout.");
    } finally {
      isSubmittingRef.current = false;
      setIsCheckingOut(false);
    }
  };
  const handleBack = () => {
    if (globalSearchQuery.trim()) {
      handleClearGlobalSearch();
      return;
    }

    if (isClientStepComplete && !params.draftId) {
      setIsClientStepComplete(false);
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/dashboard" as Href);
  };

  if (!isClientStepComplete) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />

        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.84} onPress={handleBack} style={styles.iconButton}>
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
            {clientsError && visibleClientOptions.length === 0 ? (
              <View style={styles.clientStateBlock}>
                <Text style={styles.clientStateTitle}>Unable to load clients</Text>
                <TouchableOpacity
                  activeOpacity={0.84}
                  onPress={() =>
                    void dispatch(fetchClientsThunk({ limit: 3, reset: true, sort_by: "created_at", sort_order: "desc" }))
                  }
                >
                  <Text style={styles.clientSectionAction}>Try again</Text>
                </TouchableOpacity>
              </View>
            ) : clientsLoading && visibleClientOptions.length === 0 ? (
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
                  <TouchableOpacity
                    key={`quick-sale-client-${client.id}`}
                    activeOpacity={0.84}
                    onPress={() => handleSelectClientForStep(client)}
                    style={[
                      styles.recentClientRow,
                      index < visibleClientOptions.length - 1 && styles.recentClientRowBorder,
                      isSelected && styles.clientOptionSelected,
                    ]}
                  >
                    <View style={styles.clientAvatar}>
                      <Text style={styles.clientAvatarText}>{client.initials}</Text>
                    </View>
                    <View style={styles.clientCopy}>
                      <Text numberOfLines={1} style={styles.clientName}>
                        {client.fullName}
                      </Text>
                      <Text numberOfLines={1} style={styles.clientPhone}>
                        {client.phone}
                      </Text>
                    </View>
                    <Ionicons
                      name={isSelected ? "checkmark-circle" : "chevron-forward"}
                      size={18}
                      color={isSelected ? Colors.primary : Colors.text2}
                    />
                  </TouchableOpacity>
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
          startInCreateMode={clientPickerStartsInCreateMode}
          visible={isClientPickerVisible}
        />
      </SafeAreaView>
    );
  }

  const isGlobalSearchActive = globalSearchQuery.trim().length > 0;
  // Checkout/Choose Client/Change Service render above the working screen, so
  // the floating checkout card gets out of the way while any overlay is open.
  const isOverlayActive =
    isCheckoutVisible || isClientPickerVisible || Boolean(changeServiceLineId);

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
        <Text style={styles.headerTitle}>Select Services</Text>
        <TouchableOpacity
          activeOpacity={cart.items.length === 0 ? 1 : 0.84}
          disabled={cart.items.length === 0}
          onPress={() => {
            setCheckoutInitialStep("review");
            setCheckoutSucceeded(false);
            setIsCheckoutVisible(true);
          }}
          style={[styles.iconButton, cart.items.length === 0 && styles.iconButtonDisabled]}
        >
          <Ionicons name="receipt-outline" size={17} color={Colors.primary} />
          {cart.itemCount > 0 ? (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{cart.itemCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
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
                activeClientPackages={activeClientPackages}
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
        onSelect={handleClientPickerSelect}
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
              taxAmount: service.taxAmount,
              taxRate: service.taxRate,
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
        extraCharges={{
          convenienceFee: convenienceFeeInput,
          otherCharges: otherChargesInput,
          serviceCharge: serviceChargeInput,
        }}
        gstPreviewAmount={gstPreviewAmount}
        hasItems={cart.items.length > 0}
        includeGst={includeGst}
        initialStep={checkoutInitialStep}
        isApplyingCoupon={isApplyingCoupon}
        isCheckingOut={isCheckingOut}
        isSaving={isSavingPending}
        isSuccess={checkoutSucceeded}
        items={cart.items}
        onAddMore={() => setIsCheckoutVisible(false)}
        onApplyCoupon={() => void handleApplyCoupon()}
        onAssignStaff={cart.setStaff}
        onChangeCouponCode={(value) => {
          setCouponCode(value);
          setCouponError(null);
        }}
        onChangeCustomer={() => {
          setIsCheckoutVisible(false);
          setTimeout(() => setIsClientPickerVisible(true), 280);
        }}
        onChangeExtraCharge={(key, value) => {
          if (key === "serviceCharge") setServiceChargeInput(value);
          else if (key === "convenienceFee") setConvenienceFeeInput(value);
          else setOtherChargesInput(value);
        }}
        onChangeOverallDiscount={setOverallDiscountInput}
        onChangeTip={setTipInput}
        onClose={() => setIsCheckoutVisible(false)}
        onCompleteSale={(payment) => void handleCompleteSale(payment)}
        onRemoveCoupon={handleRemoveCoupon}
        onRemoveItem={handleRemoveItem}
        onSavePending={() => void handleSavePending()}
        onSetQuantity={cart.setQuantity}
        onToggleIncludeGst={() => setIncludeGst((current) => !current)}
        overallDiscountInput={overallDiscountInput}
        selectedClient={selectedClient}
        staffOptions={initData?.staff ?? []}
        submitError={submitError}
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
  recentClientRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 62,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  recentClientRowBorder: {
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
  },
  clientOptionSelected: {
    backgroundColor: Colors.bg2,
  },
  clientAvatar: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  clientAvatarText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
  },
  clientCopy: {
    flex: 1,
  },
  clientName: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
  },
  clientPhone: {
    color: Colors.text2,
    fontSize: 12,
    marginTop: 2,
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
