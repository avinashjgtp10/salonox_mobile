import salonImg from "../../../assets/images/dashboard-hero.jpg.png";
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
 * Shows the background image only, no text overlay.
 */
export default function OnboardingImagePanel({}: Props) {
  return (
    <div className="col-lg-7 d-none d-lg-flex p-0 position-relative overflow-hidden onboarding-image-panel">
      <img
        src={salonImg}
        alt="salon interior"
        className="oip-bg"
      />
    </div>
  );
}
