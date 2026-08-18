import { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { selectCurrentSalon } from "../../../store/selectors/slices.selectors";
import {
  Search,
  PersonFill,
  TelephoneFill,
  X,
  PersonBadge,
} from "react-bootstrap-icons";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import api from "../../../services/api/axios";
import { CLIENT } from "../../../services/api/endpoints";
import { useCurrency } from "../../../hooks/useCurrency";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import "../styles/StaffCustomersPage.scss";

interface Client {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  phone_number?: string;
  status?: string;
  is_blocked?: boolean;
  created_at?: string;
  total_visits?: number;
  total_spent?: number;
}

function getInitials(first?: string, last?: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#14b8a6",
];

function getAvatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function formatDate(val?: string) {
  if (!val) return "—";
  try {
    return formatDateDDMMYYYY(new Date(val));
  } catch {
    return val;
  }
}

export default function StaffCustomersPage() {
  const currentSalon = useSelector(selectCurrentSalon);
  const salonId = currentSalon?.id;
  const { formatAmount } = useCurrency();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "blocked">("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;
  const { showError, overlay } = useStatusOverlay();

  const fetchClients = useCallback(async () => {
    if (!salonId) return;
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit };
      if (search) params.search = search;
      if (statusFilter === "active") params.is_blocked = false;
      if (statusFilter === "blocked") params.is_blocked = true;

      const res = await api.get(CLIENT.BASE, { params });
      const raw = res.data?.data?.items ?? res.data?.data ?? res.data ?? [];
      const arr = Array.isArray(raw) ? raw : [];
      setClients(arr);
      setTotal(res.data?.data?.pagination?.total ?? arr.length);
    } catch {
      showError("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [salonId, page, search, statusFilter]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="cust-page">
      {overlay}
      {/* ── Header ── */}
      <div className="cust-page__header">
        <div>
          <h1 className="cust-page__title">Customers</h1>
          <p className="cust-page__subtitle">
            Browse and manage your salon's client base.
          </p>
        </div>
        <div className="cust-page__header-stats">
          <div className="cust-page__stat-chip">
            <PersonFill size={13} />
            <span>{total} total</span>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="cust-page__toolbar">
        <div className="cust-page__search-wrap">
          <Search size={14} className="cust-page__search-icon" />
          <input
            className="cust-page__search"
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button className="cust-page__search-clear" onClick={() => setSearch("")}>
              <X size={13} />
            </button>
          )}
        </div>

        <div className="cust-page__status-tabs">
          {(["all", "active", "blocked"] as const).map((s) => (
            <button
              key={s}
              className={`cust-page__tab ${statusFilter === s ? "cust-page__tab--active" : ""}`}
              onClick={() => { setStatusFilter(s); setPage(1); }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="cust-page__card">
        {loading ? (
          <div className="cust-sk-list">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="cust-sk-row">
                <div className="cust-sk cust-sk--avatar" />
                <div className="cust-sk-lines">
                  <div className="cust-sk cust-sk--name" />
                  <div className="cust-sk cust-sk--sub" />
                </div>
                <div className="cust-sk cust-sk--contact" />
                <div className="cust-sk cust-sk--badge" />
                <div className="cust-sk cust-sk--date" />
              </div>
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="cust-page__empty">
            <PersonBadge size={42} className="cust-page__empty-icon" />
            <h3 className="cust-page__empty-title">
              {search || statusFilter !== "all" ? "No results found" : "No customers yet"}
            </h3>
            <p className="cust-page__empty-desc">
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filters."
                : "Customers will appear here after their first booking."}
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="cust-table__header">
              <div className="cust-table__col cust-table__col--client">Client</div>
              <div className="cust-table__col cust-table__col--contact">Contact</div>
              <div className="cust-table__col cust-table__col--visits">Visits</div>
              <div className="cust-table__col cust-table__col--spent">Total Spent</div>
              <div className="cust-table__col cust-table__col--joined">Joined</div>
              <div className="cust-table__col cust-table__col--status">Status</div>
            </div>

            {/* Rows */}
            {clients.map((client) => {
              const fullName = `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim();
              const isBlocked = client.is_blocked ?? client.status?.toLowerCase() === "blocked";
              return (
                <div key={client.id} className="cust-table__row">
                  <div className="cust-table__col cust-table__col--client">
                    <div
                      className="cust-avatar"
                      style={{ "--avatar-bg": getAvatarColor(client.id) } as React.CSSProperties}
                    >
                      {getInitials(client.first_name, client.last_name)}
                    </div>
                    <div className="cust-info">
                      <span className="cust-info__name">{fullName || "Unknown"}</span>
                      <span className="cust-info__email">
                        {client.email || "No email"}
                      </span>
                    </div>
                  </div>

                  <div className="cust-table__col cust-table__col--contact">
                    <span className="cust-contact">
                      <TelephoneFill size={10} />
                      {client.phone ?? client.phone_number ?? "—"}
                    </span>
                  </div>

                  <div className="cust-table__col cust-table__col--visits">
                    <span className="cust-cell-value">
                      {client.total_visits ?? "—"}
                    </span>
                  </div>

                  <div className="cust-table__col cust-table__col--spent">
                    <span className="cust-cell-value">
                      {client.total_spent != null
                        ? formatAmount(Number(client.total_spent))
                        : "—"}
                    </span>
                  </div>

                  <div className="cust-table__col cust-table__col--joined">
                    <span className="cust-cell-muted">
                      {formatDate(client.created_at)}
                    </span>
                  </div>

                  <div className="cust-table__col cust-table__col--status">
                    <span
                      className={`cust-badge ${isBlocked ? "cust-badge--blocked" : "cust-badge--active"}`}
                    >
                      {isBlocked ? "Blocked" : "Active"}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="cust-page__pagination">
                <span className="cust-page__pagination-info">
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                </span>
                <div className="cust-page__pagination-btns">
                  <button
                    className="cust-page__page-btn"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <span className="cust-page__page-num">{page} / {totalPages}</span>
                  <button
                    className="cust-page__page-btn"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
