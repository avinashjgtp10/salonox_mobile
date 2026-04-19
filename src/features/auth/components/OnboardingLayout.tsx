import { Outlet } from "react-router-dom";
import OnboardingTopBar from "./OnboardingTopBar";
import "../styles/onboarding-layout.scss";

export default function OnboardingLayout() {
  return (
    <div className="ob-layout">
      <OnboardingTopBar />
      <div className="ob-layout__content">
        <Outlet />
      </div>
    </div>
  );
}
