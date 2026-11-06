import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/AppTypography";

import { GlassButton, PrimaryButton, TextButton } from "./Buttons";
import { pearl, pearlRadius, pearlSpace, pearlType } from "./tokens";

export type SsoProvider = "Google" | "Apple";

/** Google / Apple email isn't linked to a SalonOX account: explain and offer web registration. */
export function NotRegisteredModal({ visible, email, provider, onRegister, onRetry, onUseEmail }: {
  visible: boolean;
  email?: string | null;
  provider: SsoProvider;
  onRegister: () => void;
  onRetry: () => void;
  onUseEmail: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onUseEmail} statusBarTranslucent>
      <Pressable style={styles.dim} onPress={onUseEmail} accessibilityLabel="Close" />
      <View style={styles.center} pointerEvents="box-none">
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.icon}><Ionicons name="mail-unread-outline" size={26} color="#4F7896" /></View>
          <Text style={[pearlType.h3, styles.centerText]}>This email isn’t registered</Text>
          <Text style={[pearlType.small, styles.body]}>
            {email ? <Text style={styles.email}>{email}</Text> : "This account"}
            {` isn’t linked to a SalonOX account. We don’t create accounts automatically. Please register your salon or spa first, then sign in with ${provider}.`}
          </Text>
          <PrimaryButton
            title="Register on the web"
            onPress={onRegister}
            right={<Ionicons name="open-outline" size={16} color={pearl.white} />}
            style={styles.stretchTop}
          />
          <GlassButton title="Try another account" onPress={onRetry} style={styles.stretch} />
          <TextButton title="Sign in with email instead" onPress={onUseEmail} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(59,57,80,0.28)" },
  center: { ...StyleSheet.absoluteFillObject, justifyContent: "center", padding: pearlSpace.xl },
  card: {
    borderRadius: pearlRadius.card,
    padding: pearlSpace.xl,
    gap: pearlSpace.md,
    alignItems: "center",
    backgroundColor: "rgba(250,249,252,0.97)",
    borderWidth: 1,
    borderColor: pearl.white,
  },
  icon: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(217,231,241,0.75)" },
  centerText: { textAlign: "center" },
  body: { textAlign: "center", fontSize: 13.5, lineHeight: 20 },
  email: { color: pearl.ink, fontWeight: "700" },
  stretchTop: { alignSelf: "stretch", marginTop: pearlSpace.sm },
  stretch: { alignSelf: "stretch" },
});
