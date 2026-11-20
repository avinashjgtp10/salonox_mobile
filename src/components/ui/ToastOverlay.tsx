import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Portal } from "@/components/ui/Portal";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ToastOverlay({ children, position = "center" }: { children: ReactNode; position?: "center" | "bottom" }) {
  const insets = useSafeAreaInsets();
  return (
    <Portal>
      <View pointerEvents="box-none" style={[styles.overlay, position === "bottom" && { justifyContent: "flex-end", paddingBottom: insets.bottom + 96 }]}>
        <View pointerEvents="box-none" style={styles.content}>{children}</View>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  content: { width: "100%", maxWidth: 480, gap: 8 },
});
