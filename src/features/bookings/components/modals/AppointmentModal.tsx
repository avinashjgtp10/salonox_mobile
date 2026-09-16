import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import toast from "react-hot-toast";
import { SuccessOverlay } from "../../../../components/ui";
import MultiSelectCheckbox from "../../../../components/ui/MultiSelectCheckbox";
import Dropdown from "../../../../components/ui/Dropdown";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useAppSelector, useAppDispatch } from "../../../../hooks/useAppRedux";
import { usePermissions } from "../../../../hooks/usePermissions";
import { showPermissionDenied } from "../../../../store/permissionDialogSlice";
import { useAppointment }    from "../../hooks/useAppointment";
import { usePayment, buildPaymentPayload, buildPaymentStatusPatch } from "../../hooks/usePayment";
import { usePosSettings }    from "../../hooks/usePosSettings";
import POSPaymentModal       from "./POSPaymentModal";
import { useCoupon }         from "../../hooks/useCoupon";
import { useReferral }       from "../../hooks/useReferral";
import { useServices }       from "../../hooks/useServices";
import { useServices as useCatalogServices } from "../../../catalog/hooks/useServices";
import { useLazyListPackagesQuery, useLazyListPackageTemplatesQuery, useCompleteClientPackageSessionMutation } from "../../../../services/api/endpoints/packages.endpoints";
import { useClientDetails } from "../../hooks/useClientDetails";
import { searchProductsThunk } from "../../../../middleware/catalog/products.thunk";
import { fetchMembershipsThunk } from "../../../../middleware/membership/membership.thunk";
import { setPackagesList, patchPaymentStatus } from "../../../../store/schedulerSlice";
import { postPaymentThunk } from "../../../../middleware/booking/payment.thunk";
import { checkoutBookingThunk } from "../../../../middleware/booking/booking.thunk";
import { fetchReceiptPdfThunk } from "../../../../middleware/booking/booking.thunk";
import { downloadBlob } from "../../../../utils/downloadBlob";
import { fetchSettingsThunk } from "../../../../middleware/setting/setting.thunk";
import { getActiveTaxes } from "../../../settings/utils/taxSettings";
import { getTaxModuleConfig } from "../../../settings/utils/taxModuleSettings";
import { getPaperProfile } from "../../../settings/utils/printSettings";
import { getRewardPointsConfig } from "../../../settings/utils/rewardPointsSettings";
import { getReferralConfig } from "../../../settings/utils/referralSettings";
import { getServiceReminderPresets } from "../../../catalog/utils/serviceReminderSettings";
import { isRealId } from "../../utils/paymentUtils";
import { normalizePaymentStatus } from "../../utils/bookingMapper";
import { isPackageExpired } from "../../utils/packageStatus";
import { sanitizeDecimalInput } from "../../utils/lineItemInput";
import type { TotalsResult } from "../../utils/totalsUtils";
import api from "../../../../services/api/axios";
import { PRICING, PAYMENT } from "../../../../services/api/endpoints";
import { computePointsEarned, computeEWalletCredit, computeMaxWalletUsable, computeMaxReferralRedeemable, EWALLET_REDEEM_MINIMUM } from "../../utils/paymentUtils";
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
import EwalletTopupModal from "../../../clients/components/EwalletTopupModal";
import StaffTipsModal, { type StaffTipEntry } from "./StaffTipsModal";
import { ConfirmDialog } from "../../../../components/ui";
import PackageCreateForm from "../../../../components/packages/PackageCreateForm";
import type { ClientSearchResult } from "../../../clients/components/ClientSearchInput";
import { customPackageLineItemToPackageRow } from "../../utils/customPackageItem";
import { PaymentPanel }  from "./PaymentPanel";
import { computeSplitTotal } from "../../../../components/shared/PaymentMethodPicker";
import TotalsPanel       from "./TotalsPanel";
import PaymentButton     from "../shared/PaymentButton";
import { printReceipt } from "../../utils/receipt";
import { buildClientWhatsAppLink } from "../../../../utils/whatsapp";
import { store }         from "../../../../store/store";
import { useFocusTrap }  from "../../../../hooks/useFocusTrap";
import "../../styles/AppointmentModal.scss";

// The products slice holds ONE shared list — productsSlice replaces
// `state.items` wholesale on every fetch — and it feeds both the "+ Product"
// picker and the Consumable Usage modal's Total/Remaining Stock lookup (see
// productStockById in ServiceRow.tsx). All three fetch sites below share the
// `prodRequested` guard, so whichever fires first decides what's cached for
// everything.
//
// Called with no params, the backend applies its own `limit ?? 20` ordered by
// created_at DESC (products.repository.ts), so only the 20 most recently
// created products ever had a known stock figure. Every consumable outside
// that window showed "—" and "Stock Unknown" in the usage modal no matter how
// carefully its stock was set up in the Consumables section.
//
// Deliberately NOT narrowed to product_type=consumable: it's the same shared
// list the retail picker reads, and filtering it here would empty that picker.
const PRODUCT_FETCH_PAGE_SIZE = 200;

const STAFF_ALERT_MAX_LENGTH = 100;
const NOTES_MAX_LENGTH = 200;

import type {
  Booking, Client, ClientStats,
  ServiceItem, PackageItem, ProductItem, MembershipItem,
  DiscountType, DiscountBucket, DiscountScope, SplitEntry,
  PaymentMethodSelection, PosPaymentRequest, CreatePosPaymentPayload,
} from "../../types";
import { POS_MACHINE_METHOD, SINGLE_METHODS } from "../../types";

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
  /** Pre-add this custom package (built via the standalone Catalogue "Sell
   *  Package" form — PackageCreateForm's lineItemMode) as soon as this modal
   *  opens. Same shape "+ Sell Package" itself builds inline; this is just
   *  the same handoff arriving from a page navigation (QuickSalePage.tsx)
   *  instead of an already-open bill. Applied once, on mount only. */
  initialCustomPackageItem?: PackageItem;
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

// Client-side mirror of resolveCategoryRestriction/resolveItemRestriction
// (client-memberships.repository.ts) — pools every active, spendable
// membership's category/item restriction for one bucket into a single
// "what's eligible" set, the same "unrestricted only when a covering
// membership has BOTH lists empty" rule the backend uses. Used ONLY to seed
// membershipEligibleTotal's default/max estimate below — the actual
// per-row split staff and the bill total see once applied still comes
// straight from the server (rowMembershipWalletPreview), never re-derived
// locally. Without this, a wallet restricted to one specific service (e.g.
// "Hair Cut" only) offered its FULL eligible amount against every service
// row on the bill regardless of restriction, defaulting the input higher
// than the wallet could actually cover.
function poolMembershipRestriction(
  memberships: { appliesTo: string; serviceCategoryIds?: string[]; productCategoryIds?: string[]; serviceIds?: string[]; productIds?: string[] }[],
  bucket: "service" | "product",
): { categoryIds: string[] | null; itemIds: string[] | null } {
  const excludeSide = bucket === "service" ? "products" : "services";
  const covering = memberships.filter((m) => m.appliesTo !== excludeSide);
  const catsOf = (m: typeof covering[number]) => (bucket === "service" ? m.serviceCategoryIds : m.productCategoryIds) ?? [];
  const itemsOf = (m: typeof covering[number]) => (bucket === "service" ? m.serviceIds : m.productIds) ?? [];
  if (covering.some((m) => !catsOf(m).length && !itemsOf(m).length)) return { categoryIds: null, itemIds: null };
  return {
    categoryIds: Array.from(new Set(covering.flatMap(catsOf))),
    itemIds: Array.from(new Set(covering.flatMap(itemsOf))),
  };
}

// Mirrors matchesCategoryRestriction (pricing.service.ts/payments.service.ts)
// — null/empty categoryIds+itemIds means unrestricted. rowItemId falls back
// the same way the backend's row-id normalization now does (see
// pricing.service.ts's serviceRows/productRows itemId fallback) — a freshly
// picked, unsaved row's catalog id lives under `id`, not service_id/productId.
function rowMatchesMembershipRestriction(
  categoryId: string | undefined,
  rowItemId: string | undefined,
  categoryIds: string[] | null,
  itemIds: string[] | null,
): boolean {
  if (!categoryIds?.length && !itemIds?.length) return true;
  return (!!categoryIds?.length && !!categoryId && categoryIds.includes(categoryId))
      || (!!itemIds?.length && !!rowItemId && itemIds.includes(rowItemId));
}

