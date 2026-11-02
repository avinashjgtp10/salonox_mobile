import InboxListScreen from "@/features/inbox/InboxListScreen";
import { WhatsAppSetupGate } from "@/features/marketing/WhatsAppSetupGate";

export default function WhatsAppTab() {
  return <WhatsAppSetupGate embedded><InboxListScreen embedded /></WhatsAppSetupGate>;
}
