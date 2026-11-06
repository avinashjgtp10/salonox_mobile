import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { pearl, pearlGradients, pearlShadow, pearlType } from "@/components/auth/pearl/tokens";
import { Text } from "@/components/ui/AppTypography";
import { useAuth } from "@/context/AuthContext";
import { Icon } from "./Icon";
import { Tile } from "./ui";

/** Presentation only: the parent owns offline detection and the retry action. */
export function NoInternetState({ onRetry }: { onRetry: () => void }) {
  const { user } = useAuth();
  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <Tile icon="wifiOff" tone="lilac" size={76} />
        <Text style={[pearlType.h2, styles.center]} accessibilityRole="header">No internet connection</Text>
        <Text style={styles.description}>
          <Text style={styles.emphasis}>This screen</Text> needs the internet to load the latest data. Check your Wi-Fi or mobile data, then try again.
        </Text>
      </View>

      <Pressable onPress={onRetry} accessibilityRole="button" style={({ pressed }) => pressed && styles.pressed}>
        <LinearGradient colors={pearlGradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.button, pearlShadow.button]}>
          <Icon name="repeat" size={18} color="#fff" />
          <Text style={styles.primaryLabel}>Try again</Text>
        </LinearGradient>
      </Pressable>
      <Pressable onPress={() => router.replace(user?.role === "staff" ? "/(staff)/home" : "/(tabs)/dashboard")}
        accessibilityRole="button" style={({ pressed }) => [styles.button, styles.secondary, pressed && styles.pressed]}>
        <Text style={styles.secondaryLabel}>Go to Home</Text>
      </Pressable>

      <Text style={[pearlType.bodyStrong, { marginTop: 12 }]}>While you’re offline</Text>
      <View style={styles.note}>
        <Tile icon="info" tone="lilac" size={36} />
        <Text style={styles.noteText}>Previously loaded information may still be available. Reconnect to load the latest updates.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, paddingBottom: 12, width: "100%" },
  hero: { alignItems: "center", gap: 14, paddingTop: 58, paddingBottom: 26 },
  center: { textAlign: "center" },
  description: { maxWidth: 290, fontSize: 13.5, lineHeight: 20.25, fontWeight: "500", textAlign: "center", color: pearl.muted },
  emphasis: { color: pearl.ink, fontWeight: "700" },
  button: { minHeight: 52, borderRadius: 18, paddingHorizontal: 20, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  primaryLabel: { fontSize: 14, fontWeight: "700", color: "#fff" },
  secondaryLabel: { fontSize: 14, fontWeight: "700", color: pearl.ink },
  secondary: { backgroundColor: pearl.glass, borderWidth: 1, borderColor: pearl.glassBorder },
  note: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 20, backgroundColor: pearl.glass, borderWidth: 1, borderColor: pearl.glassBorder },
  noteText: { flex: 1, fontSize: 12.5, lineHeight: 19, color: pearl.muted, fontWeight: "500" },
  pressed: { opacity: 0.8 },
});
