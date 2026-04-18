import { useLocation } from "react-router-dom";
import "../styles/onboarding-layout.scss";

// ── Step → section mapping ────────────────────────────────────────────────────
const SECTIONS = [
  { key: "account",   label: "Account",      routes: ["/account-type"] },
  { key: "business",  label: "Business",     routes: ["/business-name", "/service-type"] },
  { key: "team",      label: "Team",         routes: ["/team-setup", "/team-size"] },
  { key: "location",  label: "Location",     routes: ["/business-location", "/venue-location"] },
  { key: "finishing", label: "Finishing up", routes: ["/previous-software", "/recommendation-source"] },
];

const STEP_MAP: Record<string, number> = {
  "/account-type":           1,
  "/business-name":          2,
  "/service-type":           3,
  "/team-setup":             4,
  "/team-size":              5,
  "/business-location":      6,
  "/venue-location":         7,
  "/previous-software":      8,
  "/recommendation-source":  9,
};
const TOTAL_STEPS = 9;

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 5.2L4 7.2L8 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function OnboardingTopBar() {
  const { pathname } = useLocation();

  const currentStep = STEP_MAP[pathname] ?? 0;
  const currentSectionIdx = SECTIONS.findIndex((s) => s.routes.includes(pathname));

  // Determine section status: completed | active | upcoming
  const sectionStatus = (idx: number): "completed" | "active" | "upcoming" => {
    if (idx < currentSectionIdx) return "completed";
    if (idx === currentSectionIdx) return "active";
    return "upcoming";
  };

  // Hide on setup-complete page
  if (pathname === "/setup-complete" || pathname === "/join-business") return null;

  return (
    <div className="ob-topbar">
      {/* Logo */}
      <div className="ob-topbar__logo">salonox</div>

      {/* Steps */}
      <nav className="ob-topbar__steps" aria-label="Onboarding steps">
        {SECTIONS.map((section, idx) => {
          const status = sectionStatus(idx);
          return (
            <div
              key={section.key}
              className={`ob-topbar__step ob-topbar__step--${status}`}
              aria-current={status === "active" ? "step" : undefined}
            >
              <span className="ob-topbar__step-dot">
                {status === "completed" ? <CheckIcon /> : idx + 1}
              </span>
              <span className="ob-topbar__step-label">{section.label}</span>

              {/* Connector line between steps */}
              {idx < SECTIONS.length - 1 && (
                <span className={`ob-topbar__connector ${status === "completed" ? "ob-topbar__connector--done" : ""}`} />
              )}
            </div>
          );
        })}
      </nav>

      {/* Counter */}
      {currentSectionIdx >= 0 && (
        <div className="ob-topbar__counter">
          Step {currentSectionIdx + 1} of {SECTIONS.length}
        </div>
      )}
    </div>
  );
}
