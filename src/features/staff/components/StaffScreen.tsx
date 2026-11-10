import type { ReactNode } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { usePearlPalette } from "@/components/auth/pearl/usePearlPalette";
import { Text } from "@/components/ui/AppTypography";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { useFooterClearance } from "@/hooks/useFooterClearance";
import { useSettingsStyles } from "@/features/settings/SettingsUI";

export function StaffPage({ title, subtitle, subtitleAbove = false, right, children, refreshing = false, onRefresh }: {
  title: string; subtitle?: string; subtitleAbove?: boolean; right?: ReactNode; children: ReactNode; refreshing?: boolean; onRefresh?: () => void;
}) {
  const ui = useSettingsStyles(), p = usePearlPalette();
  const clearance = useFooterClearance();
  return <PearlBackground><SafeAreaView edges={["top"]} style={{ flex: 1 }}><AppStatusBar />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: clearance + 20, gap: 16 }}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[p.accent]} tintColor={p.accent} /> : undefined}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 8 }}>
        <View style={{ flex: 1, gap: 4 }}>{!!subtitle && subtitleAbove && <Text style={ui.muted}>{subtitle}</Text>}<Text translate style={ui.heading}>{title}</Text>{!!subtitle && !subtitleAbove && <Text style={ui.muted}>{subtitle}</Text>}</View>{right}
      </View>
      {children}
    </ScrollView>
  </SafeAreaView></PearlBackground>;
}
