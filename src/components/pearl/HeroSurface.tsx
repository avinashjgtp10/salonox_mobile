/**
 * Pearl hero background, drawn exactly like the prototype's `.glass-hero`:
 *   radial(120% 90% at top-left, blush .45 → transparent 45%),
 *   radial(90% 80% at bottom-right, sky .42 → transparent 50%),
 *   linear(140deg, #A9A4D2 0%, #8580B6 42%, #6A6597 78%, #5A5684 100%)
 * plus its `:after` glow (190px white circle, .35 → transparent 65%, at right -50 / top -60).
 */
import { type ReactNode, useState } from "react";
import { type LayoutChangeEvent, Platform, StyleSheet, View, type ViewStyle } from "react-native";
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";

const ANGLE = (140 * Math.PI) / 180;

export function HeroSurface({ children, style, radius = 26 }: { children: ReactNode; style?: ViewStyle; radius?: number }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.round(width) !== size.w || Math.round(height) !== size.h) setSize({ w: Math.round(width), h: Math.round(height) });
  };

  // CSS gradient line for a 140deg angle across a w×h box.
  const { w, h } = size;
  const dx = Math.sin(ANGLE), dy = -Math.cos(ANGLE);
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
  const line = { x1: w / 2 - dx * half, y1: h / 2 - dy * half, x2: w / 2 + dx * half, y2: h / 2 + dy * half };

  return (
    <View style={[styles.shadow, { borderRadius: radius }]}>
      <View onLayout={onLayout} style={[styles.clip, { borderRadius: radius }, style]}>
        {w ? (
          <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <LinearGradient id="heroBase" gradientUnits="userSpaceOnUse" {...line}>
                <Stop offset="0" stopColor="#A9A4D2" />
                <Stop offset="0.42" stopColor="#8580B6" />
                <Stop offset="0.78" stopColor="#6A6597" />
                <Stop offset="1" stopColor="#5A5684" />
              </LinearGradient>
              <RadialGradient id="heroBlush" gradientUnits="userSpaceOnUse" cx={0} cy={0} rx={w * 1.2} ry={h * 0.9} fx={0} fy={0}>
                <Stop offset="0" stopColor="#FFE2EE" stopOpacity={0.45} />
                <Stop offset="0.45" stopColor="#FFE2EE" stopOpacity={0} />
              </RadialGradient>
              <RadialGradient id="heroSky" gradientUnits="userSpaceOnUse" cx={w} cy={h} rx={w * 0.9} ry={h * 0.8} fx={w} fy={h}>
                <Stop offset="0" stopColor="#C4E4F5" stopOpacity={0.42} />
                <Stop offset="0.5" stopColor="#C4E4F5" stopOpacity={0} />
              </RadialGradient>
              <RadialGradient id="heroGlow" gradientUnits="userSpaceOnUse" cx={w - 45} cy={35} r={95} fx={w - 45} fy={35}>
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.35} />
                <Stop offset="0.65" stopColor="#FFFFFF" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect width={w} height={h} fill="url(#heroBase)" />
            <Rect width={w} height={h} fill="url(#heroSky)" />
            <Rect width={w} height={h} fill="url(#heroBlush)" />
            <Circle cx={w - 45} cy={35} r={95} fill="url(#heroGlow)" />
          </Svg>
        ) : <View style={[StyleSheet.absoluteFill, { backgroundColor: "#7E78B0" }]} />}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // box-shadow: 0 18px 40px rgba(93,88,144,.35)
  shadow: Platform.select<ViewStyle>({
    ios: { shadowColor: "#5D5890", shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 18 } },
    android: { elevation: 10, shadowColor: "#5D5890", backgroundColor: "#7E78B0" },
    default: {},
  }) as ViewStyle,
  clip: { overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.55)" },
});
