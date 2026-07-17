// src/components/packages/PackageCreateForm.tsx
import React, { useState, useEffect, useRef } from "react";
import { User, Loader2, Search, Plus, X } from "lucide-react";
import styles from "./packages.module.scss";
import type { ClientPackage, PackageTemplate } from "../../services/api/endpoints/packages.endpoints";
import { useListPackageTemplatesQuery, useCreatePackageTemplateMutation } from "../../services/api/endpoints/packages.endpoints";
import type { ClientSearchResult } from "../../features/clients/components/ClientSearchInput";
import ClientSelectorWithAdd from "./ClientSelectorWithAdd";
import { useCreateClientPackage } from "../../hooks/packages/usePackages";
import { useServices } from "../../features/catalog/hooks/useServices";
import type { Service } from "../../features/catalog/types/catalog.types";
import { PaymentMethodPicker, type PaymentSplitEntry } from "../shared/PaymentMethodPicker";

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
  onSaved:          (pkg: ClientPackage) => void;
  /** Called instead of onSaved when the "Generic package" toggle is on and a
   *  reusable Package Template was created rather than a client-specific package. */
  onTemplateSaved?: (tmpl: PackageTemplate) => void;
  templateToLoad?:  PackageTemplate | null;
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

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function newServiceRow(): NewService {
  return {
    id: Date.now(), name: "", catalogServiceId: null, sessions: 1, sessionsStr: "1", price: 0, priceStr: "",
    unitPrice: 0, priceManual: false,
  };
}

