import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search as SearchIcon, PersonBadge, TelephoneFill } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { STAFF } from "../../../services/api/endpoints";
import "../styles/StaffHistoryPage.scss";

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  job_title?: string;
  employee_code?: string;
  phone_number?: string;
  phone?: string;
  is_active?: boolean;
  status?: string;
}

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#6366f1,#8b5cf6)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#10b981,#059669)",
  "linear-gradient(135deg,#3b82f6,#06b6d4)",
  "linear-gradient(135deg,#ec4899,#f43f5e)",
  "linear-gradient(135deg,#8b5cf6,#6366f1)",
  "linear-gradient(135deg,#f97316,#fbbf24)",
  "linear-gradient(135deg,#14b8a6,#0ea5e9)",
];

function getGradient(id: string) {
  const seed = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[seed % AVATAR_GRADIENTS.length];
}

function initials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

export default function StaffHistoryListPage() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);

    const attempt = (n: number): Promise<any> =>
      api.get(`${STAFF.BASE}?limit=200`).catch((e: any) => {
        if (n <= 0) throw e;
        return new Promise((resolve) => setTimeout(resolve, 600)).then(() => attempt(n - 1));
      });

    attempt(2)
      .then((res) => {
        if (cancelled) return;
        const items: StaffMember[] = res.data?.data?.items ?? [];
        setStaff(items.filter((s) => s.is_active !== false));
      })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [retryTick]);

  const filtered = staff.filter((s) => {
    const q = search.toLowerCase();
    const name = `${s.first_name} ${s.last_name}`.toLowerCase();
    return name.includes(q) || (s.job_title ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="shp-list-page">
      <div className="shp-list-header">
        <div>
          <h2 className="shp-list-title">Staff History</h2>
          <p className="shp-list-subtitle">Pick a staff member to view their full profile, performance, and history.</p>
        </div>
        <div className="shp-list-search">
          <SearchIcon size={14} />
          <input
            placeholder="Search staff…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="shp-list-grid">
          {[...Array(6)].map((_, i) => <div key={i} className="shp-list-card-skel" />)}
        </div>
      ) : loadError ? (
        <div className="shp-list-empty">
          <p>Couldn't load staff — connection issue.</p>
          <button className="shp-btn shp-btn--primary" onClick={() => setRetryTick((t) => t + 1)}>Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="shp-list-empty">
          <PersonBadge size={28} />
          <p>No staff found.</p>
        </div>
      ) : (
        <div className="shp-list-grid">
          {filtered.map((s) => (
            <button
              key={s.id}
              className="shp-list-card"
              onClick={() => navigate(`/dashboard/team/history/${s.id}`)}
            >
              <div className="shp-list-card__avatar" style={{ background: getGradient(s.id) }}>
                {initials(s.first_name, s.last_name)}
              </div>
              <div className="shp-list-card__info">
                <div className="shp-list-card__name">{s.first_name} {s.last_name}</div>
                <div className="shp-list-card__role">{s.job_title || "Staff"}</div>
                {(s.phone_number || s.phone) && (
                  <div className="shp-list-card__phone">
                    <TelephoneFill size={11} /> {s.phone_number || s.phone}
                  </div>
                )}
              </div>
              <span className={`shp-list-card__status ${s.is_active === false ? "inactive" : "active"}`}>
                {s.is_active === false ? "Inactive" : "Active"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
