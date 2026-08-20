// src/components/packages/PackageCreateForm.tsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Loader2, Search, Plus, X, CalendarClock, AlertTriangle } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import styles from "./packages.module.scss";
import type { ClientPackage, PackageTemplate } from "../../services/api/endpoints/packages.endpoints";
import { useListPackageTemplatesQuery, useCreatePackageTemplateMutation, useUpdatePackageTemplateMutation } from "../../services/api/endpoints/packages.endpoints";
import type { ClientSearchResult } from "../../features/clients/components/ClientSearchInput";
import ClientSelectorWithAdd from "./ClientSelectorWithAdd";
import { useCreateClientPackage } from "../../hooks/packages/usePackages";
import { fetchStaffThunk } from "../../middleware/staff/staff.thunk";
import { setPackagesList } from "../../store/schedulerSlice";
import { useServices } from "../../features/catalog/hooks/useServices";
import type { Service } from "../../features/catalog/types/catalog.types";
import { PaymentMethodPicker, type PaymentSplitEntry } from "../shared/PaymentMethodPicker";
import { useCurrency } from "../../hooks/useCurrency";
// Same date/time pickers Quick Sale and Calendar use for a package service's
// scheduled appointment (ServicesPanel.tsx) — reused directly here instead of
// this form's own native <input type="date"/"time">, so all three places
// present scheduling the same way.
import TimeSelect from "../../features/bookings/components/shared/TimeSelect";
import { DatePicker } from "../ui";

import type { AppDispatch, RootState } from "../../store/store";

interface NewService {
  id: number;
  name: string;
  /** Real catalog services.id, when picked from the search dropdown — lets
   *  redemption match this exact service even if another catalog entry
   *  shares its display name. Null when hand-typed or template-loaded. */
  catalogServiceId: string | null;
  sessions: number;
  sessionsStr: string;
  price: number;
  priceStr: string;
  /** Per-session price of the picked service — used to scale `price` when sessions changes. */
  unitPrice: number;
  /** True once the user has hand-edited the price, so session changes stop overwriting it. */
  priceManual: boolean;
  /** Book one future appointment for this service at sale time — only ever
   *  one session per service here; the rest of totalSessions stays
   *  unscheduled for later booking. Requires catalogServiceId (the backend
   *  can't auto-create an appointment for a service with no catalog match). */
  scheduleEnabled: boolean;
  scheduleDate: string;   // yyyy-mm-dd
  scheduleTime: string;   // HH:MM
  scheduleStaffId: string;
}

interface Props {
  selectedClient:   ClientSearchResult | null;
  onClientChange:   (client: ClientSearchResult | null) => void;
  onCancel:         () => void;
  /** Shows the client search / inline "add new client" picker inside the form
   *  itself (used by the Custom Package flow, where no client is pre-selected
   *  before this form opens). */
  showClientPicker?: boolean;
  /** Shows a "Staff" dropdown (existing staff only) inside the form — feeds
   *  CreateClientPackageDTO.staffId for the Package Sale report's Staff column. */
  showStaffPicker?: boolean;
  onSaved:          (pkg: ClientPackage) => void;
  /** Called instead of onSaved when the "Generic package" toggle is on and a
   *  reusable Package Template was created rather than a client-specific package. */
  onTemplateSaved?: (tmpl: PackageTemplate) => void;
  templateToLoad?:  PackageTemplate | null;
  /** Calendar's "+ Sell Package" entry point: no payment is collected here —
   *  saving always creates a reusable template (never a paid client package),
   *  with the picked client (if any) folded into the template name only as a
   *  note for staff. Selling to a client for real still happens afterwards,
   *  the normal way, via "+ Package" on the bill. */
  quickCreateMode?: boolean;
  /** Used by the Templates tab (PackageTemplatesManager) for pure template
   *  management, where there's no client/staff/payment to collect at all —
   *  hides Client, Staff, Payment Method and per-service scheduling
   *  entirely and always saves as a template (the "Generic package" toggle
   *  itself is hidden too, since there's nothing to toggle between here). */
  templateOnly?: boolean;
  /** An existing template to load for in-place editing (fields stay fully
   *  editable, unlike templateToLoad's locked "start a new sale from this
   *  template" fields) — saving calls the update mutation instead of create.
   *  Only meaningful together with templateOnly. */
  templateToEdit?: PackageTemplate | null;
  /** Quick Sale/Calendar's "+ Sell Package" entry point — builds a brand-new
   *  custom package definition but never calls a create API here. Hides
   *  Payment Method and the per-package GST% picker (this bill's own shared
   *  tax engine prices the row the same way it prices every other line, so a
   *  separate custom rate here would be misleading) and per-service
   *  scheduling (nothing exists to schedule against yet — the real
   *  client_package is only created once the bill is actually paid).
   *  "Add to Bill" calls onAddLineItem with the definition instead of
   *  onSaved/onTemplateSaved; the caller pushes it onto the current bill's
   *  own package rows, to be paid together with everything else at checkout. */
  lineItemMode?: boolean;
  onAddLineItem?: (item: CustomPackageLineItem) => void;
}

export interface CustomPackageLineItem {
  name: string;
  /** Post-internal-discount base price, pre bill-tax — same convention an
   *  existing "+ Package" row's own `price` already uses; the bill's shared
   *  tax engine adds GST on top, same as every other row. */
  price: number;
  discount: number;
  // Who sold it — set from this form's own Staff picker. Undefined only if
  // a caller doesn't pass showStaffPicker at all (both current callers do).
  staffId?: string;
  services: Array<{ serviceId?: string; serviceName: string; totalSessions: number; price: number }>;
  neverExpires: boolean;
  expiryDate: string; // yyyy-mm-dd, "" when neverExpires
}

// yyyy-mm-dd expiry date -> whole months from today, rounded by actual elapsed
// days (not just calendar-month index). Kept only as a human-friendly label —
// dateToDays below is the exact value actually used to reconstruct the date.
function dateToMonths(dateStr: string): number | null {
  const days = dateToDays(dateStr);
  if (days == null) return null;
  return Math.max(1, Math.round(days / 30.4368));
}

// Exact day-count from today to the picked date — a template's expiry can only
// be reproduced precisely if the exact day (not just an approximate month
// count) is stored and reapplied.
function dateToDays(dateStr: string): number | null {
  if (!dateStr) return null;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [y, m, d] = dateStr.split("-").map(Number);
  const exp = new Date(y, m - 1, d);
  return Math.round((exp.getTime() - start.getTime()) / 86_400_000);
}

const GST_OPTIONS = [0, 5, 12, 18, 28];

// Matches Quick Sale/Calendar's own payment method set (SINGLE_METHODS in
// features/bookings/types/payment.types.ts) — package sale used to offer an
// extra "Net banking" option those flows didn't have.
const PKG_PAYMENT_METHODS = ["Cash", "Card", "UPI"];
const toBackendPaymentMethod = (label: string) => label.toLowerCase().replace(/\s+/g, "_");
// A package sold before this change may still carry "net_banking" as its
// stored payment method — falls back to "Cash" for the edit form's default
// selection rather than crashing on a value no longer in PKG_PAYMENT_METHODS;
// the stored value itself is untouched unless the form is resubmitted.
const fromBackendPaymentMethod = (id: string) =>
  PKG_PAYMENT_METHODS.find(m => toBackendPaymentMethod(m) === id) ?? "Cash";

