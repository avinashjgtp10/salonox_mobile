import type { ReactNode } from "react";

interface Props {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}

export default function OnboardingChoiceCard({ selected, onClick, children, className = "" }: Props) {
  return (
    <div
      className={`card p-4 premium-choice-card ${selected ? "selected" : ""} ${className}`}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      {children}
    </div>
  );
}
