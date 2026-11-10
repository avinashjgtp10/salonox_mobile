import { Linking, View } from "react-native";
import { EmptyState, SmallButton } from "@/components/pearl/ui";
import { appAlert } from "@/services/appAlert";

// Always use the public production pricing page, including in QA builds.
const PRICING_URL = "https://www.salonox.com/#pricing";

export function DashboardUpgradeRequired() {
  const explorePlans = async () => {
    try {
      await Linking.openURL(PRICING_URL);
    } catch {
      appAlert.alert("Unable to open pricing", "Please try again or visit www.salonox.com/#pricing in your browser.");
    }
  };

  return (
    <EmptyState
      icon="lock"
      title="Upgrade required"
      body="Your current plan doesn't include the dashboard. Explore our plans to unlock this feature."
      action={
        <View style={{ marginTop: 8 }}>
          <SmallButton title="Explore plans" icon="external" primary onPress={() => void explorePlans()} />
        </View>
      }
    />
  );
}
