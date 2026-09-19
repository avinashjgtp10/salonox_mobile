import { useEffect, useMemo, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Search, TelephoneFill, GeoAltFill, X, Clock } from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchPublicDigitalMenuThunk } from "../../../middleware/digitalMenu/digitalMenu.thunk";
import { getCurrencyDef } from "../../../config/currencies";
import type { PublicMenuService } from "../../catalog/types/digitalMenu.types";
import "../styles/PublicDigitalMenuPage.scss";

function formatPrice(service: PublicMenuService, symbol: string): string {
  const amount = Number(service.price) || 0;
  const formatted = `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  if (service.price_type === "free") return "Free";
  if (service.price_type === "from") return `From ${formatted}`;
  return formatted;
}

function formatDuration(minutes: number): string {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function PublicDigitalMenuPage() {
  const { token } = useParams<{ token: string }>();
  const dispatch = useAppDispatch();
  const { publicMenu, publicLoading, publicError } = useAppSelector((s) => s.digitalMenu);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [detailService, setDetailService] = useState<PublicMenuService | null>(null);
  const [detailCategory, setDetailCategory] = useState<string>("");

  useEffect(() => {
    if (token) dispatch(fetchPublicDigitalMenuThunk(token));
  }, [token, dispatch]);

  // Backend-supplied — this page is unauthenticated and never loads the
  // owner's salon slice, so useCurrency()'s Redux lookup isn't available here.
  const currencySymbol = getCurrencyDef(publicMenu?.currency).symbol;

  const categories = useMemo(() => publicMenu?.categories ?? [], [publicMenu]);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories
      .map((c) => ({
        ...c,
        services: c.services.filter((s) => !q || s.name.toLowerCase().includes(q)),
      }))
      .filter((c) => c.services.length > 0)
      .filter((c) => activeCategory === "All" || c.name === activeCategory);
  }, [categories, search, activeCategory]);

  const totalServiceCount = filteredCategories.reduce((sum, c) => sum + c.services.length, 0);

  // The digital menu and the booking page are the same catalogue twice over,
  // so a QR code that lands on a read-only price list is a dead end. Hand the
  // customer straight to the page they can actually book from.
  //
  // `booking_slug` is only non-null when the salon has published online
  // booking (the API checks), so a salon that hasn't opted in — or hasn't got
  // a slug — still gets the menu below rather than "Booking unavailable".
  // `replace` keeps Back on the customer's previous page instead of bouncing
  // them between the two.
  if (publicMenu?.status === "active" && publicMenu.booking_slug) {
    return <Navigate to={`/book/${publicMenu.booking_slug}`} replace />;
  }

  if (publicLoading) {
    return (
      <div className="pdm pdm--center">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (publicError || !publicMenu) {
    return (
      <div className="pdm pdm--center">
        <div className="pdm-message">
          <h3>Menu not found</h3>
          <p>This menu link is invalid or no longer available.</p>
        </div>
      </div>
    );
  }

  if (publicMenu.status !== "active") {
    return (
      <div className="pdm pdm--center">
        <div className="pdm-message">
          <h3>This menu is currently unavailable.</h3>
          <p>Please contact the business for more information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pdm">
      <header className="pdm-header">
        {publicMenu.salon.cover_image_url && (
          <div className="pdm-header__cover" style={{ backgroundImage: `url(${publicMenu.salon.cover_image_url})` }} />
        )}
        <div className="pdm-header__body">
          {publicMenu.salon.logo_url && (
            <img className="pdm-header__logo" src={publicMenu.salon.logo_url} alt={publicMenu.salon.name} />
          )}
          <h1 className="pdm-header__name">{publicMenu.salon.name}</h1>
          <div className="pdm-header__meta">
            {publicMenu.salon.address && (
              <span><GeoAltFill size={12} /> {publicMenu.salon.address}</span>
            )}
            {publicMenu.salon.phone && (
              <span><TelephoneFill size={12} /> {publicMenu.salon.phone}</span>
            )}
          </div>
        </div>
      </header>

      <div className="pdm-search">
        <Search size={16} />
        <input
          placeholder="Search services…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {categories.length > 0 && (
        <div className="pdm-chips">
          <button
            className={`pdm-chip${activeCategory === "All" ? " pdm-chip--active" : ""}`}
            onClick={() => setActiveCategory("All")}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.name}
              className={`pdm-chip${activeCategory === c.name ? " pdm-chip--active" : ""}`}
              onClick={() => setActiveCategory(c.name)}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <main className="pdm-body">
        {categories.length === 0 ? (
          <div className="pdm-empty">
            <p>No services have been added to this menu.</p>
          </div>
        ) : totalServiceCount === 0 ? (
          <div className="pdm-empty">
            <p>No services found.</p>
          </div>
        ) : (
          filteredCategories.map((c) => (
            <section key={c.name} className="pdm-section">
              <h2 className="pdm-section__title">{c.name}</h2>
              <div className="pdm-grid">
                {c.services.map((s) => (
                  <button
                    key={s.id}
                    className="pdm-card"
                    onClick={() => { setDetailService(s); setDetailCategory(c.name); }}
                  >
                    {s.image_url ? (
                      <div className="pdm-card__img" style={{ backgroundImage: `url(${s.image_url})` }} />
                    ) : (
                      <div className="pdm-card__img pdm-card__img--placeholder" />
                    )}
                    <div className="pdm-card__body">
                      <div className="pdm-card__name">{s.name}</div>
                      {s.description && <div className="pdm-card__desc">{s.description}</div>}
                      <div className="pdm-card__footer">
                        <span className="pdm-card__price">{formatPrice(s, currencySymbol)}</span>
                        {s.duration > 0 && (
                          <span className="pdm-card__duration"><Clock size={11} /> {formatDuration(s.duration)}</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {detailService && (
        <div className="pdm-detail-overlay" onClick={() => setDetailService(null)}>
          <div className="pdm-detail" onClick={(e) => e.stopPropagation()}>
            <button className="pdm-detail__close" onClick={() => setDetailService(null)}>
              <X size={20} />
            </button>
            {detailService.image_url ? (
              <div className="pdm-detail__img" style={{ backgroundImage: `url(${detailService.image_url})` }} />
            ) : (
              <div className="pdm-detail__img pdm-detail__img--placeholder" />
            )}
            <div className="pdm-detail__body">
              <div className="pdm-detail__category">{detailCategory}</div>
              <h3 className="pdm-detail__name">{detailService.name}</h3>
              {detailService.description && (
                <p className="pdm-detail__desc">{detailService.description}</p>
              )}
              <div className="pdm-detail__meta">
                <span className="pdm-detail__price">{formatPrice(detailService, currencySymbol)}</span>
                {detailService.duration > 0 && (
                  <span className="pdm-detail__duration"><Clock size={13} /> {formatDuration(detailService.duration)}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
