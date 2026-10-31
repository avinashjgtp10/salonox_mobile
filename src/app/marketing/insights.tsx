import MarketingInsightsScreen from "@/features/marketing/MarketingInsightsScreen";
import { WhatsAppSetupGate } from "@/features/marketing/WhatsAppSetupGate";

export default function MarketingInsightsRoute() {
  return <WhatsAppSetupGate><MarketingInsightsScreen /></WhatsAppSetupGate>;
}
