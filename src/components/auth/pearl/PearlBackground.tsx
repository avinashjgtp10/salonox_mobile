import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import { pearl, pearlGradients } from "./tokens";

// Each sheen blob is drawn as stacked translucent circles, which fades out like a
// radial gradient without needing react-native-svg (a new native module would
// change the build fingerprint and block OTA updates).
const RINGS = 9;

function SheenBlob({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) {
  return (
    <>
      {Array.from({ length: RINGS }).map((_, i) => {
        const size = r * 2 * (1 - i / RINGS);
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              left: cx - size / 2,
              top: cy - size / 2,
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
              opacity: 0.13,
            }}
          />
        );
      })}
    </>
  );
}

/** Pearl background: soft base gradient + lavender, sky, champagne and blush sheen. */
export function PearlBackground({ children }: { children?: ReactNode }) {
  const { width, height } = useWindowDimensions();
  return (
    <View style={styles.fill}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <LinearGradient colors={pearlGradients.background} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={StyleSheet.absoluteFill} />
        <SheenBlob cx={width * 0.95} cy={height * 0.06} r={width * 0.6} color={pearl.sheenChampagne} />
        <SheenBlob cx={width * -0.05} cy={height * 0.38} r={width * 0.72} color={pearl.sheenLavender} />
        <SheenBlob cx={width * 1.0} cy={height * 0.72} r={width * 0.66} color={pearl.sheenSky} />
        <SheenBlob cx={width * 0.12} cy={height * 0.98} r={width * 0.6} color={pearl.sheenBlush} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1, backgroundColor: pearl.bgTop, overflow: "hidden" } });