const PackageCreateForm: React.FC<Props> = ({
  selectedClient, onClientChange, onCancel, onSaved, onTemplateSaved, templateToLoad,
}) => {
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const { data: templates = [] } = useListPackageTemplatesQuery();

  const [pkgName,           setPkgName]          = useState("");
  const [expiry,            setExpiry]           = useState("");
  const [neverExpires,      setNeverExpires]      = useState(false);
  const [gstPct,            setGstPct]           = useState(0);
  const [discount,          setDiscount]         = useState(0);
  const [discountStr,       setDiscountStr]      = useState("");
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

  const { createClientPackage, isLoading } = useCreateClientPackage();
  const [createTemplate, { isLoading: isSavingTemplate }] = useCreatePackageTemplateMutation();
  const { services: apiServices, loading: servicesLoading, fetchServices } = useServices();

  useEffect(() => { fetchServices({ limit: 200 }); }, []);

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
  const discountVal = Math.min(discount, pkgPrice);
  const afterDisc   = Math.max(0, pkgPrice - discountVal);
  const gstAmount   = parseFloat((afterDisc * gstPct / 100).toFixed(2));
  const totalAmount = parseFloat((afterDisc + gstAmount).toFixed(2));

  const frozenStyle = isFromTemplate ? { opacity: 0.6, cursor: "not-allowed" as const, background: "#f9fafb" } : undefined;

  // Local (not UTC) today, in the yyyy-mm-dd shape <input type="date"> expects —
  // an expiry date can't be a day that's already passed.
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const clientFullName = selectedClient
    ? `${selectedClient.first_name} ${selectedClient.last_name ?? ""}`.trim()
    : "";

  const handleSave = async () => {
    if (isLoading || isSavingTemplate) return;
    if (!isGeneric && !selectedClient) return;

    // Inline validation
    if (!pkgName.trim())                       { setApiError("Package name is required."); return; }
    if (!neverExpires && !expiry)              { setApiError("Set an expiry date or check 'Never expires'."); return; }
    if (!neverExpires && expiry < todayStr)    { setApiError("Expiry date cannot be in the past."); return; }
    const validServices = services.filter(s => s.name.trim());
    if (validServices.length === 0)            { setApiError("Add at least one service."); return; }
    const methodMissing = paymentMode === "single"
      ? !singleMethod
      : splitEntries.length === 0 || splitEntries.some(e => !e.method || !parseFloat(e.amount));
    if (methodMissing)                         { setPayMethodError(true); return; }

    setApiError(null); setPayMethodError(false);

    try {
      if (isGeneric) {
        const tmpl = await createTemplate({
          name:          pkgName.trim(),
          neverExpires,
          expiryMonths:  neverExpires ? null : dateToMonths(expiry),
          expiryDays:    neverExpires ? null : dateToDays(expiry),
          basePrice:     pkgPrice,
          gstPercentage: gstPct,
          discount:      discountVal,
          paymentMethod: paymentMode === "split" ? "split" : toBackendPaymentMethod(singleMethod!),
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
              {templates.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 20px", color: "#6b7280", fontSize: 13 }}>
                  No templates yet. Create templates from the <strong>Templates</strong> tab.
                </div>
              ) : templates.map(t => {
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
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#7c3aed" }}>₹{total.toFixed(2)}</div>
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

      {/* ── Client ─────────────────────────────────────────────────────────── */}
      {!isGeneric && (
      <div className={styles.card} style={{ marginBottom: 12 }}>
        <div className={styles.cardHead}>
          <div className={styles.cardTitle}><User size={13} /> Client</div>
          {selectedClient && (
            <button onClick={() => onClientChange(null)} className={styles.btnSecondary} style={{ padding: "3px 10px", fontSize: 12 }}>
              Change
            </button>
          )}
        </div>
        {selectedClient ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
            <div className={`${styles.avatar} ${styles["avatar--md"]}`}>{initials(clientFullName)}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{clientFullName}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>
                {selectedClient.phone_number}{selectedClient.email ? ` · ${selectedClient.email}` : ""}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: "12px 16px" }}>
            <ClientSelectorWithAdd onSelect={c => onClientChange(c)} placeholder="Search client by name or mobile…" />
          </div>
        )}
      </div>
      )}

      {/* ── Package details ─────────────────────────────────────────────────── */}
      <div className={styles.card} style={{ marginBottom: 12 }}>
        <div className={styles.cardHead}>
          <div className={styles.cardTitle}>Package details</div>
        </div>
        <div className={styles.cardBody}>
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
                min={todayStr}
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
            {["Service name", "Sessions", "Price (₹)", ...(isFromTemplate ? [] : [""])].map(h => (
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
                  <span className={styles.inputPrefixSymbol}>₹</span>
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
              <label className={`${styles.formLabel} ${styles.formLabelRequired}`}>Package price (₹)</label>
              <div className={styles.inputPrefix}>
                <span className={styles.inputPrefixSymbol}>₹</span>
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
              <label className={styles.formLabel}>Discount (₹)</label>
              <div className={styles.inputPrefix}>
                <span className={styles.inputPrefixSymbol}>₹</span>
                <input
                  type="number"
                  min={0}
                  value={discountStr}
                  placeholder="0"
                  onChange={e => { setDiscountStr(e.target.value); setDiscount(parseFloat(e.target.value) || 0); }}
                  style={frozenStyle}
                  disabled={isFromTemplate}
                  onFocus={e => e.target.select()}
                  className={styles.input}
                />
              </div>
            </div>
          </div>

          {/* Live price breakdown */}
          <div className={styles.priceBox}>
            <div className={styles.priceRow}>
              <span>Package price</span>
              <span>₹{pkgPrice.toFixed(2)}</span>
            </div>
            {discountVal > 0 && (
              <div className={`${styles.priceRow} ${styles["priceRow--accent"]}`}>
                <span>Discount</span>
                <span>− ₹{discountVal.toFixed(2)}</span>
              </div>
            )}
            {gstPct > 0 && (
              <div className={styles.priceRow}>
                <span>GST ({gstPct}%)</span>
                <span>₹{gstAmount.toFixed(2)}</span>
              </div>
            )}
            <div className={`${styles.priceRow} ${styles["priceRow--total"]}`}>
              <span>Total amount</span>
              <span>₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Payment method ───────────────────────────────────────────────────── */}
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
                {price > 0 && <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>₹{price}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PackageCreateForm;
