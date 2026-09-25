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
  /** Set when a prior benefit (applied first, in the same order the backend
   * charges in) already covers the whole bill, so this one has nothing left
   * to apply to. Blocks turning it on and explains why, instead of silently
   * flashing checked then immediately un-checking itself. */
  disabledReason?: string;
  /** True for a card that's part of a group applied together as one action
   * (e.g. several memberships all included under one "Membership Discount"
   * toggle) but isn't itself the control for it — shows its checkbox as a
   * plain reflection of the group's state instead of a second, independent
   * toggle that would visually fight the real one when clicked. */
  readOnly?: boolean;
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

export const AvailableBenefitsPanel: React.FC<Props> = ({ cards }) => {
  if (cards.length === 0) return null;

  return (
    <div className="benefits-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        const blocked = !!card.disabledReason && !card.checked;
        const inert = blocked || card.readOnly;
        return (
          <div
            key={card.key}
            className={`benefit-card ${card.variantClass}${card.checked ? " benefit-card--active" : ""}${blocked ? " benefit-card--disabled" : ""}`}
            onClick={() => { if (!inert) card.onToggle(!card.checked); }}
          >
            <input
              type="checkbox"
              className="benefit-card__checkbox"
              checked={card.checked}
              disabled={inert}
              onChange={(e) => { if (!inert) card.onToggle(e.target.checked); }}
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
              {blocked && (
                <div className="benefit-card__disabled-note">{card.disabledReason}</div>
              )}
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
