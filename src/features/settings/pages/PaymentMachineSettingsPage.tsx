import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, RefreshCw, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchBranchesThunk } from "../../../middleware/salon/salon.thunk";
import {
  fetchPaymentTerminalsThunk, createPaymentTerminalThunk, updatePaymentTerminalThunk, deletePaymentTerminalThunk,
  fetchPaymentProviderConfigsThunk, upsertPaymentProviderConfigThunk, testPaymentProviderConnectionThunk,
} from "../../../middleware/settings/paymentSettings.thunk";
import type { PaymentTerminal, PaymentProviderConfig } from "../../bookings/types";
import Button from "../../../components/ui/Button";
import SettingsSection from "../components/SettingsSection";

interface ProviderDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  // Manual has no credential fields at all — Enable is all it needs.
  fields?: { key: string; label: string; placeholder: string; hint?: string }[];
}

const PROVIDERS: ProviderDef[] = [
  {
    id: "paytm",
    name: "Paytm EDC (Payment Request)",
    desc: "Sends a payment request straight to a registered Paytm EDC terminal — the customer pays on the machine, no cashier keystroke needed. Requires a Paytm EDC merchant account. This is the merchant-level account — each individual terminal (its TID) is registered separately below, under Terminals.",
    icon: "💳",
    fields: [
      { key: "mid", label: "Merchant ID (MID)", placeholder: "your-paytm-mid", hint: "Shown on the machine's info screen, next to TID." },
      { key: "merchantKey", label: "Merchant Key", placeholder: "••••••••", hint: "Not shown on the machine — issued by Paytm separately during EDC merchant onboarding." },
    ],
  },
  {
    id: "manual",
    name: "Manual / No direct integration",
    desc: "For a terminal without API access, or as a fallback. Staff sends the customer to pay on the machine, then types in its printed transaction ID to confirm — SalonoX never marks a bill paid on its own.",
    icon: "🧾",
  },
];

