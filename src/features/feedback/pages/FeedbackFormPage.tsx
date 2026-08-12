import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { StarFill, CheckCircleFill, Google } from "react-bootstrap-icons";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import {
  fetchFeedbackContextThunk,
  submitFeedbackThunk,
} from "../../../middleware/feedback/feedback.thunk";
import type { FeedbackContext } from "../../../middleware/feedback/feedback.thunk";

const INK = "#1a1a1a";
const MUTED = "#8a8a8a";
const BORDER = "#eaeaea";
const STAR = "#c9a24b";
const SERIF = "'Georgia', 'Times New Roman', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const IMPROVEMENT_TAGS = [
  "Waiting Time",
  "Staff Behaviour",
  "Service Quality",
  "Cleanliness",
  "Ambience",
  "Pricing",
  "Reception",
  "Other",
];

function StarRow({
  value,
  onChange,
  size = 22,
  justify = "center",
}: {
  value: number;
  onChange: (n: number) => void;
  size?: number;
  justify?: "center" | "flex-end";
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="fb-stars" style={{ justifyContent: justify }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className="fb-star-btn"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          <StarFill size={size} color={(hover || value) >= n ? STAR : "#e3e0d8"} />
        </button>
      ))}
    </div>
  );
}

export default function FeedbackFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const dispatch = useAppDispatch();

  const [context, setContext] = useState<FeedbackContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [overallRating, setOverallRating] = useState(0);
  const [serviceRatings, setServiceRatings] = useState<Record<string, number>>({});
  const [improvementTags, setImprovementTags] = useState<string[]>([]);
  const [additionalComments, setAdditionalComments] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!slug) {
      setLoadError("This feedback link is invalid.");
      setLoading(false);
      return;
    }
    dispatch(fetchFeedbackContextThunk(slug))
      .unwrap()
      .then((res) => setContext(res))
      .catch((err) => setLoadError(err || "This feedback link is invalid or has expired."))
      .finally(() => setLoading(false));
  }, [slug, dispatch]);

  const allServicesRated =
    !!context && context.services.every((s) => (serviceRatings[s.serviceRowId] ?? 0) > 0);
  const canSubmit = overallRating > 0 && allServicesRated;

  function toggleTag(tag: string) {
    setImprovementTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit() {
    if (!slug || !context || !canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await dispatch(
        submitFeedbackThunk({
          slug,
          overallRating,
          serviceRatings: context.services.map((s) => ({
            serviceRowId: s.serviceRowId,
            rating: serviceRatings[s.serviceRowId],
          })),
          improvementTags: improvementTags.length > 0 ? improvementTags : undefined,
          additionalComments: additionalComments.trim() || undefined,
        })
      ).unwrap();
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err || "Failed to submit your feedback.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="fb-loading">
        <div className="fb-spinner" />
        <style>{`
          .fb-loading { display:flex; align-items:center; justify-content:center; min-height:100vh;
            font-family:${SANS}; background:#fff; }
          .fb-spinner { width:36px; height:36px; border-radius:50%; border:2px solid ${BORDER};
            border-top-color:${INK}; animation:fbSpin 0.7s linear infinite; }
          @keyframes fbSpin { to { transform:rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (loadError || !context) {
    return (
      <div className="fb-error">
        <h2 className="fb-error-title">Link not found</h2>
        <p className="fb-error-sub">{loadError || "This feedback link is invalid or has expired."}</p>
        <style>{`
          .fb-error { display:flex; flex-direction:column; align-items:center; justify-content:center;
            min-height:100vh; gap:12px; font-family:${SANS}; padding:24px; text-align:center; background:#fff; }
          .fb-error-title { margin:0; font-size:20px; color:${INK}; font-family:${SERIF}; }
          .fb-error-sub { margin:0; color:${MUTED}; font-size:14px; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="fb-page">

      <style>{`
        .fb-page { min-height:100vh; display:flex; justify-content:center; background:#fdfdfc;
          font-family:${SANS}; padding:36px 16px; box-sizing:border-box; }
        .fb-sheet { width:100%; max-width:440px; background:#fff; border-radius:24px;
          padding:40px 28px 32px; box-shadow:0 24px 70px rgba(20,20,20,0.08); }

        .fb-eyebrow { margin:0; text-align:center; font-size:11px; font-weight:600; letter-spacing:0.18em;
          text-transform:uppercase; color:${MUTED}; }
        .fb-headline { margin:8px 0 6px; text-align:center; font-family:${SERIF}; font-weight:400;
          font-size:34px; color:${INK}; line-height:1.15; }
        .fb-meta-line { margin:0 0 28px; text-align:center; font-size:12.5px; color:${MUTED}; }

        .fb-block-center { text-align:center; margin-bottom:28px; }
        .fb-eyebrow-sm { margin:0 0 12px; text-align:center; font-size:11px; font-weight:600; letter-spacing:0.14em;
          text-transform:uppercase; color:${MUTED}; }

        .fb-stars { display:flex; gap:10px; }
        .fb-star-btn { background:none; border:none; cursor:pointer; padding:2px; line-height:0;
          transition: transform 0.15s ease; }
        .fb-star-btn:hover { transform: scale(1.15); }
        .fb-star-btn:active { transform: scale(0.95); }

        .fb-divider { border:none; border-top:1px solid ${BORDER}; margin:0; }

        .fb-service-row { display:flex; align-items:center; justify-content:space-between; gap:16px;
          padding:20px 0; }
        .fb-service-info { min-width:0; }
        .fb-service-name { margin:0; font-family:${SERIF}; font-size:19px; font-weight:400; color:${INK}; }
        .fb-service-staff { margin:2px 0 0; font-size:12.5px; color:${MUTED}; }
        .fb-service-row .fb-stars { flex-shrink:0; gap:4px; }

        .fb-section { margin-top:28px; }

        .fb-check-flow { display:flex; flex-wrap:wrap; gap:12px 20px; }
        .fb-check { display:flex; align-items:center; gap:9px; background:none; border:none; cursor:pointer;
          padding:0; font-size:14.5px; color:${INK}; font-family:${SANS}; }
        .fb-check-box { width:15px; height:15px; border:1.3px solid #c9c9c9; border-radius:3px; flex-shrink:0;
          display:flex; align-items:center; justify-content:center; font-size:10px; color:#fff; }
        .fb-check.active .fb-check-box { background:${INK}; border-color:${INK}; }

        .fb-textarea { width:100%; box-sizing:border-box; border:1px solid ${BORDER}; border-radius:10px;
          padding:14px; font-size:14px; font-family:${SANS}; color:${INK}; resize:vertical; min-height:80px;
          background:#fff; margin-top:14px; }
        .fb-textarea:focus { outline:none; border-color:${INK}; }
        .fb-textarea::placeholder { color:#bdbdbd; }

        .fb-error-text { font-size:12.5px; color:#c0392b; margin:14px 0 0; text-align:center; }

        .fb-btn { width:100%; border:none; cursor:pointer; font-weight:600; font-size:13px;
          letter-spacing:0.12em; text-transform:uppercase; border-radius:10px;
          padding:17px 20px; display:flex; align-items:center; justify-content:center; gap:8px; margin-top:32px;
          transition: opacity 0.18s ease; background:#e5e5e5; color:${MUTED};
        }
        .fb-btn.enabled { background:${INK}; color:#fff; cursor:pointer; }
        .fb-btn.enabled:hover { opacity:0.85; }
        .fb-btn:disabled { cursor:not-allowed; }
        .fb-btn-google { background:#fff; color:${INK}; border:1px solid ${BORDER}; margin-top:12px; }
        .fb-btn-google:hover { border-color:${INK}; opacity:1; }

        .fb-success { display:flex; flex-direction:column; align-items:center; text-align:center; gap:14px; padding:12px 0 4px; }
        .fb-success-icon { width:64px; height:64px; border-radius:50%; background:${INK};
          display:flex; align-items:center; justify-content:center; }
        .fb-success-title { margin:0; font-family:${SERIF}; font-size:24px; font-weight:400; color:${INK}; }
        .fb-success-sub { margin:0; font-size:13.5px; color:${MUTED}; }

        @media (max-width: 480px) {
          .fb-page { padding:0; }
          .fb-sheet { border-radius:0; min-height:100vh; padding:36px 22px 32px; }
          .fb-headline { font-size:28px; }
        }
      `}</style>

      <div className="fb-sheet">

        {submitted ? (
          <>
            <div className="fb-success">
              <div className="fb-success-icon"><CheckCircleFill size={28} color="#fff" /></div>
              <p className="fb-success-title">Thank you</p>
              <p className="fb-success-sub">Your feedback was submitted to {context.salonName}.</p>
            </div>
            {context.googleReviewUrl && (
              <a
                href={context.googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="fb-btn fb-btn-google enabled"
              >
                <Google size={14} /> Leave us a Google review
              </a>
            )}
          </>
        ) : (
          <>
            <p className="fb-eyebrow">{context.salonName}</p>
            <h1 className="fb-headline">Thank you, {context.clientName}</h1>
            <p className="fb-meta-line">
              {context.services.length} Service{context.services.length === 1 ? "" : "s"}
            </p>

            <div className="fb-block-center">
              <p className="fb-eyebrow-sm">Overall Experience</p>
              <StarRow value={overallRating} onChange={setOverallRating} size={28} />
            </div>

            <hr className="fb-divider" />
            {context.services.map((svc, i) => (
              <div key={svc.serviceRowId}>
                <div className="fb-service-row">
                  <div className="fb-service-info">
                    <p className="fb-service-name">{svc.name}</p>
                    {svc.staffName && <p className="fb-service-staff">{svc.staffName}</p>}
                  </div>
                  <StarRow
                    size={17}
                    justify="flex-end"
                    value={serviceRatings[svc.serviceRowId] ?? 0}
                    onChange={(n) =>
                      setServiceRatings((prev) => ({ ...prev, [svc.serviceRowId]: n }))
                    }
                  />
                </div>
                {i < context.services.length - 1 && <hr className="fb-divider" />}
              </div>
            ))}
            <hr className="fb-divider" />

            <div className="fb-section">
              <p className="fb-eyebrow-sm" style={{ textAlign: "left" }}>What can we improve?</p>
              <div className="fb-check-flow">
                {IMPROVEMENT_TAGS.map((tag) => {
                  const active = improvementTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      className={`fb-check${active ? " active" : ""}`}
                      onClick={() => toggleTag(tag)}
                    >
                      <span className="fb-check-box">{active ? "✓" : ""}</span>
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="fb-section">
              <p className="fb-eyebrow-sm" style={{ textAlign: "left" }}>Additional Comments</p>
              <textarea
                className="fb-textarea"
                style={{ marginTop: 0 }}
                placeholder="Anything else you'd like to share? (optional)"
                value={additionalComments}
                onChange={(e) => setAdditionalComments(e.target.value)}
                maxLength={1000}
              />
            </div>

            {submitError && <p className="fb-error-text">{submitError}</p>}

            <button
              className={`fb-btn${canSubmit ? " enabled" : ""}`}
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
            >
              {submitting ? "Submitting…" : "Submit Feedback"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
