import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import Button from "../../../components/ui/Button";
import SpotlightFeaturePreview from "../components/SpotlightFeaturePreview";
import { selectSpotlightFeatures, selectSpotlightReadIds, selectPublishedFeatures } from "../../../store/spotlightSlice";
import {
  fetchSpotlightFeaturesThunk,
  markSpotlightReadThunk,
} from "../../../middleware/spotlight/spotlight.thunk";
import "../styles/Spotlight.scss";

// Defensive guard before calling the explore API — every feature this page
// can reach comes straight from the backend, so its id is always a real
// UUID (Postgres gen_random_uuid()), but this stays cheap insurance against
// ever calling that endpoint with something malformed.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function SpotlightDetailPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Whichever tab (New/Recently Updated/All) the person clicked in from has
  // its own route — going back to a hardcoded "/dashboard/spotlight" would
  // always land on the default tab instead. Use browser history so it
  // returns to the exact tab they came from; only fall back to the list
  // page when there's no in-app history to go back to (e.g. a shared link
  // opened directly, or a hard refresh on this page).
  const handleBack = () => {
    if (location.key !== "default") navigate(-1);
    else navigate("/dashboard/spotlight");
  };

  const features = useAppSelector(selectSpotlightFeatures);
  const published = useAppSelector(selectPublishedFeatures);
  const readIds = useAppSelector(selectSpotlightReadIds);
  const feature = features.find((f) => f.id === id);

  useEffect(() => {
    dispatch(fetchSpotlightFeaturesThunk());
  }, [dispatch]);

  useEffect(() => {
    if (feature && UUID_RE.test(feature.id) && !readIds.includes(feature.id)) {
      dispatch(markSpotlightReadThunk(feature.id));
    }
  }, [dispatch, feature, readIds]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [id]);

  if (!feature) {
    return (
      <div className="spotlight-page">
        <Button variant="outline-dark" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={handleBack}>
          Back to Spotlight
        </Button>
        <div className="spotlight-empty" style={{ marginTop: 20 }}>
          Feature not found — it may have been removed.
        </div>
      </div>
    );
  }

  const idx = published.findIndex((f) => f.id === feature.id);
  const spotlightNumber = idx === -1 ? 0 : published.length - idx;
  const prevFeature = idx > 0 ? published[idx - 1] : null;
  const nextFeature = idx !== -1 && idx < published.length - 1 ? published[idx + 1] : null;

  return (
    <div className="spotlight-page">
      <Button
        variant="outline-dark"
        size="sm"
        iconLeft={<ArrowLeft size={14} />}
        onClick={handleBack}
      >
        Back to Spotlight
      </Button>

      <SpotlightFeaturePreview feature={feature} spotlightNumber={spotlightNumber} />

      <div className="spotlight-section-nav">
        <button
          type="button"
          className="spotlight-section-nav__btn"
          onClick={() => prevFeature && navigate(`/dashboard/spotlight/${prevFeature.id}`)}
          disabled={!prevFeature}
        >
          ← Previous
        </button>
        <button
          type="button"
          className="spotlight-section-nav__btn spotlight-section-nav__btn--next"
          onClick={() => nextFeature && navigate(`/dashboard/spotlight/${nextFeature.id}`)}
          disabled={!nextFeature}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
