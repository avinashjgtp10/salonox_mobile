import { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { selectCurrentSalon } from "../../../store/selectors/slices.selectors";
import api from "../../../services/api/axios";
import { STAFF } from "../../../services/api/endpoints";
import { toast } from "react-hot-toast";
import {
  Plus, Pencil, Trash, ArrowRight, X,
  SquareFill, ListCheck,
  CurrencyRupee, People, Wallet, GraphUpArrow,
  PersonCheck, PersonX, Tools, Bag, Tag, Gift,
  StarFill, Gear, CheckCircleFill, XCircleFill,
  Calculator, CreditCard2Front,
  ChevronLeft, ChevronRight, ClockHistory, Download,
} from "react-bootstrap-icons";
import "../styles/CommissionsPage.scss";

// ─── Types ────────────────────────────────────────────────────────────────────

type CommissionKind     = "percentage" | "fixed_rate";
type CommissionCategory = "services" | "products" | "memberships" | "gift_cards" | "cancellation";
type TabKey             = "overview" | "rules";

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  calendar_color?: string;
  designation?: string;
  is_active?: boolean;
}

interface CommissionSetting {
  id: string;
  staff_id: string;
  category: CommissionCategory;
  is_enabled: boolean;
  commission_kind: CommissionKind;
  default_rate: number | string;
  use_default_calculation: boolean | string;
  pass_cancellation_fee_late: boolean | string;
  pass_cancellation_fee_noshow: boolean | string;
}

interface FlatRule extends CommissionSetting {
  staff: StaffMember;
}

// Tier slab: "if staff generates X revenue → they get Y commission"
interface CommissionTier {
  id: string;
  revenue_target: number;
  commission_kind: CommissionKind;
  commission_value: number;
}

type CommissionPeriod = "daily" | "monthly";

interface AddFormState {
  staff_ids: string[];
  category: CommissionCategory;
  is_enabled: boolean;
  period: CommissionPeriod;
  pass_cancellation_fee_late: boolean;
  pass_cancellation_fee_noshow: boolean;
  min_monthly_revenue: number;
  tiers: CommissionTier[];
}

// ─── Types (earnings summary) ────────────────────────────────────────────────

interface EarnedByStaff {
  staff_id: string;
  staff_first_name: string;
  staff_last_name: string | null;
  staff_email: string;
  staff_calendar_color: string | null;
  staff_designation: string | null;
  total_revenue: number;
  total_earned: number;
  pending_payout: number;
  paid_out: number;
  transaction_count: number;
  categories: string[];
}

interface EarningSummary {
  total_commission: number;
  total_revenue:    number;
  pending_payout:   number;
  paid_out:         number;
  count:            number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview",         icon: <SquareFill size={13} /> },
  { key: "rules",    label: "Commission Rules", icon: <ListCheck  size={13} /> },
];

const CATEGORIES: {
  key: CommissionCategory;
  label: string;
  icon: React.ReactNode;
  bg: string;
  color: string;
}[] = [
  { key: "services",     label: "Services",     icon: <Tools    size={16} />, bg: "#ede9fe", color: "#7c3aed" },
  { key: "products",     label: "Products",     icon: <Bag      size={16} />, bg: "#dcfce7", color: "#16a34a" },
  { key: "memberships",  label: "Memberships",  icon: <Tag      size={16} />, bg: "#dbeafe", color: "#2563eb" },
  { key: "gift_cards",   label: "Gift Cards",   icon: <Gift     size={16} />, bg: "#fce7f3", color: "#db2777" },
  { key: "cancellation", label: "Cancellation", icon: <StarFill size={16} />, bg: "#fef3c7", color: "#d97706" },
];

const COLOR_MAP: Record<string, string> = {
  light_blue: "#7dd3fc", blue: "#3b82f6", dark_blue: "#1d4ed8",
  purple: "#a855f7", violet: "#7c3aed", pink: "#f472b6",
  hot_pink: "#ec4899", rose: "#f43f5e", orange: "#f97316",
  yellow: "#eab308", lime: "#84cc16", green: "#22c55e",
  teal: "#14b8a6", cyan: "#06b6d4",
};

const GRADIENTS = [
  "linear-gradient(135deg,#6366f1,#8b5cf6)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#10b981,#059669)",
  "linear-gradient(135deg,#3b82f6,#06b6d4)",
  "linear-gradient(135deg,#ec4899,#f43f5e)",
  "linear-gradient(135deg,#8b5cf6,#6366f1)",
  "linear-gradient(135deg,#f97316,#fbbf24)",
];

const STAFF_PAGE_SIZE = 5;

function getAvatar(staff: StaffMember) {
  const initials = `${staff.first_name?.[0] ?? ""}${staff.last_name?.[0] ?? ""}`.toUpperCase();
  const bg = staff.calendar_color
    ? (COLOR_MAP[staff.calendar_color] ?? GRADIENTS[0])
    : GRADIENTS[Math.abs(staff.id.charCodeAt(0)) % GRADIENTS.length];
  return { initials, bg };
}

function getCatMeta(cat: CommissionCategory) {
  return CATEGORIES.find((c) => c.key === cat) ?? CATEGORIES[0];
}

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function newTier(): CommissionTier {
  return { id: crypto.randomUUID(), revenue_target: 0, commission_kind: "fixed_rate", commission_value: 0 };
}


// ─── Staff Multi-Select ───────────────────────────────────────────────────────

