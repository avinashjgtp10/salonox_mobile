import { useEffect, useState, useRef } from "react";
import {
  X,
  ChevronDown,
  ChevronUp,
  Person,
  Plus,
  Clock,
  Pencil,
  Upload,
} from "react-bootstrap-icons";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api/axios";
import { CLIENT } from "../../../services/api/endpoints";
import "../styles/ClientDetailsDrawer.scss";

interface ClientDetailsDrawerProps {
  clientId: string | number | null;
  isOpen: boolean;
  onClose: () => void;
}

type MainTab =
  | "Overview"
  | "Appointments"
  | "Sales"
  | "Client details"
  | "Items"
  | "Documents"
  | "Wallet"
  | "Loyalty"
  | "Reviews";

type DocSubTab =
  | "Notes"
  | "Allergies"
  | "Patch tests"
  | "Client forms"
  | "Files";
type AppointmentFilter = "All" | "Booked" | "Confirmed" | "More";
type SalesFilter = "All" | "Paid" | "Drafts" | "Unpaid" | "More";
type ItemsTab = "Products" | "Memberships" | "Services";
type NotesTab = "Client notes" | "Appointment notes";
type AllergyType = "Non-drug allergy" | "Drug allergy" | "No known allergies";
type Severity = "Mild" | "Moderate" | "Severe" | "Fatal";
type PatchStatus = "Pending" | "Passed" | "Failed";

const DOC_SUB_TABS: DocSubTab[] = [
  "Notes",
  "Allergies",
  "Patch tests",
  "Client forms",
  "Files",
];
const MAIN_TABS_TOP: MainTab[] = [
  "Overview",
  "Appointments",
  "Sales",
  "Client details",
  "Items",
];
const MAIN_TABS_BOTTOM: MainTab[] = ["Wallet", "Loyalty", "Reviews"];

// ── Severity dot SVG ───────────────────────────────────────────────────────────
function SeverityDot({ color }: { color: string }) {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="14" fill={`${color}22`} />
      <circle cx="18" cy="18" r="10" fill={`${color}55`} />
      <circle cx="18" cy="18" r="6" fill={color} />
    </svg>
  );
}

