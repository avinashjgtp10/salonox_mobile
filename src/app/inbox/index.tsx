import InboxListScreen from "@/features/inbox/InboxListScreen";
import { WhatsAppSetupGate } from "@/features/marketing/WhatsAppSetupGate";

export default function InboxRoute() {
  return <WhatsAppSetupGate><InboxListScreen /></WhatsAppSetupGate>;
}
