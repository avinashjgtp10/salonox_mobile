// src/components/packages/PackageCreateForm.tsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Loader2, Search, Plus, X } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import styles from "./packages.module.scss";
import type { ClientPackage, PackageTemplate } from "../../services/api/endpoints/packages.endpoints";
import { useListPackageTemplatesQuery, useCreatePackageTemplateMutation } from "../../services/api/endpoints/packages.endpoints";
import type { ClientSearchResult } from "../../features/clients/components/ClientSearchInput";
import ClientSelectorWithAdd from "./ClientSelectorWithAdd";
import { useCreateClientPackage } from "../../hooks/packages/usePackages";
import { fetchStaffThunk } from "../../middleware/staff/staff.thunk";
import { useServices } from "../../features/catalog/hooks/useServices";
import type { Service } from "../../features/catalog/types/catalog.types";
import { PaymentMethodPicker, type PaymentSplitEntry } from "../shared/PaymentMethodPicker";
import { useCurrency } from "../../hooks/useCurrency";

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

const PKG_PAYMENT_METHODS = ["Cash", "Card", "UPI", "Net banking"];
const toBackendPaymentMethod = (label: string) => label.toLowerCase().replace(/\s+/g, "_");
const fromBackendPaymentMethod = (id: string) =>
  PKG_PAYMENT_METHODS.find(m => toBackendPaymentMethod(m) === id) ?? "Cash";

function newServiceRow(): NewService {
  return {
    id: Date.now(), name: "", catalogServiceId: null, sessions: 1, sessionsStr: "1", price: 0, priceStr: "",
    unitPrice: 0, priceManual: false,
  };
}

