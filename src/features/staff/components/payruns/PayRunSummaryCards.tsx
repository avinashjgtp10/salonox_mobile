import React from "react";
import type { PayRunSummary } from "../../../../types/payRun.types";
import Card from "../../../../components/ui/Card";

interface PayRunSummaryCardsProps {
  summary: PayRunSummary;
}

const PayRunSummaryCards: React.FC<PayRunSummaryCardsProps> = ({ summary }) => {
  const cards = [
    { label: "Earnings", value: summary.earnings, color: "text-gray-900" },
    { label: "Other", value: summary.other, color: "text-gray-900" },
    { label: "Total", value: summary.total, color: "text-gray-900" },
    { label: "Paid", value: summary.paid, color: "text-green-600" },
    { label: "To pay", value: summary.toPay, color: "text-red-600", isAction: true },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {cards.map((card, index) => (
        <Card key={index} className={`p-4 ${card.isAction ? "bg-gray-50 border-gray-200" : ""}`}>
          <div className="flex flex-col">
            <span className="text-sm text-gray-500 font-medium">{card.label}</span>
            <div className="flex items-center justify-between mt-1">
              <span className={`text-xl font-bold ${card.color}`}>
                ₮{card.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {card.isAction && (
                <button className="bg-black text-white text-xs px-3 py-1.5 rounded-full font-medium hover:bg-gray-800 transition-colors">
                  Pay team
                </button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default PayRunSummaryCards;
