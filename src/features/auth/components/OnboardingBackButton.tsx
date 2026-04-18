import { useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

interface Props {
  onClick?: () => void;
  top?: string | number;
  left?: string | number;
}

export default function OnboardingBackButton({ onClick, top = "24px", left = "24px" }: Props) {
  const navigate = useNavigate();
  return (
    <button
      className="btn btn-light border rounded-circle position-absolute d-flex align-items-center justify-content-center"
      style={{ top, left, width: "40px", height: "40px", padding: 0, zIndex: 10 }}
      onClick={onClick ?? (() => navigate(-1))}
    >
      <FiArrowLeft size={16} />
    </button>
  );
}
