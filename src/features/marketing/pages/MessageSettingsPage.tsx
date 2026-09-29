import { PageHeader } from "../../../components/ui";
import TriggerTemplatesPanel from "../components/TriggerTemplatesPanel";
import "../styles/MessageSettingsPage.scss";

// Previously the "Trigger Templates" tab inside Templates (Campaign
// Templates vs Trigger Templates) — split out into its own page under
// Marketing > Setup since it's a fundamentally different thing (per-event
// automatic message wording/on-off toggles, not a template you pick and
// blast to a list) and renamed to match what it actually configures.
export default function MessageSettingsPage() {
  return (
    <div className="ms-page">
      <PageHeader
        title="Message Settings"
        subtitle="Wording and on/off toggles for messages that fire automatically off an event — a sale, a booking, a lifecycle date."
      />
      <TriggerTemplatesPanel />
    </div>
  );
}
