import type { ReactNode } from "react";
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";

import { useKeyboardInset } from "@/hooks/useKeyboardInset";

type KeyboardInsetViewProps = {
  children: ReactNode;
  /** Safe-area space already supplied by the content. */
  bottomOffset?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  onContentLayout?: (event: LayoutChangeEvent) => void;
  style?: StyleProp<ViewStyle>;
};

/** Keeps content above the keyboard, including Android edge-to-edge layouts. */
export function KeyboardInsetView({ children, bottomOffset = 0, contentContainerStyle, onContentLayout, style }: KeyboardInsetViewProps) {
  const keyboard = useKeyboardInset();

  return (
    <View
      ref={keyboard.viewport}
      collapsable={false}
      onLayout={keyboard.onLayout}
      onTouchEndCapture={keyboard.onTouchEndCapture}
      pointerEvents="box-none"
      style={[styles.container, style]}
    >
      <View pointerEvents="box-none" style={[styles.container, { paddingBottom: Math.max(0, keyboard.inset - bottomOffset) }]}>
        <View pointerEvents="box-none" onLayout={onContentLayout} style={[styles.container, contentContainerStyle]}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