const PackageCreateForm: React.FC<Props> = ({
  selectedClient, onClientChange, onCancel, onSaved, onTemplateSaved, templateToLoad,
  quickCreateMode = false, showClientPicker = false, showStaffPicker = false,
}) => {
  const { currencySymbol, formatAmount } = useCurrency();
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const { data: templates = [] } = useListPackageTemplatesQuery();

  const [pkgName,           setPkgName]          = useState("");
  const [expiry,            setExpiry]           = useState("");
  const [neverExpires,      setNeverExpires]      = useState(false);
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
  // A generic package is a reusable Package Template (same as the Templates tab)
  // rather than a package sold to one specific client — no client is required,
  // but services are still selected the same way as a normal custom package.
  const [isGeneric,         setIsGeneric]        = useState(false);
  // When a template is loaded (either via the "Buy Existing Package" entry
  // point or the in-form "Choose Template" picker), everything except the
  // payment method is locked to what the template defines.
  const [isFromTemplate,    setIsFromTemplate]   = useState(false);
  const [staffId,           setStaffId]          = useState("");

  const { createClientPackage, isLoading } = useCreateClientPackage();
  const [createTemplate, { isLoading: isSavingTemplate }] = useCreatePackageTemplateMutation();
  const { services: apiServices, loading: servicesLoading, fetchServices } = useServices();

  const dispatch = useDispatch<AppDispatch>();
  const staffMembers = useSelector((s: RootState) => (s as any).staff?.items ?? []);

  useEffect(() => { fetchServices({ limit: 200 }); }, []);
  useEffect(() => { if (showStaffPicker) dispatch(fetchStaffThunk()); }, [showStaffPicker]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const clientFullName = selectedClient
    ? `${selectedClient.first_name} ${selectedClient.last_name ?? ""}`.trim()
    : "";

  const handleSave = async () => {
    if (isLoading || isSavingTemplate) return;
    if (!isGeneric && !selectedClient) return;

    // Inline validation
    if (!pkgName.trim())                       { setApiError("Package name is required."); return; }
    if (!neverExpires && !expiry)              { setApiError("Set an expiry date or check 'Never expires'."); return; }
    if (!neverExpires && expiry < minExpiryStr) { setApiError("Expiry date must be after today."); return; }
    const validServices = services.filter(s => s.name.trim());
    if (validServices.length === 0)            { setApiError("Add at least one service."); return; }
    const methodMissing = !quickCreateMode && (paymentMode === "single"
      ? !singleMethod
      : splitEntries.length === 0 || splitEntries.some(e => !e.method || !parseFloat(e.amount)));
    if (methodMissing)                         { setPayMethodError(true); return; }

    setApiError(null); setPayMethodError(false);

    try {
      if (isGeneric || quickCreateMode) {
        // Quick-create from Calendar never charges or touches a client's
        // account — always saves a reusable template. If a client was picked
        // (non-generic), fold their name in as a note for staff only; the
        // actual sale later happens normally via "+ Package" on a bill.
        const taggedName = !isGeneric && selectedClient
          ? `${pkgName.trim()} (for ${clientFullName})`
          : pkgName.trim();
        const tmpl = await createTemplate({
          name:          taggedName,
          neverExpires,
          expiryMonths:  neverExpires ? null : dateToMonths(expiry),
          expiryDays:    neverExpires ? null : dateToDays(expiry),
          basePrice:     pkgPrice,
          gstPercentage: gstPct,
          discount:      discountVal,
          ...(quickCreateMode ? {} : {
            paymentMethod: paymentMode === "split" ? "split" : toBackendPaymentMethod(singleMethod!),
          }),
          services: validServices.map(s => ({
            serviceName:   s.name,
            totalSessions: s.sessions || 1,
            price:         s.price,
          })),
        }).unwrap();
        onTemplateSaved?.(tmpl);
        return;
      }

      const pkg = await createClientPackage({
        clientId:      String(selectedClient!.id),
        packageName:   pkgName.trim(),
        branch:        "",
        expiryDate:    neverExpires ? "2099-12-31" : expiry,
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
        })),
      });
      onSaved(pkg);
    } catch (err: any) {
      setApiError(err?.message ?? `Failed to create ${isGeneric ? "template" : "package"}. Please try again.`);
    }
  };

  const loadTemplate = (t: PackageTemplate) => {
    setPkgName(t.name);
    setNeverExpires(t.neverExpires);
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
    setPaymentMode("single");
    setSingleMethod(fromBackendPaymentMethod(t.paymentMethod));
    setShowTemplatePicker(false);
    setApiError(null);
    setIsFromTemplate(true);
    setIsGeneric(false);
  };

  // Auto-load template when navigated from "Buy Existing Package" flow
  useEffect(() => {
    if (templateToLoad) loadTemplate(templateToLoad);
  }, [templateToLoad]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <h2 className={styles.headerTitle}>{isGeneric ? "Create Package Template" : "Create Package"}</h2>
          <p className={styles.headerSubtitle}>Configure services and pricing</p>
        </div>
        <div className={styles.headerActions}>
          <button onClick={onCancel} className={styles.btnSecondary}>Cancel</button>
        </div>
      </div>

      {/* ── Template Picker Banner ───────────────────────────────────────── */}
      {!isGeneric && templates.length > 0 && (
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
          {showClientPicker && !isGeneric && (
            <div className={styles.formField} style={{ marginBottom: 14 }}>
              <label className={`${styles.formLabel} ${styles.formLabelRequired}`}>Client</label>
              <ClientSelectorWithAdd
                defaultClient={selectedClient}
                onSelect={onClientChange}
                onClear={() => onClientChange(null)}
                placeholder="Search client by name or phone…"
              />
            </div>
          )}
          {showStaffPicker && (
            <div className={styles.formField} style={{ marginBottom: 14 }}>
              <label className={styles.formLabel}>Staff</label>
              <StaffSearchInput
                value={staffId}
                options={staffMembers.map((s: any) => ({
                  id: s.id,
                  name: s.fullName || `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Unnamed Staff",
                }))}
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
              <input
                type="date"
                value={expiry}
                min={minExpiryStr}
                onChange={e => setExpiry(e.target.value)}
                className={styles.input}
                disabled={neverExpires || isFromTemplate}
                style={neverExpires || isFromTemplate ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
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
                Save this as a reusable template instead of selling it to a client — it'll show up on the Templates tab, ready to sell to anyone later.
              </div>
            </div>
          </label>
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
          <div style={{ display: "grid", gridTemplateColumns: isFromTemplate ? "1fr 80px 110px" : "1fr 80px 110px 32px", gap: 8, marginBottom: 6 }}>
            {["Service name", "Sessions", `Price (${currencySymbol})`, ...(isFromTemplate ? [] : [""])].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: ".04em" }}>{h}</div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {services.map(svc => (
              <div key={svc.id} style={{ display: "grid", gridTemplateColumns: isFromTemplate ? "1fr 80px 110px" : "1fr 80px 110px 32px", gap: 8, alignItems: "center" }}>
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
                  style={{ textAlign: "center", ...frozenStyle }}
                  disabled={isFromTemplate}
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
                {!isFromTemplate && (
                  <button
                    onClick={() => removeService(svc.id)}
                    className={styles.btnDanger}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pricing summary ──────────────────────────────────────────────────── */}
      <div className={styles.card} style={{ marginBottom: 12 }}>
        <div className={styles.cardHead}>
          <div className={styles.cardTitle}>Pricing</div>
        </div>
        <div className={styles.cardBody}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
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
            <div className={styles.formField}>
              <label className={styles.formLabel}>GST (%)</label>
              <select value={gstPct} onChange={e => setGstPct(+e.target.value)} className={styles.select} style={frozenStyle} disabled={isFromTemplate}>
                {GST_OPTIONS.map(g => <option key={g} value={g}>{g === 0 ? "0% (Exempt)" : `${g}%`}</option>)}
              </select>
            </div>
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
      {!quickCreateMode && (
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
        <button onClick={onCancel} className={styles.btnSecondary} style={{ flex: 1 }} disabled={isLoading || isSavingTemplate}>
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={(!isGeneric && !selectedClient) || isLoading || isSavingTemplate}
          className={styles.btnPrimary}
          style={{ flex: 2 }}
        >
          {isLoading || isSavingTemplate
            ? <><Loader2 size={14} className={styles.spin} /> {isGeneric ? "Saving template…" : "Creating…"}</>
            : isGeneric ? "Create Template" : "Create Package"}
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
