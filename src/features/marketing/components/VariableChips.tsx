import { Copy } from "lucide-react";
import type { PurchaseEventType } from "../../../types/marketing.types";
import "../styles/VariableChips.scss";

// Reuses the same per-event variable list already hardcoded as
// VARIABLE_EXPLANATIONS in TriggerTemplatesPanel.tsx — no new backend
// endpoint needed, it's static per event type. Duplicated here (rather than
// imported) only for the token list; the human "meaning" strings stay in
// the WhatsApp info panel, which every channel already sits beside.
export const EVENT_VARIABLE_TOKENS: Record<PurchaseEventType, string[]> = {
  client_welcome: ["customer_name", "salon_name", "referral_code"],
  package_purchased: ["customer_name", "package_name", "services", "total_sessions", "expiry_date", "package_value", "invoice_number"],
  membership_purchased: ["customer_name", "membership_name", "benefit", "start_date", "expiry_date", "membership_price", "invoice_number"],
  bill_receipt: ["customer_name", "salon_name", "items", "feedback_line"],
  appointment_confirmation: ["customer_name", "salon_name", "appointment_date", "appointment_time", "service_name", "staff_name"],
  appointment_rescheduled: ["customer_name", "salon_name", "old_date", "old_time", "new_date", "new_time", "service_name", "staff_name"],
  appointment_cancelled: ["customer_name", "salon_name", "appointment_date", "appointment_time", "service_name"],
  payment_received: ["customer_name", "amount", "salon_name", "appointment_date", "appointment_time"],
  package_expiring_7d: ["customer_name", "package_name", "expiry_date", "remaining_sessions"],
  package_expiring_24h: ["customer_name", "package_name", "remaining_sessions", "expiry_date"],
  membership_expiring_7d: ["customer_name", "membership_name", "expiry_date", "remaining_balance"],
  membership_expiring_24h: ["customer_name", "membership_name", "remaining_balance", "expiry_date"],
  package_session_used: ["customer_name", "service_name", "package_name", "remaining_sessions", "salon_name", "remaining_services_breakdown"],
  membership_session_used: ["customer_name", "service_name", "amount_used", "remaining_balance", "salon_name"],
  package_appointment_reminder_24h: ["customer_name", "salon_name", "appointment_date", "appointment_time", "service_name", "package_name"],
  service_reminder_24h: ["customer_name", "salon_name", "appointment_date", "appointment_time", "service_name", "staff_name"],
  reward_points_earned: ["customer_name", "points_earned", "salon_name", "total_points"],
  referral_reward: ["customer_name", "referred_customer_name", "salon_name", "reward", "total_points"],
  ewallet_used: ["customer_name", "amount_used", "salon_name", "remaining_balance"],
  referral_credit_used: ["customer_name", "amount_used", "salon_name", "remaining_balance"],
  reward_points_used: ["customer_name", "points_used", "salon_name", "remaining_points"],
  birthday_wishes: ["customer_name", "salon_name"],
  anniversary_wishes: ["customer_name", "salon_name"],
  cash_counter_opened: ["salon_name", "opening_date", "opening_time", "opening_amount"],
  cash_counter_closed: ["salon_name", "closing_date", "closing_time", "collection_breakdown", "total_collection"],
};

interface Props {
  eventType: PurchaseEventType;
  /** Click inserts `{{token}}` — caller owns the field and cursor position. */
  onInsert: (token: string) => void;
}

export default function VariableChips({ eventType, onInsert }: Props) {
  const tokens = EVENT_VARIABLE_TOKENS[eventType] ?? [];
  if (tokens.length === 0) return null;

  return (
    <div className="vc-row">
      {tokens.map((token) => (
        <button
          key={token}
          type="button"
          className="vc-chip"
          title={`Insert {{${token}}}`}
          onClick={() => onInsert(token)}
          onDoubleClick={() => navigator.clipboard?.writeText(`{{${token}}}`)}
        >
          {token}
          <Copy
            size={10}
            className="vc-chip-copy"
            onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(`{{${token}}}`); }}
          />
        </button>
      ))}
    </div>
  );
}
