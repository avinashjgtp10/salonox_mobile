import { useEffect, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Stars, ChevronRight, X } from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { selectNewFeatures, selectSpotlightFetched } from "../../../store/spotlightSlice";
import { fetchSpotlightFeaturesThunk, markSpotlightReadThunk } from "../../../middleware/spotlight/spotlight.thunk";
import "../styles/SpotlightHighlightCard.scss";

// "NEW" highlight card for the Salon Dashboard home — shows the most
// recently published Spotlight feature this user hasn't explored yet.
// selectNewFeatures (published minus this user's own explored ids, see
// spotlightSlice.ts) already carries the same per-user semantics the
// notification bell's is_read does for other notification types, just
// tracked in spotlight_feature_reads instead of the shared notifications
// row — see create_spotlight_features_tables.sql's header comment for why
// that's a separate table rather than reusing is_read.
export default function SpotlightHighlightCard() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const newFeatures = useAppSelector(selectNewFeatures);
  const fetched = useAppSelector(selectSpotlightFetched);

  useEffect(() => {
    if (!fetched) dispatch(fetchSpotlightFeaturesThunk());
  }, [dispatch, fetched]);

  if (!fetched || newFeatures.length === 0) return null;

  const feature = newFeatures[0];

  const handleDismiss = (e: MouseEvent) => {
    e.stopPropagation();
    dispatch(markSpotlightReadThunk(feature.id));
  };

  return (
    <div className="spotlight-highlight-card">
      <span className="spotlight-highlight-card__badge">
        <Stars size={12} />
        NEW
      </span>
      <div className="spotlight-highlight-card__body">
        <span className="spotlight-highlight-card__eyebrow">What's New in SalonOX</span>
        <span className="spotlight-highlight-card__title">{feature.featureName}</span>
        <span className="spotlight-highlight-card__desc">{feature.shortDescription}</span>
      </div>
      <button
        type="button"
        className="spotlight-highlight-card__cta"
        onClick={() => navigate(`/dashboard/spotlight/${feature.id}`)}
      >
        Explore <ChevronRight size={13} />
      </button>
      {newFeatures.length > 1 && (
        <span className="spotlight-highlight-card__more">+{newFeatures.length - 1} more</span>
      )}
      <button
        type="button"
        className="spotlight-highlight-card__close"
        onClick={handleDismiss}
        title="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
