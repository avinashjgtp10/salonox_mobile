// src/components/packages/PackageCreateForm.tsx
import React, { useState, useEffect, useRef } from "react";
import { User, Loader2, Search } from "lucide-react";
import styles from "./packages.module.scss";
import type { ClientPackage } from "../../services/api/endpoints/packages.endpoints";
import type { ClientSearchResult } from "../../features/clients/components/ClientSearchInput";
import ClientSelectorWithAdd from "./ClientSelectorWithAdd";
import { useCreateClientPackage } from "../../hooks/packages/usePackages";
import { useServices } from "../../features/catalog/hooks/useServices";

interface NewService { id: number; name: string; sessions: number; sessionsStr: string; price: number; priceStr: string; }

interface Props {
  selectedClient: ClientSearchResult | null;
  onClientChange: (client: ClientSearchResult | null) => void;
  onCancel: () => void;
  onSaved: (pkg: ClientPackage) => void;
}

const GST_OPTIONS = [0, 5, 12, 18, 28];

const PKG_PAYMENT_METHODS = [
  { id: "cash",        label: "Cash",        icon: "💵" },
  { id: "card",        label: "Card",        icon: "💳" },
  { id: "upi",         label: "UPI",         icon: "📱" },
  { id: "net_banking", label: "Net banking", icon: "🏦" },
];

type Step = 1 | 2 | 3;

const STEPS: { step: Step; label: string }[] = [
  { step: 1, label: "Package Info" },
  { step: 2, label: "Services" },
  { step: 3, label: "Pricing" },
];

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

