import MarketingDashboardScreen from "@/features/marketing/MarketingDashboardScreen";
import { WhatsAppSetupGate } from "@/features/marketing/WhatsAppSetupGate";

export default function MarketingRoute() {
  return <WhatsAppSetupGate><MarketingDashboardScreen /></WhatsAppSetupGate>;
}
