import { Ionicons } from "@expo/vector-icons";
import type { PropsWithChildren } from "react";
import { Image, Pressable, StyleSheet, View, type ViewStyle } from "react-native";

import { LuxuryColors } from "@/components/auth/luxuryTheme";

export function LuxuryBackground({ children }: PropsWithChildren) {
  return (
    <View style={styles.background}>
      <View pointerEvents="none" style={styles.lightOrb} />
      <View pointerEvents="none" style={styles.floral}>
        <Image
          resizeMode="contain"
          source={require("../../../assets/images/auth/floral-line-art.png")}
          style={styles.floralImage}
        />
      </View>
      {children}
    </View>
  );
}

export function LuxuryBackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Go back"
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
    >
      <Ionicons color={LuxuryColors.accent} name="chevron-back" size={24} />
    </Pressable>
  );
}

export function LuxuryButtonSurface({
  children,
  outlined = false,
  style,
}: PropsWithChildren<{ outlined?: boolean; style?: ViewStyle }>) {
  return (
    <View style={[styles.button, outlined && styles.buttonOutlined, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: LuxuryColors.background,
    flex: 1,
    overflow: "hidden",
  },
  lightOrb: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 260,
    height: 520,
    position: "absolute",
    right: -190,
    top: -210,
    width: 520,
  },
  floral: {
    height: 235,
    opacity: 0.38,
    position: "absolute",
    right: -46,
    top: 24,
    width: 265,
  },
  floralImage: {
    height: "100%",
    tintColor: "#C9A784",
    width: "100%",
  },
  backButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 24,
    elevation: 4,
    height: 48,
    justifyContent: "center",
    shadowColor: "#6B4A2D",
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    width: 48,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
  button: {
    alignItems: "center",
    backgroundColor: LuxuryColors.accent,
    borderColor: LuxuryColors.accent,
    borderRadius: 20,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
  },
  buttonOutlined: {
    backgroundColor: "rgba(255,255,255,0.66)",
  },
});
