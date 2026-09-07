import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Portal } from "@/components/ui/Portal";

/** Center transient feedback in the screen, independent of footers/scroll views. */
export function ToastOverlay({ children }: { children: ReactNode }) {
  return (
    <Portal>
      <View pointerEvents="box-none" style={styles.overlay}>
        <View pointerEvents="box-none" style={styles.content}>{children}</View>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  content: { width: "100%", maxWidth: 480, gap: 8 },
});
