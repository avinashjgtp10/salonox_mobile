import { useState, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import {
  Star,
  Users,
  Gift,
  TrendingUp,
  Search,
  Plus,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Award,
  Zap,
  Crown,
  Shield,
  MoreHorizontal,
  Edit2,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import "../styles/ClientLoyaltyPage.scss";

// ── Types ─────────────────────────────────────────────────────────────────────
type Tier   = "Bronze" | "Silver" | "Gold" | "Platinum";
type Status = "Active" | "Inactive";

interface LoyaltyCustomer {
  id: string;
  name: string;
  phone: string;
  points: number;
  tier: Tier;
  status: Status;
  joinDate: string;
  initials: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getTier(pts: number): Tier {
  if (pts >= 400) return "Platinum";
  if (pts >= 200) return "Gold";
  if (pts >= 100) return "Silver";
  return "Bronze";
}

const INITIAL_CUSTOMERS: LoyaltyCustomer[] = [
  { id: "1",  name: "Priya Sharma",  phone: "+91 98765 43210", points: 450, tier: "Platinum", status: "Active",   joinDate: "12 Jan 2024", initials: "PS" },
  { id: "2",  name: "Ravi Kumar",    phone: "+91 87654 32109", points: 320, tier: "Gold",     status: "Active",   joinDate: "08 Mar 2024", initials: "RK" },
  { id: "3",  name: "Anjali Singh",  phone: "+91 76543 21098", points: 210, tier: "Gold",     status: "Active",   joinDate: "22 Feb 2024", initials: "AS" },
  { id: "4",  name: "Neha Patel",    phone: "+91 65432 10987", points: 180, tier: "Silver",   status: "Active",   joinDate: "05 Apr 2024", initials: "NP" },
  { id: "5",  name: "Amit Verma",    phone: "+91 54321 09876", points: 95,  tier: "Bronze",   status: "Active",   joinDate: "18 May 2024", initials: "AV" },
  { id: "6",  name: "Sunita Rao",    phone: "+91 43210 98765", points: 60,  tier: "Bronze",   status: "Inactive", joinDate: "30 Jun 2024", initials: "SR" },
  { id: "7",  name: "Kiran Mehta",   phone: "+91 32109 87654", points: 280, tier: "Gold",     status: "Active",   joinDate: "14 Jul 2024", initials: "KM" },
  { id: "8",  name: "Deepa Nair",    phone: "+91 21098 76543", points: 130, tier: "Silver",   status: "Active",   joinDate: "02 Aug 2024", initials: "DN" },
  { id: "9",  name: "Raj Kapoor",    phone: "+91 91234 56789", points: 510, tier: "Platinum", status: "Active",   joinDate: "15 Sep 2024", initials: "RK" },
  { id: "10", name: "Meena Iyer",    phone: "+91 80123 45678", points: 75,  tier: "Bronze",   status: "Active",   joinDate: "20 Oct 2024", initials: "MI" },
];

const TIER_CONFIG: Record<Tier, { color: string; bg: string; icon: React.ReactNode }> = {
  Bronze:   { color: "#b45309", bg: "#fef3c7", icon: <Award   size={11} /> },
  Silver:   { color: "#475569", bg: "#f1f5f9", icon: <Shield  size={11} /> },
  Gold:     { color: "#d97706", bg: "#fffbeb", icon: <Crown   size={11} /> },
  Platinum: { color: "#7c3aed", bg: "#f5f3ff", icon: <Zap     size={11} /> },
};

const REWARD_RULES = [
  { icon: "💰", label: "Earn Rate",      value: "₹100 spent = 10 points" },
  { icon: "🎯", label: "Redeem Rate",    value: "100 points = ₹10 discount" },
  { icon: "🥇", label: "Gold Tier",      value: "200+ points earned" },
  { icon: "💎", label: "Platinum Tier",  value: "400+ points earned" },
  { icon: "⏳", label: "Points Expiry",  value: "After 12 months" },
  { icon: "🔑", label: "Min Redemption", value: "50 points minimum" },
];

const POPULAR_REWARDS = [
  { id: "r1", title: "₹50 Discount",   points: 500,  icon: "🏷️", color: "#7c3aed", bg: "#f5f3ff", desc: "Get ₹50 off on your next visit" },
  { id: "r2", title: "₹100 Discount",  points: 1000, icon: "💸", color: "#059669", bg: "#f0fdf4", desc: "Get ₹100 off on any service" },
  { id: "r3", title: "Free Hair Wash", points: 200,  icon: "💆", color: "#0284c7", bg: "#f0f9ff", desc: "Complimentary hair wash service" },
];

const ROWS_PER_PAGE = 6;

// ── Component ─────────────────────────────────────────────────────────────────
export default function ClientLoyaltyPage() {
  const panelRef = useRef<HTMLDivElement>(null);

  const [customers,        setCustomers]        = useState<LoyaltyCustomer[]>(INITIAL_CUSTOMERS);
  const [search,           setSearch]           = useState("");
  const [tierFilter,       setTierFilter]       = useState<Tier | "All">("All");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [points,           setPoints]           = useState("");
  const [action,           setAction]           = useState<"add" | "redeem">("add");
  const [currentPage,      setCurrentPage]      = useState(1);
  const [actionMenuId,     setActionMenuId]     = useState<string | null>(null);
  const [isSyncing,        setIsSyncing]        = useState(false);
  const [removeId,         setRemoveId]         = useState<string | null>(null);

  const filtered = useMemo(() =>
    customers.filter((c) => {
      const q = search.toLowerCase();
      return (
        (c.name.toLowerCase().includes(q) || c.phone.includes(q)) &&
        (tierFilter === "All" || c.tier === tierFilter)
      );
    }),
    [customers, search, tierFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const pageRows   = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const totalIssued   = customers.reduce((s, c) => s + c.points, 0);
  const totalRedeemed = 1240;
  const activeMembers = customers.filter((c) => c.status === "Active").length;

  // ── Scroll panel into view ─────────────────────────────────────────────────
  const focusPanel = (customerId?: string) => {
    if (customerId) setSelectedCustomer(customerId);
    setPoints("");
    setAction("add");
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  // ── Sync ──────────────────────────────────────────────────────────────────
  const handleSync = async () => {
    setIsSyncing(true);
    await new Promise((r) => setTimeout(r, 1200));
    setIsSyncing(false);
    toast.success("Loyalty data synced successfully");
  };

  // ── Save Changes ──────────────────────────────────────────────────────────
  const handleSave = () => {
    const pts = parseInt(points, 10);
    if (!selectedCustomer || !pts || pts <= 0) {
      toast.error("Please select a customer and enter valid points");
      return;
    }
    const customer = customers.find((c) => c.id === selectedCustomer);
    if (!customer) return;

    if (action === "redeem") {
      if (pts < 50) {
        toast.error("Minimum redemption is 50 points");
        return;
      }
      if (pts > customer.points) {
        toast.error(`${customer.name} only has ${customer.points} points`);
        return;
      }
    }

    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id !== selectedCustomer) return c;
        const newPts = action === "add" ? c.points + pts : c.points - pts;
        return { ...c, points: newPts, tier: getTier(newPts) };
      })
    );

    toast.success(
      action === "add"
        ? `+${pts} points added to ${customer.name}`
        : `${pts} points redeemed for ${customer.name}`
    );

    setSelectedCustomer("");
    setPoints("");
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setSelectedCustomer("");
    setPoints("");
    setAction("add");
    toast("Form cleared", { icon: "🔄" });
  };

  // ── Remove customer ────────────────────────────────────────────────────────
  const handleRemove = (id: string) => {
    const customer = customers.find((c) => c.id === id);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    setRemoveId(null);
    setActionMenuId(null);
    toast.success(`${customer?.name} removed from loyalty program`);
  };

  // ── Toggle status ─────────────────────────────────────────────────────────
  const handleToggleStatus = (id: string) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const next = c.status === "Active" ? "Inactive" : "Active";
        toast(`${c.name} marked as ${next}`, { icon: next === "Active" ? "✅" : "⏸️" });
        return { ...c, status: next };
      })
    );
    setActionMenuId(null);
  };

  const changeSearch = (v: string) => { setSearch(v); setCurrentPage(1); };
  const changeTier   = (v: Tier | "All") => { setTierFilter(v); setCurrentPage(1); };

  return (
    <div
      className="lp-page"
      onClick={() => { if (actionMenuId) setActionMenuId(null); if (removeId) setRemoveId(null); }}
    >

      {/* ── HEADER ── */}
      <div className="lp-header">
        <div>
          <h2 className="lp-header__title">Loyalty Points</h2>
          <p className="lp-header__sub">Manage customer loyalty points and rewards</p>
        </div>
        <div className="lp-header__actions">
          <button
            className="lp-btn lp-btn--outline"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw size={13} className={isSyncing ? "lp-spin" : ""} />
            {isSyncing ? "Syncing…" : "Sync"}
          </button>
          <button
            className="lp-btn lp-btn--primary"
            onClick={() => focusPanel()}
          >
            <Plus size={13} /> Add Points
          </button>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="lp-stats">
        <div className="lp-stat lp-stat--purple">
          <div className="lp-stat__icon"><Star size={20} /></div>
          <div>
            <p className="lp-stat__label">Total Points Issued</p>
            <p className="lp-stat__value">{totalIssued.toLocaleString()}</p>
            <p className="lp-stat__hint">+12% this month</p>
          </div>
        </div>
        <div className="lp-stat lp-stat--green">
          <div className="lp-stat__icon"><TrendingUp size={20} /></div>
          <div>
            <p className="lp-stat__label">Total Points Redeemed</p>
            <p className="lp-stat__value">{totalRedeemed.toLocaleString()}</p>
            <p className="lp-stat__hint">+8% this month</p>
          </div>
        </div>
        <div className="lp-stat lp-stat--blue">
          <div className="lp-stat__icon"><Users size={20} /></div>
          <div>
            <p className="lp-stat__label">Active Members</p>
            <p className="lp-stat__value">{activeMembers}</p>
            <p className="lp-stat__hint">of {customers.length} total</p>
          </div>
        </div>
        <div className="lp-stat lp-stat--amber">
          <div className="lp-stat__icon"><Gift size={20} /></div>
          <div>
            <p className="lp-stat__label">Available Rewards</p>
            <p className="lp-stat__value">{POPULAR_REWARDS.length}</p>
            <p className="lp-stat__hint">Active rewards</p>
          </div>
        </div>
      </div>

      {/* ── MAIN ROW ── */}
      <div className="lp-main-row">

        {/* Customer Table */}
        <div className="lp-table-section">
          <div className="lp-table-topbar">
            <div className="lp-search-wrap">
              <Search size={13} className="lp-search-icon" />
              <input
                className="lp-search"
                placeholder="Search by name or phone…"
                value={search}
                onChange={(e) => changeSearch(e.target.value)}
              />
            </div>
            <div className="lp-filter-wrap">
              <Filter size={12} />
              <select
                className="lp-filter-select"
                value={tierFilter}
                onChange={(e) => changeTier(e.target.value as Tier | "All")}
              >
                <option value="All">All Tiers</option>
                <option>Bronze</option>
                <option>Silver</option>
                <option>Gold</option>
                <option>Platinum</option>
              </select>
              <ChevronDown size={11} />
            </div>
          </div>

          <div className="lp-table-wrap">
            <table className="lp-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Points</th>
                  <th>Tier</th>
                  <th>Status</th>
                  <th>Join Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="lp-table-empty">No customers found</td>
                  </tr>
                ) : pageRows.map((c) => {
                  const tier = TIER_CONFIG[c.tier];
                  return (
                    <tr key={c.id} className="lp-table-row">
                      <td>
                        <div className="lp-customer-cell">
                          <div className="lp-avatar">{c.initials}</div>
                          <span className="lp-customer-name">{c.name}</span>
                        </div>
                      </td>
                      <td className="lp-muted-cell">{c.phone}</td>
                      <td>
                        <div className="lp-points-cell">
                          <Star size={12} className="lp-pts-star" />
                          <span className="lp-pts-num">{c.points}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className="lp-tier-badge"
                          style={{ color: tier.color, background: tier.bg }}
                        >
                          {tier.icon} {c.tier}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`lp-status-badge lp-status-badge--${c.status.toLowerCase()}`}
                          style={{ cursor: "pointer" }}
                          onClick={() => handleToggleStatus(c.id)}
                          title="Click to toggle status"
                        >
                          {c.status === "Active" ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                          {c.status}
                        </span>
                      </td>
                      <td className="lp-muted-cell">{c.joinDate}</td>
                      <td>
                        <div
                          className="lp-actions-cell"
                          style={{ position: "relative" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="lp-icon-btn"
                            title="Add / Redeem points"
                            onClick={() => focusPanel(c.id)}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            className="lp-icon-btn"
                            title="More options"
                            onClick={() =>
                              setActionMenuId(actionMenuId === c.id ? null : c.id)
                            }
                          >
                            <MoreHorizontal size={13} />
                          </button>

                          {actionMenuId === c.id && (
                            <div className="lp-action-menu">
                              <button
                                className="lp-action-menu__item"
                                onClick={() => { focusPanel(c.id); setActionMenuId(null); }}
                              >
                                <Plus size={13} /> Add Points
                              </button>
                              <button
                                className="lp-action-menu__item"
                                onClick={() => { setAction("redeem"); focusPanel(c.id); setActionMenuId(null); }}
                              >
                                <Gift size={13} /> Redeem Points
                              </button>
                              <button
                                className="lp-action-menu__item lp-action-menu__item--divider"
                                onClick={() => handleToggleStatus(c.id)}
                              >
                                {c.status === "Active" ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
                                Mark {c.status === "Active" ? "Inactive" : "Active"}
                              </button>
                              <button
                                className="lp-action-menu__item lp-action-menu__item--danger"
                                onClick={() => {
                                  setRemoveId(c.id);
                                  setActionMenuId(null);
                                }}
                              >
                                <Trash2 size={13} /> Remove
                              </button>
                            </div>
                          )}

                          {/* Inline confirm delete */}
                          {removeId === c.id && (
                            <div className="lp-confirm-box" onClick={(e) => e.stopPropagation()}>
                              <p>Remove <strong>{c.name}</strong>?</p>
                              <div className="lp-confirm-box__btns">
                                <button
                                  className="lp-confirm-box__yes"
                                  onClick={() => handleRemove(c.id)}
                                >
                                  Remove
                                </button>
                                <button
                                  className="lp-confirm-box__no"
                                  onClick={() => setRemoveId(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="lp-pagination">
              <span className="lp-pagination__info">
                {(currentPage - 1) * ROWS_PER_PAGE + 1}–
                {Math.min(currentPage * ROWS_PER_PAGE, filtered.length)} of {filtered.length} customers
              </span>
              <div className="lp-pagination__btns">
                <button
                  className="lp-page-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    className={`lp-page-btn${currentPage === i + 1 ? " lp-page-btn--active" : ""}`}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  className="lp-page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Manage Points Panel */}
        <div className="lp-panel" ref={panelRef}>
          <div className="lp-panel__head">
            <h3 className="lp-panel__title">
              <Star size={15} className="lp-panel__title-icon" />
              Manage Points
            </h3>
            <p className="lp-panel__sub">Add or redeem loyalty points</p>
          </div>

          <div className="lp-form-group">
            <label className="lp-label">Customer</label>
            <div className="lp-select-wrap">
              <select
                className="lp-select"
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
              >
                <option value="">Select customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.points} pts
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="lp-select-caret" />
            </div>
          </div>

          <div className="lp-form-group">
            <label className="lp-label">Points Amount</label>
            <input
              type="number"
              className="lp-input"
              placeholder="Enter points"
              value={points}
              min={1}
              onChange={(e) => setPoints(e.target.value)}
            />
          </div>

          <div className="lp-form-group">
            <label className="lp-label">Action</label>
            <div className="lp-radio-group">
              <label className={`lp-radio${action === "add" ? " lp-radio--active" : ""}`}>
                <input type="radio" name="loyalty-action" checked={action === "add"} onChange={() => setAction("add")} />
                <Plus size={13} /> Add Points
              </label>
              <label className={`lp-radio${action === "redeem" ? " lp-radio--active" : ""}`}>
                <input type="radio" name="loyalty-action" checked={action === "redeem"} onChange={() => setAction("redeem")} />
                <Gift size={13} /> Redeem
              </label>
            </div>
          </div>

          {selectedCustomer && points && parseInt(points) > 0 && (
            <div className="lp-preview">
              <p className="lp-preview__label">Preview</p>
              <p className="lp-preview__text">
                {action === "add" ? "➕ Adding" : "🎁 Redeeming"}{" "}
                <strong>{points} pts</strong> {action === "add" ? "to" : "from"}{" "}
                <strong>{customers.find((c) => c.id === selectedCustomer)?.name}</strong>
              </p>
              {action === "add" && (
                <p className="lp-preview__after">
                  New balance:{" "}
                  <strong>
                    {(customers.find((c) => c.id === selectedCustomer)?.points ?? 0) + parseInt(points)} pts
                  </strong>
                </p>
              )}
            </div>
          )}

          <div className="lp-panel__actions">
            <button
              className="lp-btn lp-btn--primary lp-btn--full"
              onClick={handleSave}
              disabled={!selectedCustomer || !points || parseInt(points) <= 0}
            >
              Save Changes
            </button>
            <button className="lp-btn lp-btn--ghost lp-btn--full" onClick={handleReset}>
              <RotateCcw size={13} /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* ── BOTTOM ROW ── */}
      <div className="lp-bottom-row">

        {/* Reward Rules */}
        <div className="lp-card">
          <h3 className="lp-card__title">
            <Shield size={15} className="lp-card__title-icon" />
            Reward Rules
          </h3>
          <div className="lp-rules-grid">
            {REWARD_RULES.map((r) => (
              <div key={r.label} className="lp-rule-item">
                <span className="lp-rule-item__emoji">{r.icon}</span>
                <div>
                  <p className="lp-rule-item__label">{r.label}</p>
                  <p className="lp-rule-item__value">{r.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Rewards */}
        <div className="lp-card">
          <h3 className="lp-card__title">
            <Gift size={15} className="lp-card__title-icon" />
            Popular Rewards
          </h3>
          <div className="lp-rewards-list">
            {POPULAR_REWARDS.map((r) => (
              <div
                key={r.id}
                className="lp-reward-item"
                style={{ borderLeftColor: r.color }}
              >
                <div className="lp-reward-item__icon" style={{ background: r.bg }}>
                  <span>{r.icon}</span>
                </div>
                <div className="lp-reward-item__info">
                  <p className="lp-reward-item__title">{r.title}</p>
                  <p className="lp-reward-item__desc">{r.desc}</p>
                </div>
                <div className="lp-reward-item__right">
                  <span
                    className="lp-reward-item__pts"
                    style={{ color: r.color, background: r.bg }}
                  >
                    <Star size={10} /> {r.points} pts
                  </span>
                  <button
                    className="lp-reward-item__redeem-btn"
                    style={{ color: r.color, borderColor: r.color }}
                    onClick={() => {
                      setAction("redeem");
                      setPoints(String(r.points));
                      focusPanel();
                      toast(`Select a customer to redeem "${r.title}"`, { icon: "🎁" });
                    }}
                  >
                    Redeem
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
