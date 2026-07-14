import { useEffect } from "react";
import { CheckLg } from "react-bootstrap-icons";
import "./styles/SuccessOverlay.scss";

interface SuccessOverlayProps {
  message: string;
  duration?: number;
  onDone: () => void;
}

export default function SuccessOverlay({ message, duration = 1800, onDone }: SuccessOverlayProps) {
  useEffect(() => {
    const timer = setTimeout(onDone, duration);
    return () => clearTimeout(timer);
  }, [duration, onDone]);

  return (
    <div className="success-overlay">
      <div className="success-overlay__card">
        <div className="success-overlay__icon-ring">
          <CheckLg size={32} className="success-overlay__icon" />
        </div>
        <p className="success-overlay__message">{message}</p>
      </div>
    </div>
  );
}
