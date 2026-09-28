import { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, View } from "react-native";
import { Button, Icon, ProgressBar, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSegments } from "expo-router";

import { useAuth } from "@/context/AuthContext";
import { isStaffExperienceUser } from "@/utils/routeResolver";
import { getGuideSteps, getGuideTabs } from "./guideSteps";
import { guideStorage } from "./guideStorage";

function GuideModal({ staff, onClose }: { staff: boolean; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const steps = getGuideSteps(staff);
  const step = steps[index];
  const last = index === steps.length - 1;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={[styles.backdrop, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        <View accessibilityViewIsModal style={[styles.card, { backgroundColor: colors.surface }]}>
          <ScrollView contentContainerStyle={styles.content} bounces={false}>
            <View style={styles.heading}>
              <Text variant="labelLarge">USER GUIDE · {index + 1} OF {steps.length}</Text>
              <Button onPress={onClose} accessibilityLabel="Skip user guide">Skip</Button>
            </View>
            <ProgressBar progress={(index + 1) / steps.length} accessibilityLabel={`Step ${index + 1} of ${steps.length}`} />
            <View style={[styles.icon, { backgroundColor: colors.primaryContainer }]}>
              <Icon source={step.icon} size={38} color={colors.onPrimaryContainer} />
            </View>
            <Text accessibilityRole="header" accessibilityLiveRegion="polite" variant="headlineSmall" style={styles.title}>{step.title}</Text>
            <Text variant="bodyLarge" style={styles.description}>{step.description}</Text>
            <View style={[styles.location, { backgroundColor: colors.surfaceVariant }]}>
              <Icon source="map-marker-outline" size={20} color={colors.onSurfaceVariant} />
              <Text variant="labelLarge" style={styles.locationText}>{step.location}</Text>
            </View>
            <Text variant="labelMedium" style={styles.previewLabel}>WHERE TO LOOK</Text>
            <View style={styles.tabs}>
              {getGuideTabs(staff).map((tab) => (
                <View key={tab} style={[styles.tab, { borderColor: tab === step.tab ? colors.primary : colors.outlineVariant, backgroundColor: tab === step.tab ? colors.primaryContainer : colors.surface }]}>
                  <Text variant="labelSmall" style={{ color: tab === step.tab ? colors.onPrimaryContainer : colors.onSurface }}>{tab}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
          <View style={styles.actions}>
            <Button disabled={index === 0} onPress={() => setIndex((current) => current - 1)}>Back</Button>
            <Button mode="contained" onPress={() => last ? onClose() : setIndex((current) => current + 1)}>{last ? "Get started" : "Next"}</Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function FirstLoginGuide({ enabled }: { enabled: boolean }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  // Widened on purpose: without the generated .expo typed routes (e.g. in CI)
  // useSegments() is typed as the tuple [string], which rejects segments[1].
  const segments: readonly string[] = useSegments();
  const userId = user?.id ?? "";
  const staff = isStaffExperienceUser(user);
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const onHome = String(segments[0]) === (staff ? "(staff)" : "(tabs)")
    && String(segments[1]) === (staff ? "home" : "dashboard");

  useEffect(() => {
    let active = true;
    setPendingUser(null);
    if (isAuthenticated && !isLoading && userId) {
      void guideStorage.shouldShow(userId).then((show) => {
        if (active && show) setPendingUser(userId);
      });
    }
    return () => { active = false; };
  }, [isAuthenticated, isLoading, userId]);

  if (!enabled || !onHome || !isAuthenticated || isLoading || pendingUser !== userId || !userId) return null;

  return <GuideModal staff={staff} onClose={() => {
    setPendingUser(null);
    void guideStorage.dismiss(userId);
  }} />;
}

export function UserGuideButton() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  return (
    <>
      <Button icon="compass-outline" mode="outlined" onPress={() => setVisible(true)}>User guide</Button>
      {visible && <GuideModal staff={isStaffExperienceUser(user)} onClose={() => {
        setVisible(false);
        if (user?.id) void guideStorage.dismiss(user.id);
      }} />}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20, backgroundColor: "rgba(0,0,0,0.55)" },
  card: { width: "100%", maxWidth: 480, maxHeight: "100%", borderRadius: 24, overflow: "hidden" },
  content: { padding: 24 },
  heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" },
  icon: { width: 76, height: 76, borderRadius: 24, alignItems: "center", justifyContent: "center", marginTop: 24, marginBottom: 20 },
  title: { fontWeight: "700", marginBottom: 12 },
  description: { lineHeight: 25, marginBottom: 20 },
  location: { flexDirection: "row", gap: 8, borderRadius: 12, padding: 12, alignItems: "center" },
  locationText: { flex: 1 },
  previewLabel: { marginTop: 24, marginBottom: 10 },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tab: { flexGrow: 1, alignItems: "center", borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 6 },
  actions: { flexDirection: "row", justifyContent: "space-between", padding: 20, gap: 12 },
});
