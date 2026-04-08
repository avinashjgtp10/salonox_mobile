import React from "react";

interface SplitLayoutProps {
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  leftColSpan?: number; // 1-11
  className?: string;
  containerClass?: string;
  vh100?: boolean;
}

const SplitLayout: React.FC<SplitLayoutProps> = ({
  leftContent,
  rightContent,
  leftColSpan = 5,
  className = "",
  containerClass = "container-fluid",
  vh100 = true,
}) => {
  const rightColSpan = 12 - leftColSpan;
  const vhClass = vh100 ? "vh-100" : "";

  return (
    <div className={`${containerClass} ${vhClass} ${className} p-0`}>
      <div className={`row g-0 ${vhClass}`}>
        <div
          className={`col-lg-${leftColSpan} col-md-6 col-12 d-flex align-items-center justify-content-center bg-white`}
        >
          {leftContent}
        </div>
        <div
          className={`col-lg-${rightColSpan} d-none d-lg-block position-relative`}
        >
          {rightContent}
        </div>
      </div>
    </div>
  );
};

export default SplitLayout;
