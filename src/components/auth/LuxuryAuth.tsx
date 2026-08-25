import { Ionicons } from "@expo/vector-icons";
import type { PropsWithChildren } from "react";
import { useMemo } from "react";
import { Image, Pressable, StyleSheet, View, type ViewStyle } from "react-native";

import { useLuxuryColors, type LuxuryColors } from "@/components/auth/luxuryTheme";

export function LuxuryBackground({ children }: PropsWithChildren) {
  const Colors = useLuxuryColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

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
  const Colors = useLuxuryColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <Pressable
      accessibilityLabel="Go back"
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
    >
      <Ionicons color={Colors.accent} name="arrow-back" size={24} />
    </Pressable>
  );
}

export function LuxuryButtonSurface({
  children,
  outlined = false,
  style,
}: PropsWithChildren<{ outlined?: boolean; style?: ViewStyle }>) {
  const Colors = useLuxuryColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={[styles.button, outlined && styles.buttonOutlined, style]}>
      {children}
    </View>
  );
}

const createStyles = (Colors: LuxuryColors) => StyleSheet.create({
  background: {
    backgroundColor: Colors.background,
    flex: 1,
    overflow: "hidden",
  },
  lightOrb: {
    backgroundColor: Colors.card,
    borderRadius: 260,
    height: 520,
    opacity: 0.82,
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
    tintColor: Colors.accent,
    width: "100%",
  },
  backButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 24,
    elevation: 4,
    height: 48,
    justifyContent: "center",
    shadowColor: Colors.text,
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
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
    borderRadius: 20,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
  },
  buttonOutlined: {
    backgroundColor: Colors.card,
  },
});
