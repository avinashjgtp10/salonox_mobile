import { ScrollView } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { StaffHeader } from "@/features/staff/components/StaffPearl";
import { StaffCommissionSection } from "@/features/staff/components/StaffCommissionSection";
import { commissionUi } from "@/features/staff/components/CommissionPearl";

export default function StaffCommissionsRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  return (
    <PearlBackground>
      <SafeAreaView edges={["top"]} style={commissionUi.screen}>
        <AppStatusBar />
        <ScrollView
          contentContainerStyle={[
            commissionUi.content,
            { paddingBottom: insets.bottom + 24 },
          ]}
        >
          <StaffHeader title="Commissions" />
          <StaffCommissionSection key={id} staffId={id} pearlStyle />
        </ScrollView>
      </SafeAreaView>
    </PearlBackground>
  );
}
