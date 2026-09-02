import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Stars, Gear, ChevronLeft, ChevronRight, Search, X, FileEarmarkText, Collection, Link45deg, Check2 } from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import Button from "../../../components/ui/Button";
import SpotlightCard from "../components/SpotlightCard";
import SpotlightFeaturePreview from "../components/SpotlightFeaturePreview";
import {
  selectPublishedFeatures,
  selectNewFeatures,
  selectRecentlyUpdated,
  selectSpotlightReadIds,
} from "../../../store/spotlightSlice";
import {
  fetchSpotlightFeaturesThunk,
  markSpotlightReadThunk,
  updateSpotlightFeatureThunk,
} from "../../../middleware/spotlight/spotlight.thunk";
import type { SpotlightFeature } from "../types";
import "../styles/Spotlight.scss";

type TabKey = "new" | "recent" | "all";

const SEGMENTS: { key: TabKey; label: string; icon: ReactNode; path: string }[] = [
  { key: "new", label: "New Features", icon: <Stars size={13} />, path: "/dashboard/spotlight/new" },
  { key: "recent", label: "Recently Updated", icon: <FileEarmarkText size={13} />, path: "/dashboard/spotlight/recently-updated" },
  { key: "all", label: "All Features", icon: <Collection size={13} />, path: "/dashboard/spotlight/all" },
];

function tabFromPath(pathname: string): TabKey {
  if (pathname.endsWith("/recently-updated")) return "recent";
  if (pathname.endsWith("/all")) return "all";
  return "new";
}

// Same order as the dashboard sidebar (DashboardSidebar.tsx) — "All
// Features" has no inherent order of its own (unlike New/Recently Updated,
// which are meaningfully time-based), so it's sorted to match the sidebar
// sequence instead: Home first, then Quick Sale, Calendar, and so on.
const MODULE_ORDER: RegExp[] = [
  /home|dashboard overview/i,
  /quick sale/i,
  /calendar|appointment/i,
  /client/i,
  /catalog|service|product|package|membership/i,
  /staff/i,
  /cash/i,
  /marketing|campaign/i,
  /online booking/i,
  /enquir/i,
  /report/i,
  /apps?\b/i,
  /setting/i,
  /help/i,
];

function moduleRank(feature: SpotlightFeature): number {
  const haystack = `${feature.module} ${feature.moduleRoute ?? ""}`;
  const rank = MODULE_ORDER.findIndex((re) => re.test(haystack));
  return rank === -1 ? MODULE_ORDER.length : rank;
}