export default function PaymentMachineSettingsPage() {
  const dispatch = useAppDispatch();
  const salonId = useAppSelector((s: any) => s.auth.salonId);
  const branches = useAppSelector((s: any) => s.salon.branches);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const [configs, setConfigs] = useState<PaymentProviderConfig[]>([]);
  const [terminals, setTerminals] = useState<PaymentTerminal[]>([]);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, Record<string, string>>>({});
  // Keyed by "providerId.fieldKey" so two providers' fields never collide.
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const [showAddTerminal, setShowAddTerminal] = useState(false);
  const [newTerminal, setNewTerminal] = useState({ provider: "paytm", branch_id: "", terminal_label: "", provider_terminal_id: "", serial_number: "" });

  useEffect(() => {
    if (salonId) dispatch(fetchBranchesThunk(salonId));
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salonId]);

  const refresh = async () => {
    const [provRes, termRes] = await Promise.all([
      dispatch(fetchPaymentProviderConfigsThunk()),
      dispatch(fetchPaymentTerminalsThunk()),
    ]);
    if (fetchPaymentProviderConfigsThunk.fulfilled.match(provRes)) setConfigs(provRes.payload);
    if (fetchPaymentTerminalsThunk.fulfilled.match(termRes)) setTerminals(termRes.payload);
  };

  const configFor = (providerId: string) => configs.find((c) => c.provider === providerId);

  const handleFieldChange = (providerId: string, key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [providerId]: { ...prev[providerId], [key]: value } }));
  };

  const toggleFieldVisible = (providerId: string, key: string) => {
    const fieldId = `${providerId}.${key}`;
    setVisibleFields((prev) => ({ ...prev, [fieldId]: !prev[fieldId] }));
  };

  const handleSave = async (providerId: string, enable: boolean) => {
    setSaving(providerId);
    const provider = PROVIDERS.find((p) => p.id === providerId)!;
    const credentials = provider.fields
      ? Object.fromEntries(provider.fields.map((f) => [f.key, fieldValues[providerId]?.[f.key] ?? ""]))
      : undefined;
    const res = await dispatch(upsertPaymentProviderConfigThunk({ provider: providerId, credentials, is_enabled: enable }));
    setSaving(null);
    if (upsertPaymentProviderConfigThunk.fulfilled.match(res)) {
      setConfigs((prev) => {
        const others = prev.filter((c) => c.provider !== providerId);
        return [...others, res.payload];
      });
      showSuccess(enable ? "Payment Machine enabled" : "Settings saved");
    } else {
      showError((res.payload as string) || "Failed to save");
    }
  };

  const handleTest = async (providerId: string) => {
    setTesting(providerId);
    const res = await dispatch(testPaymentProviderConnectionThunk(providerId));
    setTesting(null);
    if (testPaymentProviderConnectionThunk.fulfilled.match(res)) {
      if (res.payload.ok) showSuccess(res.payload.message || "Connection test passed");
      else showError(res.payload.message || "Connection test failed");
    } else {
      showError((res.payload as string) || "Connection test failed");
    }
  };

  const handleAddTerminal = async () => {
    if (!newTerminal.terminal_label.trim()) { showError("Terminal name is required"); return; }
    if (newTerminal.provider === "paytm" && !newTerminal.provider_terminal_id.trim()) {
      showError("TID is required for a Paytm terminal — it's on the machine's info screen, next to MID");
      return;
    }
    const res = await dispatch(createPaymentTerminalThunk({
      provider: newTerminal.provider,
      branch_id: newTerminal.branch_id || undefined,
      terminal_label: newTerminal.terminal_label,
      provider_terminal_id: newTerminal.provider_terminal_id || undefined,
      serial_number: newTerminal.serial_number || undefined,
    }));
    if (createPaymentTerminalThunk.fulfilled.match(res)) {
      setTerminals((prev) => [res.payload, ...prev]);
      setNewTerminal({ provider: "paytm", branch_id: "", terminal_label: "", provider_terminal_id: "", serial_number: "" });
      setShowAddTerminal(false);
      showSuccess("Terminal added");
    } else {
      showError((res.payload as string) || "Failed to add terminal");
    }
  };

  const handleToggleTerminal = async (t: PaymentTerminal) => {
    const res = await dispatch(updatePaymentTerminalThunk({ id: t.id, data: { is_active: !t.is_active } }));
    if (updatePaymentTerminalThunk.fulfilled.match(res)) {
      setTerminals((prev) => prev.map((x) => (x.id === t.id ? res.payload : x)));
    }
  };

  const handleDeleteTerminal = async (id: string) => {
    const res = await dispatch(deletePaymentTerminalThunk(id));
    if (deletePaymentTerminalThunk.fulfilled.match(res)) {
      setTerminals((prev) => prev.filter((t) => t.id !== id));
      showSuccess("Terminal removed");
    }
  };

  const branchName = (id: string | null) => (branches as any[]).find((b) => b.id === id)?.name ?? "All branches";

  return (
    <>
      {overlay}
      <div className="settings-page-header">
        <h2 className="settings-page-title">POS / Payment Machine</h2>
        <p className="settings-page-subtitle">
          Connect a payment terminal so staff can send an invoice straight to it and have it mark PAID automatically once the customer pays.
        </p>
      </div>

      <SettingsSection title="Provider" desc="Choose one provider to enable at a time." noPadding>
        {PROVIDERS.map((provider) => {
          const config = configFor(provider.id);
          const isExpanded = expandedProvider === provider.id;
          return (
            <div key={provider.id} className="settings-integ-item">
              <div
                className={`settings-integ-row${isExpanded ? " expanded" : ""}`}
                onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
              >
                <div className="settings-integration-icon" style={{ background: config?.is_enabled ? "#f0fdf4" : "#f3f4f6" }}>
                  {provider.icon}
                </div>
                <div className="settings-integration-info">
                  <p className="settings-integration-name">{provider.name}</p>
                  <p className="settings-integration-desc">{provider.desc}</p>
                </div>
                <div className="settings-integ-status-wrap">
                  <span className={`settings-integration-status ${config?.is_enabled ? "connected" : "disconnected"}`}>
                    {config?.is_enabled ? "Enabled" : "Not enabled"}
                  </span>
                  {isExpanded ? <ChevronUp size={16} color="#6b7280" /> : <ChevronDown size={16} color="#6b7280" />}
                </div>
              </div>

              {isExpanded && (
                <div className="settings-integ-config-panel" onClick={(e) => e.stopPropagation()}>
                  {provider.fields && provider.fields.length > 0 && (
                    <div className="settings-form-grid" style={{ marginTop: 18 }}>
                      {provider.fields.map((field) => {
                        const fieldId = `${provider.id}.${field.key}`;
                        const isVisible = !!visibleFields[fieldId];
                        return (
                          <div key={field.key} className="settings-form-group">
                            <label className="settings-label">{field.label}</label>
                            <div style={{ position: "relative" }}>
                              <input
                                className="settings-input"
                                style={{ paddingRight: 36 }}
                                type={isVisible ? "text" : "password"}
                                placeholder={field.placeholder}
                                value={fieldValues[provider.id]?.[field.key] ?? ""}
                                onChange={(e) => handleFieldChange(provider.id, field.key, e.target.value)}
                              />
                              <button
                                type="button"
                                tabIndex={-1}
                                aria-label={isVisible ? `Hide ${field.label}` : `Show ${field.label}`}
                                onClick={() => toggleFieldVisible(provider.id, field.key)}
                                style={{
                                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                                  background: "none", border: "none", padding: 4, cursor: "pointer",
                                  display: "flex", color: "#6b7280",
                                }}
                              >
                                {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                            {field.hint && (
                              <span style={{ fontSize: 11.5, color: "#6b7280", marginTop: 3, display: "block" }}>{field.hint}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {config?.last_test_result && (
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 10 }}>
                      Last test: {config.last_test_result}
                    </div>
                  )}
                  <div className="settings-integ-config-actions">
                    <Button size="sm" loading={saving === provider.id} onClick={() => handleSave(provider.id, true)}>
                      {config?.is_enabled ? "Save changes" : "Save & Enable"}
                    </Button>
                    {config && (
                      <Button
                        size="sm" variant="outline-secondary"
                        loading={testing === provider.id}
                        iconLeft={<RefreshCw size={13} />}
                        onClick={() => handleTest(provider.id)}
                      >
                        Test connection
                      </Button>
                    )}
                    {config?.is_enabled && (
                      <Button size="sm" variant="outline-danger" onClick={() => handleSave(provider.id, false)}>
                        Disable
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </SettingsSection>

      <SettingsSection
        title="Terminals"
        desc={`${terminals.length} terminal${terminals.length === 1 ? "" : "s"} registered — a salon with multiple branches can register one per branch.`}
      >
        {terminals.map((t) => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{t.terminal_label}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {t.provider} · {branchName(t.branch_id)}
                {t.provider_terminal_id ? ` · TID ${t.provider_terminal_id}` : ""}
                {t.serial_number ? ` · S/N ${t.serial_number}` : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Button size="sm" variant={t.is_active ? "outline-secondary" : "outline-danger"} onClick={() => handleToggleTerminal(t)}>
                {t.is_active ? "Active" : "Inactive"}
              </Button>
              <Button size="sm" variant="outline-danger" iconLeft={<Trash2 size={13} />} onClick={() => handleDeleteTerminal(t.id)} />
            </div>
          </div>
        ))}

        {showAddTerminal ? (
          <div className="settings-form-grid" style={{ marginTop: 14 }}>
            <div className="settings-form-group">
              <label className="settings-label">Provider</label>
              <select className="settings-input" value={newTerminal.provider} onChange={(e) => setNewTerminal((v) => ({ ...v, provider: e.target.value }))}>
                {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="settings-form-group">
              <label className="settings-label">Branch</label>
              <select className="settings-input" value={newTerminal.branch_id} onChange={(e) => setNewTerminal((v) => ({ ...v, branch_id: e.target.value }))}>
                <option value="">All branches</option>
                {(branches as any[]).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="settings-form-group">
              <label className="settings-label">Terminal Name</label>
              <input className="settings-input" placeholder="Front Desk Terminal" value={newTerminal.terminal_label} onChange={(e) => setNewTerminal((v) => ({ ...v, terminal_label: e.target.value }))} />
            </div>
            <div className="settings-form-group">
              <label className="settings-label">
                Terminal ID (TID){newTerminal.provider === "paytm" ? " *" : " (optional)"}
              </label>
              <input className="settings-input" placeholder="From the machine's info screen" value={newTerminal.provider_terminal_id} onChange={(e) => setNewTerminal((v) => ({ ...v, provider_terminal_id: e.target.value }))} />
              <span style={{ fontSize: 11.5, color: "#6b7280", marginTop: 3, display: "block" }}>
                On the machine's info screen, next to MID. Required so SalonoX can route a payment to this specific terminal.
              </span>
            </div>
            <div className="settings-form-group">
              <label className="settings-label">Serial Number (optional)</label>
              <input className="settings-input" placeholder="From the machine's info screen" value={newTerminal.serial_number} onChange={(e) => setNewTerminal((v) => ({ ...v, serial_number: e.target.value }))} />
              <span style={{ fontSize: 11.5, color: "#6b7280", marginTop: 3, display: "block" }}>
                For your own reference/support use only — not sent to the payment provider.
              </span>
            </div>
            <div className="settings-integ-config-actions">
              <Button size="sm" onClick={handleAddTerminal}>Add Terminal</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAddTerminal(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline-secondary" iconLeft={<Plus size={13} />} onClick={() => setShowAddTerminal(true)} style={{ marginTop: 12 }}>
            Add Terminal
          </Button>
        )}
      </SettingsSection>
    </>
  );
}