// ── Add Allergy Modal ─────────────────────────────────────────────────────────
function AddAllergyModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<AllergyType>("Non-drug allergy");
  const [name, setName] = useState("");
  const [reaction, setReaction] = useState("");
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [note, setNote] = useState("");

  const severities: { label: Severity; color: string }[] = [
    { label: "Mild", color: "#22c55e" },
    { label: "Moderate", color: "#f97316" },
    { label: "Severe", color: "#ef4444" },
    { label: "Fatal", color: "#111827" },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add allergy</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Type tabs */}
        <div className="modal-type-tabs">
          {(
            [
              "Non-drug allergy",
              "Drug allergy",
              "No known allergies",
            ] as AllergyType[]
          ).map((t) => (
            <button
              key={t}
              className={`type-tab ${type === t ? "active" : ""}`}
              onClick={() => setType(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {type !== "No known allergies" && (
          <>
            <div className="modal-row-2">
              <div className="modal-field">
                <label>Name</label>
                <input
                  placeholder="Enter allergy name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="modal-field">
                <label>Reaction</label>
                <div className="select-wrapper">
                  <select
                    value={reaction}
                    onChange={(e) => setReaction(e.target.value)}
                  >
                    <option value="">Select an option</option>
                    <option>Rash</option>
                    <option>Swelling</option>
                    <option>Anaphylaxis</option>
                    <option>Other</option>
                  </select>
                  <ChevronDown size={14} className="select-icon" />
                </div>
              </div>
            </div>

            <div className="modal-field">
              <label>
                Severity{" "}
                <span className="field-hint">
                  Leave empty if severity unknown
                </span>
              </label>
              <div className="severity-options">
                {severities.map(({ label, color }) => (
                  <div
                    key={label}
                    className={`severity-card ${severity === label ? "selected" : ""}`}
                    onClick={() =>
                      setSeverity(severity === label ? null : label)
                    }
                  >
                    <SeverityDot color={color} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {type === "No known allergies" && (
          <div className="modal-field">
            <label>
              Note <span className="char-count">{note.length}/1000</span>
            </label>
            <textarea
              placeholder="Enter allergy notes here"
              value={note}
              maxLength={1000}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
            />
          </div>
        )}

        {type !== "No known allergies" && (
          <div className="modal-field">
            <label>
              Note <span className="char-count">{note.length}/1000</span>
            </label>
            <textarea
              placeholder="Enter allergy notes here"
              value={note}
              maxLength={1000}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
            />
          </div>
        )}

        <div className="modal-footer">
          <button className="btn-modal-save">Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Add Note Modal ────────────────────────────────────────────────────────────
function AddNoteModal({ onClose }: { onClose: () => void }) {
  const [note, setNote] = useState("");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add a note</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-field">
          <div className="note-date-row">
            <span className="note-date-label">Today</span>
            <ChevronDown size={14} />
          </div>
          <textarea
            placeholder="Add a note here..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={5}
          />
        </div>

        <div className="modal-footer space-between">
          <button className="btn-upload">
            <Upload size={14} /> Upload
          </button>
          <button className="btn-modal-save">Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Patch Test Modal ──────────────────────────────────────────────────────────
function PatchTestModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<PatchStatus>("Pending");
  const [description, setDescription] = useState("");

  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const statusOptions: { label: PatchStatus; color: string }[] = [
    { label: "Pending", color: "#f97316" },
    { label: "Passed", color: "#22c55e" },
    { label: "Failed", color: "#ef4444" },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Patch test</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-field">
          <label>
            Title <span className="char-count">{title.length}/100</span>
          </label>
          <input
            placeholder="e.g. Tint patch test"
            value={title}
            maxLength={100}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="modal-row-2">
          <div className="modal-field">
            <label>Tested</label>
            <div className="select-wrapper">
              <select defaultValue={today}>
                <option>{today}</option>
              </select>
              <ChevronDown size={14} className="select-icon" />
            </div>
            <span className="field-hint" style={{ marginTop: 4 }}>
              Expires on{" "}
              {new Date(
                Date.now() + 180 * 24 * 60 * 60 * 1000,
              ).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="modal-field">
            <label>Tested by</label>
            <div className="select-wrapper">
              <select>
                <option>Select staff</option>
              </select>
              <ChevronDown size={14} className="select-icon" />
            </div>
          </div>
        </div>

        <div className="modal-field">
          <label>Status</label>
          <div className="patch-status-options">
            {statusOptions.map(({ label, color }) => (
              <div
                key={label}
                className={`patch-status-card ${status === label ? "selected" : ""}`}
                onClick={() => setStatus(label)}
              >
                <SeverityDot color={color} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-field">
          <label>
            Description{" "}
            <span className="char-count">{description.length}/200</span>
          </label>
          <textarea
            placeholder="Enter the patch test details, e.g. product name or the updates history"
            value={description}
            maxLength={200}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>

        <div className="modal-footer space-between">
          <button className="btn-modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-modal-save">Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────
function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <svg width="72" height="54" viewBox="0 0 72 54" fill="none">
          <ellipse cx="36" cy="38" rx="32" ry="14" fill="#f0edff" />
          <ellipse cx="36" cy="30" rx="22" ry="18" fill="#e0ddff" />
          <circle cx="36" cy="22" r="12" fill="#c4b5fd" />
          <circle cx="36" cy="22" r="6" fill="#a78bfa" />
        </svg>
      </div>
      <h4>{title}</h4>
      <p>{message}</p>
    </div>
  );
}

// ── Appointment card ───────────────────────────────────────────────────────────
function AppointmentCard({ appt }: { appt: any }) {
  const date = appt.starts_at ? new Date(appt.starts_at) : null;
  const dateStr = date
    ? date.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "";
  const status: string = appt.status || "Booked";

  return (
    <div className="appointment-card-v2">
      <div className={`status-line status-${status.toLowerCase()}`} />
      <div className="card-content">
        <div className="card-header">
          <div className="header-left">
            <Clock size={16} />
            <div className="header-text">
              <span className="type">Appointment</span>
              <span className="info">
                {dateStr}
                {appt.staff_name ? ` • ${appt.staff_name}` : ""}
              </span>
            </div>
          </div>
          <span className={`status-badge badge-${status.toLowerCase()}`}>
            {status}
          </span>
        </div>
        <div className="card-body">
          <div className="service-info">
            <div className="service-name">{appt.service_name || "Service"}</div>
            <div className="service-meta">
              {[
                appt.start_time,
                appt.duration ? `${appt.duration}min` : null,
                appt.staff_name,
              ]
                .filter(Boolean)
                .join(" • ")}
            </div>
          </div>
          <div className="service-price">₹{appt.price ?? 0}</div>
        </div>
        <div className="card-footer">
          <button className="btn-checkout">Checkout</button>
        </div>
      </div>
    </div>
  );
}

// ── Main drawer ────────────────────────────────────────────────────────────────
export default function ClientDetailsDrawer({
  clientId,
  isOpen,
  onClose,
}: ClientDetailsDrawerProps) {
  const navigate = useNavigate();
  const [client, setClient] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<MainTab>("Overview");
  const [docsExpanded, setDocsExpanded] = useState(false);
  const [activeDocSubTab, setActiveDocSubTab] = useState<DocSubTab>("Notes");
  const [apptFilter, setApptFilter] = useState<AppointmentFilter>("All");
  const [salesFilter, setSalesFilter] = useState<SalesFilter>("All");
  const [itemsTab, setItemsTab] = useState<ItemsTab>("Products");
  const [notesTab, setNotesTab] = useState<NotesTab>("Client notes");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [walletActionsOpen, setWalletActionsOpen] = useState(false);

  // Modals
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddAllergy, setShowAddAllergy] = useState(false);
  const [showAddPatchTest, setShowAddPatchTest] = useState(false);

  const actionsRef = useRef<HTMLDivElement>(null);
  const walletActionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && clientId) {
      api
        .get(CLIENT.BY_ID(clientId))
        .then((r) => setClient(r.data?.data || r.data))
        .catch(() => setClient(null));
    }
    if (!isOpen) {
      setClient(null);
      setAppointments([]);
      setActiveTab("Overview");
      setDocsExpanded(false);
      setActionsOpen(false);
      setShowAddNote(false);
      setShowAddAllergy(false);
      setShowAddPatchTest(false);
    }
  }, [isOpen, clientId]);

  useEffect(() => {
    if (clientId && activeTab === "Appointments") {
      api
        .get(CLIENT.APPOINTMENTS(clientId))
        .then((r) => setAppointments(r.data?.data || r.data || []))
        .catch(() => setAppointments([]));
    }
  }, [activeTab, clientId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        actionsRef.current &&
        !actionsRef.current.contains(e.target as Node)
      )
        setActionsOpen(false);
      if (
        walletActionsRef.current &&
        !walletActionsRef.current.contains(e.target as Node)
      )
        setWalletActionsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!isOpen) return null;

  const firstName =
    client?.first_name || client?.fullName?.split(" ")[0] || "";
  const lastName =
    client?.last_name || client?.fullName?.split(" ").slice(1).join(" ") || "";
  const initials =
    `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase() || "?";
  const fullName = `${firstName} ${lastName}`.trim() || "–";
  const email = client?.email || "";
  const createdAt = client?.created_at
    ? new Date(client.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  const apptCount: number | null =
    client?.appointments_count != null
      ? client.appointments_count
      : appointments.length > 0
        ? appointments.length
        : null;

  const apptGroups: Record<string, any[]> = {};
  appointments.forEach((a) => {
    const d = a.starts_at ? new Date(a.starts_at) : new Date();
    const key = d.toLocaleDateString("en-GB", { month: "long" });
    (apptGroups[key] = apptGroups[key] || []).push(a);
  });

  const handleTabClick = (tab: MainTab) => {
    if (tab === "Documents") {
      setDocsExpanded((prev) => !prev);
      setActiveTab("Documents");
    } else {
      setActiveTab(tab);
      setDocsExpanded(false);
    }
  };

  return (
    <>
      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {showAddNote && (
        <AddNoteModal onClose={() => setShowAddNote(false)} />
      )}
      {showAddAllergy && (
        <AddAllergyModal onClose={() => setShowAddAllergy(false)} />
      )}
      {showAddPatchTest && (
        <PatchTestModal onClose={() => setShowAddPatchTest(false)} />
      )}

      <div
        className={`client-drawer-overlay ${isOpen ? "open" : ""}`}
        onClick={onClose}
      >
        <div className="client-drawer" onClick={(e) => e.stopPropagation()}>
          <button className="drawer-close" onClick={onClose}>
            <X size={20} />
          </button>

          <div className="drawer-main-container">
            {/* ── PANE 1: PROFILE SUMMARY ──────────────────────────────── */}
            <div className="profile-summary-pane">
              <div className="profile-info-card">
                <div className="profile-avatar">{initials}</div>
                <h3 className="profile-name">{fullName}</h3>
                {email && <p className="profile-email">{email}</p>}

                <div className="profile-buttons">
                  <div className="actions-wrapper" ref={actionsRef}>
                    <button
                      className="btn-actions"
                      onClick={() => setActionsOpen((o) => !o)}
                    >
                      Actions <ChevronDown size={12} />
                    </button>
                    {actionsOpen && (
                      <div className="actions-dropdown">
                        <div className="dropdown-section-label">
                          Quick actions
                        </div>
                        {[
                          "Sell",
                          "Add staff alert",
                          "Add simple note",
                          "Add allergy",
                          "Add patch test",
                          "Add tag",
                          "Add reward",
                        ].map((a) => (
                          <div key={a} className="dropdown-item">
                            {a}
                          </div>
                        ))}
                        <div className="dropdown-divider" />
                        <div
                          className="dropdown-item"
                          onClick={() =>
                            navigate(`/dashboard/clients/edit/${clientId}`)
                          }
                        >
                          Edit client details
                        </div>
                        <div className="dropdown-item">Merge profiles</div>
                        <div className="dropdown-item">Block client</div>
                        <div className="dropdown-divider" />
                        <div className="dropdown-item danger">
                          Delete client
                        </div>
                      </div>
                    )}
                  </div>
                  <button className="btn-book-now">Book now</button>
                </div>

                <div className="profile-meta-list">
                  <div className="meta-item">
                    <Plus size={16} />
                    <span>Add pronouns</span>
                  </div>
                  <div className="meta-item">
                    <Plus size={16} />
                    <span>Add date of birth</span>
                  </div>
                  {createdAt && (
                    <div className="meta-item created-date">
                      <Person size={14} />
                      <span>Created {createdAt}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── PANE 2: NAVIGATION TABS ──────────────────────────────── */}
            <div className="navigation-tabs-pane">
              <div className="tabs-list">
                {MAIN_TABS_TOP.map((tab) => (
                  <div
                    key={tab}
                    className={`tab-item ${activeTab === tab && !docsExpanded ? "active" : ""}`}
                    onClick={() => handleTabClick(tab)}
                  >
                    <span className="tab-label">{tab}</span>
                    {tab === "Appointments" &&
                      apptCount != null &&
                      apptCount > 0 && (
                        <span className="tab-count">{apptCount}</span>
                      )}
                  </div>
                ))}

                {/* Documents accordion */}
                <div
                  className={`tab-item ${activeTab === "Documents" ? "active" : ""}`}
                  onClick={() => handleTabClick("Documents")}
                >
                  <span className="tab-label">Documents</span>
                  {docsExpanded ? (
                    <ChevronUp size={12} className="ms-auto" />
                  ) : (
                    <ChevronDown size={12} className="ms-auto" />
                  )}
                </div>
                {docsExpanded && (
                  <div className="doc-sub-nav">
                    {DOC_SUB_TABS.map((sub) => (
                      <div
                        key={sub}
                        className={`doc-sub-item ${activeDocSubTab === sub ? "active" : ""}`}
                        onClick={() => setActiveDocSubTab(sub)}
                      >
                        {sub}
                      </div>
                    ))}
                  </div>
                )}

                {MAIN_TABS_BOTTOM.map((tab) => (
                  <div
                    key={tab}
                    className={`tab-item ${activeTab === tab ? "active" : ""}`}
                    onClick={() => handleTabClick(tab)}
                  >
                    <span className="tab-label">{tab}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── PANE 3: CONTENT AREA ─────────────────────────────────── */}
            <div className="tab-content-pane">
              {/* OVERVIEW */}
              {activeTab === "Overview" && (
                <div className="tab-section">
                  <h2>Overview</h2>
                  <div className="overview-card">
                    <div className="overview-card-header">
                      <span className="overview-card-title">Wallet</span>
                      <button className="link-btn">View wallet</button>
                    </div>
                    <div className="overview-field">
                      <span className="field-label">Balance</span>
                      <span className="field-amount">
                        ₹{client?.wallet_balance ?? 0}
                      </span>
                    </div>
                  </div>
                  <div className="overview-card">
                    <div className="overview-card-title mb-12">Summary</div>
                    <div className="overview-field">
                      <span className="field-label">Total sales</span>
                      <span className="field-amount">
                        ₹{client?.total_sales ?? 0}
                      </span>
                    </div>
                  </div>
                  <div className="stats-grid">
                    {[
                      {
                        label: "Appointments",
                        value: client?.appointments_count ?? 0,
                      },
                      { label: "Rating", value: "–" },
                      {
                        label: "Canceled",
                        value: client?.canceled_count ?? 0,
                      },
                      { label: "No show", value: client?.no_show_count ?? 0 },
                    ].map(({ label, value }) => (
                      <div key={label} className="stat-card">
                        <div className="stat-label">
                          {label}
                          <span className="stat-info">ℹ</span>
                        </div>
                        <div className="stat-value">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* APPOINTMENTS */}
              {activeTab === "Appointments" && (
                <div className="tab-section">
                  <h2>Appointments</h2>
                  <div className="sub-tabs-pills">
                    {(
                      [
                        "All",
                        "Booked",
                        "Confirmed",
                        "More",
                      ] as AppointmentFilter[]
                    ).map((f) => (
                      <button
                        key={f}
                        className={`sub-tab-pill ${apptFilter === f ? "active" : ""}`}
                        onClick={() => setApptFilter(f)}
                      >
                        {f}
                        {f === "More" && <ChevronDown size={12} />}
                      </button>
                    ))}
                  </div>
                  {appointments.length === 0 ? (
                    <EmptyState
                      title="No appointments"
                      message="No appointments have been booked for this client"
                    />
                  ) : (
                    Object.entries(apptGroups).map(([month, appts]) => (
                      <div key={month}>
                        <div className="month-header">{month}</div>
                        {appts.map((appt, i) => (
                          <AppointmentCard key={appt.id ?? i} appt={appt} />
                        ))}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* SALES */}
              {activeTab === "Sales" && (
                <div className="tab-section">
                  <div className="content-header-row">
                    <h2>Sales</h2>
                    <button className="btn-action-outline">Sell</button>
                  </div>
                  <div className="sub-tabs-pills">
                    {(
                      [
                        "All",
                        "Paid",
                        "Drafts",
                        "Unpaid",
                        "More",
                      ] as SalesFilter[]
                    ).map((f) => (
                      <button
                        key={f}
                        className={`sub-tab-pill ${salesFilter === f ? "active" : ""}`}
                        onClick={() => setSalesFilter(f)}
                      >
                        {f}
                        {f === "More" && <ChevronDown size={12} />}
                      </button>
                    ))}
                  </div>
                  <EmptyState
                    title="No sales"
                    message="No sales have been created with this client"
                  />
                </div>
              )}

              {/* CLIENT DETAILS */}
              {activeTab === "Client details" && (
                <div className="tab-section">
                  <div className="content-header-row">
                    <h2>Client details</h2>
                    <button className="btn-action-outline btn-edit">
                      <Pencil size={13} /> Edit
                    </button>
                  </div>

                  <div className="details-section">
                    <div className="details-section-title">Profile</div>
                    <div className="details-grid">
                      <div className="detail-field">
                        <div className="detail-label">Full name</div>
                        <div className="detail-value">{fullName}</div>
                      </div>
                      <div className="detail-field">
                        <div className="detail-label">Email</div>
                        <div className="detail-value">{email || "–"}</div>
                      </div>
                      <div className="detail-field">
                        <div className="detail-label">Phone number</div>
                        <div className="detail-value">
                          {client?.phone || "–"}
                        </div>
                      </div>
                      <div className="detail-field">
                        <div className="detail-label">Date of birth</div>
                        <div className="detail-value">
                          {client?.date_of_birth || "–"}
                        </div>
                      </div>
                      <div className="detail-field">
                        <div className="detail-label">Gender</div>
                        <div className="detail-value">
                          {client?.gender || "–"}
                        </div>
                      </div>
                      <div className="detail-field">
                        <div className="detail-label">Pronouns</div>
                        <div className="detail-value">
                          {client?.pronouns || "Not specified"}
                        </div>
                      </div>
                      <div className="detail-field">
                        <div className="detail-label">Joined</div>
                        <div className="detail-value">
                          {client?.created_at
                            ? new Date(client.created_at).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                },
                              )
                            : "–"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="details-section">
                    <div className="details-section-title">Additional info</div>
                    <div className="details-grid">
                      {[
                        ["Client source", client?.source],
                        ["Referred by", client?.referred_by],
                        ["Preferred language", client?.preferred_language],
                        ["Country", client?.country],
                        ["Occupation", client?.occupation],
                        ["Additional email", client?.additional_email],
                      ].map(([label, value]) => (
                        <div key={label as string} className="detail-field">
                          <div className="detail-label">{label}</div>
                          <div className="detail-value muted">
                            {value || "–"}
                          </div>
                        </div>
                      ))}
                      <div className="detail-field">
                        <div className="detail-label">Additional phone</div>
                        <div className="detail-value muted">
                          {client?.additional_phone || "–"}
                        </div>
                      </div>
                      <div className="detail-field full-width">
                        <div className="detail-label">Tags</div>
                        <div className="detail-value tags-row">
                          {(client?.tags || []).map((tag: string) => (
                            <span key={tag} className="tag-chip">
                              {tag}
                            </span>
                          ))}
                          <button className="btn-add-tag">
                            <Plus size={12} /> Add tag
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="details-section">
                    <div className="details-section-title">Addresses</div>
                    {!client?.addresses?.length && (
                      <p className="empty-text">No address added yet</p>
                    )}
                  </div>

                  <div className="details-section">
                    <div className="details-section-title">
                      Emergency contacts
                    </div>
                    {!client?.emergency_contacts?.length && (
                      <p className="empty-text">
                        No emergency contact added yet
                      </p>
                    )}
                  </div>

                  <div className="details-section">
                    <div className="details-section-title">Notifications</div>
                    <div className="notification-row">
                      <span className="notif-label">
                        Appointment notifications
                      </span>
                      <span className="notif-channels">
                        <a>Email</a> • <a>Text</a> •{" "}
                        <a className="wa">WhatsApp</a>
                      </span>
                    </div>
                    <div className="notification-row">
                      <span className="notif-label">
                        Marketing notifications
                      </span>
                      <span className="notif-channels">
                        <a>Email</a> • <a>Text</a> •{" "}
                        <a className="wa">WhatsApp</a>
                      </span>
                    </div>
                  </div>

                  <div className="details-section">
                    <div className="details-section-title">Payment policy</div>
                    <p className="policy-text">
                      {client?.payment_policy ||
                        "Client is not required to pay a deposit upfront or confirm with card."}
                    </p>
                  </div>
                </div>
              )}

              {/* ITEMS */}
              {activeTab === "Items" && (
                <div className="tab-section">
                  <h2>Items</h2>
                  <div className="sub-tabs-pills">
                    {(
                      ["Products", "Memberships", "Services"] as ItemsTab[]
                    ).map((t) => (
                      <button
                        key={t}
                        className={`sub-tab-pill ${itemsTab === t ? "active" : ""}`}
                        onClick={() => setItemsTab(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <EmptyState
                    title="No items"
                    message={`No ${itemsTab.toLowerCase()} have been sold to this client`}
                  />
                </div>
              )}

              {/* DOCUMENTS */}
              {activeTab === "Documents" && (
                <div className="tab-section">
                  {/* NOTES */}
                  {activeDocSubTab === "Notes" && (
                    <>
                      <div className="content-header-row">
                        <h2>Notes</h2>
                        <button
                          className="btn-action-outline"
                          onClick={() => setShowAddNote(true)}
                        >
                          Add
                        </button>
                      </div>
                      <div className="sub-tabs-pills">
                        {(
                          [
                            "Client notes",
                            "Appointment notes",
                          ] as NotesTab[]
                        ).map((t) => (
                          <button
                            key={t}
                            className={`sub-tab-pill ${notesTab === t ? "active" : ""}`}
                            onClick={() => setNotesTab(t)}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <EmptyState
                        title={
                          notesTab === "Client notes"
                            ? "No notes"
                            : "No appointment notes"
                        }
                        message={
                          notesTab === "Client notes"
                            ? "No notes have been created for this client"
                            : "No appointment notes have been created for this client"
                        }
                      />
                    </>
                  )}

                  {/* ALLERGIES */}
                  {activeDocSubTab === "Allergies" && (
                    <>
                      <div className="content-header-row">
                        <h2>Allergies</h2>
                        <button
                          className="btn-action-outline"
                          onClick={() => setShowAddAllergy(true)}
                        >
                          Add
                        </button>
                      </div>
                      <EmptyState
                        title="No allergies"
                        message="No allergies have been added for this client"
                      />
                    </>
                  )}

                  {/* PATCH TESTS */}
                  {activeDocSubTab === "Patch tests" && (
                    <>
                      <div className="content-header-row">
                        <h2>Patch tests</h2>
                        <button
                          className="btn-action-outline"
                          onClick={() => setShowAddPatchTest(true)}
                        >
                          Add
                        </button>
                      </div>
                      <EmptyState
                        title="No patch tests"
                        message="No patch tests have been added for this client"
                      />
                    </>
                  )}

                  {/* CLIENT FORMS */}
                  {activeDocSubTab === "Client forms" && (
                    <>
                      <div className="content-header-row">
                        <h2>Forms</h2>
                        <button className="btn-action-outline">Add</button>
                      </div>
                      <EmptyState
                        title="No client forms"
                        message="No client forms have been created for this client"
                      />
                    </>
                  )}

                  {/* FILES */}
                  {activeDocSubTab === "Files" && (
                    <>
                      <div className="content-header-row">
                        <h2>Files</h2>
                        <button className="btn-action-outline">Upload</button>
                      </div>
                      <EmptyState
                        title="No files"
                        message="No files have been uploaded for this client"
                      />
                    </>
                  )}
                </div>
              )}

              {/* WALLET */}
              {activeTab === "Wallet" && (
                <div className="tab-section">
                  <div className="content-header-row">
                    <h2>Wallet</h2>
                    <div className="actions-wrapper" ref={walletActionsRef}>
                      <button
                        className="btn-actions"
                        onClick={() => setWalletActionsOpen((o) => !o)}
                      >
                        Actions <ChevronDown size={12} />
                      </button>
                      {walletActionsOpen && (
                        <div className="actions-dropdown right-align">
                          <div className="dropdown-item">
                            <span className="dropdown-icon">🎁</span> Add
                            reward
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="wallet-balance-row">
                    <span className="wallet-balance">
                      ₹{client?.wallet_balance ?? 0}
                    </span>
                    <p className="wallet-sub">
                      Available balance.{" "}
                      <button className="link-btn">Learn more</button>
                    </p>
                  </div>

                  <div className="wallet-section-card">
                    <EmptyState
                      title="No payment methods"
                      message="Client cards will appear here."
                    />
                  </div>

                  <div className="wallet-rewards-header">
                    <span className="wallet-section-label">Rewards</span>
                    <button className="link-btn">View activity</button>
                  </div>

                  <div className="wallet-section-card">
                    <EmptyState
                      title="No rewards"
                      message="This client doesn't have any rewards"
                    />
                    <div style={{ textAlign: "center", marginTop: 8 }}>
                      <button className="btn-action-outline">Add reward</button>
                    </div>
                  </div>
                </div>
              )}

              {/* LOYALTY */}
              {activeTab === "Loyalty" && (
                <div className="tab-section">
                  <h2>Loyalty</h2>
                  <EmptyState
                    title="No loyalty data"
                    message="This client has no loyalty points yet"
                  />
                </div>
              )}

              {/* REVIEWS */}
              {activeTab === "Reviews" && (
                <div className="tab-section">
                  <h2>Reviews</h2>
                  <EmptyState
                    title="No reviews"
                    message="This client has not left any reviews"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
