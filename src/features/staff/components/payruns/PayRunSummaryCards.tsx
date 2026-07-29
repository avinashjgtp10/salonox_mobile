import React from "react";
import type { PayRunSummary } from "../../../../types/payRun.types";
import { useCurrency } from "../../../../hooks/useCurrency";

interface PayRunSummaryCardsProps {
  summary: PayRunSummary;
  onPayTeam?: () => void;
}

const PayRunSummaryCards: React.FC<PayRunSummaryCardsProps> = ({ summary, onPayTeam }) => {
  const { formatAmount } = useCurrency();
  const cards = [
    { label: "Earnings", value: summary.earnings, color: "text-gray-900" },
    { label: "Other", value: summary.other, color: "text-gray-900" },
    { label: "Total", value: summary.total, color: "text-gray-900" },
    { label: "Paid", value: summary.paid, color: "text-green-600" },
    { label: "To pay", value: summary.toPay, color: "text-red-600", isAction: true },
  ];

  return (
    <div className="summary-grid">
      {cards.map((card, index) => (
        <div 
          key={index} 
          className={`summary-card ${card.isAction ? "action-card" : ""}`}
        >
          <span className="card-label">{card.label}</span>
          <div className="card-content">
            <span className={`card-value ${card.color.includes('green') ? 'text-green' : card.color.includes('red') ? 'text-red' : ''}`}>
              {formatAmount(card.value)}
            </span>
            {card.isAction && (
              <button 
                onClick={onPayTeam}
                className="btn-pay"
              >
                Pay staff
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PayRunSummaryCards;
