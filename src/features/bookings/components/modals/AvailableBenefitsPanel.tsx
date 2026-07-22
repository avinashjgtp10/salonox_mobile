// src/features/bookings/components/modals/AvailableBenefitsPanel.tsx
//
// Card-grid redesign of the old stacked checkbox rows (Apply Package/
// Membership, Use eWallet/Reward Points/Referral Credit) — one card per
// spendable balance, each with its own icon/accent color. Purely
// presentational: AppointmentModal.tsx owns all the underlying state and
// builds the `cards` array from it, since it already computes every value
// shown here (balances, session counts, redemption caps).
import React from "react";
import type { Icon } from "react-bootstrap-icons";

export interface BenefitCardConfig {
  key: string;
  icon: Icon;
  variantClass: string;
  title: string;
  value: string;
  subtitle: string;
  checked: boolean;
  onToggle: (v: boolean) => void;
  input?: {
    value: number;
    max: number;
    step: number;
    prefix?: string;
    suffix?: string;
    placeholder?: string;
    onChange: (v: number) => void;
  };
}

interface Props {
  cards: BenefitCardConfig[];
}

// Fixed logical order every client sees, regardless of which of these they
// actually have — a missing one renders as an invisible placeholder (same
// footprint as a real card) so the rest never slide over to fill its spot.
// Grid column count itself still adapts responsively (auto-fit); this only
// pins the left-to-right/row-to-row sequence, not exact row/column math.
const FIXED_ORDER = ["package", "membership", "ewallet", "reward", "referral"];

export const AvailableBenefitsPanel: React.FC<Props> = ({ cards }) => {
  if (cards.length === 0) return null;
  const byKey = new Map(cards.map((c) => [c.key, c]));

  return (
    <div className="benefits-grid">
      {FIXED_ORDER.map((key) => {
        const card = byKey.get(key);
        if (!card) {
          return <div key={key} className="benefit-card benefit-card--placeholder" aria-hidden="true" />;
        }
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className={`benefit-card ${card.variantClass}${card.checked ? " benefit-card--active" : ""}`}
            onClick={() => card.onToggle(!card.checked)}
          >
            <input
              type="checkbox"
              className="benefit-card__checkbox"
              checked={card.checked}
              onChange={(e) => card.onToggle(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="benefit-card__icon-wrap">
              <Icon size={13} />
            </div>
            <div className="benefit-card__body">
              <div className="benefit-card__title-row">
                <span className="benefit-card__title">{card.title}</span>
              </div>
              <div className="benefit-card__value">{card.value}</div>
              <div className="benefit-card__subtitle">{card.subtitle}</div>
              {card.checked && card.input && (
                <div className="benefit-card__input-row" onClick={(e) => e.stopPropagation()}>
                  {card.input.prefix && <span className="pay-due-row__symbol">{card.input.prefix}</span>}
                  <input
                    type="number"
                    className="pay-due-row__input"
                    min={0}
                    max={card.input.max}
                    step={card.input.step}
                    value={card.input.value || ""}
                    placeholder={card.input.placeholder ?? "0"}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") { card.input!.onChange(0); return; }
                      const val = card.input!.step < 1 ? parseFloat(raw) : parseInt(raw, 10);
                      if (!isNaN(val)) card.input!.onChange(val);
                    }}
                  />
                  {card.input.suffix && <span className="pay-due-row__symbol">{card.input.suffix}</span>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AvailableBenefitsPanel;
