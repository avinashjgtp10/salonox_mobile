import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarEvent, ImageFill, CheckCircleFill, PlayCircleFill } from "react-bootstrap-icons";
import type { SpotlightFeature } from "../types";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import { youTubeEmbedUrl, youTubeThumbnailUrl } from "../utils/youtube";

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

// Image descriptions are sometimes pasted as one long numbered blob
// ("1. ... 2. ... 3. ...") instead of one line per point — split on
// newlines first, and if that yields a single wall of text, break it
// before each numbered marker instead so it still renders as separate
// points rather than one unreadable paragraph.
function pointsFromText(text: string): string[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;

  const numbered = text
    .split(/(?=\d+\.\s)/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (numbered.length > 1) return numbered;

  return lines.length ? lines : [text.trim()].filter(Boolean);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

type StepKey = "what" | "why" | "setup" | "sections";

const STEPS: { key: StepKey; num: number; label: string }[] = [
  { key: "what", num: 1, label: "What is it?" },
  { key: "why", num: 2, label: "Why it works" },
  { key: "setup", num: 3, label: "Set it up" },
  { key: "sections", num: 4, label: "Sections" },
];

interface SpotlightFeaturePreviewProps {
  feature: SpotlightFeature;
  spotlightNumber: number;
}

// Falls back to the legacy single `imageDataUrl` for older records saved
// before the multi-image gallery existed.
function galleryImages(feature: SpotlightFeature) {
  if (feature.images && feature.images.length > 0) return feature.images;
  if (feature.imageDataUrl) return [{ imageDataUrl: feature.imageDataUrl, description: "" }];
  return [];
}

// Shared hero + step-tabs + content block — used by both the dedicated
// detail page (/dashboard/spotlight/:id) and the list page's "active card"
// preview panel, so the two stay visually identical without duplicating markup.
export default function SpotlightFeaturePreview({ feature, spotlightNumber }: SpotlightFeaturePreviewProps) {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState<StepKey>("what");
  const [videoPlaying, setVideoPlaying] = useState(false);

  // Reset back to the first tab (and stop any playing video) whenever the
  // previewed feature changes — otherwise switching cards in the carousel
  // could land on "Set it up" for a feature the user hasn't even opened
  // "What is it?" for yet, or leave a previous feature's video embedded
  // and silently still playing behind the new card.
  useEffect(() => {
    setActiveStep("what");
    setVideoPlaying(false);
  }, [feature.id]);

  const handleTryFeature = () => {
    if (feature.moduleRoute) navigate(feature.moduleRoute);
  };

  const images = galleryImages(feature);
  // Every image the owner attached a description to becomes its own visual
  // explanation card in "Why it works" — pairing the screenshot with the
  // point it's illustrating, instead of a plain text-only bullet list.
  const describedImages = images.filter((img) => img.description && img.description.trim());

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
          {(() => {
            const embedUrl = feature.videoDataUrl?.trim() ? youTubeEmbedUrl(feature.videoDataUrl.trim()) : null;

            if (embedUrl && videoPlaying) {
              return (
                <iframe
                  src={`${embedUrl}?autoplay=1`}
                  title={feature.featureName}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              );
            }

            // Cover image is what's shown by default when one exists (even
            // alongside a video) — the video only takes over once the person
            // actually clicks Play. When there's a video but NO cover image,
            // fall back to YouTube's own thumbnail so a video-only feature
            // still shows something playable instead of the empty-state icon.
            const coverSrc = images[0]
              ? resolveMediaUrl(images[0].imageDataUrl)
              : embedUrl
              ? youTubeThumbnailUrl(feature.videoDataUrl!.trim())
              : null;

            if (coverSrc) {
              return (
                <button
                  type="button"
                  className={`spotlight-detail-hero__preview-img-btn${embedUrl ? " spotlight-detail-hero__preview-img-btn--playable" : ""}`}
                  onClick={() => embedUrl && setVideoPlaying(true)}
                  disabled={!embedUrl}
                  aria-label={embedUrl ? `Play video for ${feature.featureName}` : undefined}
                >
                  <img src={coverSrc} alt={feature.featureName} />
                  {embedUrl && (
                    <span className="spotlight-detail-hero__play-overlay">
                      <PlayCircleFill size={54} />
                    </span>
                  )}
                </button>
              );
            }

            return (
              <div className="spotlight-detail-hero__preview-empty">
                <ImageFill size={28} />
              </div>
            );
          })()}
        </div>
      </div>

      <div className="spotlight-steps">
        {STEPS.filter((step) => step.key !== "sections" || (feature.sections?.length ?? 0) > 0).map((step) => (
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
          <div className="spotlight-why-doc__text">
            {sentencesFromText(feature.whatIsThis).map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        )}

        {activeStep === "why" && (
          describedImages.length > 0 ? (
            <div className="spotlight-why-doc">
              {describedImages.map((img, i) => (
                <div className="spotlight-why-doc__block" key={i}>
                  <img
                    className="spotlight-why-doc__img"
                    src={resolveMediaUrl(img.imageDataUrl)}
                    alt={feature.featureName}
                  />
                  <div className="spotlight-why-doc__text">
                    {pointsFromText(img.description ?? "").map((point, pi) => (
                      <p key={pi}>{point}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
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
          )
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

        {activeStep === "sections" && (
          <div className="spotlight-sections">
            {(feature.sections ?? []).map((section) => (
              <div className="spotlight-sections__block" key={section.id}>
                {section.title && <h3 className="spotlight-sections__title">{section.title}</h3>}
                {section.description && (
                  <div className="spotlight-why-doc__text">
                    {pointsFromText(section.description).map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                )}
                {section.images.length > 0 && (
                  <div className="spotlight-why-doc">
                    {section.images.map((img, i) => (
                      <div className="spotlight-why-doc__block" key={i}>
                        <img
                          className="spotlight-why-doc__img"
                          src={resolveMediaUrl(img.imageDataUrl)}
                          alt={section.title || feature.featureName}
                        />
                        {img.description && (
                          <div className="spotlight-why-doc__text">
                            {pointsFromText(img.description).map((point, pi) => (
                              <p key={pi}>{point}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
