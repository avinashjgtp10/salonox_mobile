import type { ReactNode } from "react";
import "../styles/onboarding-shared.scss";

interface Props {
  children: ReactNode;
  className?: string;
}

export default function OnboardingPageWrapper({ children, className = "" }: Props) {
  return (
    <div className={`container-fluid p-0 h-100 ${className}`}>
      <div className="row g-0 ob-page-row">
        {children}
      </div>
    </div>
  );
}
