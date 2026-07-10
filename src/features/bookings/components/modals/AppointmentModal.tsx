import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
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
import { getRewardPointsConfig } from "../../../settings/utils/rewardPointsSettings";
import { getReferralConfig } from "../../../settings/utils/referralSettings";
import { isRealId } from "../../utils/paymentUtils";
import { computeTotals }     from "../../utils/totalsUtils";
import { computePointsEarned, computeEWalletCredit, computeMaxWalletUsable, EWALLET_REDEEM_MINIMUM } from "../../utils/paymentUtils";
import {
  selectPackagesList, selectProductsList, selectMembershipsList,
} from "../../../../store/selectors/scheduler.selectors";
import {
  PersonFill, Scissors, TagFill, FileText,
  BellFill, PencilFill,
} from "react-bootstrap-icons";
import { ClientPanel }   from "./ClientPanel";
import { ServicesPanel } from "./ServicesPanel";
import { PaymentPanel }  from "./PaymentPanel";
import TotalsPanel       from "./TotalsPanel";
import PaymentButton     from "../shared/PaymentButton";
import { printReceipt }  from "../../utils/receipt";
import { store }         from "../../../../store/store";
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

export const AppointmentModal: React.FC<Props> = ({
  isOpen, onClose, salonId,
  existingBooking, defaultDate, defaultTime, defaultStaffId,
  defaultClientId, defaultClientName, defaultClientPhone,
  onRefresh, onCancelBooking, onDeleteBooking, quickSale,
}) => {
  const dispatch = useAppDispatch();

  // Always fetch services + clients when modal opens
  useServices(salonId);

  // Active taxes from Tax Mapping settings, for bill calculation
  useEffect(() => { dispatch(fetchSettingsThunk()); }, [dispatch]);
  const settingItems = useAppSelector((s) => s.setting.items);
  const activeTaxes  = useMemo(() => getActiveTaxes(settingItems), [settingItems]);
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
  const [paymentMode, setPaymentMode]           = useState<"single" | "split">("single");
  const [singleMethod, setSingleMethod]         = useState<SingleMethod | null>(null);
  const [splitEntries, setSplitEntries]         = useState<SplitEntry[]>([
    { method: "Cash", amount: "" }, { method: "Card", amount: "" },
  ]);
  const [partialAmtInput, setPartialAmtInput]   = useState("");
  const [includeClearDue, setIncludeClearDue]   = useState(false);
  const [printAfterPayment, setPrintAfterPayment] = useState(false);
  const [payMethodError, setPayMethodError]     = useState(false);
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const [showPaidPopup, setShowPaidPopup] = useState(false);

  // Shows a centered "Payment Completed" popup for 2s, then runs the actual
  // close/refresh — the modal has to stay mounted for those 2s for the popup
  // to be visible at all, so this replaces calling onRefresh/onClose directly.
  const finishWithPaidPopup = useCallback(() => {
    setShowPaidPopup(true);
    setTimeout(() => {
      setShowPaidPopup(false);
      onRefresh?.();
      onClose();
    }, 2000);
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
  const { completePayment, isProcessing, payError }            = usePayment();
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
  // Map of lower-cased service name → remaining sessions from active packages (memoized for stable reference)
  const coveredServices = useMemo(() => {
    const map = new Map<string, number>();
    (clientPkgsData?.items ?? []).forEach((pkg) => {
      pkg.services.forEach((svc) => {
        if (svc.remainingSessions > 0) {
          const key = svc.serviceName.toLowerCase();
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
        const remaining = effectiveCoveredServices.get(row.service.toLowerCase()) ?? 0;
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
  // from the client's single highest-balance active membership, in row order.
  // Manual opt-in via the "Apply Membership" checkbox below the services list —
  // unchecked by default, so a client with balance isn't billed from their
  // wallet unless staff explicitly chooses to.
  // Display-only: the backend independently recomputes and applies the real
  // deduction at payment time (see payments.service.ts), gated on the same
  // flag sent with the payment — this is just a preview.
  const { memberships: clientMemberships, primary: primaryMembership } = useClientMembershipWallet(clientIdForPkg);
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
  const membershipWalletMap = useMemo(() => {
    const map = new Map<string, { walletUsed: number; payable: number }>();
    if (!applyMembership) return map;
    let remaining = primaryMembership?.membershipWalletBalance ?? 0;
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
    return map;
  }, [serviceRows, primaryMembership, applyMembership]);
  const membershipWalletUsedTotal = useMemo(
    () => Array.from(membershipWalletMap.values()).reduce((s, v) => s + v.walletUsed, 0),
    [membershipWalletMap],
  );
  const membershipWalletRemaining = Math.max(0, (primaryMembership?.membershipWalletBalance ?? 0) - membershipWalletUsedTotal);

  // Marks package sessions as complete for each covered service row after appointment is done.
  // appointmentId links each consumed session back to the sale that used it (for audit/reporting).
  async function markPackageSessions(appointmentId?: string) {
    const pkgs = clientPkgsData?.items ?? [];
    for (const row of serviceRows) {
      const key = row.service.toLowerCase();
      const remaining = effectiveCoveredServices.get(key) ?? 0;
      if (remaining <= 0) continue;

      // Find the package + service that covers this row
      const qty = Number(row.qty) || 1;
      const sessionsToMark = Math.min(qty, remaining);

      for (const pkg of pkgs) {
        const svc = pkg.services.find(
          (s) => s.serviceName.toLowerCase() === key && s.remainingSessions > 0
        );
        if (!svc) continue;
        for (let i = 0; i < sessionsToMark; i++) {
          try {
            await completePackageSession({
              id: pkg.id,
              body: { serviceId: svc.serviceId, staffName: row.staff || "Staff", appointmentId },
            }).unwrap();
          } catch {
            // don't block the appointment flow on session-mark failure
          }
        }
        break; // one package is enough per service row
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

  const totals = computeTotals({
    serviceRows, packageRows, productRows, membershipRows,
    discountType, discountValue, taxes: activeTaxes, exCharges, tip,
    couponDiscount: coupon.discount + referralDiscountPreview,
    eWalletUsed: useEWallet ? eWalletAmt : 0,
    membershipWalletUsed: membershipWalletUsedTotal,
  });

  const alreadyPaidAmount   = existingBooking?.payingNow ?? 0;
  // For partial bookings, trust the API's dueAmount directly — payingNow can be unreliable
  const remainingDue = (existingBooking?.paymentStatus === "Partial" && (existingBooking?.dueAmount ?? 0) > 0)
    ? existingBooking.dueAmount
    : Math.max(0, totals.effectiveTotal - alreadyPaidAmount);
  // Exclude current appointment's due so "Clear Pending Due" only shows OTHER unpaid appointments
  const priorDueAmt         = Math.max(0, (clientStats?.unpaidAmt ?? 0) - remainingDue);
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

  // ── Sync eWalletAmt ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!useEWallet) { setEWalletAmt(0); return; }
    const balance = clientStats?.ewalletAmt ?? 0;
    if (balance < EWALLET_REDEEM_MINIMUM) { setUseEWallet(false); setEWalletAmt(0); return; }
    const maxUsable = computeMaxWalletUsable(totals.grandTotal, referralConfig);
    setEWalletAmt(Math.min(balance, totals.grandTotal, maxUsable));
  }, [useEWallet, clientStats, totals.grandTotal, referralConfig]);

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
    if (isOpen && existingBooking?.paymentStatus === "Partial") {
      setShowPaymentSection(true);
    } else if (!isOpen) {
      setShowPaymentSection(false);
    }
  }, [isOpen, existingBooking?.id, existingBooking?.paymentStatus]);

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

    // A service row only counts as "filled" once it's actually selected from the
    // catalog dropdown, same as product/package/membership rows below. Freshly
    // added rows record that as `id` (set to the catalog service's id at
    // selection time — see ServiceRow.tsx), but existing bookings loaded back
    // from the API never carry that field — their catalog reference is only
    // persisted as `service_id`. Checking `id` alone made every previously-saved
    // booking look "empty" and silently fail validation. Accept either.
    const isRealServiceRow = (r: any) => !!r.service?.trim() && !!(r.id || r.service_id);
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
        paymentStatus: (existingBooking?.paymentStatus || "Unpaid") as any,
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
          paymentStatus: "Unpaid",
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
    // deduction brought effectiveTotal to 0) — nothing to collect via a method.
    if (totals.effectiveTotal > 0 && paymentMode === "single" && !singleMethod) {
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
        if (freshBooking) printReceipt(freshBooking as any, schedulerStaff, currentSalon, printClientExtras, { auto: true });
      }
      finishWithPaidPopup();
    }
  }, [
    completePayment, existingBooking, apiAppointmentId,
    selectedClient, salonId, totals, alreadyPaidAmount,
    eWalletAmt, coupon, paymentMode, singleMethod, splitEntries,
    partialAmtInput, includeClearDue, priorDueAmt, useEWallet, applyMembership,
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
        paymentStatus: "Paid",
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
    // wallet/membership/points deduction brought effectiveTotal to 0) — there's
    // nothing left to collect via Cash/Card/UPI.
    const methodMissing = totals.effectiveTotal > 0 && paymentMode === "single" && !singleMethod;
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
          paymentStatus: "Paid",
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
        if (freshBooking) printReceipt(freshBooking as any, schedulerStaff, currentSalon, printClientExtras, { auto: true });
      }
      finishWithPaidPopup();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save, completePayment, dispatch, selectedClient, salonId, serviceRows, totals,
      eWalletAmt, coupon, paymentMode, singleMethod, splitEntries, partialAmtInput,
      includeClearDue, priorDueAmt, useEWallet, applyMembership, printAfterPayment,
      schedulerStaff, currentSalon, finishWithPaidPopup]);

  if (!isOpen) return null;

  const isCancelledBooking = existingBooking?.status?.toLowerCase() === "cancelled";
  const isPartialBooking   = existingBooking?.paymentStatus === "Partial";
  const isPaymentFrozen = existingBooking?.paymentStatus === "Paid"
    || (existingBooking?.paymentStatus !== "Partial"
        && alreadyPaidAmount > 0
        && alreadyPaidAmount >= totals.effectiveTotal);
  const parsedPartial   = parseFloat(partialAmtInput);
  // 0 counts as a deliberate partial entry (pay nothing now, leave it all due) —
  // matches the >= 0 check in usePayment.ts's actual charge calculation.
  const isPartialEntry  = !isNaN(parsedPartial) && parsedPartial >= 0 && parsedPartial < remainingDue;

  // Disable pay button when no method selected in single mode
  const isPayDisabled = isPaymentFrozen
    || isProcessing
    || (totals.effectiveTotal > 0 && paymentMode === "single" && !singleMethod);

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

      {/* Apply Package — manual opt-in, same treatment as Apply Membership below */}
      {coveredServices.size > 0 && (
        <div
          className={`pay-ewallet${applyPackage ? " pay-ewallet--active" : ""}`}
          style={{ margin: "0 0 12px" }}
          onClick={() => setApplyPackage(v => !v)}
        >
          <input type="checkbox" checked={applyPackage} readOnly />
          <span>Apply Package ({coveredServices.size} service{coveredServices.size !== 1 ? "s" : ""} covered)</span>
        </div>
      )}

      {/* Apply Membership — manual opt-in to draw from the client's membership wallet */}
      {primaryMembership && (
        <div
          className={`pay-ewallet${applyMembership ? " pay-ewallet--active" : ""}`}
          style={{ margin: "0 0 12px" }}
          onClick={() => setApplyMembership(v => !v)}
        >
          <input type="checkbox" checked={applyMembership} readOnly />
          <span>Apply Membership (Available: {currencySymbol}{primaryMembership.membershipWalletBalance.toFixed(2)})</span>
          {applyMembership && membershipWalletUsedTotal > 0 && (
            <span className="pay-ewallet__deducted">-{currencySymbol}{membershipWalletUsedTotal.toFixed(2)}</span>
          )}
        </div>
      )}

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
      <div className={`appt-drawer-content${quickSale ? " appt-drawer-content--page" : ""}`} onClick={(e) => e.stopPropagation()}>

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
                existingBooking.paymentStatus === "Paid" ? "paid"
                : existingBooking.paymentStatus === "Partial" ? "partial"
                : "unpaid"
              }`}>
                {existingBooking.paymentStatus}
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
                    {!isCancelledBooking && existingBooking?.paymentStatus !== "Partial" && onCancelBooking && (
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
                {chargesSectionEl}
                <div className="appt-section">
                  <div className="appt-section__title"><FileText size={15} /> Payment &amp; Notes</div>
                  {notesFieldsEl}
                </div>
              </div>
              <div className="qs-layout__right">
                <div className="qs-summary-card">
                  <div className="qs-summary-card__title">Sale Summary</div>
                  <div className="qs-summary-row"><span>Subtotal</span><span>{currencySymbol}{totals.subtotal.toFixed(2)}</span></div>
                  <div className="qs-summary-row qs-summary-row--discount"><span>Discount</span><span>-{currencySymbol}{totals.totalDisc.toFixed(2)}</span></div>
                  <div className="qs-summary-row"><span>Extra Charges</span><span>+{currencySymbol}{exCharges.toFixed(2)}</span></div>
                  <div className="qs-summary-row qs-summary-row--total"><span>Grand Total</span><span>{currencySymbol}{totals.grandTotal.toFixed(2)}</span></div>
                  {tip > 0 && (
                    <div className="qs-summary-row"><span>Tip (Staff)</span><span>+{currencySymbol}{tip.toFixed(2)}</span></div>
                  )}
                  {(useEWallet && eWalletAmt > 0) && (
                    <div className="qs-summary-row qs-summary-row--discount"><span>eWallet Used</span><span>-{currencySymbol}{eWalletAmt.toFixed(2)}</span></div>
                  )}
                  <div className="qs-summary-row qs-summary-row--total"><span>Amount to Pay</span><span>{currencySymbol}{totals.effectiveTotal.toFixed(2)}</span></div>
                </div>

                {isFullyCovered ? (
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
                    eWalletBalance={clientStats?.ewalletAmt ?? 0}
                    useEWallet={useEWallet}
                    eWalletAmt={eWalletAmt}
                    onToggleEWallet={setUseEWallet}
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
                    includeClearDue={includeClearDue}
                    onToggleClearDue={setIncludeClearDue}
                    printAfterPayment={printAfterPayment}
                    onTogglePrint={setPrintAfterPayment}
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
                        serviceTotal={serviceRows.filter(r => !r.isPackageService).reduce((s, r) => s + r.total, 0)}
                        packageServiceCount={serviceRows.filter(r => r.isPackageService).length}
                        packageTotal={packageRows.reduce((s, r) => s + r.total, 0)}
                        productTotal={productRows.reduce((s, r) => s + r.total, 0)}
                        membershipTotal={membershipRows.reduce((s, r) => s + r.total, 0)}
                        exCharges={exCharges}
                        discount={discountValue}
                        discountType={discountType}
                        totalDiscount={totals.totalDisc}
                        gstAmount={totals.gstAmount}
                        taxBreakdown={totals.taxBreakdown}
                        tip={tip}
                        alreadyPaid={alreadyPaidAmount}
                        dueAmount={remainingDue}
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
                  {isFullyCovered ? (
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
                    eWalletBalance={clientStats?.ewalletAmt ?? 0}
                    useEWallet={useEWallet}
                    eWalletAmt={eWalletAmt}
                    onToggleEWallet={setUseEWallet}
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
                    includeClearDue={includeClearDue}
                    onToggleClearDue={setIncludeClearDue}
                    printAfterPayment={printAfterPayment}
                    onTogglePrint={setPrintAfterPayment}
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
        <div
          style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            zIndex: 10000, background: "#111827", color: "#fff",
            padding: "18px 32px", borderRadius: 12, display: "flex",
            alignItems: "center", gap: 10, fontSize: 15, fontWeight: 600,
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <span style={{ color: "#22c55e", fontSize: 20 }}>✓</span>
          Payment Completed
        </div>
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