export const AppointmentModal: React.FC<Props> = ({
  isOpen, onClose, salonId,
  existingBooking, defaultDate, defaultTime, defaultStaffId,
  defaultClientId, defaultClientName, defaultClientPhone,
  onRefresh, onCancelBooking, onDeleteBooking, quickSale,
  initialCustomPackageItem,
}) => {
  const dispatch = useAppDispatch();
  const { currencySymbol, formatAmount } = useCurrency();
  const { can } = usePermissions();
  // This modal doubles as Quick Sale's checkout screen (quickSale===true) —
  // that flow is already fully gated by its own create_sales permission at
  // the route level (PermissionGuard on /dashboard/sales/quick), so
  // re-checking the Calendar-specific edit_appointment/view_payment_details
  // keys there would incorrectly double-gate an unrelated permission.
  // Cancel/Delete aren't reachable from Quick Sale at all (no such action
  // exists there), so those two don't need the same exception.
  //
  // Recording/collecting payment (any Save & Pay / Continue to Payment /
  // Pay button below, whether on a brand-new or an existing appointment) is
  // gated by edit_appointment (Edit & Payment Appointment), not
  // create_appointment (Create Booking Appointment) — the two were split
  // apart so booking a new appointment never implies payment access
  // (Calendar permissions rename ticket). create_appointment alone lets a
  // staff member save a new Booked appointment with no payment step at all.
  const canRecordPaymentPerm = quickSale || can("edit_appointment");
  const canViewPaymentDetailsPerm = quickSale || can("view_payment_details");
  const canEditPerm = quickSale || can("edit_appointment");
  const canCancelPerm = can("cancel_appointment");
  const canDeletePerm = can("delete_appointment");
  const denyPerm = (key: string) => dispatch(showPermissionDenied(
    `Your account does not have the "${key}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
  ));

  // Keyboard accessibility: trap Tab inside the drawer, Escape closes it,
  // focus returns to whatever triggered it. Not a modal when embedded as a
  // full page (quickSale), so skip the trap there.
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen && !quickSale, onClose);

  // Always fetch services + clients when modal opens
  useServices(salonId);

  // Active taxes from Tax Mapping settings, for bill calculation. Settings
  // change rarely — skip refetching if this session already has them, so
  // a Quick Sale doesn't silently re-download them after every single sale
  // (the modal remounts per sale via QuickSalePage's key={saleKey}). This is
  // also the root cause a prior spinner-loop incident's own comment
  // documented but never fixed — see PermissionGuard.tsx.
  const settingItems = useAppSelector((s) => s.setting.items);
  useEffect(() => {
    if (settingItems.length === 0) dispatch(fetchSettingsThunk());
  }, [dispatch, settingItems.length]);
  const activeTaxes  = useMemo(() => getActiveTaxes(settingItems), [settingItems]);
  const showTaxBreakupOnInvoice = useMemo(() => getTaxModuleConfig(settingItems).show_breakup_on_invoice, [settingItems]);
  // Salon-wide Print Settings (paper size/margins) — resolved once and passed
  // into every printReceipt() call from this screen.
  const paperProfile = useMemo(() => getPaperProfile(settingItems), [settingItems]);
  const rewardPointsConfig = useMemo(() => getRewardPointsConfig(settingItems), [settingItems]);
  const referralConfig = useMemo(() => getReferralConfig(settingItems), [settingItems]);
  // Configurable dropdown options for the per-service redo reminder (Catalog
  // → Services → Options → "Service reminder options") — threaded down to
  // ServicesPanel/ServiceRow so staff pick from these instead of typing a
  // number every time.
  const reminderPresets = useMemo(() => getServiceReminderPresets(settingItems), [settingItems]);

  // ── Lazy on-demand fetching ───────────────────────────────────────────────
  const [triggerPackages, { data: packagesData }]       = useLazyListPackagesQuery();
  const [triggerTemplates, { data: packageTemplatesRaw }] = useLazyListPackageTemplatesQuery();
  const pkgRequested  = useRef(false);
  const prodRequested = useRef(false);
  const memRequested  = useRef(false);
  // Catalog service lookup (id/name/price) — needed to resolve a picked
  // package's individual services down to a real catalogServiceId + price
  // for the "+ Package" row's per-service scheduling breakdown (a template's
  // own services[] carries name/sessions/price but no catalog id; a catalog
  // "combo" package carries only serviceIds). Fetched on-demand, same as
  // packages/products/memberships above — never eagerly on mount.
  const { services: catalogServiceOptionsRaw, fetchServices: fetchCatalogServices } = useCatalogServices();
  const catalogServiceOptions = useMemo(
    () => catalogServiceOptionsRaw.map((s: any) => ({ id: String(s.id), name: s.name, price: parseFloat(String(s.price)) || 0 })),
    [catalogServiceOptionsRaw],
  );
  const svcCatalogRequested = useRef(false);

  // In edit mode, pre-fetch data for item types that already exist on the booking.
  // Packages/memberships are catalog reference data (name/price only, no live
  // mutable fields) — safe to treat as session-cached, so the ref guard is
  // supplemented with a Redux-state check: the ref alone resets on every Quick
  // Sale remount (key={saleKey}) and would otherwise re-fetch after every sale
  // even though the catalog was already loaded moments earlier.
  useEffect(() => {
    if (existingBooking?.packageItems?.length && !pkgRequested.current && availablePackages.length === 0) {
      pkgRequested.current = true;
      triggerPackages({ status: "Active" });
      triggerTemplates();
    }
    if ((existingBooking as any)?.productItems?.length && !prodRequested.current && availableProducts.length === 0) {
      prodRequested.current = true;
      // searchProductsThunk (POST /products/search), not fetchProductsThunk
      // (GET /products) — the GET route's validator caps pageSize at 100 and
      // rejects anything above with "pageSize must not exceed 100", which
      // PRODUCT_FETCH_PAGE_SIZE's 200 always tripped. The POST route runs the
      // same query with a 500 cap instead, with no search term required.
      dispatch(searchProductsThunk({ pageSize: PRODUCT_FETCH_PAGE_SIZE }));
    }
    if ((existingBooking as any)?.membershipItems?.length && !memRequested.current && availableMemberships.length === 0) {
      memRequested.current = true;
      dispatch(fetchMembershipsThunk());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Map package API data → scheduler packagesList when it arrives
  useEffect(() => {
    const templates = packageTemplatesRaw ?? [];
    // Row price shown/billed in Quick Sale and Calendar's "+Package" must be
    // the actual sell price (basePrice minus its own discount) — raw
    // basePrice silently dropped any discount configured on the
    // package/template, overcharging the client relative to what
    // PackageCreateForm/PackageDashboard treat as that package's real price.
    const fromCatalog = (packagesData?.items || []).map((p: any) => {
      const base = p.basePrice || 0;
      const discountAmt = p.discountType === "fixed"
        ? (p.discountValue || 0)
        : base * ((p.discountValue || 0) / 100);
      return {
        id: String(p.id || ""), name: p.name || "",
        price: Math.max(0, parseFloat((base - discountAmt).toFixed(2))),
        // Real catalog service ids — combo packages have no per-service
        // name/price/session breakdown of their own (unlike templates), so the
        // "+ Package" row's scheduling UI resolves name/price for each of
        // these against the loaded services catalog (see PackageRow).
        services: (p.serviceIds ?? []) as string[],
        // Catalog packages are the only ones with a description column; they
        // carry no per-service session data, hence no serviceDetails.
        description: typeof p.description === "string" ? p.description : undefined,
      };
    });
    // A template with a real (non-"never expires") expiry of 0 days or less is
    // mis-configured — any instance purchased from it today would be born
    // already expired (expiry_date = purchase date + expiryDays). Never offer
    // it as a purchase option in Quick Sale/Calendar's "+Package" row.
    const fromTemplates = templates
      .filter((t: any) => t.neverExpires || t.expiryDays == null || t.expiryDays > 0)
      .map((t: any) => ({
        id: String(t.id || ""), name: t.name || "",
        price: Math.max(0, parseFloat(((t.basePrice || 0) - (t.discount || 0)).toFixed(2))),
        services: (t.services || []).map((s: any) => s.serviceName),
        description: typeof t.description === "string" ? t.description : undefined,
        // Shown alongside the description (older templates have none), so the
        // panel always says what the package actually contains: each service
        // with its session count, plus the expiry.
        serviceDetails: (t.services || []).map((s: any) => ({
          name: s.serviceName || "—",
          sessions: Number(s.totalSessions) || 0,
          // Template services are free-text (no catalog id of their own) —
          // price is still real, carried straight from the template row, so
          // the "+ Package" row's per-service schedule breakdown can total
          // correctly even before/without a catalog id match.
          price: Number(s.price) || 0,
        })),
        expiryDays: t.expiryDays ?? null,
        neverExpires: !!t.neverExpires,
        // Dropped here before — the "+ Package" row's schedule breakdown had
        // no way to know a cap even existed, so every included service was
        // schedulable with no limit at all regardless of what the template
        // was actually sold to allow (see PackageRow's cap check).
        expireAfterServices: t.expireAfterServices ?? null,
      }));
    const templateNames = new Set(fromTemplates.map((t: any) => t.name.toLowerCase()));
    const merged = [...fromTemplates, ...fromCatalog.filter((c: any) => !templateNames.has(c.name.toLowerCase()))];
    if (merged.length > 0) dispatch(setPackagesList(merged));
  }, [packagesData, packageTemplatesRaw, dispatch]);

  const availablePackages    = useAppSelector(selectPackagesList);
  // Pure-consumable products (used only inside a service's recipe) aren't
  // sellable on their own — this list feeds ONLY the "+ Product" retail row
  // picker, so it's filtered to retail/both here. ServiceRow.tsx's
  // Consumables panel reads the unfiltered schedulerContext.productsList
  // directly for its own stock lookups, so this filter doesn't touch that.
  const productsFromSelector = useAppSelector(selectProductsList);
  // Memoized — without this, the .filter() below allocated a brand-new array
  // on every render (every keystroke anywhere in the modal), which defeated
  // ServicesPanel.tsx's own stableProductItems useMemo one layer down (it
  // depends on this array's reference staying stable, per its own comment).
  const availableProducts = useMemo(
    () => productsFromSelector.filter((p: any) => !p.productType || p.productType === "retail" || p.productType === "both"),
    [productsFromSelector],
  );
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

  const [showTopupModal, setShowTopupModal] = useState(false);
  // "+ Sell Package" — opens the same Custom Package creation form the
  // standalone Packages page uses, so staff can sell this bill's client a
  // brand-new package on the spot instead of only picking from an existing
  // one via "+ Package". A separate transaction from this bill, same as
  // eWallet top-up above — it doesn't add a line item here.
  const [showSellPackageModal, setShowSellPackageModal] = useState(false);
  // "Split by staff" — opens a small popup listing every staff member
  // currently assigned to a row on this bill, each with their own tip
  // amount, similar interaction to the two modals above.
  const [showStaffTipsModal, setShowStaffTipsModal] = useState(false);
  // "Delete Appointment" is a true hard delete (see onDeleteBooking's
  // callers) and only ever offered on a paid/partial bill — a stray
  // misclick on the three-dot menu shouldn't be able to fire it straight
  // away, so it goes through this confirm step first.
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Bumped after a successful top-up to force ClientPanel to refetch this
  // client's real balance from the backend — the eWallet figure on the card
  // is driven by ClientPanel's own useClientDetails() fetch, not clientStats.
  const [clientRefreshKey, setClientRefreshKey] = useState(0);
  const isSellableClient = !!selectedClient && selectedClient.id !== "walk-in";
  // PackageCreateForm expects ClientSearchResult's first_name/last_name
  // shape, not this modal's own lightweight Client (name/phone/email) —
  // converted once here rather than changing either type to match the other.
  const packageFormClient: ClientSearchResult | null = isSellableClient
    ? { id: selectedClient!.id, first_name: selectedClient!.name, last_name: "", phone_number: selectedClient!.phone, email: selectedClient!.email }
    : null;

  // ── Date ─────────────────────────────────────────────────────────────────
  // An existing booking's OWN date wins over both the caller's defaultDate and
  // today. This used to read `defaultDate || today`, which relied on every
  // caller remembering to pass it: Scheduler does (`editingBooking?.date ||
  // currentDate`), but AppointmentDetailModal — the drawer opened from the
  // Sales Summary report and the calendar chip — passes existingBooking and no
  // defaultDate, so editing a past bill showed TODAY in the date field.
  //
  // That was cosmetic until sales re-dating landed (updateDateForAppointment,
  // SCRUM-1547): now scheduled_at is compared against the stored value on
  // save, so opening an old bill and pressing Update Appointment would move
  // the appointment to today AND drag its sale, sale_items and payments with
  // it — silently re-dating the bill in every sales report. Deriving it here
  // rather than fixing the one caller means a future caller can't reintroduce
  // it.
  const [calDate, setCalDate] = useState(
    existingBooking?.date || defaultDate || new Date().toISOString().slice(0, 10)
  );

  // ── Line items ───────────────────────────────────────────────────────────
  const [serviceRows, setServiceRows]       = useState<ServiceItem[]>(() =>
    existingBooking
      ? (existingBooking.services ?? [])
      : [emptyService(defaultStaffId, defaultTime)]
  );
  const [packageRows, setPackageRows]       = useState<PackageItem[]>(() => {
    const base = existingBooking?.packageItems ?? [];
    return initialCustomPackageItem ? [...base, initialCustomPackageItem] : base;
  });
  const [productRows, setProductRows]       = useState<ProductItem[]>((existingBooking as any)?.productItems ?? []);
  const [membershipRows, setMembershipRows] = useState<MembershipItem[]>((existingBooking as any)?.membershipItems ?? []);

  // Consumables panel (ServiceRow.tsx) shows Available/Remaining Stock from
  // schedulerContext.productsList — but that list was previously only ever
  // fetched for retail Product rows (or an existing booking that already had
  // some), never just from picking a service with a consumables recipe, so a
  // brand-new appointment/Quick Sale with only services left it empty and
  // every consumable showed "—"/Out of Stock regardless of real stock.
  // Keyed on whether THIS row's consumables are actually present in the cached
  // list, not on whether the list is merely non-empty.
  //
  // The old guard was `availableProducts.length > 0`, which is wrong twice
  // over: availableProducts is the RETAIL-filtered list (consumables are
  // excluded from it by construction, see its useMemo above), and a non-empty
  // list is not a complete one. Any earlier products fetch in the session
  // leaves a partial cache behind — the Products page fetches a page at a
  // time, and ConsumablesTab searches with pageSize 20 — so Quick Sale would
  // see "products already loaded", skip the fetch, and leave a consumable
  // that simply wasn't in that slice with no stock figure at all. That's the
  // "I set the stock but the calendar still shows —" report: nothing to do
  // with how the consumable was configured.
  useEffect(() => {
    if (prodRequested.current) return;
    const neededIds = serviceRows
      .flatMap((r) => (r.consumables ?? []).map((c) => String(c.productId)))
      .filter(Boolean);
    if (neededIds.length === 0) return;
    const cachedIds = new Set(productsFromSelector.map((p: any) => String(p.id)));
    if (neededIds.every((id) => cachedIds.has(id))) return;
    prodRequested.current = true;
    // See the other dispatch(searchProductsThunk(...)) above for why this
    // isn't fetchProductsThunk — same 100-row GET cap would reject pageSize 200.
    dispatch(searchProductsThunk({ pageSize: PRODUCT_FETCH_PAGE_SIZE }));
  }, [serviceRows, productsFromSelector, dispatch]);

  // Actual-qty edits for each row's consumables — deliberately a SIBLING
  // state, never merged into serviceRows itself. serviceRows is a dependency
  // of the calculate-totals effect below; consumables never affect billing,
  // so an Actual Qty edit must never be able to re-trigger that request.
  // Keyed the same way every other per-row preview map in this file already
  // is (row tempId, falling back to array index — see ServicesPanel.tsx),
  // merged into a save-only copy of serviceRows in buildSavePayload().
  const [consumableActuals, setConsumableActuals] = useState<Record<string, Record<string, number>>>(() => {
    const seed: Record<string, Record<string, number>> = {};
    (existingBooking?.services ?? []).forEach((row: any, i: number) => {
      const tempId = row.tempId || String(i);
      (row.consumables ?? []).forEach((c: any) => {
        if (c.actualQty === undefined || c.actualQty === null) return;
        seed[tempId] = seed[tempId] || {};
        seed[tempId][c.productId] = Number(c.actualQty);
      });
    });
    return seed;
  });

  const handleConsumableActualChange = useCallback((rowKey: string, productId: string, actualQty: number) => {
    setConsumableActuals((prev) => ({
      ...prev,
      [rowKey]: { ...prev[rowKey], [productId]: actualQty },
    }));
  }, []);

  // ── Charges / Discounts ───────────────────────────────────────────────────
  const [discountType, setDiscountType]   = useState<DiscountType>(existingBooking?.discountType || "Percentage (%)");
  const [discountValue, setDiscountValue] = useState(existingBooking?.discount ?? 0);
  const [exCharges, setExCharges]         = useState(existingBooking?.exCharges ?? 0);
  // Always record-only, passed straight to staff — there was previously an
  // "Add Tip to Salon" toggle that let it opt into Grand Total/revenue; that
  // control has been removed, so tip never affects a total (see
  // totalsUtils.ts's withCharges).
  const [tip, setTip]                     = useState(existingBooking?.tipAmount ?? 0);
  // Per-staff tip entries, entered via StaffTipsModal (the sole way to add a
  // tip now — see onStaffTips below). `tip` stays the one number the pricing
  // engine/receipt/totals actually use; this is purely attribution ("who got
  // what") kept in sync with it (see handleSaveStaffTips).
  const [tipBreakdown, setTipBreakdown]   = useState<StaffTipEntry[]>((existingBooking as any)?.tipBreakdown ?? []);

  // Every distinct staff member currently assigned to a row on this bill —
  // what StaffTipsModal offers a tip field for. ServiceItem carries its own
  // staff name; package/product/membership rows only carry staffId, so
  // those fall back to a schedulerStaff lookup.
  const involvedStaff = useMemo(() => {
    const byId = new Map<string, { staffName: string; items: { label: string; amount: number }[] }>();
    const add = (staffId: string | undefined | null, staffName: string | undefined | null, label: string, amount: number) => {
      if (!staffId) return;
      const resolvedName = staffName || schedulerStaff.find((st: any) => String(st.id) === String(staffId))?.name || "Staff";
      const entry = byId.get(staffId);
      if (entry) entry.items.push({ label, amount });
      else byId.set(staffId, { staffName: resolvedName, items: [{ label, amount }] });
    };
    serviceRows.forEach((r: any) => add(r.staffId, r.staff, r.service || "Service", Number(r.total) || 0));
    packageRows.forEach((r: any) => add(r.staffId, undefined, r.packageName || "Package", Number(r.total) || 0));
    productRows.forEach((r: any) => add(r.staffId, undefined, r.productName || "Product", Number(r.total) || 0));
    membershipRows.forEach((r: any) => add(r.staffId, undefined, r.membershipName || "Membership", Number(r.total) || 0));
    return Array.from(byId.entries()).map(([staffId, v]) => ({ staffId, staffName: v.staffName, items: v.items }));
  }, [serviceRows, packageRows, productRows, membershipRows, schedulerStaff]);

  const handleSaveStaffTips = useCallback((entries: StaffTipEntry[]) => {
    setTipBreakdown(entries);
    setTip(entries.reduce((sum, e) => sum + e.amount, 0));
  }, []);

  // A staff-tip split references specific staffIds, but rows can be removed
  // (or reassigned) AFTER the split was saved — without this, a departed
  // staff member's share silently kept counting toward the Tip total forever
  // (e.g. split ₹200×3=₹600, remove one staff row, bill still showed ₹600).
  // Drop any entry whose staffId is no longer on the bill and shrink `tip`
  // to match, the moment the row list changes.
  useEffect(() => {
    if (tipBreakdown.length === 0) return;
    const validIds = new Set(involvedStaff.map((s) => s.staffId));
    const stillValid = tipBreakdown.filter((t) => validIds.has(t.staffId));
    if (stillValid.length !== tipBreakdown.length) {
      setTipBreakdown(stillValid);
      setTip(stillValid.reduce((sum, e) => sum + e.amount, 0));
    }
  }, [involvedStaff, tipBreakdown]);

  // tipBreakdown itself (the saved/persisted shape) deliberately doesn't
  // carry each staff member's service/amount — that's already owned by the
  // bill's own rows and would just go stale if duplicated onto a separate
  // saved field. This joins the two live, for the two places that display
  // the full Staff/Service/Amount/Tip breakdown (the compact summary below
  // and TotalsPanel), so both read from one derivation instead of two.
  const tipBreakdownWithItems = useMemo(
    () => tipBreakdown.map((t) => ({
      ...t,
      items: involvedStaff.find((s) => s.staffId === t.staffId)?.items ?? [],
    })),
    [tipBreakdown, involvedStaff],
  );
  const [focusedField, setFocusedField]   = useState<"exCharges" | "discountValue" | null>(null);
  const [discountValueWarning, setDiscountValueWarning] = useState<string | null>(null);
  // Raw text for the Bill Discount / Ex Charges / Tip fields WHILE FOCUSED.
  // These can't render their numeric state directly: typing "2." parses to 2,
  // and re-rendering the input from that number wipes the dot before the next
  // keystroke, so a decimal like 2.5 could never be typed at all. Only the
  // focused field reads its text here — blurred fields still display the
  // number, so nothing else has to stay in sync.
  const [decimalDraft, setDecimalDraft] = useState("");
  // Which buckets the Bill Discount applies to. New bills start with all four
  // ticked — the discount means the whole bill unless staff say otherwise.
  //
  // A REOPENED pre-feature bill stays `undefined`, and must: undefined is the
  // legacy-scope signal, and legacy is not reproducible as a bucket list (its
  // flat amount is uncapped, an explicit selection's is not). Seeding the
  // state with ["service","packages","membership"] instead would look
  // equivalent but silently re-price a legacy flat discount the moment the
  // modal opened — e.g. a ₹1500 flat on a ₹1000-service + ₹1000-product bill
  // would clamp to ₹1000 and the total would jump ₹500 with nobody touching
  // anything. It only becomes a concrete array once staff actually tick a box,
  // which is a deliberate re-scoping and correctly re-prices from there.
  const [discountAppliesTo, setDiscountAppliesTo] = useState<DiscountScope[] | undefined>(
    () => existingBooking
      ? existingBooking.discountAppliesTo
      : ["service", "packages", "product", "membership"]
  );
  // What the dropdown should SHOW while the state is still legacy/undefined —
  // the buckets legacy scope actually discounts.
  const effectiveDiscountBuckets: DiscountScope[] =
    discountAppliesTo ?? ["service", "packages", "membership"];
  const wholeBillDiscountScope = effectiveDiscountBuckets.includes("bill");

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
  const [singleMethod, setSingleMethod]         = useState<PaymentMethodSelection | null>(null);
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
  const handleSelectSingleMethod = useCallback((m: PaymentMethodSelection) => {
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
  const { save: saveAppointment, isSaving, error: saveError, apiAppointmentId } = useAppointment();
  // clientRefreshKey exists specifically to make useClientDetails() below
  // refetch (its ONE dependency for that), but nothing ever bumped it — so a
  // saved Notes/Staff Alert edit never showed up in the client stat card
  // popup unless the modal was closed and reopened. Wrapping every save call
  // site here (there are several — handleSaveAndPay, handleUpdate, etc., all
  // of which already call `save`) means none of them need to change.
  const save = useCallback(async (payload: Parameters<typeof saveAppointment>[0]) => {
    const id = await saveAppointment(payload);
    if (id) setClientRefreshKey((k) => k + 1);
    return id;
  }, [saveAppointment]);
  const { completePayment, isProcessing, payError, paymentOverlay } = usePayment();
  const coupon = useCoupon(salonId);
  const referral = useReferral();
  // Payment Machine (POS terminal) state — hooks/derived values that don't
  // depend on printClientExtras/other consts declared further down. The
  // callbacks that DO (runPosSuccessTail, openPosPaymentForAppointment,
  // handlePosModalClose) live just above handlePay instead, so their
  // dependency arrays don't reference a const before its declaration.
  // Deferred until showPaymentSection actually flips true — that's the real
  // "user is heading toward Pay" moment for BOTH flows: the regular booking
  // modal's own Continue-to-Payment click, and Quick Sale's "Add services,
  // then Continue to Payment" step (Quick Sale is one screen, but it still
  // has a client/services phase before payment — quickSale alone doesn't
  // mean payment is imminent). Without this, Quick Sale fired both POS GETs
  // on every page refresh/mount, before the user had picked anything.
  const { enabledProvider: posProvider, terminals: posTerminals } = usePosSettings(showPaymentSection);
  const posMethodOptions = useMemo(
    () => (posProvider ? [...SINGLE_METHODS, POS_MACHINE_METHOD] : undefined),
    [posProvider]
  );
  const [posCreatePayload, setPosCreatePayload] = useState<CreatePosPaymentPayload | null>(null);
  const [posModalOpen, setPosModalOpen] = useState(false);
  const posSucceededRef = useRef(false);
  const posOnSuccessRef = useRef<((request: PosPaymentRequest) => void) | null>(null);
  const [completePackageSession] = useCompleteClientPackageSessionMutation();

  // Single consolidated fetch (POST /clients/:id/details) covering profile,
  // packages, memberships, history, and loyalty eligibility for the selected
  // client — replaces what used to be 4 independent hooks/queries here
  // (useClientDetails-in-ClientPanel, useListClientPackagesQuery,
  // useClientMembershipWallet, useLoyaltyEligibility) each firing their own
  // request for the same client. The full result is handed to ClientPanel
  // below as `clientDetailsResult` so it renders from this same call instead
  // of running its own independent useClientDetails fetch.
  const clientIdForPkg = selectedClient?.id && selectedClient.id !== "walk-in" ? selectedClient.id : undefined;
  const clientDetailsResult = useClientDetails(clientIdForPkg, clientRefreshKey);
  const { details: clientDetailsForModal } = clientDetailsResult;
  const clientPkgsData = useMemo(
    () => ({ items: (clientDetailsForModal as any)?.packages ?? [] }),
    [clientDetailsForModal],
  );
  // Guard client-side against a package whose expiry date has passed but
  // hasn't been flagged as such server-side yet — an expired package must
  // never be selectable/applicable.
  // Sorted soonest-expiry-first (packages with no expiry sort last, since
  // there's no urgency to use them up) — when a client owns more than one
  // active package covering the same service, this makes the one closest to
  // expiring the one actually picked/consumed first (see firstActivePkg's
  // display below and markPackageSessions' redemption loop), instead of
  // whatever arbitrary order the API happened to return them in.
  const nonExpiredPackages = useMemo(
    () => (clientPkgsData?.items ?? [])
      .filter((pkg: any) => pkg.status === "Active" && !isPackageExpired(pkg.expiryDate))
      .sort((a: any, b: any) => {
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
  // Value is a list rather than a flat sum — each entry keeps its owning
  // package id so perRowCoveredRemaining below can also weigh it against
  // that package's own aggregate cap (see packageBudgets), not just this
  // one service's own remaining count.
  // A package's own aggregate "Expires after this many services" cap (see
  // PackageCreateForm.tsx) limits how many TOTAL sessions across ALL its
  // services can ever be marked covered — independent of any one service's
  // own remaining count. Without this, a package capped at 5 but with a
  // service that individually still shows 8 "remaining" would let a single
  // visit mark all 8 as covered. Uncapped packages get Infinity (no extra
  // limit beyond each service's own remainingSessions). Declared before
  // coveredServices below, which now reads it too.
  const packageBudgets = useMemo(() => {
    const map = new Map<string, number>();
    nonExpiredPackages.forEach((pkg: any) => {
      if (pkg.expireAfterServices == null) {
        map.set(pkg.id, Infinity);
      } else {
        const completed = pkg.services.reduce((sum: number, s: any) => sum + s.completedSessions, 0);
        map.set(pkg.id, Math.max(0, pkg.expireAfterServices - completed));
      }
    });
    return map;
  }, [nonExpiredPackages]);

  const coveredServices = useMemo(() => {
    const map = new Map<string, Array<{ packageId: string; remaining: number }>>();
    nonExpiredPackages.forEach((pkg: any) => {
      // A package that's already spent its own cap has nothing left to
      // offer from ANY of its services, even ones that individually still
      // show sessions unused — e.g. a 12-service package capped at 4 stops
      // being selectable once 4 total are used, not just once each
      // individual service's own count hits zero (see packageBudgets above).
      if ((packageBudgets.get(pkg.id) ?? Infinity) <= 0) return;
      pkg.services.forEach((svc: any) => {
        if (svc.remainingSessions > 0) {
          const key = svc.catalogServiceId ?? `name:${svc.serviceName.toLowerCase()}`;
          const arr = map.get(key) ?? [];
          arr.push({ packageId: pkg.id, remaining: svc.remainingSessions });
          map.set(key, arr);
        }
      });
    });
    return map;
  }, [nonExpiredPackages, packageBudgets]);

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
  const EMPTY_COVERED = useMemo(() => new Map<string, Array<{ packageId: string; remaining: number }>>(), []);
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
    // Working copies — a service-key pool (list of {packageId, remaining},
    // priority order = nonExpiredPackages' soonest-expiry-first) AND each
    // package's own aggregate budget, both consumed together as rows below
    // are allocated. A unit can only be taken from a package that still has
    // BOTH remaining sessions on that specific service AND remaining budget
    // under its own "Expires after this many services" cap (if any).
    const budgetPool = new Map(packageBudgets);
    const servicePool = new Map<string, Array<{ packageId: string; remaining: number }>>();
    effectiveCoveredServices.forEach((entries, key) => servicePool.set(key, entries.map((e) => ({ ...e }))));

    const perRow = new Map<string, number>();
    serviceRows.forEach((row, idx) => {
      if (!row.service.trim()) return;
      // A row that already carries an exact clientPackageId link (created by
      // the package-sale scheduling feature) must never enter this FUZZY
      // coverage pool — it's already permanently ₹0 from creation and gets
      // redeemed exactly, server-side, on checkout (see
      // clientPackagesService.redeemForAppointmentIfScheduled). Pooling it
      // here too would let markPackageSessions() fire a SECOND, fuzzy
      // completePackageSession call for the same visit, double-deducting the
      // package — and would wrongly consume a pool slot a genuinely
      // fuzzy-covered row elsewhere on this bill might need.
      if (row.clientPackageId) return;
      // service_id first — on a row loaded from a saved appointment, row.id
      // is the appointment-service ROW id (assigned server-side on save) and
      // only service_id is the actual catalog service; a freshly-picked,
      // not-yet-saved row has no row id yet so its .id holds the catalog id
      // directly (see ServiceRow.tsx's onChange(..., "id", service.id)).
      // Reading row.id alone here matched nothing in servicePool (keyed by
      // real catalog ids) for any RELOADED row, silently hiding its package
      // coverage until the row was removed and re-picked from scratch — same
      // bug ServiceRow.tsx's confirmAddConsumable/reminder patch already hit
      // and fixed for consumables.
      const rowCatalogId = (row as any).service_id || (row as any).id || null;
      const nameKey = `name:${row.service.toLowerCase()}`;
      const key = (rowCatalogId && servicePool.has(rowCatalogId)) ? rowCatalogId : nameKey;
      const entries = servicePool.get(key);
      if (!entries || entries.length === 0) return;

      const tempId = (row as any).tempId || String(idx);
      let need = Number(row.qty) || 1;
      let used = 0;
      for (const entry of entries) {
        if (need <= 0) break;
        const budget = budgetPool.get(entry.packageId) ?? 0;
        const take = Math.min(entry.remaining, budget, need);
        if (take <= 0) continue;
        entry.remaining -= take;
        budgetPool.set(entry.packageId, budget - take);
        used += take;
        need -= take;
      }
      if (used > 0) perRow.set(tempId, used);
    });
    return perRow;
  }, [effectiveCoveredServices, packageBudgets, serviceRows]);

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
  const allClientMemberships = useMemo(
    () => ((clientDetailsForModal as any)?.memberships ?? []) as any[],
    [clientDetailsForModal],
  );
  // Active + not-yet-expired — same filter useClientMembershipWallet used to
  // apply itself (guards against a membership whose expiry date has passed
  // but hasn't been flagged as such server-side yet; an expired membership
  // must never contribute wallet balance to a booking).
  const clientMemberships = useMemo(
    () => allClientMemberships.filter((m: any) => m.status === "active" && !isPackageExpired(m.expiresAt)),
    [allClientMemberships],
  );
  const primaryMembership = useMemo(
    () => clientMemberships.reduce((best: any, m: any) => {
      if (Number(m.membershipWalletBalance) <= 0) return best;
      if (!best || Number(m.membershipWalletBalance) > Number(best.membershipWalletBalance)) return m;
      return best;
    }, null),
    [clientMemberships],
  );
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

  // Restriction pool (category ids ∪ item ids, across every active
  // membership with a spendable balance) — see poolMembershipRestriction's
  // doc comment above for why membershipEligibleTotal needs this instead of
  // just membershipCoversServices/membershipCoversProducts.
  const membershipsWithBalance = useMemo(
    () => clientMemberships.filter((m) => Number(m.membershipWalletBalance) > 0),
    [clientMemberships],
  );
  const membershipServiceRestriction = useMemo(
    () => poolMembershipRestriction(membershipsWithBalance, "service"),
    [membershipsWithBalance],
  );
  const membershipProductRestriction = useMemo(
    () => poolMembershipRestriction(membershipsWithBalance, "product"),
    [membershipsWithBalance],
  );

  // Most the membership wallet could ever usefully cover — capped by both the
  // wallet's own balance and by how much eligible service (+ product, when
  // enabled) value there is to apply it against, NET of any Discount
  // Balance/Loyalty discount already reducing that row (no point defaulting
  // an input higher than what's actually still owed).
  const membershipEligibleTotal = useMemo(() => {
    const serviceTotal = membershipCoversServices
      ? serviceRows.reduce((s, row, i) => {
          if (!row.service.trim() || (row as any).isPackageService) return s;
          const rowItemId = (row as any).service_id || (row as any).id;
          if (!rowMatchesMembershipRestriction((row as any).categoryId, rowItemId, membershipServiceRestriction.categoryIds, membershipServiceRestriction.itemIds)) return s;
          const tempId = (row as any).tempId || String(i);
          const alreadyDiscounted = serviceMembershipDiscountByRow.get(tempId) ?? 0;
          return s + Math.max(0, (Number(row.total) || 0) - alreadyDiscounted);
        }, 0)
      : 0;
    const productTotal = membershipCoversProducts
      ? productRows.reduce((s, row, i) => {
          const rowItemId = (row as any).productId || (row as any).id;
          if (!rowMatchesMembershipRestriction((row as any).categoryId, rowItemId, membershipProductRestriction.categoryIds, membershipProductRestriction.itemIds)) return s;
          const tempId = (row as any).tempId || String(i);
          const alreadyDiscounted = productMembershipDiscountByRow.get(tempId) ?? 0;
          return s + Math.max(0, (Number(row.total) || 0) - alreadyDiscounted);
        }, 0)
      : 0;
    return serviceTotal + productTotal;
  }, [serviceRows, productRows, membershipCoversServices, membershipCoversProducts, serviceMembershipDiscountByRow, productMembershipDiscountByRow, membershipServiceRestriction, membershipProductRestriction]);
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
  const loyaltyEligibility = ((clientDetailsForModal as any)?.loyalty_eligibility ?? null) as any;
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
    // Every call's parameters are fully determined up front from the static
    // `pkgs` snapshot (nothing here re-reads remainingSessions between
    // calls), so the calls themselves are mutually independent — collected
    // into one flat list first (pure, no awaits), then fired together below
    // instead of one at a time. A checkout with several package-covered rows
    // spanning multiple packages used to serialize every one of these,
    // directly adding to checkout latency.
    const calls: Array<{ id: string; body: { serviceId: string; staffName: string; appointmentId?: string } }> = [];
    for (let idx = 0; idx < serviceRows.length; idx++) {
      const row = serviceRows[idx];
      // service_id first — see perRowCoveredRemaining's identical comment;
      // row.id alone is the appointment-service ROW id once this booking has
      // been saved and reloaded, not the catalog service id pkg.services is
      // keyed by.
      const rowCatalogId = (row as any).service_id || row.id || null;
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
        const svc = pkg.services.find((s: any) => {
          if (s.remainingSessions <= 0) return false;
          if (rowCatalogId && s.catalogServiceId) return s.catalogServiceId === rowCatalogId;
          return s.serviceName.toLowerCase() === nameKey;
        });
        if (!svc) continue;
        const sessionsFromThisPkg = Math.min(sessionsLeftToMark, svc.remainingSessions);
        for (let i = 0; i < sessionsFromThisPkg; i++) {
          calls.push({ id: pkg.id, body: { serviceId: svc.serviceId, staffName: row.staff || "Staff", appointmentId } });
        }
        sessionsLeftToMark -= sessionsFromThisPkg;
      }
    }
    // allSettled, not all — one failed session-mark must never block the
    // rest from landing, same as the per-call try/catch this replaces.
    await Promise.allSettled(calls.map((call) => completePackageSession(call).unwrap()));
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
    catalogTotal: 0, itemDiscountTotal: 0, subtotal: 0, manualDiscount: 0, discountBase: 0, totalDisc: 0,
    taxable: 0, gstAmount: 0, taxBreakdown: [], billTotal: 0, grandTotal: 0, roundOff: 0,
    preRedemptionTotal: 0, displaySubtotal: 0,
  };
  const [totals, setTotals] = useState<TotalsResult>(ZERO_TOTALS);
  const [totalsConfirmed, setTotalsConfirmed] = useState(false);
  const [totalsError, setTotalsError] = useState(false);
  // Why the backend's re-validation of an already-applied coupon just failed
  // on this recalc (e.g. the bill dropped below its min order amount, it hit
  // its usage limit, or it expired) — coupon.discount/coupon.error only ever
  // reflect the state from the moment "Apply" was clicked, so without this a
  // coupon silently losing validity as the bill changes later (more/fewer
  // rows, a qty edit, etc.) just made the Coupon/Total Discount row vanish
  // with no explanation at all. Cleared whenever a recalc succeeds without
  // a rejection, or when there's nothing left to price.
  const [couponRejectedReason, setCouponRejectedReason] = useState<string | null>(null);
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

  // Picking Staff or Time on a row (ServiceRow.tsx's handleStaffChange /
  // TimeSelect onChange) doesn't affect price at all, but both go through the
  // same onUpdateService/onUpdatePackage/etc. path as a real billing-relevant
  // edit (qty, price, discount, service selection) — every field edit
  // produces a new row-array reference, so without this projection every
  // Staff/Time pick retriggered the 350ms-debounced calculate-totals POST for
  // no reason. Stringified so the effect's dependency array gets a stable
  // primitive that only actually changes when a price-relevant field does —
  // the effect body below still reads the live serviceRows/etc via closure,
  // so it always sends the current staff/time even though picking them alone
  // won't cause it to re-fire.
  const pricingRelevantSignature = useMemo(() => {
    const project = (rows: any[]) =>
      rows.map((r) => ({
        id: r.serviceId ?? r.packageId ?? r.productId ?? r.membershipId ?? r.id,
        price: r.price, qty: r.qty, discount: r.discount, total: r.total,
        isPackageService: r.isPackageService,
      }));
    return JSON.stringify({
      s: project(serviceRows), p: project(packageRows),
      pr: project(productRows), m: project(membershipRows),
    });
  }, [serviceRows, packageRows, productRows, membershipRows]);

  useEffect(() => {
    setTotalsConfirmed(false);
    setTotalsError(false);
    // A brand-new Quick Sale/booking starts with one phantom serviceRows entry
    // (see emptyService() at the top of this component) that has no service
    // actually picked yet — service:"" , price:0. Counting it as "a row" made
    // calculate-totals fire the moment ANY other pricing-relevant dependency
    // changed (e.g. picking a client) even though there's nothing billable on
    // the bill yet. Only a real, catalog-selected service row (isRealServiceRow)
    // — or any package/product/membership row, none of which ever start with a
    // placeholder — should count toward "there's something to price".
    const hasAnyRowsNow = serviceRows.some(isRealServiceRow)
      || packageRows.length + productRows.length + membershipRows.length > 0;
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
      setCouponRejectedReason(null);
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
          discountAppliesTo,
          couponCode: coupon.applied || undefined,
          exCharges, tip, tipAddedToSalon: false,
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
            subtotal: data.subtotal, manualDiscount: data.manualDiscount,
            // Falls back to subtotal on an older backend that doesn't send it,
            // so the flat-amount clamp below stays permissive rather than
            // snapping every entry to 0.
            discountBase: data.discountBase ?? data.subtotal,
            totalDisc: data.totalDisc,
            taxable: data.taxable, gstAmount: data.gstAmount, taxBreakdown: data.taxBreakdown ?? [],
            // Falls back to the same taxable+GST sum the engine uses, so an
            // older backend that doesn't send the field still renders a
            // correct "Total Bill" row rather than ₹0.00.
            billTotal: data.billTotal ?? ((data.taxable ?? 0) + (data.gstAmount ?? 0)),
            grandTotal: data.grandTotal, roundOff: data.roundOff, preRedemptionTotal: data.preRedemptionTotal,
            displaySubtotal: data.displaySubtotal ?? data.subtotal,
          });
          setReferralDiscountPreview(data.referralDiscountPreview ?? 0);
          setAppliedMembershipDiscount(data.appliedMembershipDiscount ?? 0);
          setRowTaxPreview(data.rowTax ?? null);
          setRowMembershipDiscountPreview(data.rowMembershipDiscount ?? null);
          setRowMembershipWalletPreview(data.rowMembershipWallet ?? null);
          // Set only while a coupon is actually applied — once cleared (or
          // never applied), any leftover reason from a prior attempt would
          // otherwise keep showing next to a Coupon field that's now empty.
          setCouponRejectedReason(coupon.applied ? (data.couponRejectedReason ?? null) : null);
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
    pricingRelevantSignature,
    discountType, discountValue, discountAppliesTo, exCharges, tip, includeGst,
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
  // What this bill has already collected, BEFORE anything edited in this
  // session. payingNow is the primary source — bookingMapper recomputes it
  // from paid_amount rather than trusting the API's own field ("Always
  // recompute — never trust a stale appt.payingNow"), so the old warning that
  // it's unreliable no longer holds. The API's own total−due is kept as a
  // fallback for a partial bill whose paid amount can't be derived, and is
  // gated on status === "partial" because due_amount is only meaningful once
  // a real payment exists (an unpaid booking reports due 0, which would
  // otherwise read as "fully paid" and zero out the amount to collect).
  const priorPaidAmount = alreadyPaidAmount > 0
    ? alreadyPaidAmount
    : (existingBooking?.status === "partial" && (existingBooking?.dueAmount ?? 0) > 0
        ? Math.max(0, (existingBooking?.grandTotal ?? 0) - (existingBooking?.dueAmount ?? 0))
        : 0);
  // Always derived from the CURRENT total, never the due the API returned at
  // load. Returning that snapshot verbatim for partial bills meant adding or
  // removing an item recalculated the grand total while Due and the
  // "Confirm & Pay" button stayed frozen at the old figure — e.g. adding a
  // ₹500 service to a ₹1050 bill with ₹500 paid showed Total ₹1575 against
  // Due ₹550, which don't reconcile against each other.
  const remainingDue = Math.max(0, reconciledEffectiveTotal - priorPaidAmount);
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
      .filter((p: any) => p.status === "Active")
      .map((p: any) => ({
        packageName: p.packageName,
        remaining: p.services.reduce((s: number, sv: any) => s + sv.remainingSessions, 0),
        total: p.services.reduce((s: number, sv: any) => s + sv.totalSessions, 0),
      }))
      .filter((p: any) => p.remaining > 0),
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
    // Salon-configured ceiling: reward points alone may never cover more
    // than max_redeem_percent of the bill BEFORE any redemption (the same
    // preRedemptionTotal basis membership wallet is capped against), no
    // matter how large the client's points balance is. Matches the backend's
    // own enforcement in payments.service.ts/pricing.service.ts.
    const percentCapValue = totals.preRedemptionTotal * (rewardPointsConfig.max_redeem_percent / 100);
    const maxByPercent = Math.floor((percentCapValue / rewardPointsConfig.redeem_value) * rewardPointsConfig.redeem_points);
    return Math.max(0, Math.min(balance, maxByBill, maxByPercent));
  }, [clientStats, remainingAfterEWallet, rewardPointsConfig, totals.preRedemptionTotal]);

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
    // Salon-configured ceiling: referral credit alone may never cover more
    // than max_redeem_percent of the bill BEFORE any redemption (same
    // preRedemptionTotal basis reward points is capped against), no matter
    // how large the client's credit balance is. Matches the backend's own
    // enforcement in payments.service.ts/pricing.service.ts.
    const percentCapValue = computeMaxReferralRedeemable(totals.preRedemptionTotal, referralConfig);
    return Math.max(0, Math.min(balance, remainingAfterRewardPoints, percentCapValue));
  }, [clientStats, remainingAfterRewardPoints, referralConfig, totals.preRedemptionTotal]);

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
      packageRows.some((r) => (r as any).packageId || (r as any).isCustom) ||
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
    const filledPkg = packageRows.filter((r) => (r as any).packageId || (r as any).isCustom);
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
      item:  !((r as any).packageId || (r as any).isCustom),
      staff: !!((r as any).packageId || (r as any).isCustom) && !r.staffId,
      time:  !!((r as any).packageId || (r as any).isCustom) && !r.time,
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
      ...packageRows.filter((r: any) => (r.packageId || r.isCustom) && r.staffId && r.time)
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
    // The one and only place consumableActuals and serviceRows combine — a
    // save-only copy, built fresh here rather than stored anywhere, so the
    // live serviceRows state (and the calculate-totals effect that depends
    // on it) is never touched by a consumable Actual Qty edit.
    const serviceRowsForSave = serviceRows.map((row, i) => {
      const tempId = (row as any).tempId || String(i);
      const actuals = consumableActuals[tempId];
      if (!actuals || !row.consumables?.length) return row;
      return {
        ...row,
        consumables: row.consumables.map((c) => ({
          ...c,
          actualQty: actuals[c.productId] ?? c.actualQty ?? c.qty,
        })),
      };
    });
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
        discountAppliesTo,
        exCharges,
        tipAmount:     tip,
        tipAddedToSalon: false,
        tipBreakdown,
        gst:           totals.taxable > 0 ? Number(((totals.gstAmount / totals.taxable) * 100).toFixed(4)) : 0,
        gstAmount:     totals.gstAmount,
        taxBreakdown:  totals.taxBreakdown,
      } as Partial<Booking>,
      serviceRows: serviceRowsForSave, packageRows, productRows, membershipRows,
      calDate, defaultTime, notes, staffAlert, salonId,
      source:               (quickSale ? "quick_sale" : "calendar") as "quick_sale" | "calendar",
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
    if (!canRecordPaymentPerm) { denyPerm("edit_appointment"); return; }
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
      discountType, discountValue, discountAppliesTo, exCharges, tip, tipBreakdown, activeTaxes, totals,
      onRefresh, onClose, canRecordPaymentPerm]);

  const handleUpdate = useCallback(async () => {
    if (!canEditPerm) { denyPerm("edit_appointment"); return; }
    if (totalsNotReady) return;
    if (!validate()) return;
    const id = await save(buildSavePayload());
    if (id) { onRefresh?.(); onClose(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save, selectedClient, serviceRows, packageRows, productRows, membershipRows,
      calDate, defaultTime, notes, staffAlert, salonId, existingBooking, defaultStaffId,
      discountType, discountValue, discountAppliesTo, exCharges, tip, tipBreakdown, activeTaxes, totals,
      onRefresh, onClose, canEditPerm]);

  // Reveal the payment section only — does NOT persist anything. The
  // appointment is only actually saved/updated once the client confirms
  // payment (see handlePay / handleZeroPackagePayment), so simply opening
  // the payment step on an existing booking no longer fires an update call.
  const handleContinueToPaymentZero = useCallback(() => {
    if (!canRecordPaymentPerm) { denyPerm("edit_appointment"); return; }
    if (totalsNotReady) return;
    if (!validate()) return;
    setShowPaymentSection(true);
    setTimeout(() => { paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalsNotReady, selectedClient, serviceRows, packageRows, productRows, membershipRows, canRecordPaymentPerm]);

  // Same as above but requires a real (non-walk-in) client.
  const handleContinueToPayment = useCallback(() => {
    if (!canRecordPaymentPerm) { denyPerm("edit_appointment"); return; }
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
  }, [totalsNotReady, selectedClient, serviceRows, packageRows, productRows, membershipRows, canRecordPaymentPerm]);

  // ── Payment Machine (POS terminal) — success/dispatch callbacks ─────────
  // Placed here (not up with the rest of the POS state above) because they
  // close over printClientExtras/schedulerStaff/etc., which aren't declared
  // yet at that earlier point in the component body.
  //
  // Same tail every synchronous payment already runs after completePayment()
  // resolves true (see handlePay/handleQuickSaleCheckout below) — triggered
  // here once the provider confirms instead of immediately after a POST,
  // since the actual payments row was written server-side by the confirm
  // handler, not by this tab. Fetches that saved record so the Redux patch
  // reflects the server's real numbers, same reasoning completePayment uses.
  const runPosSuccessTail = useCallback(async (
    apptId: string | number,
    paymentParams: Parameters<typeof completePayment>[0],
    methodLabel: string,
  ) => {
    posSucceededRef.current = true;
    try {
      const res = await api.get(PAYMENT.BY_ID(String(apptId)));
      const savedPayment = res.data?.data;
      if (savedPayment) {
        const { payload } = buildPaymentPayload(paymentParams);
        dispatch(patchPaymentStatus(buildPaymentStatusPatch(savedPayment, paymentParams, methodLabel, payload)));
      }
    } catch {
      // Best-effort — the POS modal's own success screen already confirmed
      // the payment to staff regardless of whether this Redux refresh lands.
    }
    await markPackageSessions(String(apptId));
    if (printAfterPayment) {
      const freshBooking = store.getState().scheduler.bookings.find(
        (b: any) => String(b.id) === String(apptId)
      );
      if (freshBooking) printReceipt(freshBooking as any, schedulerStaff, currentSalon, printClientExtras, { auto: true, showTaxBreakup: showTaxBreakupOnInvoice, formatAmount, paperProfile });
    }
    setClientRefreshKey((k) => k + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, printAfterPayment, schedulerStaff, currentSalon, printClientExtras, showTaxBreakupOnInvoice, formatAmount, paperProfile]);

  // Called from handlePay/handleQuickSaleCheckout instead of completePayment()
  // when singleMethod === POS_MACHINE_METHOD — builds the exact same payload
  // completePayment would have posted immediately, but hands it to the async
  // waiting-screen flow instead of posting it right away.
  const openPosPaymentForAppointment = useCallback((
    paymentParams: Parameters<typeof completePayment>[0],
    apptId: string | number,
  ) => {
    const { payload, methodLabel } = buildPaymentPayload(paymentParams);
    const terminal = posTerminals.find((t) => t.provider === posProvider && t.is_active);
    posSucceededRef.current = false;
    posOnSuccessRef.current = () => { void runPosSuccessTail(apptId, paymentParams, methodLabel); };
    setPosCreatePayload({
      appointment_id: apptId,
      client_id: (paymentParams.clientId && isRealId(paymentParams.clientId)) ? paymentParams.clientId : undefined,
      terminal_id: terminal?.id,
      provider: posProvider!,
      amount: payload.paid_amount,
      payload,
    });
    setPosModalOpen(true);
  }, [posProvider, posTerminals, runPosSuccessTail]);

  const handlePosModalClose = useCallback(() => {
    setPosModalOpen(false);
    setPosCreatePayload(null);
    if (posSucceededRef.current) {
      finishWithPaidPopup();
    } else {
      // Failed/cancelled — let staff pick a different method rather than
      // silently leaving "Payment Machine" selected with a dead request.
      setSingleMethod(null);
    }
  }, [finishWithPaidPopup]);

  // ── Pay ──────────────────────────────────────────────────────────────────
  const handlePay = useCallback(async () => {
    if (!canRecordPaymentPerm) { denyPerm("edit_appointment"); return; }
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
    // Split rows are clamped as they're typed so this can't normally happen,
    // but block the save anyway — belt-and-braces against stale state (e.g.
    // a row edited before the bill total itself changed).
    if (paymentMode === "split" && computeSplitTotal(splitEntries) - remainingDue > 0.005) {
      return;
    }
    setPayMethodError(false);

    // Persist whatever was edited in this session (services/prices/discounts)
    // right before actually charging — this is the only point an existing
    // booking's update API is called from the payment step, not merely
    // opening/revealing it (see handleContinueToPayment above).
    const apptId = await save(buildSavePayload());
    if (!apptId) return;

    // paymentParams below is the exact same object completePayment() would
    // have posted immediately for Cash/Card/UPI — Payment Machine only
    // differs in WHEN it's posted (after the terminal confirms, not now).
    const paymentParams = {
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
    };

    if (paymentMode === "single" && singleMethod === POS_MACHINE_METHOD) {
      openPosPaymentForAppointment(paymentParams, apptId);
      return;
    }

    const ok = await completePayment(paymentParams);
    if (ok) {
      await markPackageSessions(String(apptId));
      if (printAfterPayment) {
        const freshBooking = store.getState().scheduler.bookings.find(
          (b: any) => String(b.id) === String(apptId)
        );
        if (freshBooking) printReceipt(freshBooking as any, schedulerStaff, currentSalon, printClientExtras, { auto: true, showTaxBreakup: showTaxBreakupOnInvoice, formatAmount, paperProfile });
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
    // buildSavePayload()'s own inputs — without these, a package-coverage
    // toggle (or any other row/discount/notes edit) made after this callback
    // was last memoized is silently dropped from the pre-payment save: the
    // stale closure re-sends the OLD serviceRows (e.g. still missing
    // is_package_service on a just-covered row), so payments.service.ts
    // computes GST on the full un-excluded subtotal instead of the net
    // taxable amount — see sales.tax_amount/payments.tax_breakdown drifting
    // from the correct package-aware figure (INV-00157-style bug: GST shown
    // as 5% of the full ₹999 subtotal instead of 5% of the real ₹499/₹500
    // cash-paid remainder). handleUpdate/handleSaveAndPay already list all of
    // these; handlePay/handleQuickSaleCheckout must match.
    serviceRows, packageRows, productRows, membershipRows,
    calDate, defaultTime, notes, staffAlert, defaultStaffId,
    discountType, discountValue, discountAppliesTo, exCharges, tip, tipBreakdown,
    reconciledEffectiveTotal, remainingDue, applyMembershipDiscount, applyLoyaltyDiscount,
    includeGst, consumableActuals, isPackageZero,
    printClientExtras, showTaxBreakupOnInvoice, formatAmount,
    openPosPaymentForAppointment, canRecordPaymentPerm,
  ]);

  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [sendingReceipt, setSendingReceipt] = useState(false);
  // ── Zero-payment for fully package-covered appointments ─────────────────
  const handleZeroPackagePayment = useCallback(async () => {
    if (!canRecordPaymentPerm) { denyPerm("edit_appointment"); return; }
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
      // See the identical comment in handleQuickSaleCheckout's isPackageZero
      // branch — without this, a fully package-covered Calendar checkout
      // never reaches appointments.service.ts's checkout(), silently
      // skipping both staff commission and the PDF bill_receipt safety-net send.
      dispatch(checkoutBookingThunk({ id: String(apptId), data: {} }));
      await markPackageSessions(String(apptId));
      setClientRefreshKey((k) => k + 1);
      finishWithPaidPopup();
    } else {
      onClose();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, save, existingBooking, apiAppointmentId, selectedClient, salonId, serviceRows, finishWithPaidPopup, onClose, canRecordPaymentPerm]);

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
    // Split rows are clamped as they're typed so this can't normally happen,
    // but block the save anyway — belt-and-braces against stale state.
    const splitOverpay = paymentMode === "split" && computeSplitTotal(splitEntries) - remainingDue > 0.005;
    if (!formOk || methodMissing || splitOverpay) return;

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
        // Same "checkout the appointment so commission fires" step every other
        // fully-paid path takes (see usePayment.ts's identical dispatch right
        // after a payment with finalDue === 0) — this branch bypasses
        // completePayment() entirely, so without this call a 100%
        // package-covered visit never reached appointments.service.ts's
        // checkout(), which is where staff commission gets calculated AND
        // where the PDF bill_receipt safety-net send lives (payments.service.ts's
        // own package-payment branch never sends it directly). Both were
        // silently skipped for a fully package-covered checkout.
        dispatch(checkoutBookingThunk({ id: String(id), data: {} }));
        await markPackageSessions(String(id));
        setClientRefreshKey((k) => k + 1);
        finishWithPaidPopup();
      }
      return;
    }

    const paymentParams = {
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
    };

    if (paymentMode === "single" && singleMethod === POS_MACHINE_METHOD) {
      openPosPaymentForAppointment(paymentParams, id);
      return;
    }

    const ok = await completePayment(paymentParams);
    if (ok) {
      await markPackageSessions(String(id));
      if (printAfterPayment) {
        const freshBooking = store.getState().scheduler.bookings.find(
          (b: any) => String(b.id) === String(id)
        );
        if (freshBooking) printReceipt(freshBooking as any, schedulerStaff, currentSalon, printClientExtras, { auto: true, showTaxBreakup: showTaxBreakupOnInvoice, formatAmount, paperProfile });
      }
      setClientRefreshKey((k) => k + 1);
      finishWithPaidPopup();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save, completePayment, dispatch, selectedClient, salonId, serviceRows, totals, amountThisTxn,
      eWalletAmt, coupon, paymentMode, singleMethod, splitEntries, partialAmtInput,
      includeClearDue, priorDueAmt, useEWallet, selectedDueIds, applyMembership, membershipWalletAmt, printAfterPayment,
      useRewardPoints, rewardPointsToRedeem, useReferralCredit, referralCreditAmt,
      schedulerStaff, currentSalon, finishWithPaidPopup, openPosPaymentForAppointment]);

  if (!isOpen) return null;

  const isCancelledBooking = existingBooking?.status?.toLowerCase() === "cancelled";
  const isPartialBooking   = existingBooking?.status === "partial";
  // A Paid booking whose edited total hasn't changed stays frozen (nothing
  // to collect) — but editing it to raise the total un-freezes it the moment
  // the live preview shows more is owed than what's already been paid,
  // exactly like a genuinely-partial booking already does. No separate
  // "paid" case needed anymore; this one condition covers both.
  const isPaymentFrozen =
    !isPartialBooking
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

  // Quick Sale's checkout button, built from the same partial figures as
  // `confirmLabel` above. It used to render a bare `Checkout (₹X)` that showed
  // the partial amount but never the balance left behind, so staff collecting
  // ₹500 of a ₹2,000 bill got no confirmation on the button that ₹1,500 was
  // still outstanding — the one place they look before committing.
  const quickSaleCheckoutLabel = isSaving
    ? "Saving…"
    : isProcessing
    ? "Processing…"
    : totalsNotReady
    ? (totalsError ? "Calculation failed — edit to retry" : "Confirming total…")
    // Already paid for in full at package-purchase time — appending
    // "— ₹0.00" would read like a bug, not a feature, so this stays a bare
    // label; it's really just confirming the visit happened (which is what
    // triggers session redemption).
    : isPackageZero
      ? "Checkout"
    : isPartialEntry
      ? `Checkout — ${currencySymbol}${parsedPartial.toFixed(2)} (Due - ${currencySymbol}${(remainingDue - parsedPartial).toFixed(2)})`
      : `Checkout — ${currencySymbol}${reconciledEffectiveTotal.toFixed(2)}`;

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
        onAddFormCancelled={() => { setWalkInPayError(""); setTriggerAddForm(false); }}
        refreshKey={clientRefreshKey}
        rewardPointsConfig={rewardPointsConfig}
        onClientUpdated={() => setClientRefreshKey((k) => k + 1)}
        packages={nonExpiredPackages}
        memberships={clientMemberships}
        loyaltyEligibility={loyaltyEligibility}
        clientDetailsResult={clientDetailsResult}
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
            if (!pkgRequested.current && availablePackages.length === 0) {
              pkgRequested.current = true;
              triggerPackages({ status: "Active" });
              triggerTemplates();
            }
            // catalogServiceOptions is state.services — a shared slice several
            // unrelated screens also populate with much smaller limits (e.g.
            // useServiceForm.ts's limit:25, ClientHistoryPage.tsx's unlimited
            // default page). "already non-empty" doesn't mean "already the
            // full catalog", so it can't gate this fetch — only the
            // per-modal-instance ref can, or a salon with more services than
            // whatever happened to load first silently mismatches package
            // services against a random partial list (see resolvePackageServices).
            if (!svcCatalogRequested.current) {
              svcCatalogRequested.current = true;
              fetchCatalogServices({ limit: 200 });
            }
            setPackageRows((rows) => [...rows, { id: "", packageId: "", packageName: "", price: 0, qty: 1, discount: 0, total: 0, staffId: "", time: serviceRows[0]?.time || defaultTime || "" }]);
          }}
          productRows={productRows}
          onUpdateProduct={(i, r) => setProductRows((rows) => rows.map((x, idx) => idx === i ? r : x))}
          onRemoveProduct={(i) => setProductRows((rows) => rows.filter((_, idx) => idx !== i))}
          onAddProduct={() => {
            // No bulk fetchProductsThunk here — ServicesPanel's own debounced
            // GET /products?search=... (350ms, per keystroke) already
            // resolves matches live as the user types. availableProducts was
            // only ever used as a "local matches while the API call is in
            // flight" fallback in that search, not a hard requirement — a
            // 200-row prefetch just to seed that fallback cost more than it
            // saved (the API's own results land within one debounce cycle).
            setProductRows((rows) => [...rows, { id: "", productId: "", productName: "", price: 0, qty: 1, discount: 0, total: 0, staffId: "", time: serviceRows[0]?.time || defaultTime || "" }]);
          }}
          membershipRows={membershipRows}
          onUpdateMembership={(i, r) => setMembershipRows((rows) => rows.map((x, idx) => idx === i ? r : x))}
          onRemoveMembership={(i) => setMembershipRows((rows) => rows.filter((_, idx) => idx !== i))}
          onAddMembership={() => {
            if (!memRequested.current && availableMemberships.length === 0) {
              memRequested.current = true;
              dispatch(fetchMembershipsThunk());
            }
            setMembershipRows((rows) => [...rows, { id: "", membershipId: "", membershipName: "", price: 0, qty: 1, total: 0, staffId: "", time: serviceRows[0]?.time || defaultTime || "" }]);
          }}
          onSellPackage={isSellableClient ? () => setShowSellPackageModal(true) : undefined}
          onTopupEwallet={isSellableClient ? () => setShowTopupModal(true) : undefined}
          onStaffTips={involvedStaff.length > 0 ? () => setShowStaffTipsModal(true) : undefined}
          availablePackages={availablePackages}
          availableProducts={availableProducts}
          availableMemberships={availableMemberships}
          serviceCatalog={catalogServiceOptions}
          packageRemainingByRow={perRowCoveredRemaining}
          membershipWalletInfo={membershipWalletMap}
          serviceTaxByRow={serviceTaxByRow}
          consumableActuals={consumableActuals}
          onConsumableActualChange={handleConsumableActualChange}
          clientName={selectedClient && selectedClient.id !== "walk-in" ? selectedClient.name : "Walk-In"}
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
          reminderPresets={reminderPresets}
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
    packageRows.some((r: any) => r.packageId || r.isCustom) ||
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
      // service_id first — see perRowCoveredRemaining's identical comment
      // above. row.id alone is the appointment-service ROW id once this
      // booking has been saved and reloaded, not the catalog service id
      // coveredServices is keyed by — so a package-covered service already
      // on a reopened/Pending appointment never matched here, hiding its
      // "Package" benefit card until the row was removed and re-added.
      const rowCatalogId = (row as any).service_id || (row as any).id || null;
      return (rowCatalogId && coveredServices.has(rowCatalogId))
        || coveredServices.has(`name:${row.service.toLowerCase()}`);
    }),
    [serviceRows, coveredServices],
  );
  const availableBenefitCards: BenefitCardConfig[] = useMemo(() => {
    const cards: BenefitCardConfig[] = [];

    if (coveredServices.size > 0 && firstActivePkg && hasPackageEligibleRow) {
      const rawRemaining = firstActivePkg.services.reduce((s: number, svc: any) => s + svc.remainingSessions, 0);
      // Bounded by the package's own cap, if it has one — otherwise this
      // card would keep advertising e.g. "8 Remaining" from services' own
      // unused session counts even after the cap already closed the
      // package to further coverage (see coveredServices/packageBudgets).
      const pkgRemaining = Math.min(rawRemaining, packageBudgets.get(firstActivePkg.id) ?? Infinity);
      const pkgTotal = firstActivePkg.services.reduce((s: number, svc: any) => s + svc.totalSessions, 0);
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
        subtitle: rewardPointsConfig.max_redeem_percent < 100
          ? `Available Points · up to ${rewardPointsConfig.max_redeem_percent}% of bill`
          : "Available Points",
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
    if (referralBal > 0 && referralConfig.redeem_enabled) {
      cards.push({
        key: "referral",
        icon: PeopleFill,
        variantClass: "benefit-card--referral",
        title: "Referral Credit",
        value: formatAmount(referralBal),
        subtitle: referralConfig.max_redeem_percent < 100
          ? `Available Credit · up to ${referralConfig.max_redeem_percent}% of bill`
          : "Available Credit",
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
    coveredServices, firstActivePkg, hasPackageEligibleRow, applyPackage, packageBudgets,
    clientMemberships, membershipTotalBalance, primaryMembership, applyMembership,
    membershipWalletAmt, membershipMaxUsable, membershipWalletUsedTotal, handleSetMembershipWalletAmt,
    percentageDiscountSource, loyaltyDiscountSource, applyMembershipDiscount, applyLoyaltyDiscount, formatAmount,
    clientStats, useEWallet, eWalletAmt, eWalletMaxAmt, remainingAfterMembership, handleSetEWalletAmt,
    useRewardPoints, rewardPointsToRedeem, rewardPointsMaxRedeem, rewardPointsRedeemedValue, remainingAfterEWallet, handleSetRewardPointsToRedeem,
    useReferralCredit, referralCreditAmt, referralCreditMaxAmt, remainingAfterRewardPoints, handleSetReferralCreditAmt, referralConfig,
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

  // Only buckets actually on this bill get a checkbox — a "Package" tick on a
  // bill with no packages is noise, and its selection state is irrelevant to
  // the base either way (an absent bucket contributes 0).
  const discountBucketOptions: { key: DiscountBucket; label: string; present: boolean }[] = [
    // Same order as the "+ Service / + Product / + Package / + Membership"
    // buttons above, so the two lists of item types don't disagree.
    { key: "service",    label: "Service",    present: serviceRows.length > 0 },
    { key: "product",    label: "Product",    present: productRows.length > 0 },
    { key: "packages",   label: "Package",    present: packageRows.length > 0 },
    { key: "membership", label: "Membership", present: membershipRows.length > 0 },
  ];
  const visibleDiscountBuckets = discountBucketOptions.filter((b) => b.present);
  const visibleDiscountKeys = visibleDiscountBuckets.map((b) => b.key);
  // "Entire Bill" is always offered — it's a property of the bill as a whole,
  // not of any one item type, so it stays available even on a bill that
  // happens to have only one bucket on it.
  const discountScopeOptions = [
    ...visibleDiscountBuckets.map(({ key, label }) => ({ id: key as string, label })),
    { id: "bill", label: "Entire Bill" },
  ];
  const selectedDiscountScopes = effectiveDiscountBuckets.filter(
    (k) => k === "bill" || visibleDiscountKeys.includes(k as DiscountBucket)
  ) as string[];
  // The dropdown only offers buckets present on the bill, so its onChange only
  // ever reports those — anything selected for a bucket that isn't currently
  // on the bill is carried over untouched rather than dropped, so removing the
  // last product row and adding one back doesn't quietly reset that choice.
  // Always writes a concrete array, which is what promotes a legacy bill out
  // of legacy scope (see the state's doc comment).
  const handleDiscountScopeChange = (ids: string[]) => {
    // "Entire Bill" is mutually exclusive with the per-bucket picks: newly
    // ticking it drops them, and ticking any bucket while it's active drops
    // it. Without this the two would coexist and "bill" would silently win in
    // the engine, leaving the dropdown showing buckets that do nothing.
    const next = ids as DiscountScope[];
    if (next.includes("bill") && !wholeBillDiscountScope) {
      setDiscountAppliesTo(["bill"]);
      return;
    }
    const buckets = next.filter((k) => k !== "bill");
    const kept = wholeBillDiscountScope
      ? []
      : effectiveDiscountBuckets.filter((k) => k !== "bill" && !visibleDiscountKeys.includes(k as DiscountBucket));
    setDiscountAppliesTo([...kept, ...buckets]);
  };
  // Nothing ticked means nothing to discount — the engine computes a base of 0
  // and the field silently does nothing, which is exactly the invisible-no-op
  // this whole feature exists to end, so it gets said out loud.
  const noDiscountBucketSelected =
    discountValue > 0 && !wholeBillDiscountScope
    && !visibleDiscountBuckets.some((b) => effectiveDiscountBuckets.includes(b.key));

  const chargesSectionEl = (
    <div className="appt-section">
      <div className="appt-section__title"><TagFill size={15} /> Charges &amp; Discounts</div>
      <div className="charges-grid">
        <div className="field-group">
          <label>Ex Charges</label>
          <input className="fg-input" type="text" inputMode="decimal"
            value={focusedField === "exCharges" ? decimalDraft : String(exCharges)}
            onFocus={() => { setFocusedField("exCharges"); setDecimalDraft(exCharges > 0 ? String(exCharges) : ""); }}
            onBlur={() => setFocusedField(null)}
            onChange={(e) => {
              // Digits and a single decimal point only — a native
              // type="number" input still lets someone type "+"/"-"/"e"
              // characters (min=0 only flags it :invalid, it doesn't block
              // the keystroke), so this is a plain text input sanitized by
              // hand instead, matching ServiceRow.tsx's price/qty/discount
              // fields.
              const cleaned = sanitizeDecimalInput(e.target.value);
              setDecimalDraft(cleaned);
              setExCharges(cleaned === "" ? 0 : Math.max(0, Number(cleaned) || 0));
            }} />
        </div>
        <div className="field-group">
          <label>Bill Discount</label>
          <input className="fg-input" type="text" inputMode="decimal"
            value={focusedField === "discountValue" ? decimalDraft : String(discountValue)}
            onFocus={() => { setFocusedField("discountValue"); setDecimalDraft(discountValue > 0 ? String(discountValue) : ""); }}
            onBlur={() => setFocusedField(null)}
            onChange={(e) => {
              const cleaned = sanitizeDecimalInput(e.target.value);
              let num = cleaned === "" ? 0 : Math.max(0, Number(cleaned) || 0);
              // A percentage discount can never exceed 100%. A flat (₹)
              // discount can never exceed the DISCOUNTABLE base either —
              // the engine already caps it there, but silently letting the
              // FIELD hold a bigger number shows a "Bill Discount"
              // line that doesn't match what actually comes off, so this
              // clamps — and explains — right at entry. Capped against
              // `discountBase` (the ticked buckets only), not `subtotal`:
              // with Product unticked, subtotal still includes the product
              // and would wave through an amount the engine then trims.
              if (discountType === "Percentage (%)") {
                if (num > 100) { num = 100; setDiscountValueWarning("Percentage discount cannot exceed 100%"); }
                else setDiscountValueWarning(null);
              } else {
                const baseCap = totals.discountBase || 0;
                if (baseCap > 0 && num > baseCap) {
                  num = baseCap;
                  setDiscountValueWarning(
                    (!wholeBillDiscountScope && effectiveDiscountBuckets.length < 4)
                      ? "Discount cannot exceed the selected items' total"
                      : "Discount cannot exceed total amount"
                  );
                }
                else setDiscountValueWarning(null);
              }
              // Keep the typed text (so a trailing "." survives) unless a cap
              // above actually changed the value — then show what will apply.
              setDecimalDraft(num !== Number(cleaned) ? String(num) : cleaned);
              setDiscountValue(num);
            }} />
          {discountValueWarning && <span className="fg-field__err">{discountValueWarning}</span>}
          {/* Eligible-base readout for the Apply To field beside it. Gated on
              `totalsConfirmed` because `totals` still holds the previous (or
              zero) response during the debounce — without the gate, typing a
              discount flashes a confident "10% of ₹0.00 eligible" for a few
              hundred ms before the real base lands. */}
          {!discountValueWarning && discountValue > 0 && (
            noDiscountBucketSelected ? (
              <span className="fg-field__err">Nothing selected in Apply To — this discount won't apply</span>
            ) : totalsConfirmed ? (
              <span className="fg-field__hint">
                {discountType === "Percentage (%)"
                  ? `${discountValue}% of ${formatAmount(totals.discountBase)} eligible`
                  : `${formatAmount(totals.discountBase)} eligible`}
              </span>
            ) : (
              <span className="fg-field__hint">Calculating…</span>
            )
          )}
        </div>
        <div className="field-group">
          <label>Disc. Type</label>
          <Dropdown
            className="fg-input"
            searchable={false}
            value={discountType}
            options={[
              { id: "Percentage (%)", name: "Percentage (%)" },
              { id: "Flat (₹)", name: "Flat" },
            ]}
            onChange={(id) => setDiscountType(id as DiscountType)}
          />
        </div>
        {/* Which item types the Bill Discount reduces. A multi-select rather
            than a plain <select> because the whole point of the field is
            picking combinations (Service + Product, say) — a single-choice
            dropdown could only express one bucket or a fixed preset list. */}
        <div className="field-group discount-scope-field">
          <label>Apply To</label>
          <MultiSelectCheckbox
            options={discountScopeOptions}
            selected={selectedDiscountScopes}
            onChange={handleDiscountScopeChange}
            placeholder="None"
          />
        </div>
      </div>
    </div>
  );

  const notesFieldsEl = (
    <>
      <div className="field-group">
        <label><BellFill size={13} /> Staff Alert</label>
        <textarea className="fg-textarea" rows={2} placeholder="e.g. Client has allergy to chemicals"
          maxLength={STAFF_ALERT_MAX_LENGTH}
          value={staffAlert} onChange={(e) => setStaffAlert(e.target.value)} />
        <span className={`fg-field__${staffAlert.length >= STAFF_ALERT_MAX_LENGTH ? "err" : "hint"}`}>
          {staffAlert.length}/{STAFF_ALERT_MAX_LENGTH}
        </span>
      </div>
      <div className="field-group" style={{ marginTop: 10 }}>
        <label>Notes</label>
        <textarea className="fg-textarea" rows={3} placeholder="Enter appointment notes"
          maxLength={NOTES_MAX_LENGTH}
          value={notes} onChange={(e) => setNotes(e.target.value)} />
        <span className={`fg-field__${notes.length >= NOTES_MAX_LENGTH ? "err" : "hint"}`}>
          {notes.length}/{NOTES_MAX_LENGTH}
        </span>
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
            ) : canViewPaymentDetailsPerm ? (
              // Paid/Partial/Unpaid is a payment detail — independent of
              // edit_appointment (Calendar payment-details independence
              // ticket). This badge previously rendered unconditionally to
              // anyone who could reach this modal at all (i.e. anyone with
              // edit_appointment, including Owner via its unconditional
              // bypass), with no view_payment_details check whatsoever.
              <span className={`appt-header-status-badge appt-header-status-badge--${
                existingBooking.status === "paid" ? "paid"
                : existingBooking.status === "partial" ? "partial"
                : "unpaid"
              }`}>
                {normalizePaymentStatus(existingBooking.status)}
              </span>
            ) : (
              <span
                className="appt-header-status-badge"
                style={{ background: "#f3f4f6", color: "#9ca3af", border: "1px solid #e5e7eb" }}
                title={`Your account does not have the "view_payment_details" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`}
              >
                🔒 Payment status
              </span>
            )
          )}
          {/* Three-dot menu */}
          {existingBooking && (
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
                    {(existingBooking.status === "paid" || existingBooking.status === "partial") && (
                      <button
                        style={{ ...apptMenuItemStyle, opacity: canViewPaymentDetailsPerm ? 1 : 0.5, cursor: canViewPaymentDetailsPerm ? "pointer" : "not-allowed" }}
                        onClick={() => {
                          setHeaderMenuOpen(false);
                          if (!canViewPaymentDetailsPerm) { denyPerm("view_payment_details"); return; }
                          printReceipt(existingBooking as any, schedulerStaff, currentSalon, printClientExtras, { showTaxBreakup: showTaxBreakupOnInvoice, formatAmount, paperProfile });
                        }}
                      >
                        🖨️ Print Receipt
                      </button>
                    )}
                    {(existingBooking.status === "paid" || existingBooking.status === "partial") && (
                      <button
                        style={{ ...apptMenuItemStyle, opacity: sendingReceipt ? 0.6 : (canViewPaymentDetailsPerm ? 1 : 0.5), cursor: canViewPaymentDetailsPerm ? undefined : "not-allowed" }}
                        disabled={sendingReceipt}
                        onClick={async () => {
                          setHeaderMenuOpen(false);
                          if (!canViewPaymentDetailsPerm) { denyPerm("view_payment_details"); return; }
                          const waLink = buildClientWhatsAppLink(existingBooking.clientPhone, existingBooking.clientPhoneCode);
                          setSendingReceipt(true);
                          const result: any = await dispatch(fetchReceiptPdfThunk(existingBooking.id));
                          setSendingReceipt(false);

                          if (!fetchReceiptPdfThunk.fulfilled.match(result)) {
                            toast.error(result.payload || "Failed to get the receipt PDF.");
                            return;
                          }

                          const { blob, filename: serverFilename } = result.payload as { blob: Blob; filename: string | null };
                          // Server's own filename (from the same lookup that
                          // generated the PDF) is authoritative — see
                          // fetchReceiptPdfThunk / ViewBillModal.tsx's
                          // identical handling for why.
                          const filename = serverFilename || `Receipt-${(existingBooking as any).invoiceNumber || existingBooking.id}.pdf`;

                          // Best-effort first: the native share sheet actually attaches the
                          // PDF, ready to send — the user only has to pick WhatsApp and the
                          // contact themselves (no web API can pre-select a WhatsApp contact
                          // AND attach a file at once — that combination only exists through
                          // Meta's Business API, which this deliberately avoids). Falls
                          // through silently on any failure (unsupported, cancelled, or lost
                          // activation from a slow PDF render) to the reliable path below.
                          if (navigator.share) {
                            try {
                              const file = new File([blob], filename, { type: "application/pdf" });
                              if (navigator.canShare?.({ files: [file] })) {
                                await navigator.share({
                                  files: [file],
                                  text: `Receipt for ${existingBooking.clientName || "your visit"}`,
                                });
                                return;
                              }
                            } catch { /* cancelled or blocked — fall through */ }
                          }

                          // Fallback (desktop, or share unsupported/failed): download the PDF,
                          // then hand the user a REAL link to tap themselves instead of trying
                          // to auto-open a WhatsApp tab via script. Every programmatic attempt
                          // (window.open after the await, a synthetic <a target="_blank">
                          // .click()) is still a script-initiated new-tab open and gets
                          // silently blocked by one browser or another once it happens after
                          // an await — desktop Chrome blocks it outright, mobile browsers
                          // additionally block the "blank tab now, redirect later" workaround.
                          // A link the user physically taps is a genuine, fresh user gesture,
                          // so it can never be popup-blocked on any platform — the one
                          // reliable option left.
                          downloadBlob(blob, filename, "application/pdf");
                          if (waLink) {
                            const text = `Hi ${existingBooking.clientName || ""}, please find your receipt attached.`.trim();
                            const target = `${waLink}?text=${encodeURIComponent(text)}`;
                            toast((t) => (
                              <span>
                                Receipt downloaded.{" "}
                                <a
                                  href={target}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => toast.dismiss(t.id)}
                                  style={{ color: "#2563eb", fontWeight: 700, textDecoration: "underline" }}
                                >
                                  Tap to open WhatsApp
                                </a>{" "}
                                and attach it.
                              </span>
                            ), { duration: 10000 });
                          } else {
                            toast("Receipt downloaded. This client has no phone number on file to open WhatsApp automatically.", { duration: 5000 });
                          }
                        }}
                      >
                        📤 {sendingReceipt ? "Preparing…" : "Send to WhatsApp"}
                      </button>
                    )}
                    {(existingBooking.status === "paid" || existingBooking.status === "partial") && <div style={{ height: 1, background: "#f3f4f6" }} />}
                    {/* One action per status — nothing collected yet (booked/no-show) can
                        only be cancelled; money already collected (paid/partial) can only
                        be deleted, never "cancelled" in the traditional sense. */}
                    {(existingBooking.status === "booked" || existingBooking.status === "no-show") && onCancelBooking && (
                      <button
                        style={{ ...apptMenuItemStyle, opacity: canCancelPerm ? 1 : 0.5, cursor: canCancelPerm ? "pointer" : "not-allowed" }}
                        onClick={() => {
                          setHeaderMenuOpen(false);
                          if (!canCancelPerm) { denyPerm("cancel_appointment"); return; }
                          onCancelBooking(existingBooking); onClose();
                        }}
                      >
                        🚫 Cancel Appointment
                      </button>
                    )}
                    {(existingBooking.status === "paid" || existingBooking.status === "partial") && onDeleteBooking && (
                      <button
                        style={{ ...apptMenuItemStyle, color: "#ef4444", opacity: canDeletePerm ? 1 : 0.5, cursor: canDeletePerm ? "pointer" : "not-allowed" }}
                        onClick={() => {
                          setHeaderMenuOpen(false);
                          if (!canDeletePerm) { denyPerm("delete_appointment"); return; }
                          setShowDeleteConfirm(true);
                        }}
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
                  <div className="appt-section__title"><FileText size={15} /> Staff Alert &amp; Notes</div>
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
                  {/* Running total at the tax line — everything below it (Extra
                      Charges, Bill/Referral Discount, wallets, points, round off)
                      is a post-tax adjustment, so this is the last figure that is
                      purely "items + tax". */}
                  <div className="qs-summary-row qs-summary-row--subtotal"><span>Total Bill</span><span>{currencySymbol}{totals.billTotal.toFixed(2)}</span></div>
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
                  {/* "Amount to Pay" tracks the partial amount staff type, the
                      same way the Calendar's payment step does — it used to be
                      hardcoded to the full total, so entering a partial changed
                      the Checkout button but left this row (and any printed
                      summary read off it) claiming the whole bill was being
                      collected. `previewAmountThisTxn` is the shared figure the
                      Calendar path feeds into TotalsPanel, so both screens now
                      move together. */}
                  <div className="qs-summary-row qs-summary-row--total">
                    <span>Amount to Pay</span>
                    <span>{currencySymbol}{previewAmountThisTxn.toFixed(2)}</span>
                  </div>
                  {liveDueAmount > 0.005 && (
                    <div className="qs-summary-row qs-summary-row--due">
                      <span>Remaining Due</span>
                      <span>{currencySymbol}{liveDueAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {/* Already folded into Grand Total/Amount to Pay above (see
                      totalsUtils.ts's withCharges) — placed again here, after
                      every bill-total row, just to break out how much of that
                      total is tip vs. bill. */}
                  {tip > 0 && (
                    <div className="qs-summary-row">
                      <span>Staff Tip</span>
                      <span>{currencySymbol}{tip.toFixed(2)}</span>
                    </div>
                  )}
                  {/* Name + Tip on the aligned two-column row, flush-left with
                      "Staff Tip" above it (no indent — see .qs-summary-row--sub).
                      Which service(s) they're handling is its own plain
                      left-aligned line underneath, not squeezed onto the
                      name's line. */}
                  {tip > 0 && tipBreakdownWithItems.map((t) => (
                    <div key={t.staffId}>
                      <div className="qs-summary-row qs-summary-row--sub qs-summary-row--staff">
                        <span>{t.staffName}</span>
                        <span>Tip {currencySymbol}{t.amount.toFixed(2)}</span>
                      </div>
                      {t.items.length > 0 && (
                        <div className="qs-summary-row__items">
                          {t.items.map((it) => it.label).join(", ")} — {currencySymbol}{t.items.reduce((sum, it) => sum + it.amount, 0).toFixed(2)}
                        </div>
                      )}
                    </div>
                  ))}
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
                    couponError={coupon.error || couponRejectedReason || ""}
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
                    singleMethodOptions={posMethodOptions}
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
                  {quickSaleCheckoutLabel}
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
                  <div className="appt-section__title"><FileText size={15} /> Staff Alert &amp; Notes</div>
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
                        couponWarning={couponRejectedReason}
                        referralDiscount={referralDiscountPreview}
                        membershipDiscountUsed={appliedMembershipDiscount}
                        totalDiscount={totals.totalDisc}
                        gstAmount={totals.gstAmount}
                        taxBreakdown={totals.taxBreakdown}
                        tip={tip}
                        tipBreakdown={tipBreakdownWithItems}
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
                        couponWarning={couponRejectedReason}
                        referralDiscount={referralDiscountPreview}
                        membershipDiscountUsed={appliedMembershipDiscount}
                        totalDiscount={totals.totalDisc}
                        gstAmount={totals.gstAmount}
                        taxBreakdown={totals.taxBreakdown}
                        tip={tip}
                        tipBreakdown={tipBreakdownWithItems}
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
                    couponError={coupon.error || couponRejectedReason || ""}
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
                    singleMethodOptions={posMethodOptions}
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

      <POSPaymentModal
        isOpen={posModalOpen}
        createPayload={posCreatePayload}
        amount={posCreatePayload?.amount ?? 0}
        currencySymbol={currencySymbol}
        onClose={handlePosModalClose}
        onSuccess={(r) => posOnSuccessRef.current?.(r)}
      />

      {showTopupModal && isSellableClient && (
        <EwalletTopupModal
          clientId={selectedClient!.id}
          clientName={selectedClient!.name}
          currentBalance={clientStats?.ewalletAmt ?? 0}
          onClose={() => setShowTopupModal(false)}
          onSuccess={() => setClientRefreshKey((k) => k + 1)}
        />
      )}

      {showSellPackageModal && isSellableClient && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1090, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowSellPackageModal(false); }}
        >
          <div style={{ background: "#fff", borderRadius: 16, width: "min(640px,100%)", maxHeight: "90vh", overflowY: "auto", padding: 20, boxShadow: "0 24px 64px rgba(0,0,0,.18)" }}>
            <PackageCreateForm
              selectedClient={packageFormClient}
              onClientChange={() => {}}
              onCancel={() => setShowSellPackageModal(false)}
              onSaved={() => {}}
              lineItemMode
              onAddLineItem={(item) => {
                // No API call here — becomes a real client_package only once
                // this bill is actually paid, same backend path an existing
                // "+ Package" row already uses for a template-less/catalog
                // "combo" package (see payments.service.ts's package
                // auto-create fallback, which reads `services` directly when
                // there's no package_id to resolve a template from).
                setPackageRows((rows) => [
                  ...rows,
                  customPackageLineItemToPackageRow(item, serviceRows[0]?.time || defaultTime || ""),
                ]);
                setShowSellPackageModal(false);
              }}
              showStaffPicker
            />
          </div>
        </div>
      )}

      {showStaffTipsModal && (
        <StaffTipsModal
          staffOptions={involvedStaff}
          initialBreakdown={tipBreakdown}
          currencySymbol={currencySymbol}
          onClose={() => setShowStaffTipsModal(false)}
          onSave={handleSaveStaffTips}
        />
      )}

      {showDeleteConfirm && existingBooking && (
        <ConfirmDialog
          title="Delete this appointment?"
          message="This permanently deletes the appointment and its billing record. This can't be undone."
          confirmLabel="Delete"
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={() => { setShowDeleteConfirm(false); onDeleteBooking?.(existingBooking); onClose(); }}
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
