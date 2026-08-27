import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarEvent, ImageFill, CheckCircleFill, InfoCircleFill } from "react-bootstrap-icons";
import type { SpotlightFeature } from "../types";
import { resolveMediaUrl } from "../../../utils/mediaUrl";

function bulletsFromText(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

// "What is it?" is written as prose (whatIsThis), not newline-separated
// points like benefits/howItWorks — split it into sentences so it can use
// the same icon-card layout as the other two tabs.
function sentencesFromText(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

type StepKey = "what" | "why" | "setup";

const STEPS: { key: StepKey; num: number; label: string }[] = [
  { key: "what", num: 1, label: "What is it?" },
  { key: "why", num: 2, label: "Why it works" },
  { key: "setup", num: 3, label: "Set it up" },
];

interface SpotlightFeaturePreviewProps {
  feature: SpotlightFeature;
  spotlightNumber: number;
}

// Shared hero + step-tabs + content block — used by both the dedicated
// detail page (/dashboard/spotlight/:id) and the list page's "active card"
// preview panel, so the two stay visually identical without duplicating markup.
export default function SpotlightFeaturePreview({ feature, spotlightNumber }: SpotlightFeaturePreviewProps) {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState<StepKey>("what");

  // Reset back to the first tab whenever the previewed feature changes —
  // otherwise switching cards in the carousel could land on "Set it up" for
  // a feature the user hasn't even opened "What is it?" for yet.
  useEffect(() => {
    setActiveStep("what");
  }, [feature.id]);

  const handleTryFeature = () => {
    if (feature.moduleRoute) navigate(feature.moduleRoute);
  };

  return (
    <>
      <div className="spotlight-detail-hero">
        <div className="spotlight-detail-hero__text">
          <div className="spotlight-detail-hero__meta">
            <span className="spotlight-detail-hero__badge">Spotlight #{spotlightNumber}</span>
            <span className="spotlight-detail-hero__live">
              <span className="spotlight-detail-hero__dot" />{" "}
              {feature.status === "published" ? "Live now" : feature.status === "draft" ? "Draft" : "Archived"}
            </span>
          </div>
          <h2 className="spotlight-detail-hero__title">{feature.featureName}</h2>
          <p className="spotlight-detail-hero__desc">{feature.shortDescription}</p>
          <div className="spotlight-detail-hero__row">
            {feature.moduleRoute && (
              <button type="button" className="spotlight-detail-hero__cta" onClick={handleTryFeature}>
                Try it now →
              </button>
            )}
            <span className="spotlight-detail-hero__date">
              <CalendarEvent size={13} /> Released {formatDate(feature.releaseDate)}
            </span>
          </div>
        </div>

        <div className="spotlight-detail-hero__preview">
          {feature.videoDataUrl ? (
            <video src={resolveMediaUrl(feature.videoDataUrl)} controls />
          ) : feature.imageDataUrl ? (
            <img src={resolveMediaUrl(feature.imageDataUrl)} alt={feature.featureName} />
          ) : (
            <div className="spotlight-detail-hero__preview-empty">
              <ImageFill size={28} />
            </div>
          )}
        </div>
      </div>

      <div className="spotlight-steps">
        {STEPS.map((step) => (
          <button
            key={step.key}
            type="button"
            className={`spotlight-steps__tab ${activeStep === step.key ? "spotlight-steps__tab--active" : ""}`}
            onClick={() => setActiveStep(step.key)}
          >
            <span className="spotlight-steps__num">{step.num}</span>
            {step.label}
          </button>
        ))}
      </div>

      <div className="spotlight-step-content">
        {activeStep === "what" && (
          <div className="spotlight-highlight-grid">
            {sentencesFromText(feature.whatIsThis).map((line, i) => (
              <div className="spotlight-highlight-card" key={i}>
                <span className="spotlight-highlight-card__icon">
                  <InfoCircleFill size={16} />
                </span>
                <p className="spotlight-highlight-card__text">{line}</p>
              </div>
            ))}
          </div>
        )}

        {activeStep === "why" && (
          <div className="spotlight-highlight-grid">
            {bulletsFromText(feature.benefits).map((line, i) => (
              <div className="spotlight-highlight-card" key={i}>
                <span className="spotlight-highlight-card__icon">
                  <CheckCircleFill size={16} />
                </span>
                <p className="spotlight-highlight-card__text">{line}</p>
              </div>
            ))}
          </div>
        )}

        {activeStep === "setup" && (
          <div className="spotlight-highlight-grid">
            {bulletsFromText(feature.howItWorks).map((line, i) => (
              <div className="spotlight-highlight-card" key={i}>
                <span className="spotlight-highlight-card__icon spotlight-highlight-card__icon--num">{i + 1}</span>
                <p className="spotlight-highlight-card__text">{line}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