function newServiceRow(): NewService {
  return {
    id: Date.now(), name: "", catalogServiceId: null, sessions: 1, sessionsStr: "1", price: 0, priceStr: "",
    unitPrice: 0, priceManual: false,
    scheduleEnabled: false, scheduleDate: "", scheduleTime: "", scheduleStaffId: "",
  };
}

const PackageCreateForm: React.FC<Props> = ({
  selectedClient, onClientChange, onCancel, onSaved, onTemplateSaved, templateToLoad,
  quickCreateMode = false, showClientPicker = false, showStaffPicker = false,
  templateOnly = false, templateToEdit = null,
  lineItemMode = false, onAddLineItem,
}) => {
  const { currencySymbol, formatAmount } = useCurrency();
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const { data: templates = [] } = useListPackageTemplatesQuery();

  const [pkgName,           setPkgName]          = useState("");
  // Optional "what's included / terms" blurb. The field itself is only shown
  // on the template path (see its own comment below) — a plain direct sale
  // never lets the user type one, though client_packages.description can
  // store one when a value does carry over (Generic-template-plus-client).
  const [pkgDescription,    setPkgDescription]   = useState("");
  const [expiry,            setExpiry]           = useState("");
  const [neverExpires,      setNeverExpires]      = useState(false);
  // Optional aggregate cap ("Expires after this many services") — once a
  // sold instance of this template has this many TOTAL completed sessions
  // across ALL its services combined, the client's package closes early.
  // Independent of expiry/neverExpires above — whichever condition is hit
  // first ends the package. Blank = no cap, template-only feature (never
  // shown in lineItemMode's custom-package builder).
  const [expireAfterServicesStr, setExpireAfterServicesStr] = useState("");
  // Gates the field above: OFF (default) is the normal multi-session package
  // (Sessions stays freely editable, no cap). ON switches to a simpler,
  // mutually-exclusive mode — every service row is forced to exactly 1
  // session, and instead the package closes once this many DISTINCT
  // services (not sessions-of-one-service) have been used. The two modes
  // can't combine: you either raise Sessions past 1, or you cap by service
  // count, never both at once.
  const [serviceBasedExpiry, setServiceBasedExpiry] = useState(false);
  const [gstPct,            setGstPct]           = useState(0);
  const [discount,          setDiscount]         = useState(0);
  const [discountStr,       setDiscountStr]      = useState("");
  // "flat" = ₹ off the package price, "percent" = % of the package price.
  // The DTO still receives the resolved ₹ figure either way (discountVal) —
  // percent is purely an input convenience, no backend change involved.
  const [discountType,      setDiscountType]     = useState<"flat" | "percent">("flat");
  const [pkgPrice,          setPkgPrice]         = useState(0);
  const [pkgPriceStr,       setPkgPriceStr]      = useState("");
  const [pkgPriceManual,    setPkgPriceManual]   = useState(false);

  const [paymentMode,       setPaymentMode]      = useState<"single" | "split">("single");
  const [singleMethod,      setSingleMethod]     = useState<string | null>("Cash");
  const [splitEntries,      setSplitEntries]     = useState<PaymentSplitEntry[]>([{ method: "Cash", amount: "" }]);
  const [payMethodError,    setPayMethodError]   = useState(false);
  const [apiError,          setApiError]         = useState<string | null>(null);
  const [services,          setServices]         = useState<NewService[]>([newServiceRow()]);
  // Same service picked twice would silently double-count it in the package
  // total — point staff at the existing row's Sessions field instead.
  const [duplicateServiceError, setDuplicateServiceError] = useState<string | null>(null);
  const [scheduleWarning, setScheduleWarning] = useState<string | null>(null);
  // A generic package is a reusable Package Template (same as the Templates tab)
  // rather than a package sold to one specific client — no client is required,
  // but services are still selected the same way as a normal custom package.
  const [isGeneric,         setIsGeneric]        = useState(false);
  // templateOnly (Templates tab) always means "this is a template" — the
  // checkbox itself is hidden there since there's nothing else to choose.
  const effectiveIsGeneric = isGeneric || templateOnly;
  // Both paths that save a reusable template rather than a client's own
  // package — the only place a description can be stored. Named once so the
  // submit branch below and the Description field's visibility can't diverge.
  const isTemplateSave = effectiveIsGeneric || !!quickCreateMode;
  // When a template is loaded (either via the "Buy Existing Package" entry
  // point or the in-form "Choose Template" picker), everything except the
  // payment method is locked to what the template defines.
  const [isFromTemplate,    setIsFromTemplate]   = useState(false);
  // Set only via templateToEdit — an existing template's id, edited in place
  // (fields stay editable, unlike isFromTemplate's locked fields). Presence
  // of this id, not templateOnly alone, is what makes handleSave call the
  // update mutation instead of create.
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [staffId,           setStaffId]          = useState("");

  const { createClientPackage, isLoading } = useCreateClientPackage();
  const [createTemplate, { isLoading: isSavingTemplate }] = useCreatePackageTemplateMutation();
  const [updateTemplate, { isLoading: isUpdatingTemplate }] = useUpdatePackageTemplateMutation();
  const { services: apiServices, loading: servicesLoading, fetchServices } = useServices();

  const dispatch = useDispatch<AppDispatch>();
  const staffMembers = useSelector((s: RootState) => (s as any).staff?.items ?? []);
  const staffOptions = useMemo(
    () => staffMembers.map((s: any) => ({
      id: s.id,
      name: s.fullName || `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Unnamed Staff",
    })),
    [staffMembers],
  );
  // True whenever this save will actually create a real, payable
  // client-package sale — the plain client-package path, OR "Generic
  // package" with a client picked too (creates a reusable template AND
  // sells a copy of it to that client in the same save). False for a
  // template-only save (Generic with no client picked) and for Calendar's
  // quick-create (never charges, never creates an appointment either way).
  const willCreateClientPackage = !quickCreateMode && !templateOnly && !lineItemMode && (!isGeneric || !!selectedClient);
  // Scheduling a future appointment only makes sense when a client package
  // actually gets created — no client to book the appointment for otherwise.
  const canScheduleServices = willCreateClientPackage;

  useEffect(() => { fetchServices({ limit: 200 }); }, []);
  // Needed both for the "sold by" Staff picker (showStaffPicker) and for each
  // service row's own "schedule appointment" staff picker — the latter is
  // available whenever this is a real, payable client-package sale.
  useEffect(() => { if (showStaffPicker || !isTemplateSave) dispatch(fetchStaffThunk()); }, [showStaffPicker, isTemplateSave]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update one service row — always a single setState so both fields apply atomically
  const updateService = (id: number, patch: Partial<NewService>) =>
    setServices(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));

  const addService    = () => setServices(p => [...p, newServiceRow()]);
  const removeService = (id: number) => {
    setServices(p => p.filter(s => s.id !== id));
    setDuplicateServiceError(null);
  };

  // Auto-sync package price from services total unless user manually set it
  const servicesTotal = services.reduce((sum, s) => sum + (s.price || 0), 0);

  // Live check for the "Expires after this many services" field — recomputed
  // on every render so it reacts as soon as either the typed cap or the
  // service rows change, not just at Save. A cap at or above the package's
  // own total sessions can never actually trigger (the package always runs
  // out of its own sessions first), so this catches it while typing instead
  // of only at submit.
  const totalSessionsSelected = services
    .filter(s => s.name.trim())
    .reduce((sum, s) => sum + (s.sessions || 0), 0);
  const expireAfterServicesNum = expireAfterServicesStr.trim() ? parseInt(expireAfterServicesStr, 10) : null;
  // Service-based expiry mode forces 1 session per row, so totalSessionsSelected
  // IS the service count — "expires after using all of them" (equal) is then a
  // real, complete scenario (the user's own single-service example: 1 service,
  // expires after 1), not a pointless cap. Off mode keeps the strict `<` — there,
  // a cap equal to total sessions really is redundant with natural exhaustion.
  const expireAfterServicesError =
    expireAfterServicesNum !== null && totalSessionsSelected > 0 &&
    (serviceBasedExpiry ? expireAfterServicesNum > totalSessionsSelected : expireAfterServicesNum >= totalSessionsSelected)
      ? serviceBasedExpiry
        ? `Can't be more than the number of services selected (${totalSessionsSelected}).`
        : `Must be less than the total sessions selected (${totalSessionsSelected}) — otherwise the package finishes on its own first and the cap never applies.`
      : null;
  useEffect(() => {
    if (!pkgPriceManual) {
      setPkgPrice(servicesTotal);
      setPkgPriceStr(servicesTotal > 0 ? String(servicesTotal) : "");
    }
  }, [servicesTotal, pkgPriceManual]);

  // Live pricing calculations
  const discountVal = discountType === "percent"
    ? parseFloat(((pkgPrice * Math.min(Math.max(discount, 0), 100)) / 100).toFixed(2))
    : Math.min(discount, pkgPrice);
  const afterDisc   = Math.max(0, pkgPrice - discountVal);
  const gstAmount   = parseFloat((afterDisc * gstPct / 100).toFixed(2));
  const totalAmount = parseFloat((afterDisc + gstAmount).toFixed(2));

  const frozenStyle = isFromTemplate ? { opacity: 0.6, cursor: "not-allowed" as const, background: "#f9fafb" } : undefined;

  // Earliest selectable expiry — must be strictly AFTER today, not today
  // itself: a same-day expiry means the package/template is born already
  // expired (expiry_date = purchase date + 0 days), which is exactly the
  // PKG 18/pac 27 data bug this validation exists to prevent.
  const minExpiryDate = new Date();
  minExpiryDate.setDate(minExpiryDate.getDate() + 1);
  const minExpiryStr = `${minExpiryDate.getFullYear()}-${String(minExpiryDate.getMonth() + 1).padStart(2, "0")}-${String(minExpiryDate.getDate()).padStart(2, "0")}`;

  const today = new Date();
  const minScheduleDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const clientFullName = selectedClient
    ? `${selectedClient.first_name} ${selectedClient.last_name ?? ""}`.trim()
    : "";

  const handleSave = async () => {
    if (isLoading || isSavingTemplate || isUpdatingTemplate) return;

    // "+ Sell Package" — no create/update API here at all. The definition
    // just gets handed back to the bill (see onAddLineItem's doc comment);
    // the real client_package is created later, at the bill's own checkout,
    // by the same backend path an existing "+ Package" row already uses.
    if (lineItemMode) {
      // Only the Catalogue entry point (PackageModule.tsx) shows this form's
      // own client picker — AppointmentModal's inline "+ Sell Package" never
      // does, because the client is already fixed by the bill it's opened
      // from (see the read-only display below instead).
      if (showClientPicker && !selectedClient) { setApiError("Please select a client."); return; }
      if (!pkgName.trim())                       { setApiError("Package name is required."); return; }
      if (!neverExpires && !expiry)              { setApiError("Set an expiry date or check 'Never expires'."); return; }
      if (!neverExpires && expiry < minExpiryStr) { setApiError("Expiry date must be after today."); return; }
      const validServices = services.filter(s => s.name.trim());
      if (validServices.length === 0)            { setApiError("Add at least one service."); return; }
      setApiError(null);
      onAddLineItem?.({
        name:     pkgName.trim(),
        price:    afterDisc,
        discount: discountVal,
        staffId:  staffId || undefined,
        services: validServices.map(s => ({
          serviceId:     s.catalogServiceId ?? undefined,
          serviceName:   s.name,
          totalSessions: s.sessions || 1,
          price:         s.price,
        })),
        neverExpires,
        expiryDate: neverExpires ? "" : expiry,
      });
      return;
    }

    if (!effectiveIsGeneric && !selectedClient) return;

    // Inline validation
    if (!pkgName.trim())                       { setApiError("Package name is required."); return; }
    if (!neverExpires && !expiry)              { setApiError("Set an expiry date or check 'Never expires'."); return; }
    if (!neverExpires && expiry < minExpiryStr) { setApiError("Expiry date must be after today."); return; }
    const validServices = services.filter(s => s.name.trim());
    if (validServices.length === 0)            { setApiError("Add at least one service."); return; }
    for (const s of validServices) {
      if (!s.scheduleEnabled) continue;
      if (!s.scheduleDate || !s.scheduleTime) { setApiError(`Set a date and time for "${s.name}"'s scheduled appointment, or turn scheduling off for it.`); return; }
      if (new Date(`${s.scheduleDate}T${s.scheduleTime}`).getTime() < Date.now()) {
        setApiError(`"${s.name}"'s scheduled appointment must be in the future.`); return;
      }
    }
    if (serviceBasedExpiry && !expireAfterServicesStr.trim()) {
      setApiError("Enter how many services this package should expire after, or turn off service-based expiry."); return;
    }
    const expireAfterServicesVal = expireAfterServicesStr.trim() ? parseInt(expireAfterServicesStr, 10) : null;
    if (expireAfterServicesStr.trim() && (!Number.isInteger(expireAfterServicesVal) || (expireAfterServicesVal as number) <= 0)) {
      setApiError("\"Expires after this many services\" must be a whole number greater than 0."); return;
    }
    // Same rule as the live check shown under the field itself while typing
    // (expireAfterServicesError) — blocks Save here too as a final gate, but
    // doesn't ALSO set apiError: that error is already visible inline right
    // under the field, so duplicating it into the banner below just repeats
    // the same message twice on screen.
    if (expireAfterServicesError) {
      // Clears any stale banner left over from a previous failed attempt on
      // a different check — otherwise an unrelated old message could still
      // be showing here while this field's own inline error is the real,
      // current problem.
      setApiError(null);
      return;
    }
    const methodMissing = !quickCreateMode && !templateOnly && (paymentMode === "single"
      ? !singleMethod
      : splitEntries.length === 0 || splitEntries.some(e => !e.method || !parseFloat(e.amount)));
    if (methodMissing)                         { setPayMethodError(true); return; }

    setApiError(null); setPayMethodError(false);

    try {
      if (isTemplateSave) {
        // Quick-create from Calendar never charges or touches a client's
        // account — always saves a reusable template. If a client was picked
        // (non-generic), fold their name in as a note for staff only; the
        // actual sale later happens normally via "+ Package" on a bill.
        const taggedName = !isGeneric && selectedClient
          ? `${pkgName.trim()} (for ${clientFullName})`
          : pkgName.trim();
        const templatePayload = {
          name:          taggedName,
          description:   pkgDescription.trim() || null,
          neverExpires,
          expiryMonths:  neverExpires ? null : dateToMonths(expiry),
          expiryDays:    neverExpires ? null : dateToDays(expiry),
          expireAfterServices: expireAfterServicesVal,
          basePrice:     pkgPrice,
          gstPercentage: gstPct,
          discount:      discountVal,
          ...(quickCreateMode || templateOnly ? {} : {
            paymentMethod: paymentMode === "split" ? "split" : toBackendPaymentMethod(singleMethod!),
          }),
          services: validServices.map(s => ({
            serviceName:   s.name,
            totalSessions: s.sessions || 1,
            price:         s.price,
          })),
        };
        const tmpl = editingTemplateId
          ? await updateTemplate({ id: editingTemplateId, data: templatePayload }).unwrap()
          : await createTemplate(templatePayload).unwrap();
        // Quick Sale/Calendar's "+Package" row caches the merged
        // templates+combo-packages catalog and only refetches it when empty
        // (see AppointmentModal.tsx) — without this, a new or edited
        // template stays invisible/stale there for the rest of the session.
        dispatch(setPackagesList([]));
        // Generic + a client picked: the template above is the reusable
        // definition; still fall through and sell an actual copy of it to
        // that client too, instead of stopping at "template saved" and
        // leaving the client with nothing. Pure template-only saves (no
        // client), editing an existing template, and Calendar's quick-create
        // all stop here, unchanged.
        if (!willCreateClientPackage) {
          onTemplateSaved?.(tmpl);
          return;
        }
      }

      const pkg = await createClientPackage({
        clientId:      String(selectedClient!.id),
        packageName:   pkgName.trim(),
        branch:        "",
        expiryDate:    neverExpires ? "2099-12-31" : expiry,
        expireAfterServices: expireAfterServicesVal,
        // Only ever non-empty here via the Generic-template-plus-client
        // fallthrough above (the Description field itself is hidden for a
        // plain direct sale — see the field's own comment below) — sent
        // regardless so that copy inherits the template's description too.
        description:   pkgDescription.trim() || null,
        basePrice:     pkgPrice,
        gstPercentage: gstPct,
        discount:      discountVal,
        paymentMethod: paymentMode === "split" ? "split" : toBackendPaymentMethod(singleMethod!),
        staffId:       staffId || undefined,
        services: validServices.map(s => ({
          serviceId:     s.catalogServiceId ?? undefined,
          serviceName:   s.name,
          totalSessions: s.sessions || 1,
          price:         s.price,
          ...(s.scheduleEnabled && s.scheduleDate && s.scheduleTime ? {
            schedule: {
              scheduledAt: new Date(`${s.scheduleDate}T${s.scheduleTime}`).toISOString(),
              staffId:     s.scheduleStaffId || undefined,
            },
          } : {}),
        })),
      });
      onSaved(pkg);
    } catch (err: any) {
      const noun = effectiveIsGeneric ? "template" : "package";
      setApiError(err?.message ?? `Failed to ${editingTemplateId ? "update" : "create"} ${noun}. Please try again.`);
    }
  };

  // Shared by both loaders below — populates every field a template itself
  // carries (name, expiry, services, pricing). What differs between them is
  // what happens AFTER: loadTemplate locks the fields and treats this as the
  // starting point for a NEW sale; loadTemplateForEdit leaves everything
  // open and treats it as editing the template itself in place.
  const applyTemplateFields = (t: PackageTemplate) => {
    setPkgName(t.name);
    setNeverExpires(t.neverExpires);
    setExpireAfterServicesStr(t.expireAfterServices != null ? String(t.expireAfterServices) : "");
    // Reflect the template's own state — otherwise a template saved WITH a
    // cap would load the value into a field the checkbox keeps hidden.
    setServiceBasedExpiry(t.expireAfterServices != null);
    // expiryDays (exact) is preferred — older templates saved before this fix
    // only have the approximate expiryMonths.
    if (!t.neverExpires && t.expiryDays != null) {
      const d = new Date();
      d.setDate(d.getDate() + t.expiryDays);
      // Use local date parts to avoid UTC timezone shift
      const y  = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const dy = String(d.getDate()).padStart(2, "0");
      setExpiry(`${y}-${mo}-${dy}`);
    } else if (!t.neverExpires && t.expiryMonths != null && t.expiryMonths > 0) {
      const d = new Date();
      d.setMonth(d.getMonth() + t.expiryMonths);
      const y  = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const dy = String(d.getDate()).padStart(2, "0");
      setExpiry(`${y}-${mo}-${dy}`);
    } else {
      setExpiry("");
    }
    const rows = t.services.map((s, i) => ({
      id:         Date.now() + i,
      name:       s.serviceName,
      catalogServiceId: null,
      sessions:   s.totalSessions,
      sessionsStr: String(s.totalSessions),
      price:      s.price,
      priceStr:   s.price > 0 ? String(s.price) : "",
      unitPrice:  s.totalSessions > 0 ? s.price / s.totalSessions : s.price,
      priceManual: true,
      scheduleEnabled: false, scheduleDate: "", scheduleTime: "", scheduleStaffId: "",
    }));
    setServices(rows);
    setPkgPrice(t.basePrice);
    setPkgPriceStr(String(t.basePrice));
    setPkgPriceManual(true);
    setGstPct(t.gstPercentage);
    setDiscount(t.discount);
    setDiscountStr(t.discount > 0 ? String(t.discount) : "");
    // Templates persist the discount as a flat ₹ figure — a leftover "%"
    // toggle from earlier typing must not reinterpret it as a percentage.
    setDiscountType("flat");
    setApiError(null);
  };

  const loadTemplate = (t: PackageTemplate) => {
    applyTemplateFields(t);
    setPaymentMode("single");
    setSingleMethod(fromBackendPaymentMethod(t.paymentMethod));
    setShowTemplatePicker(false);
    setIsFromTemplate(true);
    setIsGeneric(false);
  };

  // Templates tab (PackageTemplatesManager) edit path — unlike loadTemplate,
  // fields stay fully editable (isFromTemplate is never set) and the
  // template's own description carries over too, since editing the template
  // itself is the whole point here.
  const loadTemplateForEdit = (t: PackageTemplate) => {
    applyTemplateFields(t);
    setPkgDescription(t.description ?? "");
    setEditingTemplateId(t.id);
  };

  // Auto-load template when navigated from "Buy Existing Package" flow
  useEffect(() => {
    if (templateToLoad) loadTemplate(templateToLoad);
  }, [templateToLoad]); // eslint-disable-line react-hooks/exhaustive-deps

  // Templates tab: load the template being edited, or reset to a blank form
  // for a brand-new one. templateOnly-gated so this never fires for the
  // other entry points, which don't pass templateToEdit at all.
  useEffect(() => {
    if (!templateOnly) return;
    if (templateToEdit) {
      loadTemplateForEdit(templateToEdit);
    } else {
      setEditingTemplateId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateToEdit, templateOnly]);

  return (
    <>
      {/* Template picker modal */}
      {showTemplatePicker && (
        <>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 1060 }}
            onClick={() => setShowTemplatePicker(false)}
          />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            background: "#fff", borderRadius: 16, width: "min(560px,90vw)", maxHeight: "80vh",
            display: "flex", flexDirection: "column", zIndex: 1070,
            boxShadow: "0 24px 48px rgba(0,0,0,.18)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #ecedf0" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#11141a" }}>Choose a Template</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>All form fields will be pre-filled from the selected template.</div>
              </div>
              <button
                onClick={() => setShowTemplatePicker(false)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, border: "none", background: "#f0f1f3", borderRadius: 8, cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {templates.filter(t => t.neverExpires || t.expiryDays == null || t.expiryDays > 0).length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 20px", color: "#6b7280", fontSize: 13 }}>
                  No templates yet. Create templates from the <strong>Templates</strong> tab.
                </div>
              ) : templates.filter(t => t.neverExpires || t.expiryDays == null || t.expiryDays > 0).map(t => {
                const total = t.basePrice - t.discount + (t.basePrice - t.discount) * t.gstPercentage / 100;
                return (
                  <div
                    key={t.id}
                    onClick={() => loadTemplate(t)}
                    style={{
                      padding: "12px 16px", border: "1px solid #e5e7eb", borderRadius: 12,
                      cursor: "pointer", transition: "all .15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#7c3aed"; (e.currentTarget as HTMLElement).style.background = "#faf5ff"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb"; (e.currentTarget as HTMLElement).style.background = "#fff"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{t.name}</div>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                          {t.services.length} service{t.services.length !== 1 ? "s" : ""} · {t.neverExpires ? "Never expires" : `${t.expiryMonths} months`}
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#7c3aed" }}>{formatAmount(total)}</div>
                    </div>
                    <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {t.services.map(s => (
                        <span key={s.id} style={{ background: "#f5f3ff", color: "#5b21b6", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 500 }}>
                          {s.serviceName} ×{s.totalSessions}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.headerTitle}>
            {lineItemMode
              ? "Sell Custom Package"
              : templateOnly
                ? (editingTemplateId ? "Edit Package Template" : "Create Package Template")
                : (isGeneric && !selectedClient ? "Create Package Template" : "Create Package")}
          </h2>
          <p className={styles.headerSubtitle}>
            {lineItemMode ? "Added to this bill — paid together with everything else at checkout" : "Configure services and pricing"}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button onClick={onCancel} className={styles.btnSecondary}>Cancel</button>
        </div>
      </div>

      {/* ── Template Picker Banner ───────────────────────────────────────── */}
      {!effectiveIsGeneric && templates.length > 0 && (
        <div
          style={{
            background: "linear-gradient(135deg,#f5f3ff,#ede9fe)",
            border: "1px solid #c4b5fd",
            borderRadius: 10,
            padding: "10px 16px",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#5b21b6" }}>
              {isFromTemplate ? "Loaded from template" : "Use a predefined template"}
            </div>
            <div style={{ fontSize: 12, color: "#7c3aed", marginTop: 1 }}>
              {isFromTemplate
                ? "Fields are locked to the template — only the payment method can be changed."
                : `${templates.length} template${templates.length !== 1 ? "s" : ""} available — auto-fill services & pricing`}
            </div>
          </div>
          <button
            onClick={() => setShowTemplatePicker(true)}
            style={{
              background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8,
              padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "Inter, sans-serif", whiteSpace: "nowrap",
            }}
          >
            Choose Template
          </button>
        </div>
      )}

      {/* ── Package details ─────────────────────────────────────────────────── */}
      <div className={styles.card} style={{ marginBottom: 12 }}>
        <div className={styles.cardHead}>
          <div className={styles.cardTitle}>Package details</div>
        </div>
        <div className={styles.cardBody}>
          {showClientPicker && !quickCreateMode && !templateOnly && (
            <div className={styles.formField} style={{ marginBottom: 14 }}>
              <label className={`${styles.formLabel} ${isGeneric ? "" : styles.formLabelRequired}`}>
                Client{isGeneric ? " (optional)" : ""}
              </label>
              <ClientSelectorWithAdd
                defaultClient={selectedClient}
                onSelect={onClientChange}
                onClear={() => onClientChange(null)}
                placeholder="Search client by name or phone…"
              />
            </div>
          )}
          {lineItemMode && !showClientPicker && selectedClient && (
            <div className={styles.formField} style={{ marginBottom: 14 }}>
              <label className={styles.formLabel}>Client</label>
              <div style={{ padding: "8px 10px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, color: "#111827", fontWeight: 600 }}>
                {clientFullName}
              </div>
            </div>
          )}
          {showStaffPicker && !templateOnly && (
            <div className={styles.formField} style={{ marginBottom: 14 }}>
              <label className={styles.formLabel}>Staff</label>
              <StaffSearchInput
                value={staffId}
                options={staffOptions}
                onChange={setStaffId}
              />
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className={styles.formField}>
              <label className={`${styles.formLabel} ${styles.formLabelRequired}`}>Package name</label>
              <input
                value={pkgName}
                onChange={e => setPkgName(e.target.value)}
                className={styles.input}
                placeholder="e.g. Glow Package"
                disabled={isFromTemplate}
                style={frozenStyle}
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Expiry date</label>
              <DatePicker
                value={expiry}
                min={minExpiryStr}
                onChange={setExpiry}
                className="dp--block"
                disabled={neverExpires || isFromTemplate}
              />
              <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, cursor: isFromTemplate ? "not-allowed" : "pointer", fontSize: 12, color: "#6b7280", userSelect: "none" }}>
                <input
                  type="checkbox"
                  checked={neverExpires}
                  onChange={e => { setNeverExpires(e.target.checked); if (e.target.checked) setExpiry(""); }}
                  disabled={isFromTemplate}
                  style={{ width: 14, height: 14, cursor: isFromTemplate ? "not-allowed" : "pointer", accentColor: "#111827" }}
                />
                Never expires
              </label>
            </div>
          </div>

          {/* Full width — a description is prose, so it reads badly squeezed
              into one half of the two-column grid above. Editable only on
              the template path; a plain direct sale has no UI for typing one
              (kept simple rather than adding a rarely-used field there),
              though the column itself can hold one — see the payload below. */}
          {isTemplateSave && (
            <div className={styles.formField} style={{ marginTop: 12 }}>
              <label className={styles.formLabel}>Description</label>
              <textarea
                value={pkgDescription}
                onChange={e => setPkgDescription(e.target.value)}
                className={styles.input}
                placeholder="What's included, terms, or anything staff should know before selling this package"
                rows={3}
                disabled={isFromTemplate}
                style={{ ...frozenStyle, resize: "vertical", minHeight: 68, fontFamily: "inherit" }}
              />
            </div>
          )}


          {!templateOnly && !lineItemMode && (
            <label
              style={{
                display: "flex", alignItems: "flex-start", gap: 8, marginTop: 14,
                padding: "10px 12px", background: isGeneric ? "#f5f3ff" : "#f9fafb",
                border: `1px solid ${isGeneric ? "#c4b5fd" : "#e5e7eb"}`, borderRadius: 10,
                cursor: isFromTemplate ? "not-allowed" : "pointer", userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={isGeneric}
                disabled={isFromTemplate}
                onChange={e => setIsGeneric(e.target.checked)}
                style={{ width: 15, height: 15, marginTop: 1, cursor: isFromTemplate ? "not-allowed" : "pointer", accentColor: "#7c3aed", flexShrink: 0 }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Generic package</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>
                  Also save this as a reusable template on the Templates tab, ready to sell to anyone later.
                  {selectedClient
                    ? ` ${clientFullName || "The selected client"} will also get their own copy of it now.`
                    : " Leave the client blank to save the template only, with nothing sold yet."}
                </div>
              </div>
            </label>
          )}
        </div>
      </div>

      {/* ── Services ────────────────────────────────────────────────────────── */}
      <div className={styles.card} style={{ marginBottom: 12 }}>
        <div className={styles.cardHead}>
          <div className={styles.cardTitle}>Services Included</div>
          {!isFromTemplate && (
            <button onClick={addService} className={styles.btnSecondary} style={{ padding: "3px 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
              <Plus size={12} /> Add service
            </button>
          )}
        </div>
        <div className={styles.cardBody}>
          {duplicateServiceError && (
            <div style={{ fontSize: 12.5, color: "#dc2626", fontWeight: 500, marginBottom: 8, padding: "7px 10px", background: "#fef2f2", borderRadius: 6, border: "1px solid #fecaca" }}>
              {duplicateServiceError}
            </div>
          )}
          {scheduleWarning && (
            <div style={{ fontSize: 12.5, color: "#b45309", fontWeight: 500, marginBottom: 8, padding: "7px 10px", background: "#fffbeb", borderRadius: 6, border: "1px solid #fde68a", display: "flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={13} /> {scheduleWarning}
            </div>
          )}
          {(() => {
            const gridCols = [
              "1fr", "80px", "110px",
              ...(canScheduleServices ? ["32px"] : []),
              ...(isFromTemplate ? [] : ["32px"]),
            ].join(" ");
            return (
          <>
          <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 8, marginBottom: 6 }}>
            {[
              "Service name", "Sessions", `Price (${currencySymbol})`,
              ...(canScheduleServices ? [""] : []),
              ...(isFromTemplate ? [] : [""]),
            ].map((h, i) => (
              <div key={`${h}-${i}`} style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: ".04em" }}>{h}</div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {services.map(svc => (
              <div key={svc.id} style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 8, borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 8, alignItems: "center" }}>
                <ServiceSearchInput
                  value={svc.name}
                  options={apiServices}
                  loading={servicesLoading}
                  disabled={isFromTemplate}
                  onChange={picked => {
                    const pickedId = picked.id != null ? String(picked.id) : null;
                    // Same catalog ID picked twice is always a duplicate. Two
                    // different catalog entries sharing a display name (e.g. two
                    // "Hair Cut" rows at different prices) are NOT duplicates —
                    // that's the whole point of matching by ID.
                    const isDuplicate = services.some(s => {
                      if (s.id === svc.id) return false;
                      if (pickedId && s.catalogServiceId) return s.catalogServiceId === pickedId;
                      return s.name.trim().toLowerCase() === picked.name.trim().toLowerCase();
                    });
                    if (isDuplicate) {
                      setDuplicateServiceError(`"${picked.name}" is already added below — increase its Sessions instead of adding it again.`);
                      return;
                    }
                    setDuplicateServiceError(null);
                    const unitPrice = picked.price != null ? parseFloat(String(picked.price)) || 0 : svc.unitPrice;
                    const total = unitPrice * svc.sessions;
                    updateService(svc.id, {
                      name:      picked.name,
                      catalogServiceId: pickedId,
                      unitPrice,
                      priceManual: false,
                      priceStr:  total > 0 ? String(total) : "",
                      price:     total,
                    });
                  }}
                  onSearch={q => fetchServices({ search: q, limit: 30 })}
                />
                <input
                  type="number"
                  min={1}
                  value={svc.sessionsStr}
                  onChange={e => {
                    const val = e.target.value;
                    const sessions = Math.max(1, parseInt(val) || 1);
                    if (svc.priceManual) {
                      // User already hand-set the price — just track the new count.
                      updateService(svc.id, { sessionsStr: val, sessions });
                    } else {
                      // Scale the price with the per-session unit price.
                      const total = svc.unitPrice * sessions;
                      updateService(svc.id, {
                        sessionsStr: val, sessions,
                        price: total, priceStr: total > 0 ? String(total) : "",
                      });
                    }
                  }}
                  onFocus={e => e.target.select()}
                  className={styles.input}
                  style={{ textAlign: "center", ...frozenStyle, ...(serviceBasedExpiry ? { opacity: 0.6, cursor: "not-allowed" } : {}) }}
                  disabled={isFromTemplate || serviceBasedExpiry}
                  title={serviceBasedExpiry ? "Locked to 1 — service-based expiry is on" : undefined}
                />
                <div className={styles.inputPrefix}>
                  <span className={styles.inputPrefixSymbol}>{currencySymbol}</span>
                  <input
                    type="number"
                    min={0}
                    value={svc.priceStr}
                    placeholder="0"
                    onChange={e => {
                      const val = e.target.value;
                      updateService(svc.id, { priceStr: val, price: parseFloat(val) || 0, priceManual: true });
                    }}
                    onFocus={e => e.target.select()}
                    className={styles.input}
                    style={frozenStyle}
                    disabled={isFromTemplate}
                  />
                </div>
                {canScheduleServices && (
                  <button
                    type="button"
                    title={svc.scheduleEnabled ? "Remove scheduled appointment" : "Schedule a future appointment for this service"}
                    onClick={() => {
                      if (!svc.scheduleEnabled && !svc.catalogServiceId) {
                        setScheduleWarning(`"${svc.name || "This service"}" must be picked from the catalog search before it can be scheduled.`);
                        return;
                      }
                      setScheduleWarning(null);
                      updateService(svc.id, { scheduleEnabled: !svc.scheduleEnabled });
                    }}
                    className={styles.btnSecondary}
                    style={{
                      padding: 0, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                      color: svc.scheduleEnabled ? "#7c3aed" : undefined,
                      background: svc.scheduleEnabled ? "#f5f3ff" : undefined,
                      borderColor: svc.scheduleEnabled ? "#c4b5fd" : undefined,
                    }}
                  >
                    <CalendarClock size={14} />
                  </button>
                )}
                {!isFromTemplate && (
                  <button
                    onClick={() => removeService(svc.id)}
                    className={styles.btnDanger}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              {svc.scheduleEnabled && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "8px 10px", background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 8 }}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Date</label>
                    <DatePicker
                      min={minScheduleDateStr}
                      value={svc.scheduleDate}
                      onChange={d => updateService(svc.id, { scheduleDate: d })}
                      className="dp--block"
                    />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Time</label>
                    <TimeSelect
                      value={svc.scheduleTime}
                      onChange={val => updateService(svc.id, { scheduleTime: val })}
                      placeholder="Time"
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Staff</label>
                    <StaffSearchInput
                      value={svc.scheduleStaffId}
                      options={staffOptions}
                      onChange={id => updateService(svc.id, { scheduleStaffId: id })}
                    />
                  </div>
                </div>
              )}
              </div>
            ))}
          </div>
          </>
            );
          })()}

          {/* Aggregate-session cap — independent of the date expiry set in
              Package details above, whichever is hit first ends the package.
              Template-only: never shown for lineItemMode's custom
              on-the-spot package builder. Moved here (after the service
              rows, once at least one is actually picked) since the cap only
              makes sense in relation to the services just selected above. */}
          {!lineItemMode && services.some(s => s.name.trim()) && (
            <div style={{ marginTop: 14 }}>
              <label
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  cursor: isFromTemplate ? "not-allowed" : "pointer", userSelect: "none",
                  fontSize: 12.5, fontWeight: 600, color: "#111827",
                }}
              >
                <input
                  type="checkbox"
                  checked={serviceBasedExpiry}
                  disabled={isFromTemplate}
                  onChange={e => {
                    const checked = e.target.checked;
                    setServiceBasedExpiry(checked);
                    if (checked) {
                      // Force every row to exactly 1 session — mirrors the same
                      // per-row Sessions onChange logic above (rescale price
                      // unless the user already hand-set it).
                      setServices(prev => prev.map(s => {
                        if (s.priceManual) return { ...s, sessions: 1, sessionsStr: "1" };
                        const total = s.unitPrice * 1;
                        return { ...s, sessions: 1, sessionsStr: "1", price: total, priceStr: total > 0 ? String(total) : "" };
                      }));
                    } else {
                      // Field below is about to hide — clear it so a stale
                      // value can't silently ride along on submit.
                      setExpireAfterServicesStr("");
                    }
                  }}
                  style={{ width: 14, height: 14, cursor: isFromTemplate ? "not-allowed" : "pointer", accentColor: "#111827" }}
                />
                Enable service-based expiry
              </label>
              <div style={{ marginTop: 2, marginLeft: 20, fontSize: 11, color: "#9ca3af" }}>
                Locks every service to 1 session each and closes the package after a set number of services are used, instead of tracking sessions per service.
              </div>

              {serviceBasedExpiry && (
                <div className={styles.formField} style={{ marginTop: 10, marginLeft: 20, maxWidth: 280 }}>
                  <label className={styles.formLabel}>Expires after this many services</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={expireAfterServicesStr}
                    onChange={e => setExpireAfterServicesStr(e.target.value.replace(/[^0-9]/g, ""))}
                    className={styles.input}
                    placeholder="e.g. 5"
                    disabled={isFromTemplate}
                    style={expireAfterServicesError ? { ...frozenStyle, borderColor: "#ef4444" } : frozenStyle}
                  />
                  {expireAfterServicesError ? (
                    <span style={{ display: "block", marginTop: 4, fontSize: 11, color: "#ef4444", fontWeight: 500 }}>
                      {expireAfterServicesError}
                    </span>
                  ) : (
                    <span style={{ display: "block", marginTop: 4, fontSize: 11, color: "#9ca3af" }}>
                      Closes the package once this many services (across all rows, 1 session each) have been used — required while this is on.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Pricing summary ──────────────────────────────────────────────────── */}
      <div className={styles.card} style={{ marginBottom: 12 }}>
        <div className={styles.cardHead}>
          <div className={styles.cardTitle}>Pricing</div>
        </div>
        <div className={styles.cardBody}>
          <div style={{ display: "grid", gridTemplateColumns: lineItemMode ? "1fr 1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div className={styles.formField}>
              <label className={`${styles.formLabel} ${styles.formLabelRequired}`}>Package price ({currencySymbol})</label>
              <div className={styles.inputPrefix}>
                <span className={styles.inputPrefixSymbol}>{currencySymbol}</span>
                <input
                  type="number"
                  min={0}
                  value={pkgPriceStr}
                  placeholder="0"
                  onChange={e => {
                    const val = e.target.value;
                    setPkgPriceStr(val);
                    setPkgPrice(parseFloat(val) || 0);
                    setPkgPriceManual(true);
                  }}
                  onFocus={e => e.target.select()}
                  className={styles.input}
                  style={frozenStyle}
                  disabled={isFromTemplate}
                />
              </div>
            </div>
            {!lineItemMode && (
              <div className={styles.formField}>
                <label className={styles.formLabel}>GST (%)</label>
                <select value={gstPct} onChange={e => setGstPct(+e.target.value)} className={styles.select} style={frozenStyle} disabled={isFromTemplate}>
                  {GST_OPTIONS.map(g => <option key={g} value={g}>{g === 0 ? "0% (Exempt)" : `${g}%`}</option>)}
                </select>
              </div>
            )}
            <div className={styles.formField}>
              <label className={styles.formLabel}>Discount</label>
              <div style={{ display: "flex", gap: 6 }}>
                <div className={styles.inputPrefix} style={{ flex: 1 }}>
                  <span className={styles.inputPrefixSymbol}>{discountType === "percent" ? "%" : currencySymbol}</span>
                  <input
                    type="number"
                    min={0}
                    max={discountType === "percent" ? 100 : undefined}
                    value={discountStr}
                    placeholder="0"
                    onChange={e => { setDiscountStr(e.target.value); setDiscount(parseFloat(e.target.value) || 0); }}
                    style={frozenStyle}
                    disabled={isFromTemplate}
                    onFocus={e => e.target.select()}
                    className={styles.input}
                  />
                </div>
                <select
                  value={discountType}
                  onChange={e => setDiscountType(e.target.value as "flat" | "percent")}
                  className={styles.select}
                  style={{ width: 64, flexShrink: 0, ...(frozenStyle ?? {}) }}
                  disabled={isFromTemplate}
                  aria-label="Discount type"
                >
                  <option value="flat">{currencySymbol}</option>
                  <option value="percent">%</option>
                </select>
              </div>
            </div>
          </div>

          {/* Live price breakdown */}
          <div className={styles.priceBox}>
            <div className={styles.priceRow}>
              <span>Package price</span>
              <span>{formatAmount(pkgPrice)}</span>
            </div>
            {discountVal > 0 && (
              <div className={`${styles.priceRow} ${styles["priceRow--accent"]}`}>
                <span>Discount{discountType === "percent" ? ` (${Math.min(Math.max(discount, 0), 100)}%)` : ""}</span>
                <span>− {formatAmount(discountVal)}</span>
              </div>
            )}
            {gstPct > 0 && (
              <div className={styles.priceRow}>
                <span>GST ({gstPct}%)</span>
                <span>{formatAmount(gstAmount)}</span>
              </div>
            )}
            <div className={`${styles.priceRow} ${styles["priceRow--total"]}`}>
              <span>Total amount</span>
              <span>{formatAmount(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Payment method ───────────────────────────────────────────────────── */}
      {!quickCreateMode && !templateOnly && !lineItemMode && (
      <div className={styles.card} style={{ marginBottom: 12 }}>
        <div className={styles.cardBody}>
          <PaymentMethodPicker
            methods={PKG_PAYMENT_METHODS}
            paymentMode={paymentMode}
            onSetPaymentMode={(m) => { setPaymentMode(m); setPayMethodError(false); }}
            singleMethod={singleMethod}
            onSetSingleMethod={(m) => { setSingleMethod(m); setPayMethodError(false); }}
            splitEntries={splitEntries}
            onSetSplitEntries={(entries) => { setSplitEntries(entries); setPayMethodError(false); }}
            payMethodError={payMethodError}
            totalToCollect={totalAmount}
            partialAmtInput=""
            onSetPartialAmt={() => {}}
            printAfterPayment={false}
            onTogglePrint={() => {}}
            showDueRow={false}
            showPrintOption={false}
          />
        </div>
      </div>
      )}

      {/* Error */}
      {apiError && (
        <div style={{ fontSize: 13, color: "#dc2626", fontWeight: 500, marginBottom: 10, padding: "8px 12px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" }}>
          {apiError}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onCancel} className={styles.btnSecondary} style={{ flex: 1 }} disabled={isLoading || isSavingTemplate || isUpdatingTemplate}>
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={(!lineItemMode && !effectiveIsGeneric && !selectedClient) || isLoading || isSavingTemplate || isUpdatingTemplate}
          className={styles.btnPrimary}
          style={{ flex: 2 }}
        >
          {isLoading || isSavingTemplate || isUpdatingTemplate
            ? <><Loader2 size={14} className={styles.spin} /> {willCreateClientPackage ? "Creating…" : (editingTemplateId ? "Saving…" : "Saving template…")}</>
            : lineItemMode
              ? "Add to Bill"
              : willCreateClientPackage
                ? (isGeneric ? "Create Template & Package" : "Create Package")
                : (editingTemplateId ? "Save Changes" : "Create Template")}
        </button>
      </div>
    </>
  );
};

// ── Searchable service picker ─────────────────────────────────────────────────
const ServiceSearchInput: React.FC<{
  value: string;
  options: Service[];
  loading: boolean;
  onChange: (svc: Service) => void;
  onSearch: (q: string) => void;
  disabled?: boolean;
}> = ({ value, options, loading, onChange, onSearch, disabled = false }) => {
  const { formatAmount } = useCurrency();
  const [query, setQuery] = useState(value);
  const [open,  setOpen]  = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const t = setTimeout(() => onSearch(query), 300);
    return () => clearTimeout(t);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const filtered = options.filter(o =>
    String(o.name).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <Search size={12} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
        <input
          className={styles.input}
          style={disabled ? { paddingLeft: 28, opacity: 0.6, cursor: "not-allowed", background: "#f9fafb" } : { paddingLeft: 28 }}
          value={query}
          placeholder={loading ? "Loading…" : "Search service…"}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => !disabled && setOpen(true)}
          disabled={disabled}
        />
      </div>
      {open && !disabled && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,.10)", zIndex: 200, maxHeight: 200, overflowY: "auto" }}>
          {loading && <div style={{ padding: "10px 12px", fontSize: 12, color: "#9ca3af" }}>Loading…</div>}
          {!loading && filtered.length === 0 && <div style={{ padding: "10px 12px", fontSize: 12, color: "#9ca3af" }}>No services found</div>}
          {filtered.map(svc => {
            const name  = String(svc.name);
            const price = parseFloat(String(svc.price)) || 0;
            const isSelected = name === value;
            return (
              <div
                key={String(svc.id)}
                // Don't force the display text here — let the `value` prop's own
                // useEffect below be the single source of truth. If the parent
                // rejects this pick (e.g. a duplicate service), `value` won't
                // change, so the box correctly doesn't show a pick that never applied.
                onMouseDown={() => { onChange(svc); setOpen(false); }}
                style={{ padding: "9px 12px", fontSize: 13, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", background: isSelected ? "#f5f3ff" : undefined }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "#f9fafb"; }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = isSelected ? "#f5f3ff" : ""; }}
              >
                <span style={{ color: isSelected ? "#7c3aed" : "#111827", fontWeight: isSelected ? 600 : 400 }}>{name}</span>
                {price > 0 && <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>{formatAmount(price)}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Searchable staff picker (client-side filter, same scrollable dropdown as
// ServiceSearchInput above — staff list is small and already in Redux). ─────
const StaffSearchInput: React.FC<{
  value: string;
  options: { id: string | number; name: string }[];
  onChange: (id: string) => void;
}> = ({ value, options, onChange }) => {
  const [query, setQuery] = useState("");
  const [open,  setOpen]  = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => String(o.id) === value);
  const displayValue = open ? query : (selected?.name ?? "");

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const filtered = query.trim()
    ? options.filter(o => o.name.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <Search size={12} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
        <input
          className={styles.input}
          style={{ paddingLeft: 28 }}
          value={displayValue}
          placeholder="Search staff…"
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setQuery(""); setOpen(true); }}
        />
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,.10)", zIndex: 200, maxHeight: 200, overflowY: "auto" }}>
          <div
            onMouseDown={() => { onChange(""); setQuery(""); setOpen(false); }}
            style={{ padding: "9px 12px", fontSize: 13, cursor: "pointer", color: "#6b7280" }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#f9fafb"}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = ""}
          >
            Choose a staff member…
          </div>
          {filtered.length === 0 && <div style={{ padding: "10px 12px", fontSize: 12, color: "#9ca3af" }}>No staff found</div>}
          {filtered.map(o => {
            const isSelected = String(o.id) === value;
            return (
              <div
                key={String(o.id)}
                onMouseDown={() => { onChange(String(o.id)); setQuery(""); setOpen(false); }}
                style={{ padding: "9px 12px", fontSize: 13, cursor: "pointer", background: isSelected ? "#f5f3ff" : undefined }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "#f9fafb"; }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = isSelected ? "#f5f3ff" : ""; }}
              >
                <span style={{ color: isSelected ? "#7c3aed" : "#111827", fontWeight: isSelected ? 600 : 400 }}>{o.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PackageCreateForm;
