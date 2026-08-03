import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { SuccessOverlay } from "../../../../components/ui";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useAppSelector, useAppDispatch } from "../../../../hooks/useAppRedux";
import { useAppointment }    from "../../hooks/useAppointment";
import { usePayment }        from "../../hooks/usePayment";
import { useCoupon }         from "../../hooks/useCoupon";
import { useReferral }       from "../../hooks/useReferral";
import { usePackageSessions } from "../../hooks/usePackageSessions";
import { useServices }       from "../../hooks/useServices";
import { useLazyListPackagesQuery, useLazyListPackageTemplatesQuery, useListClientPackagesQuery, useCompleteClientPackageSessionMutation } from "../../../../services/api/endpoints/packages.endpoints";
import { useClientMembershipWallet } from "../../hooks/useClientMembershipWallet";
import { useLoyaltyEligibility } from "../../hooks/useLoyaltyEligibility";
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
import { isPackageExpired } from "../../utils/packageStatus";
import type { TotalsResult } from "../../utils/totalsUtils";
import api from "../../../../services/api/axios";
import { PRICING } from "../../../../services/api/endpoints";
import { computePointsEarned, computeEWalletCredit, computeMaxWalletUsable, EWALLET_REDEEM_MINIMUM } from "../../utils/paymentUtils";
import {
  selectPackagesList, selectProductsList, selectMembershipsList, selectBookings,
} from "../../../../store/selectors/scheduler.selectors";
import {
  PersonFill, Scissors, TagFill, FileText,
  BellFill, PencilFill, BoxSeamFill, AwardFill,
  WalletFill, StarFill, PeopleFill, GiftFill, Percent,
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
  const { currencySymbol, formatAmount } = useCurrency();

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
      triggerPackages({ status: "Active" });
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
    // A template with a real (non-"never expires") expiry of 0 days or less is
    // mis-configured — any instance purchased from it today would be born
    // already expired (expiry_date = purchase date + expiryDays). Never offer
    // it as a purchase option in Quick Sale/Calendar's "+Package" row.
    const fromTemplates = templates
      .filter((t: any) => t.neverExpires || t.expiryDays == null || t.expiryDays > 0)
      .map((t: any) => ({
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
  const [discountValueWarning, setDiscountValueWarning] = useState<string | null>(null);

  // Switching Disc. Type to Percentage while a flat value over 100 is
  // already entered must re-clamp it — the input's own onChange only caps
  // new keystrokes, not a value that was valid under the OTHER type.
  useEffect(() => {
    if (discountType === "Percentage (%)" && discountValue > 100) setDiscountValue(100);
  }, [discountType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-dismiss the discount validation message after a few seconds, same
  // pattern as Block Time's conflict message — it's already visible the
  // moment it appears, it doesn't need to sit on screen forever.
  useEffect(() => {
    if (!discountValueWarning) return;
    const t = setTimeout(() => setDiscountValueWarning(null), 4000);
    return () => clearTimeout(t);
  }, [discountValueWarning]);

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
  // on so behavior is unchanged unless staff explicitly opts out. Restored
  // from the persisted flag when reopening an existing booking — otherwise
  // a bill saved with GST excluded silently got GST recomputed back in on
  // every reopen (see includeGst on the Booking type).
  const [includeGst, setIncludeGst] = useState(() => existingBooking?.includeGst ?? true);
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
    // See ClientPanel.tsx's identical option for why this is needed — a
    // package purchased outside this exact RTK Query cache entry (another
    // tab, a backfill script, etc.) must not be masked by a stale cached hit.
    { skip: !clientIdForPkg, refetchOnMountOrArgChange: true },
  );
  // Backend "Active" filtering aside, also guard client-side against a
  // package whose expiry date has passed but hasn't been flagged as such
  // server-side yet — an expired package must never be selectable/applicable.
  // Sorted soonest-expiry-first (packages with no expiry sort last, since
  // there's no urgency to use them up) — when a client owns more than one
  // active package covering the same service, this makes the one closest to
  // expiring the one actually picked/consumed first (see firstActivePkg's
  // display below and markPackageSessions' redemption loop), instead of
  // whatever arbitrary order the API happened to return them in.
  const nonExpiredPackages = useMemo(
    () => (clientPkgsData?.items ?? [])
      .filter((pkg) => !isPackageExpired(pkg.expiryDate))
      .sort((a, b) => {
        const aTime = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
        const bTime = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
        return aTime - bTime;
      }),
    [clientPkgsData],
  );
  // Map of coverage key → remaining sessions from active packages (memoized for
  // stable reference). Keyed by the real catalog service id when the package
  // has one (exact match, so two same-named services at different prices
  // can't cross-consume each other's sessions); packages sold before that id
  // existed fall back to a name-prefixed key, matched only by rows that also
  // lack a catalog id — see ServiceRow.tsx's lookups.
  const coveredServices = useMemo(() => {
    const map = new Map<string, number>();
    nonExpiredPackages.forEach((pkg) => {
      pkg.services.forEach((svc) => {
        if (svc.remainingSessions > 0) {
          const key = svc.catalogServiceId ?? `name:${svc.serviceName.toLowerCase()}`;
          map.set(key, (map.get(key) ?? 0) + svc.remainingSessions);
        }
      });
    });
    return map;
  }, [nonExpiredPackages]);

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

  // Allocates the (shared, service-keyed) coverage pool ACROSS every row that
  // shares a service, in row order — instead of letting each matching row
  // independently see the FULL remaining count. Without this, two rows of the
  // same package-covered service (e.g. the same Haircut booked with two
  // different staff, now that duplicate picks create their own row instead of
  // merging into an existing one) could each mark themselves as the covered
  // "free" session, double-spending the client's package. Keyed by row
  // tempId; recomputed whenever rows are added/removed/reordered or their qty
  // changes, since the allocation depends on row order and quantities.
  const perRowCoveredRemaining = useMemo(() => {
    const pool = new Map(effectiveCoveredServices);
    const perRow = new Map<string, number>();
    serviceRows.forEach((row, idx) => {
      if (!row.service.trim()) return;
      const rowCatalogId = (row as any).id || null;
      const nameKey = `name:${row.service.toLowerCase()}`;
      const key = (rowCatalogId && effectiveCoveredServices.has(rowCatalogId)) ? rowCatalogId : nameKey;
      const avail = pool.get(key) ?? 0;
      if (avail <= 0) return;
      const tempId = (row as any).tempId || String(idx);
      const qty = Number(row.qty) || 1;
      const used = Math.min(avail, qty);
      perRow.set(tempId, used);
      pool.set(key, avail - used);
    });
    return perRow;
  }, [effectiveCoveredServices, serviceRows]);

  // Apply (or restore) ₹0 pricing on service rows as the checkbox is toggled
  // (or as rows/quantities change and the pooled allocation above shifts).
  // Nothing is committed server-side just by this — package sessions are only
  // marked consumed after checkout (markPackageSessions) — so it's always
  // safe to fully reverse here. Guards every row against a no-op write (same
  // total/isPackageService as before) so this settles to a fixed point in one
  // extra render instead of looping, even though `serviceRows` is itself a
  // dependency (via perRowCoveredRemaining).
  useEffect(() => {
    setServiceRows((prev) => {
      let changed = false;
      const next = prev.map((row, idx) => {
        if (!row.service.trim()) {
          if ((row as any).isPackageService) { changed = true; return { ...row, isPackageService: false }; }
          return row;
        }
        const tempId = (row as any).tempId || String(idx);
        const remaining = perRowCoveredRemaining.get(tempId) ?? 0;
        const qty = Number(row.qty) || 1;
        const paidQty = remaining > 0 ? Math.max(0, qty - remaining) : qty;
        const price = Number(row.price) || 0;
        const discountPct = Math.min(100, Math.max(0, Number((row as any).discount) || 0));
        const newTotal = Math.max(0, price * paidQty * (1 - discountPct / 100));
        const newIsPkg = remaining > 0 && paidQty === 0;
        if (row.total === newTotal && !!(row as any).isPackageService === newIsPkg) return row;
        changed = true;
        return { ...row, total: newTotal, isPackageService: newIsPkg };
      });
      return changed ? next : prev;
    });
  }, [perRowCoveredRemaining]);

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
  // Per-membership applies_to setting — a plan can now be services-only,
  // products-only, or both, so both directions have to be gated (services
  // used to be unconditionally eligible before "products only" existed).
  // Mirrors the backend gate in payments.service.ts (getWalletCoverage) so
  // the UI preview matches what checkout will actually deduct.
  const membershipCoversServices = useMemo(
    () => clientMemberships.some((m) => m.appliesTo !== "products" && Number(m.membershipWalletBalance) > 0),
    [clientMemberships],
  );
  const membershipCoversProducts = useMemo(
    () => clientMemberships.some((m) => m.appliesTo !== "services" && Number(m.membershipWalletBalance) > 0),
    [clientMemberships],
  );

  // Per-row membership discount (Discount Balance/Loyalty) from the live
  // pricing preview — index-aligned with serviceRows/productRows. Declared
  // here (ahead of membershipEligibleTotal/membershipWalletMap below) because
  // both need it: wallet coverage must only ever be offered against what's
  // left on a row AFTER its own discount, never the full pre-discount price —
  // otherwise a row already 40% covered by Discount Balance + Loyalty looks
  // like it still has its full value free for the wallet to also claim.
  const [rowMembershipDiscountPreview, setRowMembershipDiscountPreview] = useState<{ service: number[]; product: number[] } | null>(null);
  const serviceMembershipDiscountByRow = useMemo(() => {
    const map = new Map<string, number>();
    if (!rowMembershipDiscountPreview) return map;
    serviceRows.forEach((row, i) => {
      const tempId = (row as any).tempId || String(i);
      map.set(tempId, rowMembershipDiscountPreview.service[i] ?? 0);
    });
    return map;
  }, [rowMembershipDiscountPreview, serviceRows]);
  const productMembershipDiscountByRow = useMemo(() => {
    const map = new Map<string, number>();
    if (!rowMembershipDiscountPreview) return map;
    productRows.forEach((row, i) => {
      const tempId = (row as any).tempId || String(i);
      map.set(tempId, rowMembershipDiscountPreview.product[i] ?? 0);
    });
    return map;
  }, [rowMembershipDiscountPreview, productRows]);

  // Per-row membership WALLET coverage — same server-confirmed fill-in-order
  // split (services first, then products) already baked into rowTaxPreview
  // above. Sourced from the backend (not re-derived locally) because the real
  // fill order shares one balance across BOTH service and product rows — a
  // service added anywhere in the bill can silently take over wallet coverage
  // that used to belong to a product row. A local re-simulation of that same
  // fill order previously drove the "Membership Applied" badge/Total display,
  // and could disagree with the real, authoritative split the moment a
  // service and product both competed for the same balance — the product's
  // badge kept showing its OLD coverage while the tax preview (server-
  // confirmed) correctly reflected the NEW, smaller share, i.e. a ₹0 Total
  // sitting next to nonzero GST. Using the server's own numbers for the
  // display too makes that mismatch structurally impossible: both now update
  // from the exact same response, in the exact same tick.
  const [rowMembershipWalletPreview, setRowMembershipWalletPreview] = useState<{ service: number[]; product: number[] } | null>(null);
  const serviceMembershipWalletByRow = useMemo(() => {
    const map = new Map<string, number>();
    if (!rowMembershipWalletPreview) return map;
    serviceRows.forEach((row, i) => {
      const tempId = (row as any).tempId || String(i);
      map.set(tempId, rowMembershipWalletPreview.service[i] ?? 0);
    });
    return map;
  }, [rowMembershipWalletPreview, serviceRows]);
  const productMembershipWalletByRow = useMemo(() => {
    const map = new Map<string, number>();
    if (!rowMembershipWalletPreview) return map;
    productRows.forEach((row, i) => {
      const tempId = (row as any).tempId || String(i);
      map.set(tempId, rowMembershipWalletPreview.product[i] ?? 0);
    });
    return map;
  }, [rowMembershipWalletPreview, productRows]);

  // Most the membership wallet could ever usefully cover — capped by both the
  // wallet's own balance and by how much eligible service (+ product, when
  // enabled) value there is to apply it against, NET of any Discount
  // Balance/Loyalty discount already reducing that row (no point defaulting
  // an input higher than what's actually still owed).
  const membershipEligibleTotal = useMemo(() => {
    const serviceTotal = membershipCoversServices
      ? serviceRows.reduce((s, row, i) => {
          if (!row.service.trim() || (row as any).isPackageService) return s;
          const tempId = (row as any).tempId || String(i);
          const alreadyDiscounted = serviceMembershipDiscountByRow.get(tempId) ?? 0;
          return s + Math.max(0, (Number(row.total) || 0) - alreadyDiscounted);
        }, 0)
      : 0;
    const productTotal = membershipCoversProducts
      ? productRows.reduce((s, row, i) => {
          const tempId = (row as any).tempId || String(i);
          const alreadyDiscounted = productMembershipDiscountByRow.get(tempId) ?? 0;
          return s + Math.max(0, (Number(row.total) || 0) - alreadyDiscounted);
        }, 0)
      : 0;
    return serviceTotal + productTotal;
  }, [serviceRows, productRows, membershipCoversServices, membershipCoversProducts, serviceMembershipDiscountByRow, productMembershipDiscountByRow]);
  const membershipMaxUsable = Math.min(membershipTotalBalance, membershipEligibleTotal);

  // How much of the membership wallet staff has chosen to apply — defaults to
  // the max usable on enable, but editable down (e.g. "only use ₹300, save the
  // rest"), same pattern as the eWallet amount field above.
  const [membershipWalletAmt, setMembershipWalletAmt] = useState(0);
  // Tracks whether the amount above was deliberately typed by staff (only
  // ever clamp DOWN from here) vs still auto-following the max (e.g. GST
  // being toggled, or another benefit's usage changing, can move the max in
  // EITHER direction — an auto-following amount must track it back up too,
  // not get stuck at whatever the max happened to be last time this ran).
  const membershipWalletAmtIsCustomRef = useRef(false);
  useEffect(() => {
    if (!applyMembership) { membershipWalletAmtIsCustomRef.current = false; setMembershipWalletAmt(0); return; }
    if (membershipMaxUsable <= 0) { setApplyMembership(false); setMembershipWalletAmt(0); return; }
    setMembershipWalletAmt((prev) => (membershipWalletAmtIsCustomRef.current && prev > 0) ? Math.min(prev, membershipMaxUsable) : membershipMaxUsable);
  }, [applyMembership, membershipMaxUsable]);
  const handleSetMembershipWalletAmt = useCallback((v: number) => {
    membershipWalletAmtIsCustomRef.current = true;
    setMembershipWalletAmt(Math.max(0, Math.min(v, membershipMaxUsable)));
  }, [membershipMaxUsable]);

  // Built directly from the server-confirmed per-row split above — see
  // rowMembershipWalletPreview's doc comment for why this used to be a local
  // re-simulation of the fill order (and the bug that caused).
  const membershipWalletMap = useMemo(() => {
    const map = new Map<string, { walletUsed: number; payable: number }>();
    if (!applyMembership) return map;
    serviceRows.forEach((row, i) => {
      const tempId = (row as any).tempId || String(i);
      const used = serviceMembershipWalletByRow.get(tempId) ?? 0;
      if (used <= 0) return;
      const alreadyDiscounted = serviceMembershipDiscountByRow.get(tempId) ?? 0;
      const rowTotal = Math.max(0, (Number(row.total) || 0) - alreadyDiscounted);
      map.set(tempId, { walletUsed: used, payable: Math.max(0, rowTotal - used) });
    });
    productRows.forEach((row, i) => {
      const tempId = (row as any).tempId || String(i);
      const used = productMembershipWalletByRow.get(tempId) ?? 0;
      if (used <= 0) return;
      const alreadyDiscounted = productMembershipDiscountByRow.get(tempId) ?? 0;
      const rowTotal = Math.max(0, (Number(row.total) || 0) - alreadyDiscounted);
      map.set(`product:${tempId}`, { walletUsed: used, payable: Math.max(0, rowTotal - used) });
    });
    return map;
  }, [serviceRows, productRows, applyMembership, serviceMembershipWalletByRow, productMembershipWalletByRow, serviceMembershipDiscountByRow, productMembershipDiscountByRow]);
  const membershipWalletUsedTotal = useMemo(
    () => Array.from(membershipWalletMap.values()).reduce((s, v) => s + v.walletUsed, 0),
    [membershipWalletMap],
  );
  const membershipWalletRemaining = Math.max(0, membershipTotalBalance - membershipWalletUsedTotal);

  // ── Membership discount: percentage balance, and/or a salon-wide loyalty
  // unlock ─────────────────────────────────────────────────────────────────
  // Discount Balance and Loyalty are independently toggled by staff (two
  // separate benefit chips) and stack additively when both are checked — see
  // payments.service.ts's applyMembershipDiscountForBooking for the same
  // contract at actual charge time. Genuinely separate from the wallet above:
  // this is a pre-tax price reduction, not a redemption, and each amount is
  // fully determined by its own discount %, the eligible rows, and (for
  // percentage) any balance left — there's nothing for staff to type, only
  // opt in or out of.
  const percentageMembership = useMemo(
    () => clientMemberships.find((m) => m.pricingType === "percentage" && (m.discountBalanceRemaining ?? 0) > 0),
    [clientMemberships],
  );
  const { eligibility: loyaltyEligibility } = useLoyaltyEligibility(clientIdForPkg, clientRefreshKey);
  const percentageDiscountSource = percentageMembership
    ? {
        name: percentageMembership.membershipName,
        discountPercent: percentageMembership.discountPercent ?? 0,
        balanceRemaining: percentageMembership.discountBalanceRemaining,
      }
    : null;
  const loyaltyDiscountSource = loyaltyEligibility?.eligible
    ? {
        name: loyaltyEligibility.name,
        discountPercent: loyaltyEligibility.discountPercent,
        nextTierHint: loyaltyEligibility.nextTier
          ? `next: ${loyaltyEligibility.nextTier.discountPercent}% at ${loyaltyEligibility.nextTier.thresholdValue} visits`
          : undefined,
      }
    : null;

  // Restored to checked when reopening a booking previously saved with this
  // discount applied — same reasoning as applyMembership above.
  const [applyMembershipDiscount, setApplyMembershipDiscount] = useState(
    () => !!existingBooking && (
      !!existingBooking.applyMembershipDiscount || Number(existingBooking.membershipDiscountUsed) > 0
    )
  );
  const [applyLoyaltyDiscount, setApplyLoyaltyDiscount] = useState(
    () => !!existingBooking?.applyLoyaltyDiscount
  );
  const applyMembershipDiscountMounted = useRef(false);
  useEffect(() => {
    if (!applyMembershipDiscountMounted.current) { applyMembershipDiscountMounted.current = true; return; }
    setApplyMembershipDiscount(false);
    setApplyLoyaltyDiscount(false);
  }, [clientIdForPkg]);
  // Nothing left to apply it to (plan changed, balance ran out) — don't leave
  // a stale checked box that would silently apply ₹0.
  useEffect(() => {
    if (!percentageDiscountSource) setApplyMembershipDiscount(false);
  }, [percentageDiscountSource]);
  useEffect(() => {
    if (!loyaltyDiscountSource) setApplyLoyaltyDiscount(false);
  }, [loyaltyDiscountSource]);

  // Marks package sessions as complete for each covered service row after appointment is done.
  // appointmentId links each consumed session back to the sale that used it (for audit/reporting).
  async function markPackageSessions(appointmentId?: string) {
    const pkgs = nonExpiredPackages;
    for (let idx = 0; idx < serviceRows.length; idx++) {
      const row = serviceRows[idx];
      const rowCatalogId = row.id || null;
      const nameKey = row.service.toLowerCase();
      // Pooled allocation for THIS row (see perRowCoveredRemaining) — not the
      // raw, unpooled coverage map — so two rows of the same service (e.g.
      // booked with two different staff) can never both consume the same
      // remaining session.
      const tempId = (row as any).tempId || String(idx);
      const remaining = perRowCoveredRemaining.get(tempId) ?? 0;
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
  // Referral-discount eligibility (was: computed locally here) now comes
  // straight from the server response (pricing.service.ts already runs the
  // same eligibility check payments.service.ts uses at actual charge time).
  const rewardPointsRedeemedValue = (useRewardPoints && rewardPointsConfig.redeem_points > 0)
    ? (rewardPointsToRedeem / rewardPointsConfig.redeem_points) * rewardPointsConfig.redeem_value
    : 0;

  // Single source of truth: the backend pricing engine (pricing.engine.ts,
  // the exact same code payments.service.ts uses at actual charge time) —
  // no frontend copy of this math exists anymore. `totals` always holds the
  // last CONFIRMED server response; it is never cleared/blanked on an input
  // change, only ever replaced by a newer confirmed response, so every one
  // of this component's many display reads of `totals.*` stays valid without
  // needing a loading guard. `totalsConfirmed` separately tracks whether the
  // value currently in `totals` actually corresponds to the CURRENT inputs —
  // that's the only thing the Pay/Save button is gated on, so checkout can
  // never fire against a stale-vs-current total.
  const ZERO_TOTALS: TotalsResult = {
    catalogTotal: 0, itemDiscountTotal: 0, subtotal: 0, manualDiscount: 0, totalDisc: 0,
    taxable: 0, gstAmount: 0, taxBreakdown: [], grandTotal: 0, roundOff: 0, preRedemptionTotal: 0,
    displaySubtotal: 0,
  };
  const [totals, setTotals] = useState<TotalsResult>(ZERO_TOTALS);
  const [totalsConfirmed, setTotalsConfirmed] = useState(false);
  const [totalsError, setTotalsError] = useState(false);
  const [referralDiscountPreview, setReferralDiscountPreview] = useState(0);
  // Server-confirmed discount a percentage/loyalty membership would give on the
  // current rows — a genuine pre-tax price reduction, already folded into
  // totals.taxable/grandTotal above by the backend, unlike the wallet redemptions
  // which only affect effectiveTotal. Tracked separately (display-only) so it
  // can be shown as its own line, same pattern as referralDiscountPreview.
  const [appliedMembershipDiscount, setAppliedMembershipDiscount] = useState(0);
  // Per-row GST from the pricing preview (index-aligned with the rows we sent),
  // so the live sale-building screen can show each item's own tax — same real
  // figure that gets stored per sale_item at checkout.
  const [rowTaxPreview, setRowTaxPreview] = useState<{ service: number[]; packages: number[]; product: number[]; membership: number[] } | null>(null);
  // Per-service-row GST keyed by tempId — the pricing preview returns rowTax
  // index-aligned with the serviceRows we sent (same order), so map each
  // row's own tax back onto its tempId for the live per-row display.
  const serviceTaxByRow = useMemo(() => {
    const map = new Map<string, number>();
    if (!rowTaxPreview) return map;
    serviceRows.forEach((row, i) => {
      const tempId = (row as any).tempId || String(i);
      map.set(tempId, rowTaxPreview.service[i] ?? 0);
    });
    return map;
  }, [rowTaxPreview, serviceRows]);

  // Same per-row GST preview as serviceTaxByRow above, for the other three
  // billable item types — the backend's rowTax already carries all four
  // (see pricing.engine.ts's computeBillTotals), only the service row ever
  // had a live "+₹X GST" hint wired up to it on this side.
  const packageTaxByRow = useMemo(() => {
    const map = new Map<string, number>();
    if (!rowTaxPreview) return map;
    packageRows.forEach((row, i) => {
      const tempId = (row as any).tempId || String(i);
      map.set(tempId, rowTaxPreview.packages[i] ?? 0);
    });
    return map;
  }, [rowTaxPreview, packageRows]);

  const productTaxByRow = useMemo(() => {
    const map = new Map<string, number>();
    if (!rowTaxPreview) return map;
    productRows.forEach((row, i) => {
      const tempId = (row as any).tempId || String(i);
      map.set(tempId, rowTaxPreview.product[i] ?? 0);
    });
    return map;
  }, [rowTaxPreview, productRows]);

  const membershipTaxByRow = useMemo(() => {
    const map = new Map<string, number>();
    if (!rowTaxPreview) return map;
    membershipRows.forEach((row, i) => {
      const tempId = (row as any).tempId || String(i);
      map.set(tempId, rowTaxPreview.membership[i] ?? 0);
    });
    return map;
  }, [rowTaxPreview, membershipRows]);

  useEffect(() => {
    setTotalsConfirmed(false);
    setTotalsError(false);
    const hasAnyRowsNow = serviceRows.length + packageRows.length + productRows.length + membershipRows.length > 0;
    if (!hasAnyRowsNow) {
      // No rows left on the bill — the pricing request below never even fires
      // for an empty bill, so falling through here used to leave `totals`
      // (and eWallet/membership/referral preview amounts) stuck at whatever
      // they were before the last row was deleted, forever — the exact stale
      // "eWallet Used" / stale Subtotal-Grand Total bug. The correct total for
      // zero rows is trivially zero, no network round-trip needed to confirm it.
      setTotals(ZERO_TOTALS);
      setReferralDiscountPreview(0);
      setAppliedMembershipDiscount(0);
      setRowTaxPreview(null);
      setRowMembershipDiscountPreview(null);
      setRowMembershipWalletPreview(null);
      setTotalsConfirmed(true);
      return;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await api.post(PRICING.CALCULATE_TOTALS, {
          client_id: (selectedClient?.id && selectedClient.id !== "walk-in") ? selectedClient.id : undefined,
          appointment_id: existingBooking?.id ?? apiAppointmentId ?? undefined,
          serviceRows, packageRows, productRows, membershipRows,
          // The engine's discountType vocabulary ('percentage'|'flat') is not
          // the same string set as this component's own DiscountType
          // ("Percentage (%)"|"Flat (₹)") — translate here, at the one place
          // that talks to the backend, rather than changing this component's
          // display/state vocabulary everywhere else.
          discountType: discountType === "Percentage (%)" ? "percentage" : "flat",
          discountValue,
          couponCode: coupon.applied || undefined,
          exCharges, tip,
          includeGst,
          applyEwallet: useEWallet,
          eWalletRequested: useEWallet ? eWalletAmt : 0,
          applyMembershipWallet: applyMembership,
          membershipWalletRequested: applyMembership ? membershipWalletAmt : 0,
          applyMembershipDiscount,
          applyLoyaltyDiscount,
          applyRewardPoints: useRewardPoints,
          rewardPointsToRedeem: useRewardPoints ? rewardPointsToRedeem : 0,
          applyReferralCredit: useReferralCredit,
          referralCreditRequested: useReferralCredit ? referralCreditAmt : 0,
        }, { signal: ctrl.signal });
        const data = res.data?.data;
        if (data) {
          setTotals({
            catalogTotal: data.catalogTotal, itemDiscountTotal: data.itemDiscountTotal,
            subtotal: data.subtotal, manualDiscount: data.manualDiscount, totalDisc: data.totalDisc,
            taxable: data.taxable, gstAmount: data.gstAmount, taxBreakdown: data.taxBreakdown ?? [],
            grandTotal: data.grandTotal, roundOff: data.roundOff, preRedemptionTotal: data.preRedemptionTotal,
            displaySubtotal: data.displaySubtotal ?? data.subtotal,
          });
          setReferralDiscountPreview(data.referralDiscountPreview ?? 0);
          setAppliedMembershipDiscount(data.appliedMembershipDiscount ?? 0);
          setRowTaxPreview(data.rowTax ?? null);
          setRowMembershipDiscountPreview(data.rowMembershipDiscount ?? null);
          setRowMembershipWalletPreview(data.rowMembershipWallet ?? null);
          setTotalsConfirmed(true);
        }
      } catch (err: any) {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return; // superseded by a newer input change
        // Real network/server failure — `totals` keeps showing the last
        // confirmed value (still accurate for the PRIOR inputs), but
        // `totalsConfirmed` stays false so Pay/Save stays disabled rather
        // than let staff charge against a total that no longer matches
        // what's on screen.
        setTotalsError(true);
      }
    }, 350);

    return () => { ctrl.abort(); clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    serviceRows, packageRows, productRows, membershipRows,
    discountType, discountValue, exCharges, tip, includeGst,
    coupon.applied, coupon.discount,
    // referral.applied: linking a client to a referrer (the "Apply" button on
    // the referral-code field) is its own API call, separate from this bill's
    // totals — without this dependency, the first-bill welcome discount
    // preview stays stuck at its pre-link value (usually ₹0) until some
    // unrelated field happens to change and coincidentally retriggers this effect.
    referral.applied,
    useEWallet, eWalletAmt, applyMembership, membershipWalletAmt, applyMembershipDiscount, applyLoyaltyDiscount,
    useRewardPoints, rewardPointsToRedeem, useReferralCredit, referralCreditAmt,
    selectedClient?.id, existingBooking?.id, apiAppointmentId,
  ]);

  // Blocks every save/pay action (button-level, plus a defensive early-return
  // inside each handler) whenever `totals` doesn't yet reflect the CURRENT
  // inputs — never charge or persist a total mid-confirmation or after a
  // failed confirmation. Self-clears the moment the debounced request above
  // resolves; there's no local math to fall back to anymore.
  // Gated on there being any rows at all — with none, the debounced request
  // above intentionally never fires (nothing to price), so `totalsConfirmed`
  // would otherwise stay permanently false and every button would sit
  // disabled with a confusing "Confirming…" label instead of the existing,
  // more helpful validate() error ("add a service") a click would surface.
  const hasAnyRowsForTotals = serviceRows.length + packageRows.length + productRows.length + membershipRows.length > 0;
  const totalsNotReady = hasAnyRowsForTotals && (!totalsConfirmed || totalsError);

  // The debounced backend totals.preRedemptionTotal can lag a beat behind an edit
  // to any locally-editable "how much of this benefit to use" amount
  // (membership wallet, eWallet, reward points, referral credit) — reconciling
  // it locally against the currently-displayed deduction lines means "Amount
  // to Pay"/"Fully Covered" can never show a number that contradicts the
  // "Membership Wallet Used"/"eWallet Used"/etc. rows directly above it, and —
  // more importantly — staff are never silently skipped past collecting a
  // real remaining balance because the preview hadn't caught up yet.
  // totals.preRedemptionTotal only depends on tax/discount/referral-discount,
  // not these wallet-style redemptions, so it's a much narrower staleness
  // window to inherit from the backend. (totals.grandTotal already has all
  // four subtracted server-side — using it here would double-subtract.)
  // Rounded to the nearest whole rupee — matches the single rounding point at
  // the very end of the backend's waterfall (pricing.engine.ts computeBillTotals),
  // now that Grand Total and Amount to Pay are the same merged figure.
  const rawReconciledTotal = Math.max(0, totals.preRedemptionTotal
    - membershipWalletUsedTotal
    - (useEWallet ? eWalletAmt : 0)
    - rewardPointsRedeemedValue
    - (useReferralCredit ? referralCreditAmt : 0));
  const reconciledEffectiveTotal = Math.round(rawReconciledTotal);
  const reconciledRoundOff = reconciledEffectiveTotal - rawReconciledTotal;

  const alreadyPaidAmount   = existingBooking?.payingNow ?? 0;
  // For partial bookings, trust the API's dueAmount directly — payingNow can be unreliable
  const remainingDue = (existingBooking?.status === "partial" && (existingBooking?.dueAmount ?? 0) > 0)
    ? existingBooking.dueAmount
    : Math.max(0, reconciledEffectiveTotal - alreadyPaidAmount);
  const parsedPartial   = parseFloat(partialAmtInput);
  // 0 counts as a deliberate partial entry (pay nothing now, leave it all due) —
  // matches the >= 0 check in usePayment.ts's actual charge calculation.
  const isPartialEntry  = !isNaN(parsedPartial) && parsedPartial >= 0 && parsedPartial < remainingDue;
  // The amount actually being collected THIS transaction — not the whole bill.
  // A partial entry of 0 (deferring everything to due) needs no payment method,
  // even though the bill itself (effectiveTotal) is still > 0. Falls back to
  // remainingDue (the outstanding balance), not totals.effectiveTotal (the
  // FULL bill) — for a booking with no prior payment those are identical
  // (remainingDue = effectiveTotal - 0), but for topping up an already-
  // partial booking, using effectiveTotal here double-counted what was
  // already paid in the live "Paid"/"Due" preview below (though the actual
  // charge in usePayment.ts was never affected — it already used remainingDue).
  const amountThisTxn   = isPartialEntry ? parsedPartial : remainingDue;
  // Preview shown in the summary below defaults amountThisTxn to the full
  // remainingDue purely as a fallback for the *charge* calculation — it does
  // NOT mean staff have actually chosen to collect it. Simply opening a
  // partially-paid appointment (nothing typed, no payment method picked,
  // "Confirm & Pay" still disabled) previewed "Paid (incl. this payment)" as
  // if the outstanding balance had already been paid in full. Once staff
  // actually type a partial amount, that's real, deliberate input and the
  // preview should track it live regardless of method choice (unchanged,
  // original behavior) — this only suppresses the *unrequested* default.
  const hasChosenPaymentMethod = !(amountThisTxn > 0 && paymentMode === "single" && !singleMethod);
  const previewAmountThisTxn = isPartialEntry || hasChosenPaymentMethod ? amountThisTxn : 0;
  // Live preview for the payment-step summary: as staff types a partial
  // amount, Paid/Due (and therefore the still-visible GST line above it)
  // should update immediately instead of only reflecting a prior, already-
  // completed transaction — otherwise the GST-inclusive balance due looks
  // frozen/wrong while a partial payment is being entered.
  const livePaidAmount = alreadyPaidAmount + previewAmountThisTxn;
  const liveDueAmount  = Math.max(0, remainingDue - previewAmountThisTxn);
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
  const previewPoints       = computePointsEarned(reconciledEffectiveTotal, rewardPointsConfig);
  const previewWalletCredit = computeEWalletCredit(previewPoints, rewardPointsConfig);
  // Nothing left to collect — either the appointment's items are fully package-covered
  // (grandTotal itself is already 0) or a wallet/membership deduction brought
  // an otherwise non-zero bill down to 0. Either way, there's no cash/card/UPI amount
  // to take, so the coupon/payment-method UI is just noise here.
  const isFullyCovered = reconciledEffectiveTotal === 0;
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
    membershipWalletUsedTotal > 0 ? "Membership Wallet" : "",
    useEWallet && eWalletAmt > 0 ? "eWallet" : "",
    useRewardPoints && rewardPointsRedeemedValue > 0 ? "Reward Points" : "",
    useReferralCredit && referralCreditAmt > 0 ? "Referral Credit" : "",
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
    activePackages: nonExpiredPackages
      .filter((p) => p.status === "Active")
      .map((p) => ({
        packageName: p.packageName,
        remaining: p.services.reduce((s, sv) => s + sv.remainingSessions, 0),
        total: p.services.reduce((s, sv) => s + sv.totalSessions, 0),
      }))
      .filter((p) => p.remaining > 0),
  };

  // ── Sequential benefit caps ──────────────────────────────────────────────
  // Membership / eWallet / Reward Points / Referral Credit used to each cap
  // themselves against the FULL bill (totals.grandTotal) independently, with
  // zero awareness of the others — so a client could apply e.g. membership
  // wallet AND reward points, each up to the whole bill, and the two "Used"
  // lines would together add up to far more than the invoice total. Toggling
  // GST afterward (which changes totals.grandTotal) could also leave a
  // benefit re-capped against the wrong ceiling, and a benefit amount that
  // was only ever auto-following its max could get stuck at a stale value
  // instead of tracking the max back up. This must match the backend's
  // actual charge-time order (payments.service.ts) and its own preview
  // (pricing.service.ts): Membership → eWallet → Reward Points → Referral
  // Credit, each capped against what's still left AFTER the ones before it,
  // not the original bill.
  const remainingAfterMembership = Math.max(0, totals.preRedemptionTotal - membershipWalletUsedTotal);

  // ── eWallet cap: most the client is allowed to apply to what's left after membership ──
  const eWalletMaxAmt = useMemo(() => {
    const balance = clientStats?.ewalletAmt ?? 0;
    if (balance < EWALLET_REDEEM_MINIMUM) return 0;
    const maxUsable = computeMaxWalletUsable(remainingAfterMembership, referralConfig);
    return Math.min(balance, remainingAfterMembership, maxUsable);
  }, [clientStats, remainingAfterMembership, referralConfig]);

  // ── Sync eWalletAmt ──────────────────────────────────────────────────────
  // Defaults to the max allowed on enable, but a user-typed custom amount
  // (e.g. "just ₹500 from wallet, rest via cash") is preserved across
  // re-renders and only clamped down if the cap itself shrinks. An amount
  // that's still auto-following the max (never manually edited) must track
  // it in EITHER direction — e.g. toggling "Include GST" back on grows the
  // bill/cap back up, and an eWallet amount that was only ever auto-set
  // must grow back up with it, not stay frozen at the smaller pre-GST value.
  const eWalletAmtIsCustomRef = useRef(false);
  useEffect(() => {
    if (!useEWallet) { eWalletAmtIsCustomRef.current = false; setEWalletAmt(0); return; }
    if (eWalletMaxAmt <= 0) { setUseEWallet(false); setEWalletAmt(0); return; }
    setEWalletAmt((prev) => (eWalletAmtIsCustomRef.current && prev > 0) ? Math.min(prev, eWalletMaxAmt) : eWalletMaxAmt);
  }, [useEWallet, eWalletMaxAmt]);

  const handleSetEWalletAmt = useCallback((v: number) => {
    eWalletAmtIsCustomRef.current = true;
    setEWalletAmt(Math.max(0, Math.min(v, eWalletMaxAmt)));
  }, [eWalletMaxAmt]);

  const remainingAfterEWallet = Math.max(0, remainingAfterMembership - (useEWallet ? eWalletAmt : 0));

  // ── Reward points cap: most points the client can redeem on what's left
  // after membership + eWallet ────────────────────────────────────────────
  // Own dedicated balance now (not folded into eWallet) — capped by the real
  // points balance and by not letting the redeemed ₹ value exceed what's left.
  const rewardPointsMaxRedeem = useMemo(() => {
    const balance = clientStats?.rewardPoints ?? 0;
    if (balance <= 0 || rewardPointsConfig.redeem_points <= 0) return 0;
    const maxByBill = Math.floor((remainingAfterEWallet / rewardPointsConfig.redeem_value) * rewardPointsConfig.redeem_points);
    return Math.max(0, Math.min(balance, maxByBill));
  }, [clientStats, remainingAfterEWallet, rewardPointsConfig]);

  const rewardPointsIsCustomRef = useRef(false);
  useEffect(() => {
    if (!useRewardPoints) { rewardPointsIsCustomRef.current = false; setRewardPointsToRedeem(0); return; }
    if (rewardPointsMaxRedeem <= 0) { setUseRewardPoints(false); setRewardPointsToRedeem(0); return; }
    setRewardPointsToRedeem((prev) => (rewardPointsIsCustomRef.current && prev > 0) ? Math.min(prev, rewardPointsMaxRedeem) : rewardPointsMaxRedeem);
  }, [useRewardPoints, rewardPointsMaxRedeem]);

  const handleSetRewardPointsToRedeem = useCallback((v: number) => {
    rewardPointsIsCustomRef.current = true;
    setRewardPointsToRedeem(Math.max(0, Math.min(v, rewardPointsMaxRedeem)));
  }, [rewardPointsMaxRedeem]);

  const remainingAfterRewardPoints = Math.max(0, remainingAfterEWallet - rewardPointsRedeemedValue);

  // ── Referral credit cap: most ₹ the client can redeem on what's left after
  // membership + eWallet + reward points ──────────────────────────────────
  const referralCreditMaxAmt = useMemo(() => {
    const balance = clientStats?.referralBalance ?? 0;
    return Math.max(0, Math.min(balance, remainingAfterRewardPoints));
  }, [clientStats, remainingAfterRewardPoints]);

  const referralCreditIsCustomRef = useRef(false);
  useEffect(() => {
    if (!useReferralCredit) { referralCreditIsCustomRef.current = false; setReferralCreditAmt(0); return; }
    if (referralCreditMaxAmt <= 0) { setUseReferralCredit(false); setReferralCreditAmt(0); return; }
    setReferralCreditAmt((prev) => (referralCreditIsCustomRef.current && prev > 0) ? Math.min(prev, referralCreditMaxAmt) : referralCreditMaxAmt);
  }, [useReferralCredit, referralCreditMaxAmt]);

  const handleSetReferralCreditAmt = useCallback((v: number) => {
    referralCreditIsCustomRef.current = true;
    setReferralCreditAmt(Math.max(0, Math.min(v, referralCreditMaxAmt)));
  }, [referralCreditMaxAmt]);

  // ── Inline validation errors ──────────────────────────────────────────────
  const [clientError,    setClientError]    = useState("");
  const [noItemsError,   setNoItemsError]   = useState(false);
  const [blockTimeError,      setBlockTimeError]      = useState("");
  const [overnightError,      setOvernightError]      = useState("");
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
    if (overnightError) setOvernightError("");
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
    // ── Reject any item that would run past midnight ──────────────────────
    // The calendar grid, drag/resize, and duration math (see useAppointment.ts's
    // buildSavePayload) all assume a single calendar day — nothing here rolls
    // an appointment onto the next day's date. Block it up front with a clear
    // message rather than silently truncating the stored duration.
    setOvernightError("");
    const overnightRow = rowsToCheck.find((row) => timeToMins(row.time) + (row.duration || 30) > 24 * 60);
    if (overnightRow) {
      setOvernightError("This appointment runs past midnight — please choose a start time/duration that ends before 12:00 AM, or split it into two separate bookings.");
      ok = false;
      if (!scrollTarget) scrollTarget = "services";
    }

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
        // Fully-reduced figure (Svc Discount, Extra Charges/Tip, Referral
        // Discount, Membership Wallet, eWallet, Reward Points ALL already
        // applied) — Grand Total is the merged, post-redemption concept
        // everywhere now, including this persisted booking field.
        grandTotal:    reconciledEffectiveTotal,
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
      applyMembershipDiscount,
      applyLoyaltyDiscount,
      includeGst,
    };
  }

  const handleSaveAndPay = useCallback(async () => {
    if (totalsNotReady) return;
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
  }, [save, dispatch, reconciledEffectiveTotal, selectedClient, serviceRows, packageRows, productRows, membershipRows,
      calDate, defaultTime, notes, staffAlert, salonId, existingBooking, defaultStaffId,
      discountType, discountValue, exCharges, tip, activeTaxes, totals,
      onRefresh, onClose]);

  const handleUpdate = useCallback(async () => {
    if (totalsNotReady) return;
    if (!validate()) return;
    const id = await save(buildSavePayload());
    if (id) { onRefresh?.(); onClose(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save, selectedClient, serviceRows, packageRows, productRows, membershipRows,
      calDate, defaultTime, notes, staffAlert, salonId, existingBooking, defaultStaffId,
      discountType, discountValue, exCharges, tip, activeTaxes, totals,
      onRefresh, onClose]);

  // Reveal the payment section only — does NOT persist anything. The
  // appointment is only actually saved/updated once the client confirms
  // payment (see handlePay / handleZeroPackagePayment), so simply opening
  // the payment step on an existing booking no longer fires an update call.
  const handleContinueToPaymentZero = useCallback(() => {
    if (totalsNotReady) return;
    if (!validate()) return;
    setShowPaymentSection(true);
    setTimeout(() => { paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalsNotReady, selectedClient, serviceRows, packageRows, productRows, membershipRows]);

  // Same as above but requires a real (non-walk-in) client.
  const handleContinueToPayment = useCallback(() => {
    if (totalsNotReady) return;
    const isWalkIn = !selectedClient || selectedClient.id === "walk-in";
    if (isWalkIn) {
      setWalkInPayError("Add client details before proceeding to payment.");
      setTriggerAddForm(true);
      clientSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (!validate()) return;
    setShowPaymentSection(true);
    setTimeout(() => {
      paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalsNotReady, selectedClient, serviceRows, packageRows, productRows, membershipRows]);

  // ── Pay ──────────────────────────────────────────────────────────────────
  const handlePay = useCallback(async () => {
    if (totalsNotReady) return;
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

    // Persist whatever was edited in this session (services/prices/discounts)
    // right before actually charging — this is the only point an existing
    // booking's update API is called from the payment step, not merely
    // opening/revealing it (see handleContinueToPayment above).
    const apptId = await save(buildSavePayload());
    if (!apptId) return;

    const ok = await completePayment({
      appointmentId: apptId,
      clientId:      selectedClient?.id,
      salonId,
      grandTotal:        reconciledEffectiveTotal,
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
      membershipWalletRequested: membershipWalletAmt,
      applyMembershipDiscount,
      applyLoyaltyDiscount,
      gstAmount:         totals.gstAmount,
      taxBreakdown:      totals.taxBreakdown,
      includeGst,
    });
    if (ok) {
      await markPackageSessions(String(apptId));
      if (printAfterPayment) {
        const freshBooking = store.getState().scheduler.bookings.find(
          (b: any) => String(b.id) === String(apptId)
        );
        if (freshBooking) printReceipt(freshBooking as any, schedulerStaff, currentSalon, printClientExtras, { auto: true, showTaxBreakup: showTaxBreakupOnInvoice, formatAmount });
      }
      // A membership/eWallet/reward-points/referral deduction just happened
      // server-side — refetch this client's balances so the still-open
      // Available Benefits panel and client card stop showing pre-payment figures.
      setClientRefreshKey((k) => k + 1);
      finishWithPaidPopup();
    }
  }, [
    completePayment, save, existingBooking, apiAppointmentId,
    selectedClient, salonId, totals, alreadyPaidAmount, amountThisTxn,
    eWalletAmt, coupon, paymentMode, singleMethod, splitEntries,
    partialAmtInput, includeClearDue, priorDueAmt, useEWallet, selectedDueIds, applyMembership, membershipWalletAmt,
    useRewardPoints, rewardPointsToRedeem, useReferralCredit, referralCreditAmt,
    finishWithPaidPopup, printAfterPayment, schedulerStaff, currentSalon,
  ]);

  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  // ── Zero-payment for fully package-covered appointments ─────────────────
  const handleZeroPackagePayment = useCallback(async () => {
    // Persist the current services/prices first — Continue to Payment no
    // longer saves eagerly, so the appointment isn't guaranteed to already
    // reflect this session's edits until this point.
    const apptId = existingBooking ? await save(buildSavePayload()) : (apiAppointmentId ?? undefined);
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
      setClientRefreshKey((k) => k + 1);
      finishWithPaidPopup();
    } else {
      onClose();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, save, existingBooking, apiAppointmentId, selectedClient, salonId, serviceRows, finishWithPaidPopup, onClose]);

  // ── Quick Sale: single "Checkout" click — saves the appointment and
  // completes payment in one step, no separate "Continue to Payment" reveal.
  const handleQuickSaleCheckout = useCallback(async () => {
    if (totalsNotReady) return;
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
        setClientRefreshKey((k) => k + 1);
        finishWithPaidPopup();
      }
      return;
    }

    const ok = await completePayment({
      appointmentId: id,
      clientId:      selectedClient?.id,
      salonId,
      grandTotal:        reconciledEffectiveTotal,
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
      membershipWalletRequested: membershipWalletAmt,
      applyMembershipDiscount,
      applyLoyaltyDiscount,
      gstAmount:         totals.gstAmount,
      taxBreakdown:      totals.taxBreakdown,
      includeGst,
    });
    if (ok) {
      await markPackageSessions(String(id));
      if (printAfterPayment) {
        const freshBooking = store.getState().scheduler.bookings.find(
          (b: any) => String(b.id) === String(id)
        );
        if (freshBooking) printReceipt(freshBooking as any, schedulerStaff, currentSalon, printClientExtras, { auto: true, showTaxBreakup: showTaxBreakupOnInvoice, formatAmount });
      }
      setClientRefreshKey((k) => k + 1);
      finishWithPaidPopup();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save, completePayment, dispatch, selectedClient, salonId, serviceRows, totals, amountThisTxn,
      eWalletAmt, coupon, paymentMode, singleMethod, splitEntries, partialAmtInput,
      includeClearDue, priorDueAmt, useEWallet, selectedDueIds, applyMembership, membershipWalletAmt, printAfterPayment,
      useRewardPoints, rewardPointsToRedeem, useReferralCredit, referralCreditAmt,
      schedulerStaff, currentSalon, finishWithPaidPopup]);

  if (!isOpen) return null;

  const isCancelledBooking = existingBooking?.status?.toLowerCase() === "cancelled";
  const isPartialBooking   = existingBooking?.status === "partial";
  // A Paid booking whose edited total hasn't changed stays frozen (nothing
  // to collect) — but editing it to raise the total un-freezes it the moment
  // the live preview shows more is owed than what's already been paid,
  // exactly like a genuinely-partial booking already does. No separate
  // "paid" case needed anymore; this one condition covers both.
  const isPaymentFrozen =
    existingBooking?.status !== "partial"
        && alreadyPaidAmount > 0
        && alreadyPaidAmount >= reconciledEffectiveTotal;

  // Disable pay button when no method selected in single mode
  const isPayDisabled = isPaymentFrozen
    || isProcessing
    || totalsNotReady
    || (amountThisTxn > 0 && paymentMode === "single" && !singleMethod);

  const confirmLabel = isPaymentFrozen
    ? "Already Paid"
    : totalsNotReady
    ? (totalsError ? "Calculation failed — edit to retry" : "Confirming total…")
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
        onClientUpdated={() => setClientRefreshKey((k) => k + 1)}
        packages={nonExpiredPackages}
        memberships={clientMemberships}
        loyaltyEligibility={loyaltyEligibility}
      />
    </div>
  );

  const servicesSectionEl = (
    <>
      <div
        className="appt-section"
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
          onAddService={() => setServiceRows((rows) => {
            const last = rows[rows.length - 1];
            const nextTime = last?.time
              ? (() => {
                  const [h, m] = last.time.split(":").map(Number);
                  const total = h * 60 + m + (last.duration || 30);
                  // Don't wrap past midnight into a bogus "00:00" (looks like the
                  // very start of the same day, not the actual next day) — 23:30
                  // is the last bookable slot, so cap there instead.
                  if (total >= 24 * 60) return "23:30";
                  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
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
              triggerPackages({ status: "Active" });
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
          packageRemainingByRow={perRowCoveredRemaining}
          membershipWalletInfo={membershipWalletMap}
          serviceTaxByRow={serviceTaxByRow}
          packageTaxByRow={packageTaxByRow}
          productTaxByRow={productTaxByRow}
          membershipTaxByRow={membershipTaxByRow}
          serviceMembershipDiscountByRow={serviceMembershipDiscountByRow}
          productMembershipDiscountByRow={productMembershipDiscountByRow}
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
          onClearPkgError={(i: number, field: string) => setPkgErrors((prev) => {
            const n = [...prev];
            if (n[i]) n[i] = { ...n[i], [field]: false };
            return n;
          })}
          onClearProdError={(i: number, field: string) => setProdErrors((prev) => {
            const n = [...prev];
            if (n[i]) n[i] = { ...n[i], [field]: false };
            return n;
          })}
          onClearMemError={(i: number, field: string) => setMemErrors((prev) => {
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
  const firstActivePkg = nonExpiredPackages[0];
  // `coveredServices` is aggregated across ALL of the client's active
  // packages, regardless of what's actually on THIS bill — so it stays
  // non-empty even when none of the currently-added services match any of
  // them. Gating the card on that alone let staff check "Apply Package" for
  // a bill it could never actually apply to (e.g. a package that only
  // covers Haircut, applied to a bill of just a Facial) — it never zeroed
  // anything, but nothing indicated why. Only show/offer it when at least
  // one current row is genuinely eligible.
  const hasPackageEligibleRow = useMemo(
    () => serviceRows.some((row) => {
      if (!row.service.trim()) return false;
      const rowCatalogId = (row as any).id || null;
      return (rowCatalogId && coveredServices.has(rowCatalogId))
        || coveredServices.has(`name:${row.service.toLowerCase()}`);
    }),
    [serviceRows, coveredServices],
  );
  const availableBenefitCards: BenefitCardConfig[] = useMemo(() => {
    const cards: BenefitCardConfig[] = [];

    if (coveredServices.size > 0 && firstActivePkg && hasPackageEligibleRow) {
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
        value: `${formatAmount(membershipTotalBalance)} Remaining`,
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

    // Two independent chips — staff picks either or both; checking both
    // stacks their discounts additively (see applyMembershipDiscountForBooking).
    if (percentageDiscountSource) {
      cards.push({
        key: "membership-discount",
        icon: Percent,
        variantClass: "benefit-card--membership",
        title: "Membership Discount",
        value: `${percentageDiscountSource.discountPercent}% Off`,
        subtitle: `${percentageDiscountSource.name} · ${formatAmount(percentageDiscountSource.balanceRemaining ?? 0)} balance left`,
        checked: applyMembershipDiscount,
        onToggle: setApplyMembershipDiscount,
      });
    }

    if (loyaltyDiscountSource) {
      cards.push({
        key: "loyalty-discount",
        icon: Percent,
        variantClass: "benefit-card--membership",
        title: "Loyalty Discount",
        value: `${loyaltyDiscountSource.discountPercent}% Off`,
        subtitle: loyaltyDiscountSource.nextTierHint
          ? `${loyaltyDiscountSource.name} · ${loyaltyDiscountSource.nextTierHint}`
          : loyaltyDiscountSource.name,
        checked: applyLoyaltyDiscount,
        onToggle: setApplyLoyaltyDiscount,
      });
    }

    const eWalletBal = clientStats?.ewalletAmt ?? 0;
    if (eWalletBal >= 100) {
      cards.push({
        key: "ewallet",
        icon: WalletFill,
        variantClass: "benefit-card--ewallet",
        title: "eWallet",
        value: formatAmount(eWalletBal),
        subtitle: "Available Balance",
        checked: useEWallet,
        onToggle: setUseEWallet,
        disabledReason: (!useEWallet && remainingAfterMembership <= 0)
          ? (membershipWalletUsedTotal > 0 ? "Bill already fully covered by Membership Wallet" : `Bill total is already ${formatAmount(0)}`)
          : undefined,
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
        disabledReason: (!useRewardPoints && remainingAfterEWallet <= 0)
          ? (() => {
              const parts = [
                membershipWalletUsedTotal > 0 ? "Membership Wallet" : "",
                useEWallet && eWalletAmt > 0 ? "eWallet" : "",
              ].filter(Boolean);
              return parts.length > 0 ? `Bill already fully covered by ${parts.join(" + ")}` : `Bill total is already ${formatAmount(0)}`;
            })()
          : undefined,
        input: {
          value: rewardPointsToRedeem,
          max: rewardPointsMaxRedeem,
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
        value: formatAmount(referralBal),
        subtitle: "Available Credit",
        checked: useReferralCredit,
        onToggle: setUseReferralCredit,
        disabledReason: (!useReferralCredit && remainingAfterRewardPoints <= 0)
          ? (() => {
              const parts = [
                membershipWalletUsedTotal > 0 ? "Membership Wallet" : "",
                useEWallet && eWalletAmt > 0 ? "eWallet" : "",
                useRewardPoints && rewardPointsRedeemedValue > 0 ? "Reward Points" : "",
              ].filter(Boolean);
              return parts.length > 0 ? `Bill already fully covered by ${parts.join(" + ")}` : `Bill total is already ${formatAmount(0)}`;
            })()
          : undefined,
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
    coveredServices, firstActivePkg, hasPackageEligibleRow, applyPackage,
    clientMemberships, membershipTotalBalance, primaryMembership, applyMembership,
    membershipWalletAmt, membershipMaxUsable, membershipWalletUsedTotal, handleSetMembershipWalletAmt,
    percentageDiscountSource, loyaltyDiscountSource, applyMembershipDiscount, applyLoyaltyDiscount, formatAmount,
    clientStats, useEWallet, eWalletAmt, eWalletMaxAmt, remainingAfterMembership, handleSetEWalletAmt,
    useRewardPoints, rewardPointsToRedeem, rewardPointsMaxRedeem, rewardPointsRedeemedValue, remainingAfterEWallet, handleSetRewardPointsToRedeem,
    useReferralCredit, referralCreditAmt, referralCreditMaxAmt, remainingAfterRewardPoints, handleSetReferralCreditAmt,
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
          <input className="fg-input" type="text" inputMode="decimal"
            value={focusedField === "exCharges" && exCharges === 0 ? "" : exCharges}
            onFocus={() => setFocusedField("exCharges")}
            onBlur={() => setFocusedField(null)}
            onChange={(e) => {
              // Digits and a single decimal point only — a native
              // type="number" input still lets someone type "+"/"-"/"e"
              // characters (min=0 only flags it :invalid, it doesn't block
              // the keystroke), so this is a plain text input sanitized by
              // hand instead, matching ServiceRow.tsx's price/qty/discount
              // fields.
              const cleaned = e.target.value.replace(/[^0-9.]/g, "");
              setExCharges(cleaned === "" ? 0 : Math.max(0, Number(cleaned) || 0));
            }} />
        </div>
        <div className="field-group">
          <label>Tip</label>
          <input className="fg-input" type="text" inputMode="decimal"
            value={focusedField === "tip" && tip === 0 ? "" : tip}
            onFocus={() => setFocusedField("tip")}
            onBlur={() => setFocusedField(null)}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/[^0-9.]/g, "");
              setTip(cleaned === "" ? 0 : Math.max(0, Number(cleaned) || 0));
            }} />
        </div>
        <div className="field-group">
          <label>Bill Discount</label>
          <input className="fg-input" type="text" inputMode="decimal"
            value={focusedField === "discountValue" && discountValue === 0 ? "" : discountValue}
            onFocus={() => setFocusedField("discountValue")}
            onBlur={() => setFocusedField(null)}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/[^0-9.]/g, "");
              let num = cleaned === "" ? 0 : Math.max(0, Number(cleaned) || 0);
              // A percentage discount can never exceed 100%. A flat (₹)
              // discount can never exceed the current subtotal either —
              // computeTotals() already floors the resulting taxable amount
              // at 0 regardless, but silently letting the FIELD hold an
              // absurd value (e.g. a stray extra digit) shows a nonsensical
              // "Svc Discount: -₹3,400,000,000.00" line before that floor
              // kicks in, so this clamps — and explains — right at entry.
              if (discountType === "Percentage (%)") {
                if (num > 100) { num = 100; setDiscountValueWarning("Percentage discount cannot exceed 100%"); }
                else setDiscountValueWarning(null);
              } else {
                const subtotalCap = totals.subtotal || 0;
                if (subtotalCap > 0 && num > subtotalCap) { num = subtotalCap; setDiscountValueWarning("Discount cannot exceed total amount"); }
                else setDiscountValueWarning(null);
              }
              setDiscountValue(num);
            }} />
          {discountValueWarning && <span className="fg-field__err">{discountValueWarning}</span>}
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
                  {/* Item-level "Disc %" and the bill-level "Bill Discount" can both be
                      active at once and stack — broken out explicitly (instead of one
                      blended "Discount" line) so it's clear how much came from each. */}
                  {totals.itemDiscountTotal > 0 && (
                    <>
                      <div className="qs-summary-row"><span>Items Total</span><span>{currencySymbol}{totals.catalogTotal.toFixed(2)}</span></div>
                      <div className="qs-summary-row qs-summary-row--discount"><span>Item Discount</span><span>-{currencySymbol}{totals.itemDiscountTotal.toFixed(2)}</span></div>
                    </>
                  )}
                  <div className="qs-summary-row"><span>Subtotal</span><span>{currencySymbol}{totals.displaySubtotal.toFixed(2)}</span></div>
                  {coupon.discount > 0 && (
                    <div className="qs-summary-row qs-summary-row--discount"><span>Coupon{coupon.applied ? ` (${coupon.applied})` : ""}</span><span>-{currencySymbol}{coupon.discount.toFixed(2)}</span></div>
                  )}
                  {/* Genuinely pre-tax, unlike "Membership Wallet Used" further down —
                      already folded into totals.taxable/grandTotal by the backend, so
                      this line explains the reduction rather than causing it again. */}
                  {appliedMembershipDiscount > 0 && (
                    <div className="qs-summary-row qs-summary-row--discount"><span>Membership Discount</span><span>-{currencySymbol}{appliedMembershipDiscount.toFixed(2)}</span></div>
                  )}
                  {/* Per-tax-name breakdown — mirrors TotalsPanel.tsx's exact
                      convention, so this summary and the post-"Continue to
                      Payment" panel never disagree on how GST is shown.
                      Only exclusive taxes add to what's owed; inclusive ones
                      are already inside the item price, shown for transparency only. */}
                  {totals.taxBreakdown.filter((t) => !t.inclusive && t.amount > 0).map((t) => (
                    <div className="qs-summary-row" key={`${t.name}-excl`}><span>{t.name} ({t.rate}%)</span><span>+{currencySymbol}{t.amount.toFixed(2)}</span></div>
                  ))}
                  {totals.taxBreakdown.filter((t) => t.inclusive && t.amount > 0).map((t) => (
                    <div className="qs-summary-row" key={`${t.name}-incl`}><span>{t.name} ({t.rate}%, incl.)</span><span>{currencySymbol}{t.amount.toFixed(2)}</span></div>
                  ))}
                  <div className="qs-summary-row"><span>Extra Charges</span><span>+{currencySymbol}{exCharges.toFixed(2)}</span></div>
                  {/* Bill Discount is a POST-tax deduction — applied to the bill total
                      after GST/Extra Charges (see pricing.engine.ts computeBillTotals). */}
                  {totals.manualDiscount > 0 && (
                    <div className="qs-summary-row qs-summary-row--discount"><span>Bill Discount</span><span>-{currencySymbol}{totals.manualDiscount.toFixed(2)}</span></div>
                  )}
                  {/* Referral Discount is a POST-tax, POST-Svc-Discount deduction now —
                      applied here, not folded into the pre-tax coupon discount above. */}
                  {referralDiscountPreview > 0 && (
                    <div className="qs-summary-row qs-summary-row--discount"><span>Referral Discount</span><span>-{currencySymbol}{referralDiscountPreview.toFixed(2)}</span></div>
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
                  {Math.abs(reconciledRoundOff) >= 0.005 && (
                    <div className="qs-summary-row"><span>Round Off</span><span>{reconciledRoundOff >= 0 ? "+" : "-"}{currencySymbol}{Math.abs(reconciledRoundOff).toFixed(2)}</span></div>
                  )}
                  <div className="qs-summary-row qs-summary-row--total"><span>Grand Total</span><span>{currencySymbol}{reconciledEffectiveTotal.toFixed(2)}</span></div>
                  <div className="qs-summary-row qs-summary-row--total"><span>Amount to Pay</span><span>{currencySymbol}{reconciledEffectiveTotal.toFixed(2)}</span></div>
                  {/* Display/record-only — never part of Grand Total/Amount to Pay
                      above (totals.grandTotal deliberately never adds `tip`, see
                      totalsUtils.ts). Placed after every bill-total row so it
                      reads as separate info, not part of the running total. */}
                  {tip > 0 && (
                    <div className="qs-summary-row"><span>Staff Tip</span><span>{currencySymbol}{tip.toFixed(2)}</span></div>
                  )}
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
                    effectiveTotal={reconciledEffectiveTotal}
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
                  disabled={isSaving || isProcessing || totalsNotReady} onClick={handleQuickSaleCheckout}>
                  {isSaving ? "Saving…" : isProcessing ? "Processing…" : totalsNotReady ? (totalsError ? "Calculation failed — edit to retry" : "Confirming total…") : `Checkout (${currencySymbol}${(isPartialEntry ? parsedPartial : reconciledEffectiveTotal).toFixed(2)})`}
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

              {/* 3. Charges & Discounts — stays visible through the payment
                  step too (Partial/Continue Payment), matching the Quick
                  Sale layout below which never hid it. Previously this
                  disappeared the moment showPaymentSection flipped true,
                  even though exCharges/tip/discountValue/discountType still
                  fed the live totals recalc shown in the payment section —
                  staff just lost the ability to see/edit them mid-checkout. */}
              {chargesSectionEl}

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
                        displaySubtotal={totals.displaySubtotal}
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
                        referralDiscount={referralDiscountPreview}
                        membershipDiscountUsed={appliedMembershipDiscount}
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
                        grandTotal={reconciledEffectiveTotal}
                        roundOff={reconciledRoundOff}
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
                      <span>{currencySymbol}{reconciledEffectiveTotal.toFixed(2)}</span>
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
                        displaySubtotal={totals.displaySubtotal}
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
                        referralDiscount={referralDiscountPreview}
                        membershipDiscountUsed={appliedMembershipDiscount}
                        totalDiscount={totals.totalDisc}
                        gstAmount={totals.gstAmount}
                        taxBreakdown={totals.taxBreakdown}
                        tip={tip}
                        membershipWalletUsed={membershipWalletUsedTotal}
                        ewalletUsed={useEWallet ? eWalletAmt : 0}
                        rewardPointsValue={rewardPointsRedeemedValue}
                        referralCreditUsed={useReferralCredit ? referralCreditAmt : 0}
                        alreadyPaid={livePaidAmount}
                        paidLabel="Paid (incl. this payment)"
                        dueAmount={liveDueAmount}
                        grandTotal={reconciledEffectiveTotal}
                        roundOff={reconciledRoundOff}
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
                    effectiveTotal={reconciledEffectiveTotal}
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

          {overnightError && (
            <div style={{
              margin: "8px 0", padding: "10px 14px",
              background: "#fef2f2", border: "1px solid #fca5a5",
              borderRadius: 8, color: "#dc2626", fontSize: 13,
              display: "flex", alignItems: "flex-start", gap: 8,
            }}>
              <span style={{ flexShrink: 0 }}>⛔</span>
              <span>{overnightError}</span>
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
                  <button className="btn btn-outline-secondary" onClick={handleUpdate} disabled={isSaving || totalsNotReady}>
                    {isSaving ? "Saving…" : totalsNotReady ? (totalsError ? "Calculation failed — edit to retry" : "Confirming total…") : "Update Appointment"}
                  </button>
                  {!isPaymentFrozen && (
                    isPackageZero ? (
                      <button className="btn btn-dark" disabled={isSaving || totalsNotReady}
                        style={{ background: "#16a34a", borderColor: "#16a34a" }}
                        onClick={handleContinueToPaymentZero}>
                        {isSaving ? "Saving…" : totalsNotReady ? (totalsError ? "Calculation failed — edit to retry" : "Confirming total…") : `Continue with Payment (${currencySymbol}0)`}
                      </button>
                    ) : (
                      <button className="btn btn-dark" disabled={isSaving || totalsNotReady} onClick={handleContinueToPayment}>
                        {isSaving ? "Saving…" : totalsNotReady ? (totalsError ? "Calculation failed — edit to retry" : "Confirming total…") : "Continue to Payment"}
                      </button>
                    )
                  )}
                </>
              ) : (
                // New appointment (no existingBooking) — always save and close
                <button className="btn btn-dark" style={{ width: "100%" }} onClick={handleSaveAndPay} disabled={isSaving || totalsNotReady}>
                  {isSaving ? "Saving…" : totalsNotReady ? (totalsError ? "Calculation failed — edit to retry" : "Confirming total…") : "Save Appointment"}
                </button>
              )}
            </>
          ) : (
            <>
              <button className="btn btn-outline-secondary" onClick={() => setShowPaymentSection(false)}>
                <PencilFill size={13} /> Update Appointment
              </button>
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
          currentBalance={clientStats?.ewalletAmt ?? 0}
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
