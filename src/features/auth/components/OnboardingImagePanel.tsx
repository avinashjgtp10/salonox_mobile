import { FiStar } from "react-icons/fi";
import salonImg from "../../../assets/images/salon.jpg";
import "../styles/onboarding-shared.scss";

export interface OIPQuote {
  text: string;
  author: string;
  role: string;
}

export interface OIPStat {
  value: string;
  label: string;
}

interface Props {
  /** JSX to render inside the top-right CTA slot (e.g. Continue button) */
  continueBtn?: React.ReactNode;
  /** Testimonial / social-proof quote at the bottom */
  quote?: OIPQuote;
  /** Key metrics shown above the quote card */
  stats?: OIPStat[];
}

/**
 * Reusable right-panel for every onboarding step.
 * Shows the salon background image with a dark gradient overlay,
 * a brand logo top-left, an optional CTA button top-right, and
 * a glassmorphic quote card at the bottom.
 */
export default function OnboardingImagePanel({
  continueBtn,
  quote,
  stats,
}: Props) {
  return (
    <div
      className="col-lg-7 d-none d-lg-flex p-0 position-relative overflow-hidden onboarding-image-panel"
      style={{ minHeight: "100vh" }}
    >
      {/* Background image */}
      <img
        src={salonImg}
        alt="salon interior"
        className="oip-bg"
      />

      {/* Dark gradient overlay */}
      <div className="oip-overlay" />

      {/* Top bar: brand + optional continue CTA */}
      <div className="oip-topbar">
        <span className="oip-brand">salonox</span>
        {continueBtn && <div className="oip-cta">{continueBtn}</div>}
      </div>

      {/* Flex spacer */}
      <div className="oip-spacer" />

      {/* Bottom content */}
      <div className="oip-bottom">
        {stats && stats.length > 0 && (
          <div className="oip-stats">
            {stats.map((s, i) => (
              <div key={i}>
                <div className="oip-stat-value">{s.value}</div>
                <div className="oip-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {quote && (
          <div className="oip-quote-card">
            <div className="oip-stars">
              {[1, 2, 3, 4, 5].map((i) => (
                <FiStar key={i} style={{ fill: "#fbbf24", stroke: "none" }} />
              ))}
            </div>
            <p className="oip-quote-text">"{quote.text}"</p>
            <div className="oip-quote-author">
              <span className="oip-author-name">{quote.author}</span>
              <span className="oip-author-role">{quote.role}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
