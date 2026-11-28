import { View, type ViewProps } from "react-native";

import { pearlRadius, pearlShadow, pearlSpace } from "./tokens";
import { themedStyles } from "@/components/auth/pearl/themedStyles";

/** Frosted pearl card: translucent white surface with a bright edge. */
export function GlassCard({ style, children, strong, ...rest }: ViewProps & { strong?: boolean }) {
  return (
    <View style={[styles.card, strong && styles.strong, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = themedStyles((p) => ({
  card: {
    backgroundColor: p.glass,
    borderColor: p.glassBorder,
    borderWidth: 1,
    borderRadius: pearlRadius.card,
    padding: pearlSpace.lg,
    ...pearlShadow.card,
  },
  strong: { backgroundColor: p.glassStrong },
}));
