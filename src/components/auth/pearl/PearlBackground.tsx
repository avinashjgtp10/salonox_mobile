import { type ReactNode } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";

/**
 * Pearl background, drawn exactly like the prototype's `.bg`:
 *   radial(260px at 88% 8%,   champagne rgba(239,226,212,.9)  → transparent 70%)
 *   radial(300px at 0% 38%,   lavender  rgba(217,214,240,.95) → transparent 70%)
 *   radial(280px at 100% 72%, sky       rgba(214,232,244,.9)  → transparent 70%)
 *   radial(240px at 15% 98%,  blush     rgba(246,226,234,.9)  → transparent 70%)
 *   linear(160deg, #FAF9F6 0%, #F2F1F8 50%, #F5F3EE 100%)
 */
const SHEEN = [
  { id: "bgChampagne", x: 0.88, y: 0.08, r: 260, color: "#EFE2D4", opacity: 0.9 },
  { id: "bgLavender", x: 0, y: 0.38, r: 300, color: "#D9D6F0", opacity: 0.95 },
  { id: "bgSky", x: 1, y: 0.72, r: 280, color: "#D6E8F4", opacity: 0.9 },
  { id: "bgBlush", x: 0.15, y: 0.98, r: 240, color: "#F6E2EA", opacity: 0.9 },
] as const;

const ANGLE = (160 * Math.PI) / 180;

/** Pearl background: soft base gradient + champagne, lavender, sky and blush sheen. */
export function PearlBackground({ children }: { children?: ReactNode }) {
  const { width: w, height: h } = useWindowDimensions();
  const dx = Math.sin(ANGLE), dy = -Math.cos(ANGLE);
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;

  return (
    <View style={styles.fill}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Svg width={w} height={h}>
          <Defs>
            <LinearGradient id="bgBase" gradientUnits="userSpaceOnUse"
              x1={w / 2 - dx * half} y1={h / 2 - dy * half} x2={w / 2 + dx * half} y2={h / 2 + dy * half}>
              <Stop offset="0" stopColor="#FAF9F6" />
              <Stop offset="0.5" stopColor="#F2F1F8" />
              <Stop offset="1" stopColor="#F5F3EE" />
            </LinearGradient>
            {SHEEN.map(blob => (
              <RadialGradient key={blob.id} id={blob.id} gradientUnits="userSpaceOnUse"
                cx={w * blob.x} cy={h * blob.y} r={blob.r} fx={w * blob.x} fy={h * blob.y}>
                <Stop offset="0" stopColor={blob.color} stopOpacity={blob.opacity} />
                <Stop offset="0.7" stopColor={blob.color} stopOpacity={0} />
              </RadialGradient>
            ))}
          </Defs>
          <Rect width={w} height={h} fill="url(#bgBase)" />
          {/* CSS paints the first listed layer on top, so draw them in reverse. */}
          {[...SHEEN].reverse().map(blob => <Rect key={blob.id} width={w} height={h} fill={`url(#${blob.id})`} />)}
        </Svg>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#F5F4F6" },
});
