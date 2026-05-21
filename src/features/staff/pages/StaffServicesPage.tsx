import { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { selectCurrentSalon } from "../../../store/selectors/slices.selectors";
import {
  Search,
  Scissors,
  X,
  Clock,
  CurrencyDollar,
} from "react-bootstrap-icons";
import toast from "react-hot-toast";
import api from "../../../services/api/axios";
import { SERVICES } from "../../../services/api/endpoints";
import "../styles/StaffServicesPage.scss";

interface Service {
  id: number;
  name?: string;
  category?: string;
  category_name?: string;
  duration?: number;
  price?: number;
  description?: string;
  is_active?: boolean;
  online_booking?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  hair: "svc-cat--hair",
  nails: "svc-cat--nails",
  skin: "svc-cat--skin",
  makeup: "svc-cat--makeup",
  massage: "svc-cat--massage",
  spa: "svc-cat--spa",
};

function getCategoryClass(cat?: string) {
  if (!cat) return "svc-cat--default";
  return CATEGORY_COLORS[cat.toLowerCase()] ?? "svc-cat--default";
}

function formatDuration(mins?: number) {
  if (!mins) return "—";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function StaffServicesPage() {
  const currentSalon = useSelector(selectCurrentSalon);
  const salonId = currentSalon?.id;

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;


  const fetchServices = useCallback(async () => {
    if (!salonId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      if (categoryFilter !== "all") params.set("category", categoryFilter);

      const res = await api.get(SERVICES.LIST(params.toString()));
      const raw = res.data?.data?.items ?? res.data?.data ?? res.data ?? [];
      const arr: Service[] = Array.isArray(raw) ? raw : [];
      setServices(arr);
      setTotal(res.data?.data?.pagination?.total ?? arr.length);

      // Build category list from first load
      if (categories.length === 0 && arr.length > 0) {
        const cats = Array.from(
          new Set(arr.map((s) => s.category_name ?? s.category).filter(Boolean))
        ) as string[];
        setCategories(cats);
      }
    } catch {
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  }, [salonId, page, search, categoryFilter]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="svc-page">
      {/* ── Header ── */}
      <div className="svc-page__header">
        <div>
          <h1 className="svc-page__title">Services</h1>
          <p className="svc-page__subtitle">
            All services offered by your salon.
          </p>
        </div>
        <div className="svc-page__header-chip">
          <Scissors size={13} />
          <span>{total} services</span>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="svc-page__toolbar">
        <div className="svc-page__search-wrap">
          <Search size={14} className="svc-page__search-icon" />
          <input
            className="svc-page__search"
            placeholder="Search services..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button className="svc-page__search-clear" onClick={() => setSearch("")}>
              <X size={13} />
            </button>
          )}
        </div>

        {categories.length > 0 && (
          <div className="svc-page__category-tabs">
            <button
              className={`svc-page__tab ${categoryFilter === "all" ? "svc-page__tab--active" : ""}`}
              onClick={() => { setCategoryFilter("all"); setPage(1); }}
            >
              All
            </button>
            {categories.slice(0, 5).map((cat) => (
              <button
                key={cat}
                className={`svc-page__tab ${categoryFilter === cat ? "svc-page__tab--active" : ""}`}
                onClick={() => { setCategoryFilter(cat); setPage(1); }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="svc-grid">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="svc-skeleton-card">
              <div className="svc-sk svc-sk--title" />
              <div className="svc-sk svc-sk--cat" />
              <div className="svc-sk-row">
                <div className="svc-sk svc-sk--chip" />
                <div className="svc-sk svc-sk--chip" />
              </div>
            </div>
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="svc-page__empty">
          <Scissors size={42} className="svc-page__empty-icon" />
          <h3 className="svc-page__empty-title">
            {search || categoryFilter !== "all" ? "No results found" : "No services yet"}
          </h3>
          <p className="svc-page__empty-desc">
            {search || categoryFilter !== "all"
              ? "Try adjusting your search."
              : "Services you create will appear here."}
          </p>
        </div>
      ) : (
        <>
          <div className="svc-grid">
            {services.map((svc) => (
              <div key={svc.id} className="svc-card">
                <div className="svc-card__top">
                  <div className="svc-card__icon-wrap">
                    <Scissors size={18} />
                  </div>
                  <span
                    className={`svc-cat ${getCategoryClass(svc.category_name ?? svc.category)}`}
                  >
                    {svc.category_name ?? svc.category ?? "General"}
                  </span>
                </div>

                <h3 className="svc-card__name">{svc.name || "Unnamed Service"}</h3>

                {svc.description && (
                  <p className="svc-card__desc">{svc.description}</p>
                )}

                <div className="svc-card__meta">
                  <span className="svc-meta-chip svc-meta-chip--duration">
                    <Clock size={11} />
                    {formatDuration(svc.duration)}
                  </span>
                  <span className="svc-meta-chip svc-meta-chip--price">
                    <CurrencyDollar size={11} />
                    {svc.price != null
                      ? `₹${Number(svc.price).toLocaleString("en-IN")}`
                      : "Price on request"}
                  </span>
                </div>

                <div className="svc-card__footer">
                  <span
                    className={`svc-status ${svc.is_active !== false ? "svc-status--active" : "svc-status--inactive"}`}
                  >
                    {svc.is_active !== false ? "Active" : "Inactive"}
                  </span>
                  {svc.online_booking && (
                    <span className="svc-online-tag">Online Booking</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="svc-page__pagination">
              <span className="svc-page__pagination-info">
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
              </span>
              <div className="svc-page__pagination-btns">
                <button
                  className="svc-page__page-btn"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span className="svc-page__page-num">{page} / {totalPages}</span>
                <button
                  className="svc-page__page-btn"
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
  );
}
