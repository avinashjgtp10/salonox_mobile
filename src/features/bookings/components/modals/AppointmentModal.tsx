import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { SuccessOverlay } from "../../../../components/ui";
import { currencySymbol } from "../../utils/currency";
import { useAppSelector, useAppDispatch } from "../../../../hooks/useAppRedux";
import { useAppointment }    from "../../hooks/useAppointment";
import { usePayment }        from "../../hooks/usePayment";
import { useCoupon }         from "../../hooks/useCoupon";
import { useReferral }       from "../../hooks/useReferral";
import { usePackageSessions } from "../../hooks/usePackageSessions";
import { useServices }       from "../../hooks/useServices";
import { useLazyListPackagesQuery, useLazyListPackageTemplatesQuery, useListClientPackagesQuery, useCompleteClientPackageSessionMutation } from "../../../../services/api/endpoints/packages.endpoints";
import { useClientMembershipWallet } from "../../hooks/useClientMembershipWallet";
import { fetchProductsThunk } from "../../../../middleware/catalog/products.thunk";
import { fetchMembershipsThunk } from "../../../../middleware/membership/membership.thunk";
import { setPackagesList, patchPaymentStatus } from "../../../../store/schedulerSlice";
import { postPaymentThunk } from "../../../../middleware/booking/payment.thunk";
import { fetchSettingsThunk } from "../../../../middleware/setting/setting.thunk";
import { getActiveTaxes } from "../../../settings/utils/taxSettings";
import { getTaxModuleConfig } from "../../../settings/utils/taxModuleSettings";
import { getRewardPointsConfig } from "../../../settings/utils/rewardPointsSettings";
import { getReferralConfig } from "../../../settings/utils/referralSettings";
import { isRealId } from "../../utils/paymentUtils";
import { normalizePaymentStatus } from "../../utils/bookingMapper";
import { computeTotals }     from "../../utils/totalsUtils";
import { computePointsEarned, computeEWalletCredit, computeMaxWalletUsable, EWALLET_REDEEM_MINIMUM } from "../../utils/paymentUtils";
import {
  selectPackagesList, selectProductsList, selectMembershipsList, selectBookings,
} from "../../../../store/selectors/scheduler.selectors";
import {
  PersonFill, Scissors, TagFill, FileText,
  BellFill, PencilFill, BoxSeamFill, AwardFill,
  WalletFill, StarFill, PeopleFill, GiftFill,
} from "react-bootstrap-icons";
import { ClientPanel }   from "./ClientPanel";
import { ServicesPanel } from "./ServicesPanel";
import { AvailableBenefitsPanel, type BenefitCardConfig } from "./AvailableBenefitsPanel";
import SellPackageModal from "../../../../components/packages/SellPackageModal";
import SellMembershipCalendarModal from "../../../catalog/components/SellMembershipCalendarModal";
import EwalletTopupModal from "../../../clients/components/EwalletTopupModal";
import type { ClientSearchResult } from "../../../clients/components/ClientSearchInput";
import { PaymentPanel }  from "./PaymentPanel";
import TotalsPanel       from "./TotalsPanel";
import PaymentButton     from "../shared/PaymentButton";
import { printReceipt }  from "../../utils/receipt";
import { store }         from "../../../../store/store";
import { useFocusTrap }  from "../../../../hooks/useFocusTrap";
import "../../styles/AppointmentModal.scss";

import type {
  Booking, Client, ClientStats,
  ServiceItem, PackageItem, ProductItem, MembershipItem,
  DiscountType, SingleMethod, SplitEntry,
} from "../../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  salonId?: string;
  existingBooking?: Booking | null;
  defaultDate?: string;
  defaultTime?: string;
  defaultStaffId?: string;
  defaultClientId?: string;
  defaultClientName?: string;
  defaultClientPhone?: string;
  onRefresh?: () => void;
  onCancelBooking?: (b: Booking) => void;
  onDeleteBooking?: (b: Booking) => void;
  /** Quick Sale entry point: skip the "save only" step and go straight to payment. */
  quickSale?: boolean;
}

