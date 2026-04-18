import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
}

export default function OnboardingPageWrapper({ children, className = "" }: Props) {
  return (
    <div className={`container-fluid p-0 h-100 ${className}`}>
      <div className="row g-0" style={{ minHeight: "calc(100vh - 64px)" }}>
        {children}
      </div>
    </div>
  );
}
