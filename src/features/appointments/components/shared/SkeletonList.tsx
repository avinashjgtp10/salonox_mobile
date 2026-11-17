import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { usePearlColors } from "@/components/auth/pearl/usePearlColors";
import { useMemo } from "react";
import { View } from "react-native";

export function SkeletonList() {
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.stack}>
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={`appointment-loading-${index}`} style={styles.card}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
        </View>
      ))}
    </View>
  );
}