const PackageCreateForm: React.FC<Props> = ({
  selectedClient, onClientChange, onCancel, onSaved,
}) => {
  const [step,       setStep]      = useState<Step>(1);
  const [pkgName,    setPkgName]   = useState("");
  const [category,   setCategory]  = useState("");
  const [expiry,     setExpiry]    = useState("");
  const [neverExpires, setNeverExpires] = useState(false);
  const [basePrice,    setBasePrice]    = useState(0);
  const [basePriceStr, setBasePriceStr] = useState("0");
  const [gstPct,       setGstPct]       = useState(18);
  const [discount,     setDiscount]     = useState(0);
  const [discountStr,  setDiscountStr]  = useState("0");
  const [selectedMethods, setSelectedMethods] = useState<string[]>(["cash"]);
  const [splitAmounts,    setSplitAmounts]    = useState<Record<string, string>>({});
  const [payMethodError,  setPayMethodError]  = useState("");
  const [apiError,        setApiError]        = useState<string | null>(null);
  const [services,   setServices]  = useState<NewService[]>([
    { id: 1, name: "", sessions: 5, sessionsStr: "5", price: 0, priceStr: "0" },
  ]);

  const { createClientPackage, isLoading } = useCreateClientPackage();
  const { services: apiServices, categories: apiCategories, loading: servicesLoading, fetchServices } = useServices();

  useEffect(() => { fetchServices({ limit: 200 }); }, []);

  const afterDisc   = Math.max(0, basePrice - discount);
  const gstAmount   = Math.round(afterDisc * gstPct) / 100;
  const totalAmount = afterDisc + gstAmount;

  const isSplit      = selectedMethods.length > 1;
  const splitTotal   = selectedMethods.reduce((s, id) => s + (parseFloat(splitAmounts[id] || "0")), 0);
  const splitRemaining = totalAmount - splitTotal;

  const clientFullName = selectedClient
    ? `${selectedClient.first_name} ${selectedClient.last_name ?? ""}`.trim()
    : "";

  const step1Valid = !!selectedClient && pkgName.trim() !== "" && category !== "" && (neverExpires || expiry !== "");
  const step2Valid = services.some(s => s.name !== "");
  const canNext    = step === 1 ? step1Valid : step === 2 ? step2Valid : basePrice >= 0;

  const addService    = () => setServices(p => [...p, { id: Date.now(), name: "", sessions: 5, sessionsStr: "5", price: 0, priceStr: "0" }]);
  const removeService = (id: number) => setServices(p => p.filter(s => s.id !== id));
  const updateService = (id: number, field: keyof NewService, value: string | number) =>
    setServices(p => p.map(s => s.id === id ? { ...s, [field]: value } : s));

  const handleSave = async () => {
    if (!selectedClient || isLoading) return;
    if (selectedMethods.length === 0) { setPayMethodError("Please select a payment method."); return; }
    setApiError(null); setPayMethodError("");

    try {
      const pkg = await createClientPackage({
        clientId:      String(selectedClient.id),
        packageName:   pkgName,
        category,
        expiryDate:    neverExpires ? null : expiry,
        basePrice,
        gstPercentage: gstPct,
        discount,
        paymentMethod: isSplit ? "split" : selectedMethods[0],
        services: services
          .filter(s => s.name)
          .map(s => ({
            serviceName:   s.name,
            totalSessions: s.sessions,
            price:         s.price,
          })),
      });
      onSaved(pkg);
    } catch (err: any) {
      setApiError(err?.message ?? "Failed to create package. Please try again.");
    }
  };

  return (
    <>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.headerTitle}>Create Package</h2>
          <p className={styles.headerSubtitle}>Configure services and pricing</p>
        </div>
        <div className={styles.headerActions}>
          <button onClick={onCancel} className={styles.btnSecondary}>Cancel</button>
        </div>
      </div>

      {/* Client */}
      <div className={styles.card} style={{ marginBottom: 14 }}>
        <div className={styles.cardHead}>
          <div className={styles.cardTitle}><User size={13} /> Client</div>
          {selectedClient && (
            <button
              onClick={() => onClientChange(null)}
              className={styles.btnSecondary}
              style={{ padding: "3px 10px", fontSize: 12 }}
            >
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
            <ClientSelectorWithAdd
              onSelect={c => onClientChange(c)}
              placeholder="Search client by name or mobile…"
            />
          </div>
        )}
      </div>

      {/* Stepper */}
      <div className={styles.stepper}>
        {STEPS.map((s, idx) => {
          const done   = step > s.step;
          const active = step === s.step;
          return (
            <div key={s.step} className={styles.stepItem}>
              <div className={`${styles.stepDot} ${done ? styles["stepDot--done"] : ""} ${active ? styles["stepDot--active"] : ""}`}>
                {done ? "✓" : s.step}
              </div>
              <span className={`${styles.stepLabel} ${done ? styles["stepLabel--done"] : ""} ${active ? styles["stepLabel--active"] : ""}`}>
                {s.label}
              </span>
              {idx < STEPS.length - 1 && (
                <div className={`${styles.stepLine} ${done ? styles["stepLine--done"] : ""}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── STEP 1: Package Info ──────────────────────────────────────────── */}
      {step === 1 && (
        <Section title="Package information">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Package name" required>
              <input value={pkgName} onChange={e => setPkgName(e.target.value)} className={styles.input} placeholder="e.g. Glow Package" />
            </Field>
            <Field label="Category" required>
              <select value={category} onChange={e => setCategory(e.target.value)} className={styles.select}>
                <option value="">
                  {servicesLoading ? "Loading…" : "Select category…"}
                </option>
                {apiCategories.map(c => (
                  <option key={c.id} value={String(c.name)}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Expiry date">
              <input
                type="date"
                value={expiry}
                onChange={e => setExpiry(e.target.value)}
                className={styles.input}
                disabled={neverExpires}
                style={neverExpires ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
              />
              <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, cursor: "pointer", fontSize: 12, color: "#6b7280", userSelect: "none" }}>
                <input
                  type="checkbox"
                  checked={neverExpires}
                  onChange={e => { setNeverExpires(e.target.checked); if (e.target.checked) setExpiry(""); }}
                  style={{ width: 14, height: 14, cursor: "pointer", accentColor: "#111827" }}
                />
                Never expires
              </label>
            </Field>
          </div>
          {!selectedClient && (
            <p style={{ fontSize: 12, color: "#dc2626", marginTop: 10, fontWeight: 500 }}>
              Please select a client above before continuing.
            </p>
          )}
        </Section>
      )}

      {/* ── STEP 2: Services ──────────────────────────────────────────────── */}
      {step === 2 && (
        <Section title="Services included">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 30px", gap: 8, marginBottom: 8 }}>
            {["Service name","Sessions","Price (₹)",""].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {services.map(svc => (
              <div key={svc.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 30px", gap: 8, alignItems: "center" }}>
                <ServiceSearchInput
                  value={svc.name}
                  options={apiServices.map(s => String(s.name))}
                  loading={servicesLoading}
                  onChange={name => updateService(svc.id, "name", name)}
                  onSearch={q => fetchServices({ search: q, limit: 30 })}
                />
                <input
                  type="number"
                  value={svc.sessionsStr}
                  onChange={e => {
                    updateService(svc.id, "sessionsStr", e.target.value);
                    updateService(svc.id, "sessions", parseInt(e.target.value) || 0);
                  }}
                  onFocus={e => e.target.select()}
                  className={styles.input}
                  style={{ textAlign: "center" }}
                />
                <div className={styles.inputPrefix}>
                  <span className={styles.inputPrefixSymbol}>₹</span>
                  <input
                    type="number"
                    min={0}
                    value={svc.priceStr}
                    onChange={e => {
                      updateService(svc.id, "priceStr", e.target.value);
                      updateService(svc.id, "price", parseFloat(e.target.value) || 0);
                    }}
                    onFocus={e => e.target.select()}
                    className={styles.input}
                  />
                </div>
                <button onClick={() => removeService(svc.id)} disabled={services.length <= 1} className={styles.btnDanger}>✕</button>
              </div>
            ))}
          </div>
          <button onClick={addService} className={styles.btnGhost} style={{ marginTop: 10 }}>+ Add service</button>
        </Section>
      )}

      {/* ── STEP 3: Pricing ───────────────────────────────────────────────── */}
      {step === 3 && (
        <>
          <Section title="Pricing details">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              <Field label="Package price (₹)" required>
                <div className={styles.inputPrefix}>
                  <span className={styles.inputPrefixSymbol}>₹</span>
                  <input
                    type="number"
                    min={0}
                    value={basePriceStr}
                    onChange={e => {
                      setBasePriceStr(e.target.value);
                      setBasePrice(parseFloat(e.target.value) || 0);
                    }}
                    onFocus={e => e.target.select()}
                    className={styles.input}
                  />
                </div>
              </Field>
              <Field label="GST (%)">
                <select value={gstPct} onChange={e => setGstPct(+e.target.value)} className={styles.select}>
                  {GST_OPTIONS.map(g => <option key={g} value={g}>{g === 0 ? "0% (Exempt)" : `${g}%`}</option>)}
                </select>
              </Field>
              <Field label="Discount (₹)">
                <div className={styles.inputPrefix}>
                  <span className={styles.inputPrefixSymbol}>₹</span>
                  <input
                    type="number"
                    min={0}
                    value={discountStr}
                    onChange={e => {
                      setDiscountStr(e.target.value);
                      setDiscount(parseFloat(e.target.value) || 0);
                    }}
                    onFocus={e => e.target.select()}
                    className={styles.input}
                  />
                </div>
              </Field>
            </div>
            <div className={styles.priceBox}>
              <PriceRow label="Package price" value={`₹${basePrice.toFixed(2)}`} />
              {discount > 0 && <PriceRow label="Discount" value={`− ₹${discount.toFixed(2)}`} accent="green" />}
              {gstPct > 0   && <PriceRow label={`GST (${gstPct}%)`} value={`₹${gstAmount.toFixed(2)}`} />}
              <div className={`${styles.priceRow} ${styles["priceRow--total"]}`}>
                <span>Total amount</span><span>₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </Section>
          <Section title="Payment method">
            <div className={styles.payMethod}>
              {PKG_PAYMENT_METHODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMethods(prev =>
                    prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                  )}
                  className={`${styles.payChip} ${selectedMethods.includes(m.id) ? styles["payChip--active"] : ""}`}
                >
                  <span className={styles.payChipIcon}>{m.icon}</span>
                  <span className={styles.payChipLabel}>{m.label}</span>
                </button>
              ))}
            </div>
          </Section>

          {apiError && (
            <div style={{ fontSize: 13, color: "#dc2626", fontWeight: 500, marginTop: 8 }}>
              {apiError}
            </div>
          )}
        </>
      )}

      {/* Navigation */}
      <div className={styles.actions}>
        {step > 1
          ? <button onClick={() => setStep(s => (s - 1) as Step)} className={styles.btnSecondary} disabled={isLoading}>← Back</button>
          : <div />
        }
        {step < 3
          ? <button onClick={() => setStep(s => (s + 1) as Step)} disabled={!canNext} className={styles.btnPrimary}>Next →</button>
          : (
            <button onClick={handleSave} disabled={!selectedClient || isLoading} className={styles.btnPrimary}>
              {isLoading
                ? <><Loader2 size={14} className={styles.spin} /> Creating…</>
                : "Create Package"
              }
            </button>
          )
        }
      </div>
    </>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className={styles.card}>
    <div className={styles.cardHead}><div className={styles.cardTitle}>{title}</div></div>
    <div className={styles.cardBody}>{children}</div>
  </div>
);

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <div className={styles.formField}>
    <label className={`${styles.formLabel} ${required ? styles.formLabelRequired : ""}`}>{label}</label>
    {children}
  </div>
);

const PriceRow: React.FC<{ label: string; value: string; accent?: string }> = ({ label, value, accent }) => (
  <div className={`${styles.priceRow} ${accent === "green" ? styles["priceRow--accent"] : ""}`}>
    <span>{label}</span><span>{value}</span>
  </div>
);

// ── Searchable service picker ─────────────────────────────────────────────────
const ServiceSearchInput: React.FC<{
  value: string;
  options: string[];
  loading: boolean;
  onChange: (v: string) => void;
  onSearch: (q: string) => void;
}> = ({ value, options, loading, onChange, onSearch }) => {
  const [query, setQuery] = useState(value);
  const [open,  setOpen]  = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // keep local query in sync when value is reset from outside
  useEffect(() => { setQuery(value); }, [value]);

  // debounce API search — fires 300ms after the user stops typing
  useEffect(() => {
    const t = setTimeout(() => onSearch(query), 300);
    return () => clearTimeout(t);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  // close on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  // filter already-loaded options immediately for instant visual feedback
  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <Search size={12} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
        <input
          className={styles.input}
          style={{ paddingLeft: 28 }}
          value={query}
          placeholder={loading ? "Loading services…" : "Search service…"}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8,
          boxShadow: "0 4px 16px rgba(0,0,0,.10)", zIndex: 200,
          maxHeight: 200, overflowY: "auto",
        }}>
          {loading && (
            <div style={{ padding: "10px 12px", fontSize: 12, color: "#9ca3af" }}>Loading…</div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: "10px 12px", fontSize: 12, color: "#9ca3af" }}>No services found</div>
          )}
          {filtered.map(name => (
            <div
              key={name}
              onMouseDown={() => { onChange(name); setQuery(name); setOpen(false); }}
              style={{
                padding: "9px 12px", fontSize: 13, cursor: "pointer",
                background: name === value ? "#f5f3ff" : undefined,
                color: name === value ? "#7c3aed" : "#111827",
                fontWeight: name === value ? 600 : 400,
              }}
              onMouseEnter={e => { if (name !== value) (e.currentTarget as HTMLDivElement).style.background = "#f9fafb"; }}
              onMouseLeave={e => { if (name !== value) (e.currentTarget as HTMLDivElement).style.background = ""; }}
            >
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PackageCreateForm;