function StaffMultiSelect({
  staffList,
  selected,
  onChange,
  disabled,
}: {
  staffList: StaffMember[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");

  const filtered = staffList.filter((s) =>
    `${s.first_name} ${s.last_name ?? ""} ${s.designation ?? ""} ${s.email}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const allSelected = filtered.length > 0 && filtered.every((s) => selected.includes(s.id));

  const toggleAll = () => {
    if (allSelected) {
      onChange(selected.filter((id) => !filtered.some((s) => s.id === id)));
    } else {
      const newIds = [...new Set([...selected, ...filtered.map((s) => s.id)])];
      onChange(newIds);
    }
  };

  const toggle = (id: string) => {
    if (disabled) return;
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  return (
    <div className="cm-field">
      <label className="cm-label">
        Team members <span className="cm-optional">(leave empty to apply to all staff)</span>
        {selected.length > 0 && (
          <span className="cm-staff-count-badge">{selected.length} selected</span>
        )}
      </label>

      <div className="cm-staff-picker">
        {/* Search */}
        <div className="cm-staff-search-wrap">
          <input
            className="cm-staff-search"
            placeholder="Search staff…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={disabled}
          />
        </div>

        {/* Select all row */}
        {!disabled && filtered.length > 0 && (
          <label className="cm-staff-row cm-staff-row--all" onClick={toggleAll}>
            <input
              type="checkbox"
              className="cm-staff-cb"
              checked={allSelected}
              onChange={toggleAll}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="cm-staff-all-label">Select all{search ? " matching" : ""} ({filtered.length}) — or leave empty to apply to all</span>
          </label>
        )}

        {/* Staff list */}
        <div className="cm-staff-list">
          {filtered.length === 0 ? (
            <div className="cm-staff-empty">No staff found</div>
          ) : (
            filtered.map((s) => {
              const av      = getAvatar(s);
              const checked = selected.includes(s.id);
              return (
                <label
                  key={s.id}
                  className={`cm-staff-row ${checked ? "cm-staff-row--checked" : ""} ${disabled ? "cm-staff-row--disabled" : ""}`}
                  onClick={() => toggle(s.id)}
                >
                  <input
                    type="checkbox"
                    className="cm-staff-cb"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggle(s.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="cm-staff-av" style={{ background: av.bg }}>{av.initials}</div>
                  <div className="cm-staff-info">
                    <div className="cm-staff-name">{s.first_name} {s.last_name ?? ""}</div>
                    <div className="cm-staff-role">{s.designation ?? s.email}</div>
                  </div>
                  {checked && <CheckCircleFill size={14} color="#6c3ce1" />}
                </label>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

const EMPTY_FORM: AddFormState = {
  staff_ids: [],
  category: "services",
  is_enabled: true,
  period: "monthly",
  pass_cancellation_fee_late: false,
  pass_cancellation_fee_noshow: false,
  min_monthly_revenue: 0,
  tiers: [newTier()],
};

function AddRuleModal({
  staffList, onClose, onSaved, editing,
}: {
  staffList: StaffMember[];
  onClose: () => void;
  onSaved: () => void;
  editing?: FlatRule | null;
  salonId: string;
}) {
  const [form, setForm] = useState<AddFormState>(
    editing
      ? {
          staff_ids: [editing.staff_id],
          category: editing.category,
          is_enabled: editing.is_enabled,
          period: ((editing as any).period ?? "monthly") as CommissionPeriod,
          pass_cancellation_fee_late: Boolean(editing.pass_cancellation_fee_late),
          pass_cancellation_fee_noshow: Boolean(editing.pass_cancellation_fee_noshow),
          min_monthly_revenue: Number((editing as any).min_monthly_revenue ?? 0),
          tiers: [{ id: crypto.randomUUID(), revenue_target: 0, commission_kind: editing.commission_kind, commission_value: Number(editing.default_rate) }],
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);

  const setField = (k: keyof Omit<AddFormState, "tiers">, v: any) =>
    setForm((p) => ({ ...p, [k]: v }));

  const updateTier = (id: string, key: keyof CommissionTier, val: any) =>
    setForm((p) => ({
      ...p,
      tiers: p.tiers.map((t) => (t.id === id ? { ...t, [key]: val } : t)),
    }));

  const addTier    = () => setForm((p) => ({ ...p, tiers: [...p.tiers, newTier()] }));
  const removeTier = (id: string) =>
    setForm((p) => ({ ...p, tiers: p.tiers.filter((t) => t.id !== id) }));

  const handleSave = async () => {
    const targetIds = form.staff_ids.length > 0 ? form.staff_ids : staffList.map((s) => s.id);
    if (form.tiers.length === 0) { toast.error("Add at least one commission slab"); return; }

    const invalidTier = form.tiers.find((t) => t.commission_value <= 0);
    if (invalidTier) { toast.error("All slabs must have a commission value greater than 0"); return; }

    setSaving(true);
    try {
      const slabs = form.tiers
        .filter((t) => t.commission_value > 0)
        .map((t) => ({
          revenue_target:   t.revenue_target,
          commission_kind:  t.commission_kind,
          commission_value: t.commission_value,
        }));

      const payload = {
        staff_ids:                    targetIds,
        category:                     form.category,
        is_enabled:                   form.is_enabled,
        period:                       form.period,
        commission_kind:              form.tiers[0]?.commission_kind ?? "fixed_rate",
        default_rate:                 form.tiers[0]?.commission_value ?? 0,
        revenue_target:               form.tiers[0]?.revenue_target ?? 0,
        min_monthly_revenue:          form.min_monthly_revenue,
        use_default_calculation:      false,
        pass_cancellation_fee_late:   form.pass_cancellation_fee_late,
        pass_cancellation_fee_noshow: form.pass_cancellation_fee_noshow,
        slabs,
      };

      const res = await api.post(STAFF.COMMISSIONS_BULK, payload);
      const { saved, failed } = res.data?.data ?? { saved: targetIds, failed: [] };

      if (failed.length > 0) {
        toast.error(`${failed.length} staff could not be configured`);
      }
      toast.success(editing ? "Commission rule updated" : `Commission rule added for ${saved.length} staff member${saved.length !== 1 ? "s" : ""}`);
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const selCat = getCatMeta(form.category);

  return (
    <div className="cm-modal-overlay" onClick={onClose}>
      <div className="cm-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="cm-modal-header">
          <h3>{editing ? "Edit Commission Rule" : "Add Commission Rule"}</h3>
          <button className="cm-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="cm-modal-body">

          {/* Staff multi-select */}
          <StaffMultiSelect
            staffList={staffList}
            selected={form.staff_ids}
            onChange={(ids) => setForm((p) => ({ ...p, staff_ids: ids }))}
            disabled={!!editing}
          />

          {/* Category */}
          <div className="cm-field">
            <label className="cm-label">Category <span className="cm-req">*</span></label>
            <div className="cm-cat-grid">
              {CATEGORIES.map((c) => (
                <button key={c.key} type="button"
                  className={`cm-cat-opt ${form.category === c.key ? "cm-cat-opt--active" : ""}`}
                  onClick={() => setField("category", c.key)}>
                  <span className="cm-cat-opt-icon" style={{ background: c.bg, color: c.color }}>{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Commission Slabs */}
          <div className="cm-field">
            <div className="cm-slabs-header">
              <div>
                <label className="cm-label">Commission Slabs <span className="cm-req">*</span></label>
                <div className="cm-slabs-hint">
                  Set revenue targets and what the staff member earns when they hit each target.
                </div>
              </div>
              <button className="cm-add-slab-btn" type="button" onClick={addTier}>
                <Plus size={13} /> Add Slab
              </button>
            </div>

            {/* Column headers */}
            <div className="cm-slab-cols-header">
              <span>If staff generates</span>
              <span>They receive</span>
              <span>Type</span>
              <span />
            </div>

            <div className="cm-slabs">
              {form.tiers.map((tier, idx) => (
                <div key={tier.id} className="cm-slab-row">
                  <div className="cm-slab-index">{idx + 1}</div>

                  {/* Revenue target */}
                  <div className="cm-slab-input-wrap">
                    <span className="cm-slab-prefix">₹</span>
                    <input
                      type="number"
                      className="cm-slab-input"
                      placeholder="0 = always apply"
                      min={0}
                      value={tier.revenue_target || ""}
                      onChange={(e) => updateTier(tier.id, "revenue_target", Number(e.target.value))}
                    />
                  </div>

                  <ArrowRight size={14} className="cm-slab-arrow" />

                  {/* Commission value */}
                  <div className="cm-slab-input-wrap">
                    <span className="cm-slab-prefix">
                      {tier.commission_kind === "percentage" ? "%" : "₹"}
                    </span>
                    <input
                      type="number"
                      className="cm-slab-input"
                      placeholder="e.g. 200"
                      min={0}
                      value={tier.commission_value || ""}
                      onChange={(e) => updateTier(tier.id, "commission_value", Number(e.target.value))}
                    />
                  </div>

                  {/* Kind toggle */}
                  <div className="cm-slab-kind">
                    <button
                      type="button"
                      className={`cm-kind-btn ${tier.commission_kind === "fixed_rate" ? "cm-kind-btn--active" : ""}`}
                      onClick={() => updateTier(tier.id, "commission_kind", "fixed_rate")}
                      title="Fixed amount"
                    >
                      ₹
                    </button>
                    <button
                      type="button"
                      className={`cm-kind-btn ${tier.commission_kind === "percentage" ? "cm-kind-btn--active" : ""}`}
                      onClick={() => updateTier(tier.id, "commission_kind", "percentage")}
                      title="Percentage"
                    >
                      %
                    </button>
                  </div>

                  {/* Remove */}
                  {form.tiers.length > 1 && (
                    <button type="button" className="cm-slab-remove" onClick={() => removeTier(tier.id)}>
                      <X size={13} />
                    </button>
                  )}

                  {/* Preview sentence */}
                  {tier.commission_value > 0 && (
                    <div className="cm-slab-preview">
                      {tier.revenue_target > 0
                        ? <>If <strong>{selCat.label.toLowerCase()}</strong> revenue reaches <strong>{fmt(tier.revenue_target)}</strong>, staff gets </>
                        : <>Staff always gets </>
                      }
                      <strong>
                        {tier.commission_kind === "percentage"
                          ? `${tier.commission_value}%`
                          : fmt(tier.commission_value)}
                      </strong>
                      {tier.revenue_target === 0 && <> from {selCat.label.toLowerCase()}</>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Minimum monthly revenue threshold */}
          <div className="cm-field">
            <label className="cm-label">
              Minimum Monthly Revenue <span className="cm-optional">(optional — commission only applies if staff hits this)</span>
            </label>
            <div className="cm-input-group">
              <span className="cm-input-prefix">₹</span>
              <input
                type="number"
                className="cm-input cm-input--prefixed"
                placeholder="e.g. 20000 — leave 0 to always apply"
                min={0}
                value={form.min_monthly_revenue || ""}
                onChange={(e) => setForm((p) => ({ ...p, min_monthly_revenue: Number(e.target.value) }))}
              />
            </div>
          </div>

          {/* Cancellation options */}
          {form.category === "cancellation" && (
            <div className="cm-field">
              <label className="cm-label">Cancellation options</label>
              <div className="cm-checks">
                <label className="cm-check-row">
                  <input type="checkbox" checked={form.pass_cancellation_fee_late}
                    onChange={(e) => setField("pass_cancellation_fee_late", e.target.checked)} />
                  <span>Pass late cancellation fee to staff</span>
                </label>
                <label className="cm-check-row">
                  <input type="checkbox" checked={form.pass_cancellation_fee_noshow}
                    onChange={(e) => setField("pass_cancellation_fee_noshow", e.target.checked)} />
                  <span>Pass no-show fee to staff</span>
                </label>
              </div>
            </div>
          )}

          {/* Period — daily vs monthly */}
          <div className="cm-field">
            <label className="cm-label">Commission Period</label>
            <div className="cm-period-toggle">
              <button
                type="button"
                className={`cm-period-btn ${form.period === "daily" ? "cm-period-btn--active" : ""}`}
                onClick={() => setField("period", "daily")}
              >
                Daily
                <span className="cm-period-hint">Revenue measured per day</span>
              </button>
              <button
                type="button"
                className={`cm-period-btn ${form.period === "monthly" ? "cm-period-btn--active" : ""}`}
                onClick={() => setField("period", "monthly")}
              >
                Monthly
                <span className="cm-period-hint">Revenue measured per month</span>
              </button>
            </div>
          </div>

          {/* Enable toggle */}
          <div className="cm-field">
            <label className="cm-check-row">
              <input type="checkbox" checked={form.is_enabled}
                onChange={(e) => setField("is_enabled", e.target.checked)} />
              <span>Enable this rule immediately</span>
            </label>
          </div>
        </div>

        <div className="cm-modal-footer">
          <button className="cm-btn cm-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="cm-btn cm-btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : editing ? "Update Rule" : "Add Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  rules, staffList, onAddRule, commsFetching, earnSummary, earnedByStaff, summaryMonth, onMonthChange, onSettle, settlingId, onOpenHistory,
}: {
  rules: FlatRule[];
  staffList: StaffMember[];
  onAddRule: (staff?: StaffMember) => void;
  commsFetching: boolean;
  earnSummary: EarningSummary | null;
  earnedByStaff: EarnedByStaff[];
  summaryMonth: string;
  onMonthChange: (month: string) => void;
  onSettle: (staffId: string, name: string, amount: number) => void;
  settlingId: string | null;
  onOpenHistory: (staffId: string) => void;
}): JSX.Element {
  const staffWithComm     = new Set(rules.map((r) => r.staff_id));
  const configuredStaff   = staffList.filter((s) => staffWithComm.has(s.id));
  const unconfiguredStaff = staffList.filter((s) => !staffWithComm.has(s.id));

  // Pagination for staff commission status
  const [configPage, setConfigPage]     = useState(1);
  const [unconfigPage, setUnconfigPage] = useState(1);

  const configPages   = Math.ceil(configuredStaff.length / STAFF_PAGE_SIZE);
  const unconfigPages = Math.ceil(unconfiguredStaff.length / STAFF_PAGE_SIZE);

  const pagedConfigured   = configuredStaff.slice((configPage - 1) * STAFF_PAGE_SIZE, configPage * STAFF_PAGE_SIZE);
  const pagedUnconfigured = unconfiguredStaff.slice((unconfigPage - 1) * STAFF_PAGE_SIZE, unconfigPage * STAFF_PAGE_SIZE);

  return (
    <div className="cm-overview">

      {/* ── Stat cards: Total Rules, Total Staff, Configured, No Commission ── */}
      <div className="cm-ov-cards">
        <div className="cm-ov-card">
          <div className="cm-ov-card-icon" style={{ background: "#ede9fe", color: "#7c3aed" }}>
            <ListCheck size={18} />
          </div>
          <div>
            <div className="cm-ov-val">{rules.length}</div>
            <div className="cm-ov-label">Total Rules</div>
          </div>
        </div>
        <div className="cm-ov-card">
          <div className="cm-ov-card-icon" style={{ background: "#dbeafe", color: "#2563eb" }}>
            <People size={18} />
          </div>
          <div>
            <div className="cm-ov-val">{staffList.length}</div>
            <div className="cm-ov-label">Total Staff</div>
          </div>
        </div>
        <div className="cm-ov-card">
          <div className="cm-ov-card-icon" style={{ background: "#dcfce7", color: "#16a34a" }}>
            <PersonCheck size={18} />
          </div>
          <div>
            <div className="cm-ov-val">{configuredStaff.length}</div>
            <div className="cm-ov-label">Configured</div>
          </div>
        </div>
        <div className="cm-ov-card">
          <div className="cm-ov-card-icon" style={{ background: "#fef3c7", color: "#d97706" }}>
            <PersonX size={18} />
          </div>
          <div>
            <div className="cm-ov-val">{unconfiguredStaff.length}</div>
            <div className="cm-ov-label">No Commission</div>
          </div>
        </div>
      </div>

      {/* Background loading indicator */}
      {commsFetching && (
        <div className="cm-comms-loading-bar">
          <div className="cm-comms-loading-inner" />
          <span>Loading commission data…</span>
        </div>
      )}

      {/* ── Earnings row ── */}
      <div className="cm-ov-earn-header">
        <span className="cm-ov-earn-title">This Month</span>
        <input
          type="month"
          className="cm-month-picker"
          value={summaryMonth}
          max={new Date().toISOString().slice(0, 7)}
          onChange={(e) => onMonthChange(e.target.value)}
        />
      </div>
      <div className="cm-ov-earnings">
        <div className="cm-ov-earn-card">
          <div className="cm-ov-earn-icon" style={{ background: "#ede9fe", color: "#7c3aed" }}>
            <GraphUpArrow size={16} />
          </div>
          <div>
            <div className="cm-ov-earn-label">Total Revenue Generated</div>
            <div className="cm-ov-earn-val">
              {earnSummary ? fmt(earnSummary.total_revenue) : <span className="cm-earn-dash">—</span>}
            </div>
            <div className="cm-ov-earn-sub">{earnSummary ? `${earnSummary.count} transactions` : "Loading…"}</div>
          </div>
        </div>
        <div className="cm-ov-earn-card">
          <div className="cm-ov-earn-icon" style={{ background: "#dcfce7", color: "#16a34a" }}>
            <CurrencyRupee size={16} />
          </div>
          <div>
            <div className="cm-ov-earn-label">Commission Paid</div>
            <div className="cm-ov-earn-val">
              {earnSummary ? fmt(earnSummary.paid_out) : <span className="cm-earn-dash">—</span>}
            </div>
            <div className="cm-ov-earn-sub" style={{ color: "#16a34a" }}>Settled</div>
          </div>
        </div>
        <div className="cm-ov-earn-card">
          <div className="cm-ov-earn-icon" style={{ background: "#fef3c7", color: "#d97706" }}>
            <Wallet size={16} />
          </div>
          <div>
            <div className="cm-ov-earn-label">Pending Payout</div>
            <div className="cm-ov-earn-val">
              {earnSummary ? fmt(earnSummary.pending_payout) : <span className="cm-earn-dash">—</span>}
            </div>
            <div className="cm-ov-earn-sub" style={{ color: "#d97706" }}>Awaiting payment</div>
          </div>
        </div>
        <div className="cm-ov-earn-card">
          <div className="cm-ov-earn-icon" style={{ background: "#dbeafe", color: "#2563eb" }}>
            <Calculator size={16} />
          </div>
          <div>
            <div className="cm-ov-earn-label">Total Commission Accrued</div>
            <div className="cm-ov-earn-val">
              {earnSummary ? fmt(earnSummary.total_commission) : <span className="cm-earn-dash">—</span>}
            </div>
            <div className="cm-ov-earn-sub">Paid + Pending</div>
          </div>
        </div>
      </div>

      {/* ── Bottom two-col ── */}
      <div className="cm-ov-bottom">

        {/* Left — Commission Earned by staff */}
        <div className="cm-ov-panel">
          <div className="cm-ov-panel-header">
            <div>
              <div className="cm-ov-panel-title">Commission Earned</div>
              <div className="cm-ov-panel-sub">
                {earnedByStaff.length > 0
                  ? `${earnedByStaff.length} staff earned this month`
                  : "No commissions earned yet"}
              </div>
            </div>
          </div>

          {earnedByStaff.length === 0 ? (
            <div className="cm-ov-empty">
              <CurrencyRupee size={28} />
              <p>No commissions earned this month</p>
              <span className="cm-ov-empty-sub">Commissions appear here after checkouts</span>
            </div>
          ) : (
            <div className="cm-earned-list">
              {earnedByStaff.map((e) => {
                const av = {
                  initials: `${e.staff_first_name?.[0] ?? ""}${e.staff_last_name?.[0] ?? ""}`.toUpperCase(),
                  bg: e.staff_calendar_color
                    ? (COLOR_MAP[e.staff_calendar_color] ?? GRADIENTS[0])
                    : GRADIENTS[Math.abs(e.staff_id.charCodeAt(0)) % GRADIENTS.length],
                };
                const cats = (e.categories ?? []).map((c: string) => getCatMeta(c as any));
                const allPaid = e.pending_payout === 0 && e.total_earned > 0;

                return (
                  <div key={e.staff_id} className={`cm-earned-row ${allPaid ? "cm-earned-row--paid" : ""}`} onClick={() => onOpenHistory(e.staff_id)} style={{ cursor: "pointer" }}>
                    <div className="cm-earned-av" style={{ background: av.bg }}>{av.initials}</div>

                    <div className="cm-earned-info">
                      <div className="cm-earned-name">
                        {e.staff_first_name} {e.staff_last_name ?? ""}
                        {allPaid && <span className="cm-paid-chip"><CheckCircleFill size={10} /> Paid</span>}
                      </div>
                      <div className="cm-earned-cats">
                        {cats.map((c: ReturnType<typeof getCatMeta>) => (
                          <span key={c.key} className="cm-earned-cat-dot"
                            style={{ background: c.bg, color: c.color }} title={c.label}>
                            {c.icon}
                          </span>
                        ))}
                        <span className="cm-earned-txn">{e.transaction_count} transaction{e.transaction_count !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="cm-earned-amounts">
                        <span className="cm-earned-rev">Revenue {fmt(e.total_revenue)}</span>
                        <span className="cm-earned-sep">·</span>
                        <span className="cm-earned-total">Earned <strong>{fmt(e.total_earned)}</strong></span>
                      </div>
                      {e.pending_payout > 0 && (
                        <div className="cm-earned-pending">
                          Pending: <strong>{fmt(e.pending_payout)}</strong>
                          {e.paid_out > 0 && <span> · Paid: {fmt(e.paid_out)}</span>}
                        </div>
                      )}
                    </div>

                    <div className="cm-earned-row-end" onClick={(ev) => ev.stopPropagation()}>
                      {e.pending_payout > 0 && (
                        <>
                          <span className="cm-pending-badge">
                            <ClockHistory size={10} /> {fmt(e.pending_payout)} pending
                          </span>
                          <button
                            className="cm-settle-btn"
                            disabled={settlingId === e.staff_id}
                            onClick={() => onSettle(
                              e.staff_id,
                              `${e.staff_first_name} ${e.staff_last_name ?? ""}`.trim(),
                              e.pending_payout
                            )}
                          >
                            {settlingId === e.staff_id ? "Settling…" : "Settle"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right — staff commission status with pagination */}
        <div className="cm-ov-panel">
          <div className="cm-ov-panel-header">
            <div>
              <div className="cm-ov-panel-title">Staff Commission Status</div>
              <div className="cm-ov-panel-sub">
                {configuredStaff.length} configured · {unconfiguredStaff.length} not set
              </div>
            </div>
          </div>

          {/* Configured staff */}
          {configuredStaff.length > 0 && (
            <>
              <div className="cm-ov-staff-section-label">
                <CheckCircleFill size={11} color="#16a34a" /> With commission rules
              </div>
              {pagedConfigured.map((s) => {
                const av       = getAvatar(s);
                const sRules   = rules.filter((r) => r.staff_id === s.id);
                const active   = sRules.filter((r) => r.is_enabled).length;
                const catKeys  = [...new Set(sRules.map((r) => r.category))];
                return (
                  <div key={s.id} className="cm-ov-staff-row cm-ov-staff-row--has">
                    <div className="cm-ov-av" style={{ background: av.bg }}>{av.initials}</div>
                    <div className="cm-ov-staff-info">
                      <div className="cm-ov-staff-name">{s.first_name} {s.last_name ?? ""}</div>
                      <div className="cm-ov-staff-meta">
                        {catKeys.map((cat) => {
                          const m = getCatMeta(cat);
                          return (
                            <span key={cat} className="cm-cat-dot"
                              style={{ background: m.bg, color: m.color }} title={m.label}>
                              {m.icon}
                            </span>
                          );
                        })}
                        <span className="cm-ov-staff-count">
                          {active} active rule{active !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <CheckCircleFill size={14} color="#16a34a" />
                  </div>
                );
              })}
              {configPages > 1 && (
                <div className="cm-ov-pagination">
                  <button className="cm-pg-btn" disabled={configPage === 1}
                    onClick={() => setConfigPage((p) => p - 1)}>
                    <ChevronLeft size={13} />
                  </button>
                  <span className="cm-pg-info">{configPage} / {configPages}</span>
                  <button className="cm-pg-btn" disabled={configPage === configPages}
                    onClick={() => setConfigPage((p) => p + 1)}>
                    <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </>
          )}

          {/* Unconfigured staff */}
          {unconfiguredStaff.length > 0 && (
            <>
              <div className="cm-ov-staff-section-label" style={{ marginTop: 14 }}>
                <XCircleFill size={11} color="#dc2626" /> No commission set
              </div>
              {pagedUnconfigured.map((s) => {
                const av = getAvatar(s);
                return (
                  <div key={s.id} className="cm-ov-staff-row cm-ov-staff-row--none">
                    <div className="cm-ov-av" style={{ background: av.bg }}>{av.initials}</div>
                    <div className="cm-ov-staff-info">
                      <div className="cm-ov-staff-name">{s.first_name} {s.last_name ?? ""}</div>
                      <div className="cm-ov-staff-role">{s.designation ?? "Staff"}</div>
                    </div>
                    <button className="cm-ov-add-btn" onClick={() => onAddRule(s)}>
                      <Plus size={11} /> Add Rule
                    </button>
                  </div>
                );
              })}
              {unconfigPages > 1 && (
                <div className="cm-ov-pagination">
                  <button className="cm-pg-btn" disabled={unconfigPage === 1}
                    onClick={() => setUnconfigPage((p) => p - 1)}>
                    <ChevronLeft size={13} />
                  </button>
                  <span className="cm-pg-info">{unconfigPage} / {unconfigPages}</span>
                  <button className="cm-pg-btn" disabled={unconfigPage === unconfigPages}
                    onClick={() => setUnconfigPage((p) => p + 1)}>
                    <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </>
          )}

          {staffList.length === 0 && (
            <div className="cm-ov-empty">
              <People size={28} />
              <p>No staff members found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Rule Row (Commission Rules tab) ─────────────────────────────────────────

function RuleRow({
  rule, onToggle, onEdit, onDelete, toggling,
}: {
  rule: FlatRule;
  onToggle: (r: FlatRule) => void;
  onEdit:   (r: FlatRule) => void;
  onDelete: (r: FlatRule) => void;
  toggling: boolean;
}) {
  const cat    = getCatMeta(rule.category);
  const avatar = getAvatar(rule.staff);
  const name   = `${rule.staff.first_name} ${rule.staff.last_name ?? ""}`.trim();

  return (
    <div className="cm-rule-row">
      <div className="cm-rule-icon" style={{ background: cat.bg, color: cat.color }}>{cat.icon}</div>
      <div className="cm-rule-info">
        <div className="cm-rule-name">{cat.label} Commission</div>
        <div className="cm-rule-desc">
          <strong>{name}</strong> earns{" "}
          <strong>
            {rule.commission_kind === "percentage" ? `${Number(rule.default_rate)}%` : fmt(Number(rule.default_rate))}
          </strong>{" "}
          from {cat.label.toLowerCase()} transactions.
        </div>
        <div className="cm-rule-staff-chip">
          <div className="cm-rule-staff-dot" style={{ background: avatar.bg }}>{avatar.initials}</div>
          <span>{name}</span>
        </div>
      </div>
      <div className="cm-rule-meta">
        <div className="cm-rule-tag" style={{ background: "#f3f4f6" }}>
          <span className="cm-tag-label">Type</span>
          <span className="cm-tag-val">{rule.commission_kind === "percentage" ? "%" : "₹ Fixed"}</span>
        </div>
        <ArrowRight size={13} className="cm-rule-arrow" />
        <div className="cm-rule-tag" style={{ background: cat.bg }}>
          <span className="cm-tag-label">Rate</span>
          <span className="cm-tag-val" style={{ color: cat.color }}>
            {rule.commission_kind === "percentage" ? `${Number(rule.default_rate)}%` : fmt(Number(rule.default_rate))}
          </span>
        </div>
      </div>
      <div className="cm-rule-actions">
        <label className="cm-toggle" title={rule.is_enabled ? "Disable" : "Enable"}>
          <input type="checkbox" checked={rule.is_enabled} disabled={toggling}
            onChange={() => onToggle(rule)} />
          <span className="cm-slider" />
        </label>
        <button className="cm-icon-btn cm-icon-btn--edit"  onClick={() => onEdit(rule)}   title="Edit"><Pencil size={13} /></button>
        <button className="cm-icon-btn cm-icon-btn--delete" onClick={() => onDelete(rule)} title="Delete"><Trash size={13} /></button>
      </div>
    </div>
  );
}


// ─── Commission History Drawer ────────────────────────────────────────────────

function CommissionHistoryDrawer({
  staffId, staffName, summaryMonth, onClose,
}: {
  staffId: string;
  staffName: string;
  summaryMonth: string;
  onClose: () => void;
}): JSX.Element {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`${STAFF.BY_ID(staffId)}/commissions/history?month=${summaryMonth}`)
      .then((r) => setHistory(r.data?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [staffId, summaryMonth]);

  const totalEarned  = history.reduce((s, h) => s + parseFloat(h.commission_amount), 0);
  const totalRevenue = history.reduce((s, h) => s + parseFloat(h.revenue_amount), 0);

  return (
    <div className="cm-history-overlay" onClick={onClose}>
      <div className="cm-history-drawer" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="cm-history-header">
          <div>
            <div className="cm-history-title">{staffName}</div>
            <div className="cm-history-sub">Commission History · {summaryMonth}</div>
          </div>
          <button className="cm-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Summary strip */}
        <div className="cm-history-summary">
          <div className="cm-history-sum-item">
            <span>Total Revenue</span>
            <strong>{fmt(totalRevenue)}</strong>
          </div>
          <div className="cm-history-sum-div" />
          <div className="cm-history-sum-item">
            <span>Total Earned</span>
            <strong style={{ color: "#6c3ce1" }}>{fmt(totalEarned)}</strong>
          </div>
          <div className="cm-history-sum-div" />
          <div className="cm-history-sum-item">
            <span>Transactions</span>
            <strong>{history.length}</strong>
          </div>
        </div>

        {/* History list */}
        <div className="cm-history-body">
          {loading ? (
            <div className="cm-loading" style={{ padding: "20px" }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="cm-skeleton-row">
                  <div className="cm-skel cm-skel--icon" />
                  <div className="cm-skel-info">
                    <div className="cm-skel cm-skel--title" />
                    <div className="cm-skel cm-skel--sub" />
                  </div>
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="cm-ov-empty">
              <ClockHistory size={28} />
              <p>No commission history for this month</p>
            </div>
          ) : (
            history.map((h) => {
              const cat     = getCatMeta(h.category as CommissionCategory);
              const isPaid  = h.status === "paid";
              const date    = new Date(h.earned_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
              return (
                <div key={h.id} className="cm-history-row">
                  <div className="cm-history-cat-icon" style={{ background: cat.bg, color: cat.color }}>
                    {cat.icon}
                  </div>
                  <div className="cm-history-info">
                    <div className="cm-history-cat">{cat.label}</div>
                    <div className="cm-history-date">{date}</div>
                  </div>
                  <div className="cm-history-amounts">
                    <div className="cm-history-revenue">Revenue {fmt(parseFloat(h.revenue_amount))}</div>
                    <div className="cm-history-earned">
                      {h.commission_kind === "percentage"
                        ? `${h.commission_rate}%`
                        : `₹${h.commission_rate} per ₹${h.commission_rate}`}
                      {" → "}
                      <strong>{fmt(parseFloat(h.commission_amount))}</strong>
                    </div>
                  </div>
                  <span className={`cm-history-status ${isPaid ? "cm-history-status--paid" : "cm-history-status--pending"}`}>
                    {isPaid ? "Paid" : "Pending"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommissionsPage() {
  const currentSalon = useSelector(selectCurrentSalon);
  const salonId      = currentSalon?.id;

  const [activeTab,   setActiveTab]   = useState<TabKey>("overview");
  const [catFilter,   setCatFilter]   = useState("all");
  const [staffList,   setStaffList]   = useState<StaffMember[]>([]);
  const [rules,       setRules]       = useState<FlatRule[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [commsFetching,    setCommsFetching]    = useState(false);
  const [earnSummary,      setEarnSummary]      = useState<EarningSummary | null>(null);
  const [earnedByStaff,    setEarnedByStaff]    = useState<EarnedByStaff[]>([]);
  const [summaryMonth,     setSummaryMonth]     = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [historyStaffId,   setHistoryStaffId]   = useState<string | null>(null);
  const [showModal,   setShowModal]   = useState(false);
  const [editingRule, setEditingRule] = useState<FlatRule | null>(null);
  const [togglingId,  setTogglingId]  = useState<string | null>(null);
  const [settlingId,  setSettlingId]  = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!salonId) return;
    setLoading(true);

    try {
      // Fire all 3 requests in parallel
      const [staffRes, commissionsRes] = await Promise.all([
        api.get(`${STAFF.BASE}?limit=200&salon_id=${salonId}`),
        api.get(`${STAFF.BASE}/commissions/all?salon_id=${salonId}`),
      ]);

      // Fetch earning summary + per-staff breakdown (non-blocking)
      Promise.all([
        api.get(`${STAFF.BASE}/commissions/summary?salon_id=${salonId}&month=${summaryMonth}`),
        api.get(`${STAFF.BASE}/commissions/earned?salon_id=${salonId}&month=${summaryMonth}`),
      ]).then(([summaryRes, earnedRes]) => {
        setEarnSummary(summaryRes.data?.data ?? null);
        setEarnedByStaff(earnedRes.data?.data ?? []);
      }).catch(() => {});

      const allStaff: StaffMember[] = staffRes.data?.data?.items ?? [];
      const staff = allStaff.filter((s) => s.is_active !== false);
      setStaffList(staff);

      // Build staff lookup map for O(1) join — uses the unfiltered list so
      // existing commission rules for now-deactivated staff still resolve names
      const staffMap = new Map(allStaff.map((s) => [s.id, s]));

      const rawCommissions = commissionsRes.data?.data ?? [];
      const flat: FlatRule[] = rawCommissions
        .map((c: any) => {
          // API returns joined staff fields — map them back
          const staffMember: StaffMember = staffMap.get(c.staff_id) ?? {
            id:             c.staff_id,
            first_name:     c.staff_first_name,
            last_name:      c.staff_last_name,
            email:          c.staff_email,
            calendar_color: c.staff_calendar_color,
            designation:    c.staff_designation,
          };
          return { ...c, staff: staffMember } as FlatRule;
        })
        // Only show rules that have a meaningful rate configured
        .filter((r: FlatRule) => Number(r.default_rate) > 0);

      setRules(flat);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load commissions");
    } finally {
      setLoading(false);
      setCommsFetching(false);
    }
  }, [salonId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Refetch summary when month picker changes
  useEffect(() => {
    if (!salonId) return;
    Promise.all([
      api.get(`${STAFF.BASE}/commissions/summary?salon_id=${salonId}&month=${summaryMonth}`),
      api.get(`${STAFF.BASE}/commissions/earned?salon_id=${salonId}&month=${summaryMonth}`),
    ]).then(([summaryRes, earnedRes]) => {
      setEarnSummary(summaryRes.data?.data ?? null);
      setEarnedByStaff(earnedRes.data?.data ?? []);
    }).catch(() => {});
  }, [summaryMonth, salonId]);

  const handleToggle = async (rule: FlatRule) => {
    setTogglingId(rule.id);
    try {
      await api.put(STAFF.COMMISSIONS(rule.staff_id), {
        category:                     rule.category,
        is_enabled:                   !rule.is_enabled,
        commission_kind:              rule.commission_kind,
        default_rate:                 Number(rule.default_rate),
        revenue_target:               Number((rule as any).revenue_target ?? 0),
        use_default_calculation:      Boolean(rule.use_default_calculation),
        pass_cancellation_fee_late:   Boolean(rule.pass_cancellation_fee_late),
        pass_cancellation_fee_noshow: Boolean(rule.pass_cancellation_fee_noshow),
      });
      setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, is_enabled: !r.is_enabled } : r));
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (rule: FlatRule) => {
    if (!window.confirm(`Remove ${getCatMeta(rule.category).label} commission for ${rule.staff.first_name}?`)) return;
    try {
      await api.put(STAFF.COMMISSIONS(rule.staff_id), {
        category:                     rule.category,
        is_enabled:                   false,
        commission_kind:              rule.commission_kind,
        default_rate:                 0,
        use_default_calculation:      true,
        pass_cancellation_fee_late:   false,
        pass_cancellation_fee_noshow: false,
      }); // default_rate: 0 is already a number, no cast needed
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
      toast.success("Rule removed");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to remove");
    }
  };

  const handleSettle = async (staffId: string, name: string, amount: number) => {
    setSettlingId(staffId);
    try {
      await api.post(STAFF.SETTLE_COMMISSION(staffId));
      toast.success(`₹${amount.toLocaleString("en-IN")} settled for ${name}`);
      const [summaryRes, earnedRes] = await Promise.all([
        api.get(`${STAFF.BASE}/commissions/summary?salon_id=${salonId}&month=${summaryMonth}`),
        api.get(`${STAFF.BASE}/commissions/earned?salon_id=${salonId}&month=${summaryMonth}`),
      ]);
      setEarnSummary(summaryRes.data?.data ?? null);
      setEarnedByStaff(earnedRes.data?.data ?? []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to settle commission");
    } finally {
      setSettlingId(null);
    }
  };

  const filtered  = rules.filter((r) => catFilter === "all" || r.category === catFilter);
  const catCounts = CATEGORIES.reduce((acc, c) => {
    acc[c.key] = rules.filter((r) => r.category === c.key && Number(r.default_rate) > 0).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="commissions-page">
      <div className="cm-header">
        <div>
          <h2 className="cm-title">Commission Management</h2>
          <p className="cm-subtitle">Create and manage commission rules for your team</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="cm-export-btn" onClick={async () => {
            try {
              const res = await api.get(`${STAFF.BASE}/commissions/export?salon_id=${salonId}&month=${summaryMonth}`, { responseType: "blob" });
              const url = URL.createObjectURL(new Blob([res.data]));
              const a   = document.createElement("a");
              a.href    = url;
              a.download = `commissions_${summaryMonth}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            } catch { toast.error("Export failed"); }
          }}>
            <Download size={14} /> Export CSV
          </button>
          <button className="cm-add-btn" onClick={() => { setEditingRule(null); setShowModal(true); }}>
            <Plus size={15} /> Add Commission Rule
          </button>
        </div>
      </div>

      <div className="cm-tabs">
        {TABS.map(({ key, label, icon }) => (
          <button key={key}
            className={`cm-tab ${activeTab === key ? "cm-tab--active" : ""}`}
            onClick={() => setActiveTab(key)}>
            {icon} {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="cm-loading">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="cm-skeleton-row">
              <div className="cm-skel cm-skel--icon" />
              <div className="cm-skel-info">
                <div className="cm-skel cm-skel--title" />
                <div className="cm-skel cm-skel--sub" />
              </div>
              <div className="cm-skel cm-skel--tag" />
            </div>
          ))}
        </div>
      ) : activeTab === "overview" ? (
        <OverviewTab
          rules={rules}
          staffList={staffList}
          onAddRule={() => { setEditingRule(null); setShowModal(true); }}
          commsFetching={commsFetching}
          earnSummary={earnSummary}
          earnedByStaff={earnedByStaff}
          summaryMonth={summaryMonth}
          onMonthChange={(m) => { setSummaryMonth(m); }}
          onSettle={handleSettle}
          settlingId={settlingId}
          onOpenHistory={(staffId) => setHistoryStaffId(staffId)}
        />
      ) : (
        <div className="cm-body">
          <div className="cm-main">
            <div className="cm-section-header">
              <h3 className="cm-section-title">Commission Rules</h3>
              <p className="cm-section-sub">Set rules for services, products and other earnings</p>
            </div>
            <div className="cm-cat-pills">
              <button className={`cm-pill ${catFilter === "all" ? "cm-pill--active" : ""}`}
                onClick={() => setCatFilter("all")}>
                All Rules <span className="cm-pill-count">({rules.length})</span>
              </button>
              {CATEGORIES.map(({ key, label }) => (
                <button key={key}
                  className={`cm-pill ${catFilter === key ? "cm-pill--active" : ""}`}
                  onClick={() => setCatFilter(key)}>
                  {label} <span className="cm-pill-count">({catCounts[key] ?? 0})</span>
                </button>
              ))}
            </div>
            {filtered.length === 0 ? (
              <div className="cm-empty">
                <Gear size={28} />
                <p>No commission rules found</p>
                <button className="cm-add-btn" onClick={() => { setEditingRule(null); setShowModal(true); }}>
                  <Plus size={14} /> Add your first rule
                </button>
              </div>
            ) : (
              <div className="cm-rules-list">
                {filtered.map((rule) => (
                  <RuleRow key={rule.id} rule={rule}
                    onToggle={handleToggle}
                    onEdit={(r) => { setEditingRule(r); setShowModal(true); }}
                    onDelete={handleDelete}
                    toggling={togglingId === rule.id} />
                ))}
              </div>
            )}
          </div>
          <div className="cm-sidebar">
            <div className="cm-sidebar-block">
              <div className="cm-sidebar-title"><CheckCircleFill size={13} /> How it works?</div>
              {[
                { icon: <Tools size={14} />,           bg: "#ede9fe", ic: "#7c3aed", t: "Set Rules",      d: "Create slab-based rules for each category." },
                { icon: <CurrencyRupee size={14} />,    bg: "#dcfce7", ic: "#16a34a", t: "Earn",           d: "Staff earns commission when they hit targets." },
                { icon: <Calculator size={14} />,       bg: "#dbeafe", ic: "#2563eb", t: "Auto Calculate", d: "Commission is calculated automatically." },
                { icon: <CreditCard2Front size={14} />, bg: "#fef3c7", ic: "#d97706", t: "Payout",         d: "Pay commissions with one click." },
              ].map((s, i) => (
                <div key={i} className="cm-step">
                  <div className="cm-step-icon" style={{ background: s.bg, color: s.ic }}>{s.icon}</div>
                  <div>
                    <div className="cm-step-title">{s.t}</div>
                    <div className="cm-step-desc">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* History Drawer */}
      {historyStaffId && (
        <CommissionHistoryDrawer
          staffId={historyStaffId}
          staffName={earnedByStaff.find((e) => e.staff_id === historyStaffId)
            ? `${earnedByStaff.find((e) => e.staff_id === historyStaffId)!.staff_first_name} ${earnedByStaff.find((e) => e.staff_id === historyStaffId)!.staff_last_name ?? ""}`
            : "Staff"}
          summaryMonth={summaryMonth}
          onClose={() => setHistoryStaffId(null)}
        />
      )}

      {showModal && (
        <AddRuleModal
          staffList={staffList}
          onClose={() => { setShowModal(false); setEditingRule(null); }}
          onSaved={fetchAll}
          editing={editingRule}
          salonId={salonId ?? ""}
        />
      )}
    </div>
  );
}