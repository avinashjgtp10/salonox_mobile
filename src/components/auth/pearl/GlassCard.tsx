import { StyleSheet, View, type ViewProps } from "react-native";

import { pearl, pearlRadius, pearlShadow, pearlSpace } from "./tokens";

/** Frosted pearl card: translucent white surface with a bright edge. */
export function GlassCard({ style, children, strong, ...rest }: ViewProps & { strong?: boolean }) {
  return (
    <View style={[styles.card, strong && styles.strong, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: pearl.glass,
    borderColor: pearl.glassBorder,
    borderWidth: 1,
    borderRadius: pearlRadius.card,
    padding: pearlSpace.lg,
    ...pearlShadow.card,
  },
  strong: { backgroundColor: pearl.glassStrong },
});
