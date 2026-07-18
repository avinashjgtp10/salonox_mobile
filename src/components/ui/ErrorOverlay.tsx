import { useEffect } from "react";
import { XLg } from "react-bootstrap-icons";
import "./styles/ErrorOverlay.scss";

interface ErrorOverlayProps {
  message: string;
  duration?: number;
  onDone: () => void;
}

export default function ErrorOverlay({ message, duration = 2400, onDone }: ErrorOverlayProps) {
  useEffect(() => {
    const timer = setTimeout(onDone, duration);
    return () => clearTimeout(timer);
  }, [duration, onDone]);

  return (
    <div className="error-overlay" onClick={onDone}>
      <div className="error-overlay__card" onClick={(e) => e.stopPropagation()}>
        <div className="error-overlay__icon-ring">
          <XLg size={28} className="error-overlay__icon" />
        </div>
        <p className="error-overlay__message">{message}</p>
      </div>
    </div>
  );
}
