import InboxThreadScreen from "@/features/inbox/InboxThreadScreen";
import { WhatsAppSetupGate } from "@/features/marketing/WhatsAppSetupGate";

export default function InboxThreadRoute() {
  return <WhatsAppSetupGate><InboxThreadScreen /></WhatsAppSetupGate>;
}