function nextQuarterHour(): string {
  const now = new Date();
  let h = now.getHours();
  let m = Math.ceil(now.getMinutes() / 15) * 15;
  if (m === 60) { m = 0; h = (h + 1) % 24; }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function emptyService(staffId?: string, time?: string): ServiceItem {
  return { id: "", service: "", staff: "", staffId: staffId || "", time: time || nextQuarterHour(), price: 0, qty: 1, total: 0, duration: 30 };
}

function timeToMins(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// A service row only counts as "filled" once it's actually selected from the
// catalog dropdown, same as product/package/membership rows. Freshly added
// rows record that as `id` (set to the catalog service's id at selection time
// — see ServiceRow.tsx), but existing bookings loaded back from the API never
// carry that field — their catalog reference is only persisted as
// `service_id`. Checking `id` alone made every previously-saved booking look
// "empty". Accept either.
function isRealServiceRow(r: any): boolean {
  return !!r.service?.trim() && !!(r.id || r.service_id);
}

export const AppointmentModal: React.FC<Props> = ({
  isOpen, onClose, salonId,
  existingBooking, defaultDate, defaultTime, defaultStaffId,
  defaultClientId, defaultClientName, defaultClientPhone,
  onRefresh, onCancelBooking, onDeleteBooking, quickSale,
}) => {
  const dispatch = useAppDispatch();

  // Keyboard accessibility: trap Tab inside the drawer, Escape closes it,
  // focus returns to whatever triggered it. Not a modal when embedded as a
  // full page (quickSale), so skip the trap there.
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen && !quickSale, onClose);

  // Always fetch services + clients when modal opens
  useServices(salonId);

  // Active taxes from Tax Mapping settings, for bill calculation
  useEffect(() => { dispatch(fetchSettingsThunk()); }, [dispatch]);
  const settingItems = useAppSelector((s) => s.setting.items);
  const activeTaxes  = useMemo(() => getActiveTaxes(settingItems), [settingItems]);
  const showTaxBreakupOnInvoice = useMemo(() => getTaxModuleConfig(settingItems).show_breakup_on_invoice, [settingItems]);
  const rewardPointsConfig = useMemo(() => getRewardPointsConfig(settingItems), [settingItems]);
  const referralConfig = useMemo(() => getReferralConfig(settingItems), [settingItems]);

  // ── Lazy on-demand fetching ───────────────────────────────────────────────
  const [triggerPackages, { data: packagesData }]       = useLazyListPackagesQuery();
  const [triggerTemplates, { data: packageTemplatesRaw }] = useLazyListPackageTemplatesQuery();
  const pkgRequested  = useRef(false);
  const prodRequested = useRef(false);
  const memRequested  = useRef(false);

  // In edit mode, pre-fetch data for item types that already exist on the booking
  useEffect(() => {
    if (existingBooking?.packageItems?.length && !pkgRequested.current) {
      pkgRequested.current = true;
      triggerPackages({});
      triggerTemplates();
    }
    if ((existingBooking as any)?.productItems?.length && !prodRequested.current) {
      prodRequested.current = true;
      dispatch(fetchProductsThunk());
    }
    if ((existingBooking as any)?.membershipItems?.length && !memRequested.current) {
      memRequested.current = true;
      dispatch(fetchMembershipsThunk());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Map package API data → scheduler packagesList when it arrives
  useEffect(() => {
    const templates = packageTemplatesRaw ?? [];
    const fromCatalog = (packagesData?.items || []).map((p: any) => ({
      id: String(p.id || ""), name: p.name || "", price: p.basePrice || 0, services: [] as string[],
    }));
    const fromTemplates = templates.map((t: any) => ({
      id: String(t.id || ""), name: t.name || "", price: t.basePrice || 0,
      services: (t.services || []).map((s: any) => s.serviceName),
    }));
    const templateNames = new Set(fromTemplates.map((t: any) => t.name.toLowerCase()));
    const merged = [...fromTemplates, ...fromCatalog.filter((c: any) => !templateNames.has(c.name.toLowerCase()))];
    if (merged.length > 0) dispatch(setPackagesList(merged));
  }, [packagesData, packageTemplatesRaw, dispatch]);

  const availablePackages    = useAppSelector(selectPackagesList);
  const availableProducts    = useAppSelector(selectProductsList);
  const availableMemberships = useAppSelector(selectMembershipsList);
  const allBookings          = useAppSelector(selectBookings);
  const blockedTimes   = useAppSelector((s: any) => s.scheduler?.blockedTimes ?? []);
  const schedulerStaff = useAppSelector((s: any) => s.scheduler?.staffList ?? []);
  const currentSalon  = useAppSelector((s: any) => s.salon?.currentSalon ?? null);

  // ── Client ───────────────────────────────────────────────────────────────
  const [selectedClient, setSelectedClient] = useState<Client | null>(
    existingBooking
      ? (existingBooking.clientId
          ? { id: String(existingBooking.clientId), name: existingBooking.clientName || "", phone: existingBooking.clientPhone || "", eWallet: 0 }
          : { id: "walk-in", name: "Walk-In", phone: "", eWallet: 0 })
      : defaultClientId
        ? { id: defaultClientId, name: defaultClientName || "", phone: defaultClientPhone || "", eWallet: 0 }
        : null
  );
  const [clientStats, setClientStats]       = useState<ClientStats | null>(null);

  // Sell a brand-new package/membership as a popup over the calendar instead
  // of navigating away to the Catalog page — same pattern as ClientHistoryModal.
  const [showSellPackageModal, setShowSellPackageModal] = useState(false);
  const [showSellMembershipModal, setShowSellMembershipModal] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState(false);
  // Bumped after a successful top-up to force ClientPanel to refetch this
  // client's real balance from the backend — the eWallet figure on the card
  // is driven by ClientPanel's own useClientDetails() fetch, not clientStats.
  const [clientRefreshKey, setClientRefreshKey] = useState(0);
  const isSellableClient = !!selectedClient && selectedClient.id !== "walk-in";
  const sellInitialClient: ClientSearchResult | null = isSellableClient
    ? { id: selectedClient!.id, first_name: selectedClient!.name, phone_number: selectedClient!.phone }
    : null;

  // ── Date ─────────────────────────────────────────────────────────────────
  const [calDate, setCalDate] = useState(defaultDate || new Date().toISOString().slice(0, 10));

  // ── Line items ───────────────────────────────────────────────────────────
  const [serviceRows, setServiceRows]       = useState<ServiceItem[]>(() =>
    existingBooking
      ? (existingBooking.services ?? [])
      : [emptyService(defaultStaffId, defaultTime)]
  );
  const [packageRows, setPackageRows]       = useState<PackageItem[]>(existingBooking?.packageItems ?? []);
  const [productRows, setProductRows]       = useState<ProductItem[]>((existingBooking as any)?.productItems ?? []);
  const [membershipRows, setMembershipRows] = useState<MembershipItem[]>((existingBooking as any)?.membershipItems ?? []);

  // ── Charges / Discounts ───────────────────────────────────────────────────
  const [discountType, setDiscountType]   = useState<DiscountType>(existingBooking?.discountType || "Percentage (%)");
  const [discountValue, setDiscountValue] = useState(existingBooking?.discount ?? 0);
  const [exCharges, setExCharges]         = useState(existingBooking?.exCharges ?? 0);
  const [tip, setTip]                     = useState(existingBooking?.tipAmount ?? 0);
  const [focusedField, setFocusedField]   = useState<"exCharges" | "tip" | "discountValue" | null>(null);

  // ── Notes / Alert ─────────────────────────────────────────────────────────
  const [notes, setNotes]           = useState(existingBooking?.notes ?? "");
  const [staffAlert, setStaffAlert] = useState(existingBooking?.staffAlert ?? "");

  // ── Payment state ────────────────────────────────────────────────────────
  const [useEWallet, setUseEWallet]             = useState(false);
  const [eWalletAmt, setEWalletAmt]             = useState(0);
  const [useRewardPoints, setUseRewardPoints]   = useState(false);
  const [rewardPointsToRedeem, setRewardPointsToRedeem] = useState(0);
  const [useReferralCredit, setUseReferralCredit] = useState(false);
  const [referralCreditAmt, setReferralCreditAmt] = useState(0);
  const [paymentMode, setPaymentMode]           = useState<"single" | "split">("single");
  const [singleMethod, setSingleMethod]         = useState<SingleMethod | null>(null);
  const [splitEntries, setSplitEntries]         = useState<SplitEntry[]>([
    { method: "Cash", amount: "" }, { method: "Card", amount: "" },
  ]);
  const [partialAmtInput, setPartialAmtInput]   = useState("");
  // Which specific prior unpaid/partial bookings (by id) are checked to be
  // cleared alongside this payment — staff can pick individual dates rather
  // than an all-or-nothing "clear everything outstanding". includeClearDue is
  // just "is anything selected", derived below once priorDueBookings exists.
  const [selectedDueIds, setSelectedDueIds]     = useState<Set<string>>(new Set());
  const [printAfterPayment, setPrintAfterPayment] = useState(false);
  // Lets staff exclude GST from this specific bill even when Tax Mapping is
  // configured (e.g. a client requesting a no-GST cash bill) — defaults to
  // on so behavior is unchanged unless staff explicitly opts out.
  const [includeGst, setIncludeGst] = useState(true);
  const [payMethodError, setPayMethodError]     = useState(false);
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const [showPaidPopup, setShowPaidPopup] = useState(false);

  // Shows a centered "Payment Completed" popup (SuccessOverlay), then runs the
  // actual close/refresh once it auto-dismisses — the modal has to stay
  // mounted while it's visible, so this replaces calling onRefresh/onClose directly.
  const finishWithPaidPopup = useCallback(() => {
    setShowPaidPopup(true);
  }, []);
  const handlePaidPopupDone = useCallback(() => {
    setShowPaidPopup(false);
    onRefresh?.();
    onClose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRefresh, onClose]);

  // Selecting a method (or switching Single/Split) resolves the "no method selected"
  // error immediately — otherwise the red outline lingers after a valid selection.
  const handleSelectSingleMethod = useCallback((m: SingleMethod) => {
    setSingleMethod(m);
    setPayMethodError(false);
  }, []);
  const handleSetPaymentMode = useCallback((m: "single" | "split") => {
    setPaymentMode(m);
    setPayMethodError(false);
  }, []);
  const paymentSectionRef = useRef<HTMLDivElement>(null);

  // ── Walk-in → Add Client gate ─────────────────────────────────────────────
  const [triggerAddForm, setTriggerAddForm]   = useState(false);
  const [walkInPayError, setWalkInPayError]   = useState("");
  const clientSectionRef = useRef<HTMLDivElement>(null);
  const servicesSectionRef = useRef<HTMLDivElement>(null);

  // Scrolls the section that actually failed validation into view — no visual
  // flash, just brings the existing inline error message on-screen.
  const scrollToErrorSection = useCallback((which: "client" | "services") => {
    const ref = which === "client" ? clientSectionRef : servicesSectionRef;
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // ── Hooks ────────────────────────────────────────────────────────────────
  const { save, isSaving, error: saveError, apiAppointmentId } = useAppointment();
  const { completePayment, isProcessing, payError, paymentOverlay } = usePayment();
  const coupon = useCoupon(salonId);
  const referral = useReferral();
  usePackageSessions(selectedClient?.id ?? null);
  const [completePackageSession] = useCompleteClientPackageSessionMutation();

  // Fetch client's active packages to check which services are pre-paid (price = 0)
  const clientIdForPkg = selectedClient?.id && selectedClient.id !== "walk-in" ? selectedClient.id : undefined;
  const { data: clientPkgsData } = useListClientPackagesQuery(
    { clientId: clientIdForPkg, status: "Active", limit: 50 },
    { skip: !clientIdForPkg },
  );
  // Map of coverage key → remaining sessions from active packages (memoized for
  // stable reference). Keyed by the real catalog service id when the package
  // has one (exact match, so two same-named services at different prices
  // can't cross-consume each other's sessions); packages sold before that id
  // existed fall back to a name-prefixed key, matched only by rows that also
  // lack a catalog id — see ServiceRow.tsx's lookups.
  const coveredServices = useMemo(() => {
    const map = new Map<string, number>();
    (clientPkgsData?.items ?? []).forEach((pkg) => {
      pkg.services.forEach((svc) => {
        if (svc.remainingSessions > 0) {
          const key = svc.catalogServiceId ?? `name:${svc.serviceName.toLowerCase()}`;
          map.set(key, (map.get(key) ?? 0) + svc.remainingSessions);
        }
      });
    });
    return map;
  }, [clientPkgsData]);

  // Manual opt-in via the "Apply Package" checkbox below the services list —
  // unchecked by default for a brand-new appointment, but restored to checked
  // when reopening a booking that was already saved with package coverage
  // (otherwise the reset-on-client-change effect below would immediately wipe
  // the ₹0 pricing this booking was saved with, undoing it every time it's reopened).
  const [applyPackage, setApplyPackage] = useState(() =>
    !!existingBooking && (
      (existingBooking.services ?? []).some((s: any) => s.isPackageService)
      || (existingBooking.packageItems ?? []).some((p: any) => (p as any).isPackageService)
    )
  );
  const applyPackageMounted = useRef(false);
  useEffect(() => {
    if (!applyPackageMounted.current) { applyPackageMounted.current = true; return; }
    setApplyPackage(false);
  }, [clientIdForPkg]);
  const EMPTY_COVERED = useMemo(() => new Map<string, number>(), []);
  const effectiveCoveredServices = applyPackage ? coveredServices : EMPTY_COVERED;

  // Apply (or restore) ₹0 pricing on service rows as the checkbox is toggled.
  // Nothing is committed server-side just by checking this box — package
  // sessions are only marked consumed after checkout (markPackageSessions) —
  // so it's always safe to fully reverse here when unchecked.
  useEffect(() => {
    if (effectiveCoveredServices.size === 0) {
      setServiceRows((prev) => {
        let changed = false;
        const next = prev.map((row) => {
          if (!(row as any).isPackageService) return row;
          changed = true;
          const qty      = Number(row.qty) || 1;
          const discount = Number((row as any).discount) || 0;
          const price    = Number(row.price) || 0;
          return { ...row, total: Math.max(0, price * qty - discount), isPackageService: false };
        });
        return changed ? next : prev;
      });
      return;
    }
    setServiceRows((prev) =>
      prev.map((row) => {
        if (!row.service.trim()) return row;
        // Exact catalog-id key first, then the name-prefixed fallback key —
        // must match coveredServices' actual key format (see the useMemo
        // above), or this always misses and leaves the row untouched.
        const rowCatalogId = (row as any).id || null;
        const remaining = (rowCatalogId ? effectiveCoveredServices.get(rowCatalogId) : undefined)
          ?? effectiveCoveredServices.get(`name:${row.service.toLowerCase()}`)
          ?? 0;
        if (remaining <= 0) return row;
        const qty = Number(row.qty) || 1;
        const paidQty = Math.max(0, qty - remaining);
        const catalogPrice = Number(row.price) || 0;
        return { ...row, total: paidQty * catalogPrice, isPackageService: paidQty === 0 };
      })
    );
  }, [effectiveCoveredServices]);

  // Apply (or restore) ₹0 pricing on package rows when the client already owns that package
  useEffect(() => {
    if (effectiveCoveredServices.size === 0) {
      setPackageRows((prev) => {
        let changed = false;
        const next = prev.map((row) => {
          if (!(row as any).isPackageService) return row;
          const name = ((row as any).packageName || (row as any).name || "").toLowerCase();
          const catalogPkg = availablePackages.find((p: any) => (p.name || "").toLowerCase() === name);
          if (!catalogPkg) return row;
          changed = true;
          const qty   = row.qty || 1;
          const price = Number(catalogPkg.price) || 0;
          return { ...row, price, total: price * qty, isPackageService: false };
        });
        return changed ? next : prev;
      });
      return;
    }
    setPackageRows((prev) =>
      prev.map((row) => {
        const name = ((row as any).packageName || (row as any).name || "").toLowerCase();
        if (!name || !effectiveCoveredServices.has(name)) return row;
        return { ...row, price: 0, total: 0, isPackageService: true };
      })
    );
  }, [effectiveCoveredServices, availablePackages]);

  // ── Membership wallet: preview allocation across service rows ──────────────
  // Amount-based running pool (not per-name matching like packages) — draws
  // from the combined balance across ALL of the client's active memberships
  // (highest-balance first), in row order.
  // Manual opt-in via the "Apply Membership" checkbox below the services list —
  // unchecked by default, so a client with balance isn't billed from their
  // wallet unless staff explicitly chooses to.
  // Display-only: the backend independently recomputes and applies the real
  // deduction at payment time (see payments.service.ts), gated on the same
  // flag sent with the payment — this is just a preview.
  const { memberships: clientMemberships, primary: primaryMembership } = useClientMembershipWallet(clientIdForPkg, clientRefreshKey);
  // Combined balance across ALL active memberships (not just the single
  // highest-balance one) — checkout now draws from multiple in sequence, see
  // deductWalletAcrossMemberships in client-memberships.repository.ts.
  const membershipTotalBalance = useMemo(
    () => clientMemberships.reduce((sum, m) => sum + (Number(m.membershipWalletBalance) > 0 ? Number(m.membershipWalletBalance) : 0), 0),
    [clientMemberships],
  );
  // Restored to checked when reopening a booking previously saved with membership
  // wallet coverage applied — same reasoning as applyPackage above.
  const [applyMembership, setApplyMembership] = useState(
    () => !!existingBooking && (
      !!existingBooking.applyMembershipWallet || Number(existingBooking.membershipWalletUsed) > 0
    )
  );
  const applyMembershipMounted = useRef(false);
  useEffect(() => {
    if (!applyMembershipMounted.current) { applyMembershipMounted.current = true; return; }
    setApplyMembership(false);
  }, [clientIdForPkg]);
  // Per-membership toggle — products only become wallet-eligible once at least
  // one of the client's active, spendable memberships opted in
  // (memberships.applies_to_products). Mirrors the backend gate in
  // payments.service.ts (isProductEligible) so the UI preview matches what
  // checkout will actually deduct.
  const membershipCoversProducts = useMemo(
    () => clientMemberships.some((m) => m.appliesToProducts && Number(m.membershipWalletBalance) > 0),
    [clientMemberships],
  );

  // Most the membership wallet could ever usefully cover — capped by both the
  // wallet's own balance and by how much eligible service (+ product, when
  // enabled) value there is to apply it against (no point defaulting an
  // input higher than that).
  const membershipEligibleTotal = useMemo(() => {
    const serviceTotal = serviceRows.reduce((s, row) => {
      if (!row.service.trim() || (row as any).isPackageService) return s;
      return s + (Number(row.total) || 0);
    }, 0);
    const productTotal = membershipCoversProducts
      ? productRows.reduce((s, row) => s + (Number(row.total) || 0), 0)
      : 0;
    return serviceTotal + productTotal;
  }, [serviceRows, productRows, membershipCoversProducts]);
  const membershipMaxUsable = Math.min(membershipTotalBalance, membershipEligibleTotal);

  // How much of the membership wallet staff has chosen to apply — defaults to
  // the max usable on enable, but editable down (e.g. "only use ₹300, save the
  // rest"), same pattern as the eWallet amount field above.
  const [membershipWalletAmt, setMembershipWalletAmt] = useState(0);
  useEffect(() => {
    if (!applyMembership) { setMembershipWalletAmt(0); return; }
    if (membershipMaxUsable <= 0) { setApplyMembership(false); setMembershipWalletAmt(0); return; }
    setMembershipWalletAmt((prev) => (prev > 0 ? Math.min(prev, membershipMaxUsable) : membershipMaxUsable));
  }, [applyMembership, membershipMaxUsable]);
  const handleSetMembershipWalletAmt = useCallback((v: number) => {
    setMembershipWalletAmt(Math.max(0, Math.min(v, membershipMaxUsable)));
  }, [membershipMaxUsable]);

  const membershipWalletMap = useMemo(() => {
    const map = new Map<string, { walletUsed: number; payable: number }>();
    if (!applyMembership) return map;
    let remaining = Math.min(membershipTotalBalance, membershipWalletAmt);
    if (remaining <= 0) return map;
    serviceRows.forEach((row, i) => {
      const tempId = (row as any).tempId || String(i);
      if (!row.service.trim() || (row as any).isPackageService) return;
      const rowTotal = Number(row.total) || 0;
      if (rowTotal <= 0 || remaining <= 0) return;
      const used = Math.min(remaining, rowTotal);
      remaining -= used;
      map.set(tempId, { walletUsed: used, payable: rowTotal - used });
    });
    if (membershipCoversProducts) {
      productRows.forEach((row, i) => {
        const tempId = (row as any).tempId || String(i);
        if (!row.productId || remaining <= 0) return;
        const rowTotal = Number(row.total) || 0;
        if (rowTotal <= 0) return;
        const used = Math.min(remaining, rowTotal);
        remaining -= used;
        map.set(`product:${tempId}`, { walletUsed: used, payable: rowTotal - used });
      });
    }
    return map;
  }, [serviceRows, productRows, membershipTotalBalance, applyMembership, membershipWalletAmt, membershipCoversProducts]);
  const membershipWalletUsedTotal = useMemo(
    () => Array.from(membershipWalletMap.values()).reduce((s, v) => s + v.walletUsed, 0),
    [membershipWalletMap],
  );
  // Split by bucket (product: rows vs. service rows) so computeTotals can
  // exclude only the wallet-covered portion from each bucket's taxable base —
  // GST shouldn't be charged on an amount the client never actually paid.
  const membershipServiceWalletUsedTotal = useMemo(
    () => Array.from(membershipWalletMap.entries())
      .reduce((s, [key, v]) => s + (key.startsWith("product:") ? 0 : v.walletUsed), 0),
    [membershipWalletMap],
  );
  const membershipProductWalletUsedTotal = useMemo(
    () => Array.from(membershipWalletMap.entries())
      .reduce((s, [key, v]) => s + (key.startsWith("product:") ? v.walletUsed : 0), 0),
    [membershipWalletMap],
  );
  const membershipWalletRemaining = Math.max(0, membershipTotalBalance - membershipWalletUsedTotal);

  // Marks package sessions as complete for each covered service row after appointment is done.
  // appointmentId links each consumed session back to the sale that used it (for audit/reporting).
  async function markPackageSessions(appointmentId?: string) {
    const pkgs = clientPkgsData?.items ?? [];
    for (const row of serviceRows) {
      const rowCatalogId = row.id || null;
      const nameKey = row.service.toLowerCase();
      // Try the exact catalog-id key first, then fall back to the
      // name-prefixed key (covers legacy packages with no catalog id).
      const remaining = (rowCatalogId ? effectiveCoveredServices.get(rowCatalogId) : undefined)
        ?? effectiveCoveredServices.get(`name:${nameKey}`)
        ?? 0;
      if (remaining <= 0) continue;

      // Find the package(s) that cover this row — exact catalog id match when
      // this row has one, otherwise (legacy data on both sides) fall back to
      // name. A client can own more than one active package covering the
      // same service (e.g. two separate 1-session packages) — the
      // coverage/pricing preview above already pools their remaining
      // sessions together, so consumption here must draw from each matching
      // package in turn too, not just the first one it finds, or sessions
      // beyond that first package's own balance are silently never marked.
      const qty = Number(row.qty) || 1;
      let sessionsLeftToMark = Math.min(qty, remaining);

      for (const pkg of pkgs) {
        if (sessionsLeftToMark <= 0) break;
        const svc = pkg.services.find((s) => {
          if (s.remainingSessions <= 0) return false;
          if (rowCatalogId && s.catalogServiceId) return s.catalogServiceId === rowCatalogId;
          return s.serviceName.toLowerCase() === nameKey;
        });
        if (!svc) continue;
        const sessionsFromThisPkg = Math.min(sessionsLeftToMark, svc.remainingSessions);
        for (let i = 0; i < sessionsFromThisPkg; i++) {
          try {
            await completePackageSession({
              id: pkg.id,
              body: { serviceId: svc.serviceId, staffName: row.staff || "Staff", appointmentId },
            }).unwrap();
          } catch {
            // don't block the appointment flow on session-mark failure
          }
        }
        sessionsLeftToMark -= sessionsFromThisPkg;
      }
    }
  }

  // Only offer referral-code entry for a genuinely new client: no referrer
  // already linked, and no prior visits (backend still enforces "first
  // payment only" independently — this is just UX gating).
  const showReferralField = referralConfig.active
    && !!selectedClient?.id && selectedClient.id !== "walk-in"
    && !clientStats?.referredByClientId
    && (clientStats?.totalVisit ?? 0) === 0;

  // ── Totals ───────────────────────────────────────────────────────────────
  // Referral discount preview — mirrors the backend's eligibility check
  // (payments.service.ts) so staff see the reduced total BEFORE paying, not
  // just after. Needs the raw subtotal first (unaffected by any discount
  // inputs), so this is computed via a preliminary pass before the real one.
  const prelimSubtotal = computeTotals({
    serviceRows, packageRows, productRows, membershipRows,
    discountType, discountValue, taxes: activeTaxes, exCharges, tip,
    couponDiscount: coupon.discount,
    eWalletUsed: 0, membershipWalletUsed: 0,
  }).subtotal;
  // True once linked, whether that happened earlier (existing client record)
  // or just now via the "Apply" button on this same screen.
  const isReferralLinked = (!!clientStats?.referredByClientId && clientStats.referralPending) || referral.applied;
  const referralDiscountPreview = (referralConfig.active && isReferralLinked && prelimSubtotal >= referralConfig.min_bill_amount)
    ? Math.min(referralConfig.referee_reward_amount, prelimSubtotal)
    : 0;

  const rewardPointsRedeemedValue = (useRewardPoints && rewardPointsConfig.redeem_points > 0)
    ? (rewardPointsToRedeem / rewardPointsConfig.redeem_points) * rewardPointsConfig.redeem_value
    : 0;

  const billTaxes = includeGst ? activeTaxes : [];
  const totals = computeTotals({
    serviceRows, packageRows, productRows, membershipRows,
    discountType, discountValue, taxes: billTaxes, exCharges, tip,
    couponDiscount: coupon.discount + referralDiscountPreview,
    eWalletUsed: useEWallet ? eWalletAmt : 0,
    membershipWalletUsed: membershipWalletUsedTotal,
    membershipServiceWalletUsed: membershipServiceWalletUsedTotal,
    membershipProductWalletUsed: membershipProductWalletUsedTotal,
    rewardPointsRedeemedValue,
    referralCreditUsed: useReferralCredit ? referralCreditAmt : 0,
  });

  const alreadyPaidAmount   = existingBooking?.payingNow ?? 0;
  // For partial bookings, trust the API's dueAmount directly — payingNow can be unreliable
  const remainingDue = (existingBooking?.status === "partial" && (existingBooking?.dueAmount ?? 0) > 0)
    ? existingBooking.dueAmount
    : Math.max(0, totals.effectiveTotal - alreadyPaidAmount);
  const parsedPartial   = parseFloat(partialAmtInput);
  // 0 counts as a deliberate partial entry (pay nothing now, leave it all due) —
  // matches the >= 0 check in usePayment.ts's actual charge calculation.
  const isPartialEntry  = !isNaN(parsedPartial) && parsedPartial >= 0 && parsedPartial < remainingDue;
  // The amount actually being collected THIS transaction — not the whole bill.
  // A partial entry of 0 (deferring everything to due) needs no payment method,
  // even though the bill itself (effectiveTotal) is still > 0.
  const amountThisTxn   = isPartialEntry ? parsedPartial : totals.effectiveTotal;
  // Live preview for the payment-step summary: as staff types a partial
  // amount, Paid/Due (and therefore the still-visible GST line above it)
  // should update immediately instead of only reflecting a prior, already-
  // completed transaction — otherwise the GST-inclusive balance due looks
  // frozen/wrong while a partial payment is being entered.
  const livePaidAmount = alreadyPaidAmount + amountThisTxn;
  const liveDueAmount  = Math.max(0, remainingDue - amountThisTxn);
  // Exclude current appointment's due so "Clear Pending Due" only shows OTHER unpaid appointments —
  // one row per prior booking (by date), so staff can pick specific ones instead of all-or-nothing.
  const currentApptId = existingBooking?.id ?? apiAppointmentId;
  const priorDueBookings = useMemo(() => {
    if (!selectedClient?.id || selectedClient.id === "walk-in") return [];
    return allBookings
      .filter((b) =>
        String(b.clientId) === String(selectedClient.id) &&
        String(b.id) !== String(currentApptId) &&
        b.status !== "paid" &&
        Number(b.dueAmount) > 0
      )
      .map((b) => ({ id: String(b.id), date: b.date, dueAmount: Number(b.dueAmount), grandTotal: Number(b.grandTotal) }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }, [allBookings, selectedClient?.id, currentApptId]);
  const priorDueAmt = priorDueBookings
    .filter((b) => selectedDueIds.has(b.id))
    .reduce((s, b) => s + b.dueAmount, 0);
  const includeClearDue = selectedDueIds.size > 0;
  const isAllDueSelected = priorDueBookings.length > 0 && priorDueBookings.every((b) => selectedDueIds.has(b.id));
  const toggleAllDue = useCallback((checked: boolean) => {
    setSelectedDueIds(checked ? new Set(priorDueBookings.map((b) => b.id)) : new Set());
  }, [priorDueBookings]);
  const toggleOneDue = useCallback((id: string) => {
    setSelectedDueIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  // Reward earnings are credited straight into eWallet at payment time (see
  // payments.service.ts) — this is just a preview of that ₹ credit, not a
  // separate redeemable balance.
  const previewPoints       = computePointsEarned(totals.effectiveTotal, rewardPointsConfig);
  const previewWalletCredit = computeEWalletCredit(previewPoints, rewardPointsConfig);
  // Nothing left to collect — either the appointment's items are fully package-covered
  // (grandTotal itself is already 0) or a wallet/membership deduction brought
  // an otherwise non-zero bill down to 0. Either way, there's no cash/card/UPI amount
  // to take, so the coupon/payment-method UI is just noise here.
  const isFullyCovered = totals.effectiveTotal === 0;
  // Only swap in the static "Fully Covered" banner (which has no way to
  // uncheck/edit anything) when eWallet isn't the reason for the ₹0 —
  // eWallet is a user-editable choice (they may want to apply only part of
  // it), so while useEWallet is on, keep the interactive PaymentPanel (with
  // its checkbox + amount field) visible even if it currently zeroes the bill.
  const showFullyCoveredBanner = isFullyCovered && !useEWallet;
  // True package coverage means the raw pre-discount subtotal is already ₹0
  // (package-covered service rows are themselves priced at ₹0) — distinct from
  // a coupon/wallet deduction bringing a non-zero subtotal down to zero.
  // Conflating the two (checking grandTotal === 0 instead) mislabels a
  // fully-coupon-discounted bill as a package payment, which then gets posted
  // with payment_method: "Package" — silently skipping sale/revenue recording,
  // reward earning, and coupon usage tracking server-side (all of which are
  // gated off `isPackagePayment` in payments.service.ts).
  const hasAnyRows = serviceRows.length + packageRows.length + productRows.length + membershipRows.length > 0;
  const isPackageZero = hasAnyRows && totals.subtotal === 0;

  // Which source(s) actually brought the bill to ₹0 — shown in the "Fully
  // Covered" message instead of a static guess, since any combination of
  // coupon/eWallet/membership wallet can be the real reason. (eWallet already
  // includes any reward/referral money the client has — there's no separate
  // "reward points" balance anymore.)
  const coveredBySources = [
    coupon.discount > 0 ? `Coupon (${coupon.applied})` : "",
    referralDiscountPreview > 0 ? "Referral Discount" : "",
    useEWallet && eWalletAmt > 0 ? "eWallet" : "",
    membershipWalletUsedTotal > 0 ? "Membership Wallet" : "",
  ].filter(Boolean);
  const fullyCoveredText = coveredBySources.length > 0
    ? `Fully covered by ${coveredBySources.join(" + ")}. No payment required.`
    : "Fully covered by the client's membership wallet or eWallet. No payment required.";

  // Referral / membership / package standing to show on the printed receipt —
  // passed as the `client` param to printReceipt() since the appointment itself
  // only carries items purchased on THIS booking, not the client's overall balance.
  const printClientExtras = {
    referralCode: clientStats?.referralCode ?? null,
    referralEarnings: clientStats?.referralEarnings ?? 0,
    activeMemberships: clientMemberships
      .filter((m) => m.status === "active")
      .map((m) => ({ membershipName: m.membershipName, membershipWalletBalance: m.membershipWalletBalance, expiresAt: m.expiresAt })),
    activePackages: (clientPkgsData?.items ?? [])
      .filter((p) => p.status === "Active")
      .map((p) => ({
        packageName: p.packageName,
        remaining: p.services.reduce((s, sv) => s + sv.remainingSessions, 0),
        total: p.services.reduce((s, sv) => s + sv.totalSessions, 0),
      }))
      .filter((p) => p.remaining > 0),
  };

  // ── eWallet cap: most the client is allowed to apply to this bill ──────────
  const eWalletMaxAmt = useMemo(() => {
    const balance = clientStats?.ewalletAmt ?? 0;
    if (balance < EWALLET_REDEEM_MINIMUM) return 0;
    const maxUsable = computeMaxWalletUsable(totals.grandTotal, referralConfig);
    return Math.min(balance, totals.grandTotal, maxUsable);
  }, [clientStats, totals.grandTotal, referralConfig]);

  // ── Sync eWalletAmt ──────────────────────────────────────────────────────
  // Defaults to the max allowed on enable, but a user-typed custom amount
  // (e.g. "just ₹500 from wallet, rest via cash") is preserved across
  // re-renders and only clamped down if the cap itself shrinks.
  useEffect(() => {
    if (!useEWallet) { setEWalletAmt(0); return; }
    if (eWalletMaxAmt <= 0) { setUseEWallet(false); setEWalletAmt(0); return; }
    setEWalletAmt((prev) => (prev > 0 ? Math.min(prev, eWalletMaxAmt) : eWalletMaxAmt));
  }, [useEWallet, eWalletMaxAmt]);

  const handleSetEWalletAmt = useCallback((v: number) => {
    setEWalletAmt(Math.max(0, Math.min(v, eWalletMaxAmt)));
  }, [eWalletMaxAmt]);

  // ── Reward points cap: most points the client can redeem on this bill ──────
  // Own dedicated balance now (not folded into eWallet) — capped by the real
  // points balance and by not letting the redeemed ₹ value exceed the bill.
  const rewardPointsMaxRedeem = useMemo(() => {
    const balance = clientStats?.rewardPoints ?? 0;
    if (balance <= 0 || rewardPointsConfig.redeem_points <= 0) return 0;
    const maxByBill = Math.floor((totals.grandTotal / rewardPointsConfig.redeem_value) * rewardPointsConfig.redeem_points);
    return Math.max(0, Math.min(balance, maxByBill));
  }, [clientStats, totals.grandTotal, rewardPointsConfig]);

  useEffect(() => {
    if (!useRewardPoints) { setRewardPointsToRedeem(0); return; }
    if (rewardPointsMaxRedeem <= 0) { setUseRewardPoints(false); setRewardPointsToRedeem(0); return; }
    setRewardPointsToRedeem((prev) => (prev > 0 ? Math.min(prev, rewardPointsMaxRedeem) : rewardPointsMaxRedeem));
  }, [useRewardPoints, rewardPointsMaxRedeem]);

  const handleSetRewardPointsToRedeem = useCallback((v: number) => {
    setRewardPointsToRedeem(Math.max(0, Math.min(v, rewardPointsMaxRedeem)));
  }, [rewardPointsMaxRedeem]);

  // ── Referral credit cap: most ₹ the client can redeem on this bill ─────────
  const referralCreditMaxAmt = useMemo(() => {
    const balance = clientStats?.referralBalance ?? 0;
    return Math.max(0, Math.min(balance, totals.grandTotal));
  }, [clientStats, totals.grandTotal]);

  useEffect(() => {
    if (!useReferralCredit) { setReferralCreditAmt(0); return; }
    if (referralCreditMaxAmt <= 0) { setUseReferralCredit(false); setReferralCreditAmt(0); return; }
    setReferralCreditAmt((prev) => (prev > 0 ? Math.min(prev, referralCreditMaxAmt) : referralCreditMaxAmt));
  }, [useReferralCredit, referralCreditMaxAmt]);

  const handleSetReferralCreditAmt = useCallback((v: number) => {
    setReferralCreditAmt(Math.max(0, Math.min(v, referralCreditMaxAmt)));
  }, [referralCreditMaxAmt]);

  // ── Inline validation errors ──────────────────────────────────────────────
  const [clientError,    setClientError]    = useState("");
  const [noItemsError,   setNoItemsError]   = useState(false);
  const [blockTimeError,      setBlockTimeError]      = useState("");
  const [svcErrors,      setSvcErrors]      = useState<Array<{ service?: boolean; staff?: boolean; time?: boolean }>>([]);
  const [pkgErrors,      setPkgErrors]      = useState<Array<{ item?: boolean; staff?: boolean; time?: boolean }>>([]);
  const [prodErrors,     setProdErrors]     = useState<Array<{ item?: boolean; staff?: boolean; time?: boolean }>>([]);
  const [memErrors,      setMemErrors]      = useState<Array<{ item?: boolean; staff?: boolean; time?: boolean }>>([]);

  useEffect(() => {
    if (selectedClient && selectedClient.id !== "walk-in") {
      setClientError("");
      setWalkInPayError("");
      setTriggerAddForm(false);
    }
  }, [selectedClient]);

  // Auto-open payment section for partial-paid appointments so user can pay the remaining due
  useEffect(() => {
    if (isOpen && existingBooking?.status === "partial") {
      setShowPaymentSection(true);
    } else if (!isOpen) {
      setShowPaymentSection(false);
    }
  }, [isOpen, existingBooking?.id, existingBooking?.status]);

  useEffect(() => {
    if (!noItemsError) return;
    const hasAny =
      serviceRows.some((r) => r.service.trim()) ||
      packageRows.some((r) => (r as any).packageId) ||
      productRows.some((r) => (r as any).productId) ||
      membershipRows.some((r) => (r as any).membershipId);
    if (hasAny) setNoItemsError(false);
  }, [serviceRows, packageRows, productRows, membershipRows, noItemsError]);

  useEffect(() => {
    if (blockTimeError) setBlockTimeError("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceRows, packageRows, membershipRows, productRows, calDate]);

  function validate(): boolean {
    let ok = true;
    let scrollTarget: "client" | "services" | null = null;
    if (!selectedClient) { setClientError("Please select a client or choose Walk-In"); ok = false; scrollTarget = "client"; }
    else setClientError("");

    const filledSvc = serviceRows.filter(isRealServiceRow);
    const filledPkg = packageRows.filter((r) => (r as any).packageId);
    const filledPrd = productRows.filter((r) => (r as any).productId);
    const filledMem = membershipRows.filter((r) => (r as any).membershipId);
    const hasAnyFilled = filledSvc.length > 0 || filledPkg.length > 0 || filledPrd.length > 0 || filledMem.length > 0;

    if (!hasAnyFilled) {
      setNoItemsError(true);
      setSvcErrors([]); setPkgErrors([]); setProdErrors([]); setMemErrors([]);
      scrollToErrorSection(scrollTarget ?? "services");
      return false;
    }
    setNoItemsError(false);

    const se = serviceRows.map((r) => ({
      service: !isRealServiceRow(r),
      staff:   isRealServiceRow(r) && !r.staffId,
      time:    isRealServiceRow(r) && !r.time,
    }));
    setSvcErrors(se);
    if (se.some((e) => e.service || e.staff || e.time)) { ok = false; if (!scrollTarget) scrollTarget = "services"; }

    const pe = packageRows.map((r) => ({
      item:  !(r as any).packageId,
      staff: !!(r as any).packageId && !r.staffId,
      time:  !!(r as any).packageId && !r.time,
    }));
    setPkgErrors(pe);
    if (pe.some((e) => e.item || e.staff || e.time)) { ok = false; if (!scrollTarget) scrollTarget = "services"; }

    const pre = productRows.map((r) => ({
      item:  !(r as any).productId,
      staff: !!(r as any).productId && !r.staffId,
      time:  !!(r as any).productId && !r.time,
    }));
    setProdErrors(pre);
    if (pre.some((e) => e.item || e.staff || e.time)) { ok = false; if (!scrollTarget) scrollTarget = "services"; }

    const me = membershipRows.map((r) => ({
      item:  !(r as any).membershipId,
      staff: !!(r as any).membershipId && !r.staffId,
      time:  !!(r as any).membershipId && !r.time,
    }));
    setMemErrors(me);
    if (me.some((e) => e.item || e.staff || e.time)) { ok = false; if (!scrollTarget) scrollTarget = "services"; }

    // ── Block time conflict check ─────────────────────────────────────────
    setBlockTimeError("");
    const rowsToCheck = [
      ...serviceRows.filter((r) => r.service.trim() && r.staffId && r.time)
        .map((r) => ({ staffId: r.staffId, time: r.time, duration: r.duration || 30 })),
      ...packageRows.filter((r: any) => r.packageId && r.staffId && r.time)
        .map((r: any) => ({ staffId: r.staffId, time: r.time, duration: r.duration || 30 })),
      ...membershipRows.filter((r: any) => r.membershipId && r.staffId && r.time)
        .map((r: any) => ({ staffId: r.staffId, time: r.time, duration: r.duration || 30 })),
      ...productRows.filter((r: any) => r.productId && r.staffId && r.time)
        .map((r: any) => ({ staffId: r.staffId, time: r.time, duration: r.duration || 30 })),
    ];
    for (const row of rowsToCheck) {
      const svcStart = timeToMins(row.time);
      const svcEnd   = svcStart + (row.duration || 30);
      const conflict = (blockedTimes as any[]).find((bt) => {
        if (String(bt.staffId) !== String(row.staffId)) return false;
        if (bt.date !== calDate) return false;
        const btStart = timeToMins(bt.startTime);
        const btEnd   = timeToMins(bt.endTime);
        return svcStart < btEnd && svcEnd > btStart;
      });
      if (conflict) {
        const staffName =
          (schedulerStaff as any[]).find((s) => String(s.id) === String(row.staffId))?.name ||
          "This staff member";
        const reasonPart = conflict.reason ? ` (${conflict.reason})` : "";
        setBlockTimeError(
          `${staffName} is blocked from ${conflict.startTime} to ${conflict.endTime} on this date${reasonPart}. Please choose a different time or staff.`
        );
        ok = false;
        if (!scrollTarget) scrollTarget = "services";
        break;
      }
    }

    // Overlapping appointments for the same staff are allowed intentionally
    // (e.g. hair color processing time) — the scheduler visualizes concurrent
    // bookings side-by-side instead of blocking the save.

    if (!ok && scrollTarget) scrollToErrorSection(scrollTarget);
    return ok;
  }

  function buildSavePayload() {
    const isWalkIn = !selectedClient || selectedClient.id === "walk-in";
    return {
      booking: {
        clientId:      isWalkIn ? undefined : selectedClient?.id,
        clientName:    isWalkIn ? "Walk-In" : (selectedClient?.name || "Walk-In"),
        clientPhone:   isWalkIn ? "" : (selectedClient?.phone || ""),
        staffId:       serviceRows[0]?.staffId || defaultStaffId || "",
        date:          calDate,
        startTime:     serviceRows[0]?.time || defaultTime || "10:00",
        status:        (existingBooking?.status || "booked") as any,
        grandTotal:    totals.grandTotal,
        discount:      discountValue,
        discountType,
        exCharges,
        tipAmount:     tip,
        gst:           totals.taxable > 0 ? Number(((totals.gstAmount / totals.taxable) * 100).toFixed(4)) : 0,
        gstAmount:     totals.gstAmount,
        taxBreakdown:  totals.taxBreakdown,
      } as Partial<Booking>,
      serviceRows, packageRows, productRows, membershipRows,
      calDate, defaultTime, notes, staffAlert, salonId,
      clientId:             selectedClient?.id ?? null,
      existingBooking:      existingBooking ?? null,
      isPackageAppointment: isPackageZero,
      applyMembershipWallet: applyMembership,
    };
  }

  const handleSaveAndPay = useCallback(async () => {
    if (!validate()) return;
    const id = await save(buildSavePayload());
    if (id) {
      // For package-covered appointments (grand total = ₹0), mark paymentMode in Redux BEFORE
      // onRefresh overwrites the booking from the API. The paymentPatchCache survives setBookings,
      // so the tooltip and bill correctly show ₹0 even while the appointment is still Unpaid.
      if (isPackageZero) {
        dispatch(patchPaymentStatus({
          id: String(id),
          status: "booked",
          payingNow: 0,
          dueAmount: 0,
          grandTotal: 0,
          paymentMode: "Package",
        }));
      }
      onRefresh?.();
      onClose();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save, dispatch, totals.grandTotal, selectedClient, serviceRows, packageRows, productRows, membershipRows,
      calDate, defaultTime, notes, staffAlert, salonId, existingBooking, defaultStaffId,
      discountType, discountValue, exCharges, tip, activeTaxes, totals,
      onRefresh, onClose]);

  const handleUpdate = useCallback(async () => {
    if (!validate()) return;
    const id = await save(buildSavePayload());
    if (id) { onRefresh?.(); onClose(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save, selectedClient, serviceRows, packageRows, productRows, membershipRows,
      calDate, defaultTime, notes, staffAlert, salonId, existingBooking, defaultStaffId,
      discountType, discountValue, exCharges, tip, activeTaxes, totals,
      onRefresh, onClose]);

  // Save (or update) the booking, then reveal the payment section — shared by
  // "Continue to Payment" (existing booking) and Quick Sale (new booking, ₹0).
  const handleContinueToPaymentZero = useCallback(async () => {
    if (!validate()) return;
    const id = await save(buildSavePayload());
    if (!id) return;
    setShowPaymentSection(true);
    setTimeout(() => { paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save, selectedClient, serviceRows, packageRows, productRows, membershipRows,
      calDate, defaultTime, notes, staffAlert, salonId, existingBooking, defaultStaffId,
      discountType, discountValue, exCharges, tip, activeTaxes, totals]);

  // Same as above but requires a real (non-walk-in) client — shared by
  // "Continue to Payment" (existing booking) and Quick Sale (new booking, non-₹0).
  const handleContinueToPayment = useCallback(async () => {
    const isWalkIn = !selectedClient || selectedClient.id === "walk-in";
    if (isWalkIn) {
      setWalkInPayError("Add client details before proceeding to payment.");
      setTriggerAddForm(true);
      clientSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (!validate()) return;
    const id = await save(buildSavePayload());
    if (!id) return;
    setShowPaymentSection(true);
    setTimeout(() => {
      paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save, selectedClient, serviceRows, packageRows, productRows, membershipRows,
      calDate, defaultTime, notes, staffAlert, salonId, existingBooking, defaultStaffId,
      discountType, discountValue, exCharges, tip, activeTaxes, totals]);

  // ── Pay ──────────────────────────────────────────────────────────────────
  const handlePay = useCallback(async () => {
    // Validate payment method first — stop completely if not selected. Skipped
    // once the bill is fully covered (package, or a wallet/membership/points
    // deduction brought effectiveTotal to 0), or when this transaction's own
    // amount is a deliberate 0 (partial entry deferring everything to due) —
    // nothing to collect via a method either way.
    if (amountThisTxn > 0 && paymentMode === "single" && !singleMethod) {
      setPayMethodError(true);
      return; // ← hard stop, no processing
    }
    setPayMethodError(false);

    const apptId = existingBooking?.id ?? apiAppointmentId;
    if (!apptId) return;

    const ok = await completePayment({
      appointmentId: apptId,
      clientId:      selectedClient?.id,
      salonId,
      grandTotal:        totals.grandTotal,
      effectiveTotal:    totals.effectiveTotal,
      subtotal:          totals.subtotal,
      manualDiscountAmt: totals.manualDiscount,
      alreadyPaidAmount,
      eWalletAmt,
      couponDiscount:    coupon.discount,
      couponApplied:     coupon.applied,
      paymentMode, singleMethod, splitEntries, partialAmtInput,
      includeClearDue, priorDueAmt, useEWallet,
      rewardPointsToRedeem: useRewardPoints ? rewardPointsToRedeem : 0,
      referralCreditAmt:    useReferralCredit ? referralCreditAmt : 0,
      selectedDueIds: Array.from(selectedDueIds),
      applyMembershipWallet: applyMembership,
      gstAmount:         totals.gstAmount,
      taxBreakdown:      totals.taxBreakdown,
    });
    if (ok) {
      await markPackageSessions(String(apptId));
      if (printAfterPayment) {
        const freshBooking = store.getState().scheduler.bookings.find(
          (b: any) => String(b.id) === String(apptId)
        );
        if (freshBooking) printReceipt(freshBooking as any, schedulerStaff, currentSalon, printClientExtras, { auto: true, showTaxBreakup: showTaxBreakupOnInvoice });
      }
      finishWithPaidPopup();
    }
  }, [
    completePayment, existingBooking, apiAppointmentId,
    selectedClient, salonId, totals, alreadyPaidAmount, amountThisTxn,
    eWalletAmt, coupon, paymentMode, singleMethod, splitEntries,
    partialAmtInput, includeClearDue, priorDueAmt, useEWallet, selectedDueIds, applyMembership,
    useRewardPoints, rewardPointsToRedeem, useReferralCredit, referralCreditAmt,
    finishWithPaidPopup, printAfterPayment, schedulerStaff, currentSalon,
  ]);

  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  // ── Zero-payment for fully package-covered appointments ─────────────────
  const handleZeroPackagePayment = useCallback(async () => {
    const apptId = existingBooking?.id ?? apiAppointmentId;
    if (!apptId) return;
    // Catalog total = what the backend stored (price × qty per service, before package discount).
    // The appointment was saved at full price so grand_total > 0 in the DB.
    // We declare that amount as "paid via Package" so the backend marks the appointment Paid.
    const catalogTotal = serviceRows.reduce((s: number, r) => {
      const p = Number((r as any).price) || 0;
      const q = Number(r.qty) || 1;
      return s + p * q;
    }, 0);
    const result: any = await dispatch(postPaymentThunk({
      salon_id:       salonId || undefined,
      appointment_id: apptId,
      client_id:      (selectedClient?.id && isRealId(selectedClient.id)) ? selectedClient.id : undefined,
      gross_amount:   catalogTotal,
      net_amount:     0,
      paid_amount:    0,
      due_amount:     0,
      payment_method: "Package",
      split_details:  { Package: catalogTotal },
      status:         "completed",
    }));
    if (!postPaymentThunk.rejected.match(result)) {
      dispatch(patchPaymentStatus({
        id: String(apptId),
        status: "paid",
        payingNow: 0,
        dueAmount: 0,
        grandTotal: 0,
        paymentMode: "Package",
      }));
      await markPackageSessions(String(apptId));
      finishWithPaidPopup();
    } else {
      onClose();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, existingBooking, apiAppointmentId, selectedClient, salonId, serviceRows, finishWithPaidPopup, onClose]);

  // ── Quick Sale: single "Checkout" click — saves the appointment and
  // completes payment in one step, no separate "Continue to Payment" reveal.
  const handleQuickSaleCheckout = useCallback(async () => {
    const isWalkIn = !selectedClient || selectedClient.id === "walk-in";
    if (isWalkIn) {
      setWalkInPayError("Add client details before proceeding to payment.");
      setTriggerAddForm(true);
      clientSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    // Run form validation (service/staff/time) and the payment-method check
    // together, so ALL errors surface on the first Checkout click — not the
    // form errors only after the payment method has been fixed.
    const formOk = validate();
    // No payment method needed once the bill is fully covered (package, or a
    // wallet/membership/points deduction brought effectiveTotal to 0), or when
    // this transaction's own amount is a deliberate 0 (partial entry deferring
    // everything to due) — nothing to collect via a method either way.
    const methodMissing = amountThisTxn > 0 && paymentMode === "single" && !singleMethod;
    setPayMethodError(methodMissing);
    if (!formOk || methodMissing) return;

    const id = await save(buildSavePayload());
    if (!id) return;

    if (isPackageZero) {
      const catalogTotal = serviceRows.reduce((s: number, r) => {
        const p = Number((r as any).price) || 0;
        const q = Number(r.qty) || 1;
        return s + p * q;
      }, 0);
      const result: any = await dispatch(postPaymentThunk({
        salon_id:       salonId || undefined,
        appointment_id: id,
        client_id:      (selectedClient?.id && isRealId(selectedClient.id)) ? selectedClient.id : undefined,
        gross_amount:   catalogTotal,
        net_amount:     0,
        paid_amount:    0,
        due_amount:     0,
        payment_method: "Package",
        split_details:  { Package: catalogTotal },
        status:         "completed",
      }));
      if (!postPaymentThunk.rejected.match(result)) {
        dispatch(patchPaymentStatus({
          id: String(id),
          status: "paid",
          payingNow: 0,
          dueAmount: 0,
          grandTotal: 0,
          paymentMode: "Package",
        }));
        await markPackageSessions(String(id));
        finishWithPaidPopup();
      }
      return;
    }

    const ok = await completePayment({
      appointmentId: id,
      clientId:      selectedClient?.id,
      salonId,
      grandTotal:        totals.grandTotal,
      effectiveTotal:    totals.effectiveTotal,
      subtotal:          totals.subtotal,
      manualDiscountAmt: totals.manualDiscount,
      alreadyPaidAmount: 0,
      eWalletAmt,
      couponDiscount:    coupon.discount,
      couponApplied:     coupon.applied,
      paymentMode, singleMethod, splitEntries, partialAmtInput,
      includeClearDue, priorDueAmt, useEWallet,
      rewardPointsToRedeem: useRewardPoints ? rewardPointsToRedeem : 0,
      referralCreditAmt:    useReferralCredit ? referralCreditAmt : 0,
      selectedDueIds: Array.from(selectedDueIds),
      applyMembershipWallet: applyMembership,
      gstAmount:         totals.gstAmount,
      taxBreakdown:      totals.taxBreakdown,
    });
    if (ok) {
      await markPackageSessions(String(id));
      if (printAfterPayment) {
        const freshBooking = store.getState().scheduler.bookings.find(
          (b: any) => String(b.id) === String(id)
        );
        if (freshBooking) printReceipt(freshBooking as any, schedulerStaff, currentSalon, printClientExtras, { auto: true, showTaxBreakup: showTaxBreakupOnInvoice });
      }
      finishWithPaidPopup();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save, completePayment, dispatch, selectedClient, salonId, serviceRows, totals, amountThisTxn,
      eWalletAmt, coupon, paymentMode, singleMethod, splitEntries, partialAmtInput,
      includeClearDue, priorDueAmt, useEWallet, selectedDueIds, applyMembership, printAfterPayment,
      useRewardPoints, rewardPointsToRedeem, useReferralCredit, referralCreditAmt,
      schedulerStaff, currentSalon, finishWithPaidPopup]);

  if (!isOpen) return null;

  const isCancelledBooking = existingBooking?.status?.toLowerCase() === "cancelled";
  const isPartialBooking   = existingBooking?.status === "partial";
  const isPaymentFrozen = existingBooking?.status === "paid"
    || (existingBooking?.status !== "partial"
        && alreadyPaidAmount > 0
        && alreadyPaidAmount >= totals.effectiveTotal);

  // Disable pay button when no method selected in single mode
  const isPayDisabled = isPaymentFrozen
    || isProcessing
    || (amountThisTxn > 0 && paymentMode === "single" && !singleMethod);

  const confirmLabel = isPaymentFrozen
    ? "Already Paid"
    : isPartialEntry
      ? `Confirm Partial — ${currencySymbol}${parsedPartial.toFixed(2)} (${currencySymbol}${(remainingDue - parsedPartial).toFixed(2)} due)`
      : includeClearDue
        ? `Confirm & Pay — ${currencySymbol}${(remainingDue + priorDueAmt).toFixed(2)} (incl. ${currencySymbol}${priorDueAmt.toFixed(2)} due)`
        : `Confirm & Pay — ${currencySymbol}${remainingDue.toFixed(2)}`;

  // ── Reusable body sections — shared by the Calendar drawer layout and the Quick Sale two-column layout ──
  const clientSectionEl = (
    <div className="appt-section" ref={clientSectionRef}>
      <div className="appt-section__title"><PersonFill size={15} /> Client</div>
      <ClientPanel
        salonId={salonId}
        calDate={calDate}
        onDateChange={setCalDate}
        selectedClientId={selectedClient?.id ?? null}
        initialName={existingBooking?.clientName}
        fallbackUnpaidAmt={existingBooking?.dueAmount ?? 0}
        onSelectClient={setSelectedClient}
        onClearClient={() => { setSelectedClient(null); setClientStats(null); }}
        onStatsLoaded={setClientStats}
        historyUrlBase="/dashboard/clients"
        error={clientError || walkInPayError}
        defaultName={!existingBooking && !selectedClient ? defaultClientName : undefined}
        defaultPhone={!existingBooking && !selectedClient ? defaultClientPhone : undefined}
        openAddForm={triggerAddForm}
        refreshKey={clientRefreshKey}
        rewardPointsConfig={rewardPointsConfig}
      />
    </div>
  );

  const servicesSectionEl = (
    <>
      <div
        className="appt-section"
        style={isPartialBooking ? { pointerEvents: "none", opacity: 0.7 } : undefined}
        ref={servicesSectionRef}
      >
        <div className="appt-section__title"><Scissors size={15} /> Services &amp; Items</div>
        {noItemsError && (
          <div className="services-no-items-error">
            Add at least one service, package, product or membership before saving.
          </div>
        )}
        <ServicesPanel
          serviceRows={serviceRows}
          onUpdateService={(i, field, value) => setServiceRows((rows) => rows.map((x, idx) => idx === i ? { ...x, [field as string]: value } : x))}
          onRemoveService={(i) => setServiceRows((rows) => rows.filter((_, idx) => idx !== i))}
          onServiceDuplicate={(i, svc) => {
            // Picking a service that's already on the bill merges into that
            // row (qty +1) instead of creating a duplicate row. Coverage is
            // recomputed against the package pool ONCE for the merged row, so
            // two rows of the same service can no longer each claim the same
            // remaining session (double free) — anything beyond the remaining
            // sessions is charged at the normal price.
            const nameKey = svc.name.trim().toLowerCase();
            const targetIdx = serviceRows.findIndex((r, idx) =>
              idx !== i && r.service.trim() && (
                (svc.id && r.id && String(r.id) === String(svc.id)) ||
                r.service.trim().toLowerCase() === nameKey
              ));
            if (targetIdx === -1) return false;
            setServiceRows((rows) => {
              const target = rows[targetIdx];
              if (!target) return rows;
              const newQty = Math.min(99, (Number(target.qty) || 1) + 1);
              const remaining = (svc.id ? effectiveCoveredServices.get(String(svc.id)) : undefined)
                ?? effectiveCoveredServices.get(`name:${nameKey}`) ?? 0;
              const price = Number(target.price) || Number(svc.price) || 0;
              const discountPct = Math.min(100, Math.max(0, Number(target.discount) || 0));
              const paidQty = Math.max(0, newQty - remaining);
              const total = Math.max(0, price * paidQty * (1 - discountPct / 100));
              return rows
                .map((r, idx) => idx === targetIdx
                  ? { ...r, qty: newQty, total, isPackageService: paidQty === 0 }
                  : r)
                .filter((_, idx) => idx !== i);
            });
            return true;
          }}
          onAddService={() => setServiceRows((rows) => {
            const last = rows[rows.length - 1];
            const nextTime = last?.time
              ? (() => {
                  const [h, m] = last.time.split(":").map(Number);
                  const total = h * 60 + m + (last.duration || 30);
                  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
                })()
              : rows[0]?.time;
            return [...rows, emptyService("", nextTime)];
          })}
          packageRows={packageRows}
          onUpdatePackage={(i, r) => setPackageRows((rows) => rows.map((x, idx) => idx === i ? r : x))}
          onRemovePackage={(i) => setPackageRows((rows) => rows.filter((_, idx) => idx !== i))}
          onAddPackage={() => {
            if (!pkgRequested.current) {
              pkgRequested.current = true;
              triggerPackages({});
              triggerTemplates();
            }
            setPackageRows((rows) => [...rows, { id: "", packageId: "", packageName: "", price: 0, qty: 1, discount: 0, total: 0, staffId: "", time: serviceRows[0]?.time || defaultTime || "" }]);
          }}
          productRows={productRows}
          onUpdateProduct={(i, r) => setProductRows((rows) => rows.map((x, idx) => idx === i ? r : x))}
          onRemoveProduct={(i) => setProductRows((rows) => rows.filter((_, idx) => idx !== i))}
          onAddProduct={() => {
            if (!prodRequested.current) {
              prodRequested.current = true;
              dispatch(fetchProductsThunk());
            }
            setProductRows((rows) => [...rows, { id: "", productId: "", productName: "", price: 0, qty: 1, discount: 0, total: 0, staffId: "", time: serviceRows[0]?.time || defaultTime || "" }]);
          }}
          membershipRows={membershipRows}
          onUpdateMembership={(i, r) => setMembershipRows((rows) => rows.map((x, idx) => idx === i ? r : x))}
          onRemoveMembership={(i) => setMembershipRows((rows) => rows.filter((_, idx) => idx !== i))}
          onAddMembership={() => {
            if (!memRequested.current) {
              memRequested.current = true;
              dispatch(fetchMembershipsThunk());
            }
            setMembershipRows((rows) => [...rows, { id: "", membershipId: "", membershipName: "", price: 0, qty: 1, total: 0, staffId: "", time: serviceRows[0]?.time || defaultTime || "" }]);
          }}
          onSellPackage={isSellableClient ? () => setShowSellPackageModal(true) : undefined}
          onSellMembership={isSellableClient ? () => setShowSellMembershipModal(true) : undefined}
          onTopupEwallet={isSellableClient ? () => setShowTopupModal(true) : undefined}
          availablePackages={availablePackages}
          availableProducts={availableProducts}
          availableMemberships={availableMemberships}
          coveredServices={effectiveCoveredServices}
          membershipWalletInfo={membershipWalletMap}
          frozen={false}
          svcErrors={svcErrors}
          pkgErrors={pkgErrors}
          prodErrors={prodErrors}
          memErrors={memErrors}
          onClearSvcError={(i: number, field: string) => setSvcErrors((prev) => {
            const n = [...prev];
            if (n[i]) n[i] = { ...n[i], [field]: false };
            return n;
          })}
        />
      </div>

      {/* Apply Package / Apply Membership toggles now live in
          availableBenefitsSectionEl (payment step only), alongside
          eWallet/Reward Points/Referral Credit as a unified card grid. */}

      {(saveError || payError) && (
        <div style={{
          margin: "0 0 4px", padding: "10px 14px",
          background: "#fef2f2", border: "1px solid #fca5a5",
          borderRadius: 8, color: "#dc2626", fontSize: 13,
          display: "flex", alignItems: "flex-start", gap: 8,
        }}>
          <span style={{ flexShrink: 0 }}>⛔</span>
          <span>{saveError || payError}</span>
        </div>
      )}
    </>
  );

  // Applying a benefit (package/membership/eWallet/etc.) to a bill with no
  // service, package, product, or membership line item on it yet is
  // meaningless — there's nothing for the benefit to discount. The cards stay
  // visible (staff should still see the client's balances), but toggling one
  // on with an empty bill is blocked with a plain-language message — shown
  // only on that attempt, not preemptively.
  const hasAnyFilledItems = useMemo(() => (
    serviceRows.some(isRealServiceRow) ||
    packageRows.some((r: any) => r.packageId) ||
    productRows.some((r: any) => r.productId) ||
    membershipRows.some((r: any) => r.membershipId)
  ), [serviceRows, packageRows, productRows, membershipRows]);

  const [benefitsGateError, setBenefitsGateError] = useState(false);
  useEffect(() => {
    if (hasAnyFilledItems) setBenefitsGateError(false);
  }, [hasAnyFilledItems]);

  // ── Available Benefits — one card per spendable balance (Package,
  // Membership, eWallet, Reward Points, Referral Credit). AppointmentModal
  // owns all the underlying state; the panel itself is purely presentational.
  const firstActivePkg = (clientPkgsData?.items ?? [])[0];
  const availableBenefitCards: BenefitCardConfig[] = useMemo(() => {
    const cards: BenefitCardConfig[] = [];

    if (coveredServices.size > 0 && firstActivePkg) {
      const pkgRemaining = firstActivePkg.services.reduce((s, svc) => s + svc.remainingSessions, 0);
      const pkgTotal = firstActivePkg.services.reduce((s, svc) => s + svc.totalSessions, 0);
      cards.push({
        key: "package",
        icon: BoxSeamFill,
        variantClass: "benefit-card--package",
        title: "Package",
        value: `${pkgRemaining}/${pkgTotal} Remaining`,
        subtitle: firstActivePkg.packageName,
        checked: applyPackage,
        onToggle: setApplyPackage,
      });
    }

    const activeMembershipsWithBalance = clientMemberships.filter((m) => Number(m.membershipWalletBalance) > 0);
    if (membershipTotalBalance > 0) {
      cards.push({
        key: "membership",
        icon: AwardFill,
        variantClass: "benefit-card--membership",
        title: activeMembershipsWithBalance.length > 1 ? `Membership (${activeMembershipsWithBalance.length})` : "Membership",
        value: `${currencySymbol}${membershipTotalBalance.toLocaleString("en-IN")} Remaining`,
        subtitle: activeMembershipsWithBalance.length > 1
          ? activeMembershipsWithBalance.map((m) => m.membershipName).join(", ")
          : (activeMembershipsWithBalance[0]?.membershipName ?? primaryMembership?.membershipName ?? ""),
        checked: applyMembership,
        onToggle: setApplyMembership,
        input: {
          value: membershipWalletAmt,
          max: membershipMaxUsable,
          step: 0.01,
          prefix: currencySymbol,
          onChange: handleSetMembershipWalletAmt,
        },
      });
    }

    const eWalletBal = clientStats?.ewalletAmt ?? 0;
    if (eWalletBal >= 100) {
      cards.push({
        key: "ewallet",
        icon: WalletFill,
        variantClass: "benefit-card--ewallet",
        title: "eWallet",
        value: `${currencySymbol}${eWalletBal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        subtitle: "Available Balance",
        checked: useEWallet,
        onToggle: setUseEWallet,
        input: {
          value: eWalletAmt,
          max: eWalletMaxAmt,
          step: 0.01,
          prefix: currencySymbol,
          onChange: handleSetEWalletAmt,
        },
      });
    }

    const rewardBal = clientStats?.rewardPoints ?? 0;
    if (rewardBal > 0) {
      cards.push({
        key: "reward",
        icon: StarFill,
        variantClass: "benefit-card--reward",
        title: "Reward Points",
        value: `${rewardBal.toLocaleString("en-IN")} pts`,
        subtitle: "Available Points",
        checked: useRewardPoints,
        onToggle: setUseRewardPoints,
        input: {
          value: rewardPointsToRedeem,
          max: rewardBal,
          step: 1,
          suffix: "pts",
          placeholder: "0 pts",
          onChange: handleSetRewardPointsToRedeem,
        },
      });
    }

    const referralBal = clientStats?.referralBalance ?? 0;
    if (referralBal > 0) {
      cards.push({
        key: "referral",
        icon: PeopleFill,
        variantClass: "benefit-card--referral",
        title: "Referral Credit",
        value: `${currencySymbol}${referralBal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        subtitle: "Available Credit",
        checked: useReferralCredit,
        onToggle: setUseReferralCredit,
        input: {
          value: referralCreditAmt,
          max: referralCreditMaxAmt,
          step: 0.01,
          prefix: currencySymbol,
          onChange: handleSetReferralCreditAmt,
        },
      });
    }

    return cards;
  }, [
    coveredServices, firstActivePkg, applyPackage,
    clientMemberships, membershipTotalBalance, primaryMembership, applyMembership,
    membershipWalletAmt, membershipMaxUsable, handleSetMembershipWalletAmt,
    clientStats, useEWallet, eWalletAmt, eWalletMaxAmt, handleSetEWalletAmt,
    useRewardPoints, rewardPointsToRedeem, handleSetRewardPointsToRedeem,
    useReferralCredit, referralCreditAmt, referralCreditMaxAmt, handleSetReferralCreditAmt,
  ]);

  // Turning a benefit ON with nothing on the bill is what gets blocked (and
  // surfaces the message); turning one OFF is always allowed.
  const gatedBenefitCards: BenefitCardConfig[] = useMemo(
    () => availableBenefitCards.map((c) => ({
      ...c,
      onToggle: (v: boolean) => {
        if (v && !hasAnyFilledItems) { setBenefitsGateError(true); return; }
        setBenefitsGateError(false);
        c.onToggle(v);
      },
    })),
    [availableBenefitCards, hasAnyFilledItems],
  );

  const availableBenefitsSectionEl = availableBenefitCards.length > 0 ? (
    <div className="appt-section">
      <div className="appt-section__title"><GiftFill size={15} /> Available Benefits</div>
      <AvailableBenefitsPanel cards={gatedBenefitCards} />
      {benefitsGateError && (
        <div className="services-no-items-error">
          Please add or select a service or item before applying benefits.
        </div>
      )}
    </div>
  ) : null;

  const chargesSectionEl = (
    <div className="appt-section">
      <div className="appt-section__title"><TagFill size={15} /> Charges &amp; Discounts</div>
      <div className="charges-grid">
        <div className="field-group">
          <label>Ex Charges</label>
          <input className="fg-input" type="number" min={0}
            value={focusedField === "exCharges" && exCharges === 0 ? "" : exCharges}
            onFocus={() => setFocusedField("exCharges")}
            onBlur={() => setFocusedField(null)}
            onWheel={(e) => e.currentTarget.blur()}
            onChange={(e) => setExCharges(e.target.value === "" ? 0 : Number(e.target.value))} />
        </div>
        <div className="field-group">
          <label>Tip</label>
          <input className="fg-input" type="number" min={0}
            value={focusedField === "tip" && tip === 0 ? "" : tip}
            onFocus={() => setFocusedField("tip")}
            onBlur={() => setFocusedField(null)}
            onWheel={(e) => e.currentTarget.blur()}
            onChange={(e) => setTip(e.target.value === "" ? 0 : Number(e.target.value))} />
        </div>
        <div className="field-group">
          <label>Svc Discount</label>
          <input className="fg-input" type="number" min={0}
            value={focusedField === "discountValue" && discountValue === 0 ? "" : discountValue}
            onFocus={() => setFocusedField("discountValue")}
            onBlur={() => setFocusedField(null)}
            onWheel={(e) => e.currentTarget.blur()}
            onChange={(e) => setDiscountValue(e.target.value === "" ? 0 : Number(e.target.value))} />
        </div>
        <div className="field-group">
          <label>Disc. Type</label>
          <select className="fg-input" value={discountType}
            onChange={(e) => setDiscountType(e.target.value as DiscountType)}>
            <option value="Percentage (%)">Percentage (%)</option>
            <option value="Flat (₹)">Flat</option>
          </select>
        </div>
      </div>
    </div>
  );

  const notesFieldsEl = (
    <>
      <div className="field-group">
        <label><BellFill size={13} /> Staff Alert</label>
        <textarea className="fg-textarea" rows={2} placeholder="e.g. Client has allergy to chemicals"
          value={staffAlert} onChange={(e) => setStaffAlert(e.target.value)} />
      </div>
      <div className="field-group" style={{ marginTop: 10 }}>
        <label>Notes</label>
        <textarea className="fg-textarea" rows={3} placeholder="Enter appointment notes"
          value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </>
  );

  return (
    <div className={`appt-drawer-overlay${quickSale ? " appt-drawer-overlay--page" : ""}`} onClick={quickSale ? undefined : onClose}>
      <div
        ref={dialogRef}
        className={`appt-drawer-content${quickSale ? " appt-drawer-content--page" : ""}`}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
        {...(quickSale ? {} : { role: "dialog", "aria-modal": true, "aria-label": existingBooking ? "Edit Appointment" : "New Appointment" })}
      >

        {/* ── Header ── */}
        <div className="appt-drawer-header">
          {!quickSale && <button className="btn-close-drawer" onClick={onClose}>×</button>}
          <h2>{existingBooking ? "Edit Appointment" : quickSale ? "Quick Sale" : "New Appointment"}</h2>
          {existingBooking && (
            isCancelledBooking ? (
              <span className="appt-header-status-badge" style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5" }}>
                CANCELLED
              </span>
            ) : (
              <span className={`appt-header-status-badge appt-header-status-badge--${
                existingBooking.status === "paid" ? "paid"
                : existingBooking.status === "partial" ? "partial"
                : "unpaid"
              }`}>
                {normalizePaymentStatus(existingBooking.status)}
              </span>
            )
          )}
          {/* Three-dot menu — hidden for partial-payment appointments */}
          {existingBooking && !isPartialBooking && (
            <div style={{ position: "relative", marginLeft: "auto" }}>
              <button
                onClick={() => setHeaderMenuOpen((v) => !v)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 20, fontWeight: 900, color: "#6b7280",
                  padding: "0 6px", lineHeight: 1, borderRadius: 4,
                }}
                title="More options"
              >
                ⋮
              </button>
              {headerMenuOpen && (
                <>
                  {/* backdrop to close on outside click */}
                  <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={() => setHeaderMenuOpen(false)} />
                  <div style={{
                    position: "absolute", top: "110%", right: 0,
                    background: "#fff", border: "1px solid #e5e7eb",
                    borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.13)",
                    zIndex: 9999, minWidth: 190, padding: "4px 0",
                  }}>
                    {!isCancelledBooking && existingBooking?.status !== "partial" && onCancelBooking && (
                      <button
                        style={apptMenuItemStyle}
                        onClick={() => { setHeaderMenuOpen(false); onCancelBooking(existingBooking); onClose(); }}
                      >
                        🚫 Cancel Appointment
                      </button>
                    )}
                    {onDeleteBooking && (
                      <button
                        style={{ ...apptMenuItemStyle, color: "#ef4444" }}
                        onClick={() => { setHeaderMenuOpen(false); onDeleteBooking(existingBooking); onClose(); }}
                      >
                        🗑️ Delete Appointment
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="appt-drawer-body" style={isCancelledBooking ? { pointerEvents: "none", opacity: 0.55, userSelect: "none" } : undefined}>

          {quickSale && !showPaymentSection ? (
            <div className="qs-layout">
              <div className="qs-layout__left">
                {clientSectionEl}
                {servicesSectionEl}
                {/* Quick Sale is a one-screen direct checkout (no separate
                    payment step), so benefits DO belong here — this screen is
                    the payment step, unlike the regular booking flow where
                    they're deferred to showPaymentSection. */}
                {availableBenefitsSectionEl}
                {chargesSectionEl}
                <div className="appt-section">
                  <div className="appt-section__title"><FileText size={15} /> Payment &amp; Notes</div>
                  <div className="pn-layout pn-layout--single">
                    {notesFieldsEl}
                  </div>
                </div>
              </div>
              <div className="qs-layout__right">
                <div className="qs-summary-card">
                  <div className="qs-summary-card__title">Sale Summary</div>
                  {/* Item-level "Disc %" and the bill-level "Svc Discount" can both be
                      active at once and stack — broken out explicitly (instead of one
                      blended "Discount" line) so it's clear how much came from each. */}
                  {totals.itemDiscountTotal > 0 && (
                    <>
                      <div className="qs-summary-row"><span>Items Total</span><span>{currencySymbol}{totals.catalogTotal.toFixed(2)}</span></div>
                      <div className="qs-summary-row qs-summary-row--discount"><span>Item Discount</span><span>-{currencySymbol}{totals.itemDiscountTotal.toFixed(2)}</span></div>
                    </>
                  )}
                  <div className="qs-summary-row"><span>Subtotal</span><span>{currencySymbol}{totals.subtotal.toFixed(2)}</span></div>
                  {totals.manualDiscount > 0 && (
                    <div className="qs-summary-row qs-summary-row--discount"><span>Svc Discount</span><span>-{currencySymbol}{totals.manualDiscount.toFixed(2)}</span></div>
                  )}
                  {coupon.discount > 0 && (
                    <div className="qs-summary-row qs-summary-row--discount"><span>Coupon{coupon.applied ? ` (${coupon.applied})` : ""}</span><span>-{currencySymbol}{coupon.discount.toFixed(2)}</span></div>
                  )}
                  <div className="qs-summary-row"><span>Extra Charges</span><span>+{currencySymbol}{exCharges.toFixed(2)}</span></div>
                  {Math.abs(totals.roundOff) >= 0.005 && (
                    <div className="qs-summary-row"><span>Round Off</span><span>{totals.roundOff >= 0 ? "+" : "-"}{currencySymbol}{Math.abs(totals.roundOff).toFixed(2)}</span></div>
                  )}
                  <div className="qs-summary-row qs-summary-row--total"><span>Grand Total</span><span>{currencySymbol}{totals.grandTotal.toFixed(2)}</span></div>
                  {tip > 0 && (
                    <div className="qs-summary-row"><span>Tip (Staff)</span><span>+{currencySymbol}{tip.toFixed(2)}</span></div>
                  )}
                  {membershipWalletUsedTotal > 0 && (
                    <div className="qs-summary-row qs-summary-row--discount"><span>Membership Wallet Used</span><span>-{currencySymbol}{membershipWalletUsedTotal.toFixed(2)}</span></div>
                  )}
                  {(useEWallet && eWalletAmt > 0) && (
                    <div className="qs-summary-row qs-summary-row--discount"><span>eWallet Used</span><span>-{currencySymbol}{eWalletAmt.toFixed(2)}</span></div>
                  )}
                  {rewardPointsRedeemedValue > 0 && (
                    <div className="qs-summary-row qs-summary-row--discount"><span>Reward Points Used</span><span>-{currencySymbol}{rewardPointsRedeemedValue.toFixed(2)}</span></div>
                  )}
                  {(useReferralCredit && referralCreditAmt > 0) && (
                    <div className="qs-summary-row qs-summary-row--discount"><span>Referral Credit Used</span><span>-{currencySymbol}{referralCreditAmt.toFixed(2)}</span></div>
                  )}
                  <div className="qs-summary-row qs-summary-row--total"><span>Amount to Pay</span><span>{currencySymbol}{totals.effectiveTotal.toFixed(2)}</span></div>
                </div>

                {showFullyCoveredBanner ? (
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    gap: 8, padding: "18px 14px", background: "#f0fdf4",
                    border: "1px solid #86efac", borderRadius: 10,
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#15803d" }}>
                      {isPackageZero ? "Package Payment" : "Fully Covered"}
                    </div>
                    <div style={{ fontSize: 12, color: "#166534", textAlign: "center" }}>
                      {isPackageZero
                        ? "Fully covered by the client's active package. No payment required."
                        : fullyCoveredText}
                    </div>
                  </div>
                ) : (
                  <PaymentPanel
                    effectiveTotal={totals.effectiveTotal}
                    remainingDue={remainingDue}
                    alreadyPaid={0}
                    grandTotal={totals.grandTotal}
                    membershipWalletUsed={membershipWalletUsedTotal}
                    membershipWalletRemaining={membershipWalletRemaining}
                    couponInput={coupon.input}
                    onCouponInputChange={coupon.setInput}
                    onApplyCoupon={() => coupon.apply(totals.subtotal)}
                    couponDiscount={coupon.discount}
                    couponMessage={coupon.message}
                    couponError={coupon.error}
                    couponLoading={coupon.loading}
                    showReferral={showReferralField}
                    referralInput={referral.input}
                    onReferralInputChange={referral.setInput}
                    onApplyReferral={() => referral.apply(selectedClient?.id)}
                    referralApplied={referral.applied}
                    referralMessage={referral.message}
                    referralError={referral.error}
                    referralLoading={referral.loading}
                    referralDiscount={referralDiscountPreview}
                    referralMinBillAmount={referralConfig.min_bill_amount}
                    referralRewardAmount={referralConfig.referee_reward_amount}
                    paymentMode={paymentMode}
                    onSetPaymentMode={handleSetPaymentMode}
                    singleMethod={singleMethod}
                    onSetSingleMethod={handleSelectSingleMethod}
                    splitEntries={splitEntries}
                    onSetSplitEntries={setSplitEntries}
                    payMethodError={payMethodError}
                    partialAmtInput={partialAmtInput}
                    onSetPartialAmt={setPartialAmtInput}
                    priorDueAmt={priorDueAmt}
                    priorDueBookings={priorDueBookings}
                    selectedDueIds={selectedDueIds}
                    isAllDueSelected={isAllDueSelected}
                    onToggleAllDue={toggleAllDue}
                    onToggleOneDue={toggleOneDue}
                    printAfterPayment={printAfterPayment}
                    onTogglePrint={setPrintAfterPayment}
                    includeGst={includeGst}
                    onToggleIncludeGst={setIncludeGst}
                    hasActiveTaxes={activeTaxes.length > 0}
                    previewPoints={previewPoints}
                    previewWalletCredit={previewWalletCredit}
                    frozen={false}
                  />
                )}

                <button className="btn btn-dark" style={{ width: "100%" }}
                  disabled={isSaving || isProcessing} onClick={handleQuickSaleCheckout}>
                  {isSaving ? "Saving…" : isProcessing ? "Processing…" : `Checkout (${currencySymbol}${(isPartialEntry ? parsedPartial : totals.effectiveTotal).toFixed(2)})`}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 1. Client */}
              {clientSectionEl}

              {/* 2. Services & Items */}
              {servicesSectionEl}

              {/* Available Benefits — payment step only. Wallet deductions
                  only actually happen at payment time (payments.service.ts),
                  so a benefit toggled during booking was a preview that
                  silently evaporated: nothing deducted, nothing on the
                  calendar chip. Keeping the toggles next to the Pay action
                  means what staff applies is what actually gets deducted. */}
              {showPaymentSection && availableBenefitsSectionEl}

              {/* 3. Charges & Discounts */}
              {!showPaymentSection && chargesSectionEl}

              {/* 4. Payment & Notes */}
              {!showPaymentSection && (
                <div className="appt-section">
                  <div className="appt-section__title"><FileText size={15} /> Payment &amp; Notes</div>
                  <div className="pn-layout">
                    <div className="pn-layout__left">
                      {notesFieldsEl}
                    </div>
                    <div className="pn-layout__right">
                      <TotalsPanel
                        subtotal={totals.subtotal}
                        catalogTotal={totals.catalogTotal}
                        itemDiscountTotal={totals.itemDiscountTotal}
                        serviceTotal={serviceRows.filter(r => !r.isPackageService).reduce((s, r) => s + r.total, 0)}
                        packageServiceCount={serviceRows.filter(r => r.isPackageService).length}
                        packageTotal={packageRows.reduce((s, r) => s + r.total, 0)}
                        productTotal={productRows.reduce((s, r) => s + r.total, 0)}
                        membershipTotal={membershipRows.reduce((s, r) => s + r.total, 0)}
                        exCharges={exCharges}
                        discount={discountValue}
                        discountType={discountType}
                        manualDiscount={totals.manualDiscount}
                        couponDiscount={coupon.discount}
                        couponCode={coupon.applied}
                        totalDiscount={totals.totalDisc}
                        gstAmount={totals.gstAmount}
                        taxBreakdown={totals.taxBreakdown}
                        tip={tip}
                        membershipWalletUsed={membershipWalletUsedTotal}
                        ewalletUsed={useEWallet ? eWalletAmt : 0}
                        rewardPointsValue={rewardPointsRedeemedValue}
                        referralCreditUsed={useReferralCredit ? referralCreditAmt : 0}
                        alreadyPaid={alreadyPaidAmount}
                        dueAmount={remainingDue}
                        grandTotal={totals.grandTotal}
                        roundOff={totals.roundOff}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Payment section */}
              {showPaymentSection && (
                <div className="appt-section" ref={paymentSectionRef}>
                  <div className="appt-section__title" style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Amount to Pay</span>
                    {alreadyPaidAmount > 0 ? (
                      <span>Paid {currencySymbol}{alreadyPaidAmount.toFixed(2)} &nbsp;·&nbsp; Remaining {currencySymbol}{remainingDue.toFixed(2)}</span>
                    ) : (
                      <span>{currencySymbol}{totals.effectiveTotal.toFixed(2)}</span>
                    )}
                  </div>
                  {/* Subtotal/Discount/GST/Grand Total breakdown must stay
                      visible here too — this used to only render before
                      "Continue to Payment", so once actual checkout (partial
                      or full) began, the GST line disappeared entirely and
                      only a single lump "Amount to Pay" figure remained.
                      Paid/Due here live-update with whatever partial amount
                      is currently typed, so the GST-inclusive balance due is
                      accurate at every step, not just after submitting. */}
                  {!showFullyCoveredBanner && (
                    <div style={{ marginBottom: 12 }}>
                      <TotalsPanel
                        subtotal={totals.subtotal}
                        catalogTotal={totals.catalogTotal}
                        itemDiscountTotal={totals.itemDiscountTotal}
                        serviceTotal={serviceRows.filter(r => !r.isPackageService).reduce((s, r) => s + r.total, 0)}
                        packageServiceCount={serviceRows.filter(r => r.isPackageService).length}
                        packageTotal={packageRows.reduce((s, r) => s + r.total, 0)}
                        productTotal={productRows.reduce((s, r) => s + r.total, 0)}
                        membershipTotal={membershipRows.reduce((s, r) => s + r.total, 0)}
                        exCharges={exCharges}
                        discount={discountValue}
                        discountType={discountType}
                        manualDiscount={totals.manualDiscount}
                        couponDiscount={coupon.discount}
                        couponCode={coupon.applied}
                        totalDiscount={totals.totalDisc}
                        gstAmount={totals.gstAmount}
                        taxBreakdown={totals.taxBreakdown}
                        tip={tip}
                        membershipWalletUsed={membershipWalletUsedTotal}
                        ewalletUsed={useEWallet ? eWalletAmt : 0}
                        rewardPointsValue={rewardPointsRedeemedValue}
                        referralCreditUsed={useReferralCredit ? referralCreditAmt : 0}
                        alreadyPaid={livePaidAmount}
                        dueAmount={liveDueAmount}
                        grandTotal={totals.grandTotal}
                        roundOff={totals.roundOff}
                      />
                    </div>
                  )}
                  {showFullyCoveredBanner ? (
                    <div style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      gap: 10, padding: "24px 16px", background: "#f0fdf4",
                      border: "1px solid #86efac", borderRadius: 10, marginTop: 8,
                    }}>
                      <div style={{ fontSize: 32 }}>{isPackageZero ? "📦" : "✅"}</div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#15803d" }}>
                        {isPackageZero ? "Package Payment" : "Fully Covered"}
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: "#16a34a" }}>{currencySymbol}0.00</div>
                      <div style={{ fontSize: 13, color: "#166534", textAlign: "center" }}>
                        {isPackageZero
                          ? "This appointment is fully covered by the client's active package. No payment required."
                          : fullyCoveredText}
                      </div>
                    </div>
                  ) : (
                  <PaymentPanel
                    effectiveTotal={totals.effectiveTotal}
                    remainingDue={remainingDue}
                    alreadyPaid={alreadyPaidAmount}
                    grandTotal={totals.grandTotal}
                    membershipWalletUsed={membershipWalletUsedTotal}
                    membershipWalletRemaining={membershipWalletRemaining}
                    couponInput={coupon.input}
                    onCouponInputChange={coupon.setInput}
                    onApplyCoupon={() => coupon.apply(totals.subtotal)}
                    couponDiscount={coupon.discount}
                    couponMessage={coupon.message}
                    couponError={coupon.error}
                    couponLoading={coupon.loading}
                    showReferral={showReferralField}
                    referralInput={referral.input}
                    onReferralInputChange={referral.setInput}
                    onApplyReferral={() => referral.apply(selectedClient?.id)}
                    referralApplied={referral.applied}
                    referralMessage={referral.message}
                    referralError={referral.error}
                    referralLoading={referral.loading}
                    referralDiscount={referralDiscountPreview}
                    referralMinBillAmount={referralConfig.min_bill_amount}
                    referralRewardAmount={referralConfig.referee_reward_amount}
                    paymentMode={paymentMode}
                    onSetPaymentMode={handleSetPaymentMode}
                    singleMethod={singleMethod}
                    onSetSingleMethod={handleSelectSingleMethod}
                    splitEntries={splitEntries}
                    onSetSplitEntries={setSplitEntries}
                    payMethodError={payMethodError}
                    partialAmtInput={partialAmtInput}
                    onSetPartialAmt={setPartialAmtInput}
                    priorDueAmt={priorDueAmt}
                    priorDueBookings={priorDueBookings}
                    selectedDueIds={selectedDueIds}
                    isAllDueSelected={isAllDueSelected}
                    onToggleAllDue={toggleAllDue}
                    onToggleOneDue={toggleOneDue}
                    printAfterPayment={printAfterPayment}
                    onTogglePrint={setPrintAfterPayment}
                    includeGst={includeGst}
                    onToggleIncludeGst={setIncludeGst}
                    hasActiveTaxes={activeTaxes.length > 0}
                    previewPoints={previewPoints}
                    previewWalletCredit={previewWalletCredit}
                    frozen={isPaymentFrozen}
                  />
                  )}
                </div>
              )}
            </>
          )}

          {blockTimeError && (
            <div style={{
              margin: "8px 0", padding: "10px 14px",
              background: "#fef2f2", border: "1px solid #fca5a5",
              borderRadius: 8, color: "#dc2626", fontSize: 13,
              display: "flex", alignItems: "flex-start", gap: 8,
            }}>
              <span style={{ flexShrink: 0 }}>⛔</span>
              <span>{blockTimeError}</span>
            </div>
          )}
        </div>

        {/* ── Footer — hidden in the two-column Quick Sale layout, whose CTA lives in the sidebar ── */}
        {!(quickSale && !showPaymentSection) && (
        <div className="appt-drawer-footer">
          {isCancelledBooking ? (
            <div style={{
              width: "100%", textAlign: "center", padding: "10px 0",
              color: "#ef4444", fontWeight: 700, fontSize: 14, letterSpacing: "0.3px",
            }}>
              🚫 This appointment is cancelled — no actions available
            </div>
          ) : !showPaymentSection ? (
            <>
              {existingBooking ? (
                <>
                  <button className="btn btn-outline-secondary" onClick={handleUpdate} disabled={isSaving}>
                    {isSaving ? "Saving…" : "Update Appointment"}
                  </button>
                  {!isPaymentFrozen && (
                    isPackageZero ? (
                      <button className="btn btn-dark" disabled={isSaving}
                        style={{ background: "#16a34a", borderColor: "#16a34a" }}
                        onClick={handleContinueToPaymentZero}>
                        {isSaving ? "Saving…" : `Continue with Payment (${currencySymbol}0)`}
                      </button>
                    ) : (
                      <button className="btn btn-dark" disabled={isSaving} onClick={handleContinueToPayment}>
                        {isSaving ? "Saving…" : "Continue to Payment"}
                      </button>
                    )
                  )}
                </>
              ) : (
                // New appointment (no existingBooking) — always save and close
                <button className="btn btn-dark" style={{ width: "100%" }} onClick={handleSaveAndPay} disabled={isSaving}>
                  {isSaving ? "Saving…" : "Save Appointment"}
                </button>
              )}
            </>
          ) : (
            <>
              {!isPartialBooking && (
                <button className="btn btn-outline-secondary" onClick={() => setShowPaymentSection(false)}>
                  <PencilFill size={13} /> Update Appointment
                </button>
              )}
              {isPackageZero ? (
                <button
                  className="btn btn-dark"
                  style={{ background: "#16a34a", borderColor: "#16a34a", flex: 1 }}
                  disabled={isProcessing}
                  onClick={handleZeroPackagePayment}
                >
                  {isProcessing ? "Processing…" : `Confirm & Complete (Package — ${currencySymbol}0)`}
                </button>
              ) : (
                <PaymentButton
                  amount={isPartialEntry ? parsedPartial : (includeClearDue ? remainingDue + priorDueAmt : remainingDue)}
                  isPartial={isPartialEntry}
                  disabled={isPayDisabled}
                  label={isProcessing ? "Processing…" : confirmLabel}
                  onClick={handlePay}
                />
              )}
            </>
          )}
        </div>
        )}

      </div>

      {showPaidPopup && (
        <SuccessOverlay message="Payment Completed" duration={2000} onDone={handlePaidPopupDone} />
      )}

      {paymentOverlay}

      {showSellPackageModal && sellInitialClient && (
        <SellPackageModal
          initialClient={sellInitialClient}
          onClose={() => setShowSellPackageModal(false)}
          onSaved={() => { setShowSellPackageModal(false); setClientRefreshKey((k) => k + 1); }}
        />
      )}

      {showSellMembershipModal && sellInitialClient && (
        <SellMembershipCalendarModal
          initialClient={sellInitialClient}
          onClose={() => setShowSellMembershipModal(false)}
          onSaved={() => { setShowSellMembershipModal(false); setClientRefreshKey((k) => k + 1); }}
        />
      )}

      {showTopupModal && isSellableClient && (
        <EwalletTopupModal
          clientId={selectedClient!.id}
          clientName={selectedClient!.name}
          onClose={() => setShowTopupModal(false)}
          onSuccess={() => setClientRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
};

const apptMenuItemStyle: React.CSSProperties = {
  display: "block", width: "100%", textAlign: "left",
  background: "none", border: "none", cursor: "pointer",
  padding: "10px 16px", fontSize: 13, color: "#111827",
};

export default AppointmentModal;
