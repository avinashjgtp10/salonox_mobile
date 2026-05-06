import React from "react";
import { ExclamationTriangle } from "react-bootstrap-icons";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => (
  <div className="slp__error-state">
    <div className="slp__error-icon">
      <ExclamationTriangle size={28} />
    </div>
    <h3>Something went wrong</h3>
    <p>{message}</p>
    {onRetry && (
      <button className="slp__btn slp__btn--outline" onClick={onRetry}>
        Try again
      </button>
    )}
  </div>
);

export default ErrorState;
