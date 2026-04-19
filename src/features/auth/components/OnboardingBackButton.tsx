import { useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import "../styles/onboarding-shared.scss";

interface Props {
  onClick?: () => void;
  top?: string | number;
  left?: string | number;
}

export default function OnboardingBackButton({ onClick, top = "24px", left = "24px" }: Props) {
  const navigate = useNavigate();
  return (
    <button
      className="ob-back-btn position-absolute"
      style={{ top, left }}
      onClick={onClick ?? (() => navigate(-1))}
    >
      <FiArrowLeft size={16} />
    </button>
  );
}