export default function SpotlightListPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = tabFromPath(location.pathname);
  const [activeIndex, setActiveIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const role = useAppSelector((s) => s.auth.role);
  const isOwner = role === "salon_owner" || role === "admin";
  const published = useAppSelector(selectPublishedFeatures);
  const newFeatures = useAppSelector(selectNewFeatures);
  const recentlyUpdated = useAppSelector(selectRecentlyUpdated);
  const readIds = useAppSelector(selectSpotlightReadIds);

  useEffect(() => {
    dispatch(fetchSpotlightFeaturesThunk());
  }, [dispatch]);

  const tabList = useMemo(() => {
    if (activeTab === "new") return newFeatures;
    if (activeTab === "recent") return recentlyUpdated;
    return [...published].sort((a, b) => moduleRank(a) - moduleRank(b));
  }, [activeTab, newFeatures, recentlyUpdated, published]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tabList;
    return tabList.filter(
      (f) =>
        f.featureName.toLowerCase().includes(q) ||
        f.module.toLowerCase().includes(q) ||
        f.shortDescription.toLowerCase().includes(q)
    );
  }, [tabList, search]);

  useEffect(() => {
    setActiveIndex(0);
    trackRef.current?.scrollTo({ left: 0 });
    timelineRef.current?.scrollTo({ left: 0 });
  }, [activeTab, search]);

  // published is newest-first (new items are unshifted); spotlight numbers
  // count down from the total so the newest feature carries the highest
  // number, like an episode index — matches the reference "Spotlight #8".
  const spotlightNumber = (feature: SpotlightFeature) => {
    const idx = published.findIndex((f) => f.id === feature.id);
    return idx === -1 ? 0 : published.length - idx;
  };

  const bannerFeature = newFeatures[0];
  const activeFeature = list[activeIndex];

  const shareLink = (feature: SpotlightFeature) => `${window.location.origin}/dashboard/spotlight/${feature.id}`;

  const markRead = (feature: SpotlightFeature) => {
    if (!readIds.includes(feature.id)) {
      dispatch(markSpotlightReadThunk(feature.id));
    }
  };

  const openFeature = (feature: SpotlightFeature) => {
    markRead(feature);
    navigate(`/dashboard/spotlight/${feature.id}`);
  };

  const handleImageUpload = async (feature: SpotlightFeature, dataUrl: string) => {
    const result = await dispatch(updateSpotlightFeatureThunk({ id: feature.id, data: { imageDataUrl: dataUrl } }));
    if (updateSpotlightFeatureThunk.rejected.match(result)) {
      throw new Error(result.payload || "Couldn't save this image — try a smaller file.");
    }
  };

  const scrollToIndex = (index: number) => {
    const clamped = Math.max(0, Math.min(list.length - 1, index));
    const track = trackRef.current;
    const card = track?.children[clamped] as HTMLElement | undefined;
    if (track && card) {
      track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: "smooth" });
    }
    // Timeline's first child is the connecting line, so dots start at index 1.
    const timeline = timelineRef.current;
    const dot = timeline?.children[clamped + 1] as HTMLElement | undefined;
    if (timeline && dot) {
      const target = dot.offsetLeft - timeline.offsetWidth / 2 + dot.offsetWidth / 2;
      timeline.scrollTo({ left: target, behavior: "smooth" });
    }
    setActiveIndex(clamped);
  };

  const handleCopyActiveLink = async () => {
    if (!activeFeature) return;
    try {
      await navigator.clipboard.writeText(shareLink(activeFeature));
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — no-op, nothing to surface for a
      // non-critical convenience action.
    }
  };

  return (
    <div className="spotlight-shell">
      {bannerFeature && !bannerDismissed && (
        <div className="spotlight-banner">
          <span className="spotlight-banner__badge">Spotlight #{spotlightNumber(bannerFeature)}</span>
          <span className="spotlight-banner__text">New: {bannerFeature.featureName}</span>
          <button type="button" className="spotlight-banner__link" onClick={() => openFeature(bannerFeature)}>
            See how it works →
          </button>
          <button type="button" className="spotlight-banner__close" onClick={() => setBannerDismissed(true)} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="spotlight-page">
        {isOwner && (
          <div className="spotlight-page__manage">
            <Button variant="outline-dark" size="sm" iconLeft={<Gear size={14} />} onClick={() => navigate("/dashboard/spotlight/manage")}>
              Manage Features
            </Button>
          </div>
        )}

        <div className="spotlight-segmented">
          {SEGMENTS.map((seg) => {
            const count = seg.key === "new" ? newFeatures.length : seg.key === "recent" ? recentlyUpdated.length : published.length;
            const isActive = activeTab === seg.key;
            return (
              <button
                key={seg.key}
                type="button"
                className={`spotlight-segmented__btn ${isActive ? "spotlight-segmented__btn--active" : ""}`}
                onClick={() => navigate(seg.path)}
              >
                {seg.icon}
                {seg.label}
                <span className="spotlight-segmented__count">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="spotlight-hero">
          <div className="spotlight-hero__text">
            <h1 className="spotlight-hero__title">
              Weekly
              <br />
              <em>Spotlights</em>
            </h1>
            <p className="spotlight-hero__subtitle">
              Every release, a new SalonOX feature takes the spotlight. See what's new, read how it works, and start using it.
            </p>
          </div>
          <div className="spotlight-hero__stat">
            <span className="spotlight-hero__stat-num">{published.length}</span>
            <span className="spotlight-hero__stat-label">Features Spotlighted</span>
          </div>
        </div>

        <div className="spotlight-search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search spotlights by name, module, or feature…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {list.length === 0 ? (
          <div className="spotlight-empty">
            {search.trim() ? "No features match your search." : "Nothing here yet — check back after the next release."}
          </div>
        ) : (
          <>
            <div className="spotlight-timeline-row">
              <span className="spotlight-timeline-count">
                <strong>{activeIndex + 1}</strong> / {list.length}
              </span>
              <div className="spotlight-timeline" ref={timelineRef}>
                <span className="spotlight-timeline__line" />
                {list.map((feature, i) => (
                  <button
                    key={feature.id}
                    type="button"
                    className={`spotlight-timeline__dot ${i === activeIndex ? "spotlight-timeline__dot--active" : ""}`}
                    onClick={() => scrollToIndex(i)}
                    aria-label={`Go to feature ${i + 1}`}
                  >
                    <span className="spotlight-timeline__ring" />
                  </button>
                ))}
              </div>
            </div>

            <div className="spotlight-carousel__track" ref={trackRef}>
              {list.map((feature, i) => (
                <SpotlightCard
                  key={feature.id}
                  feature={feature}
                  index={spotlightNumber(feature)}
                  isUnread={!readIds.includes(feature.id)}
                  active={i === activeIndex}
                  isOwner={isOwner}
                  onSelect={() => openFeature(feature)}
                  onImageUpload={(dataUrl) => handleImageUpload(feature, dataUrl)}
                />
              ))}
            </div>

            <div className="spotlight-carousel__nav">
              <button
                type="button"
                className="spotlight-carousel__nav-btn"
                onClick={() => scrollToIndex(activeIndex - 1)}
                disabled={activeIndex === 0}
                aria-label="Previous"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                className="spotlight-carousel__nav-btn"
                onClick={() => scrollToIndex(activeIndex + 1)}
                disabled={activeIndex === list.length - 1}
                aria-label="Next"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            {activeFeature && (
              <>
                <div className="spotlight-linkbar">
                  <span className="spotlight-linkbar__url">{shareLink(activeFeature)}</span>
                  <button type="button" className="spotlight-linkbar__copy" onClick={handleCopyActiveLink}>
                    {linkCopied ? <Check2 size={14} /> : <Link45deg size={14} />}
                    {linkCopied ? "Copied" : "Copy link"}
                  </button>
                </div>

                <div className="spotlight-active-preview">
                  <SpotlightFeaturePreview feature={activeFeature} spotlightNumber={spotlightNumber(activeFeature)} />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
