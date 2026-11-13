import React, { useEffect, useId, useRef, useState } from 'react';
import {
  AccessibilityInfo, Animated, Easing, Image, StyleSheet, Text, View,
  useWindowDimensions, type LayoutChangeEvent,
} from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

export const SALONOX_LOGO = require('./assets/salonox-logo.png');
export const SALONOX_FONTS = {
  DMSans_500Medium: require('./assets/DMSans_500Medium.ttf'),
  DMSans_600SemiBold: require('./assets/DMSans_600SemiBold.ttf'),
};

type Props = {
  /** Keep the splash visible until app initialization finishes. */
  ready?: boolean;
  /** Original starts its 550ms fade at 2500ms. */
  minimumDuration?: number;
  onTransitionStart?: () => void;
  /** Called at 3100ms by default, after the original transition completes. */
  onFinish?: () => void;
  /** Optional override; otherwise follows the device accessibility setting. */
  reduceMotion?: boolean;
};

/** When the authored reveal timeline finishes, relative to its start. */
const AUTHORED_END = 2330;
const cssEaseOut = Easing.bezier(0, 0, 0.58, 1);
const cssEase = Easing.bezier(0.25, 0.1, 0.25, 1);
const logoEase = Easing.bezier(0.16, 1, 0.3, 1);
const timing = (value: Animated.Value, duration: number, delay = 0,
  easing = cssEaseOut, toValue = 1) =>
  Animated.timing(value, { toValue, duration, delay, easing, useNativeDriver: true });

/** Native layout + native-driven animations. No WebView or screenshot background. */
export default function SalonOXSplash({ ready = true, minimumDuration = 1900,
  onTransitionStart, onFinish, reduceMotion }: Props) {
  const window = useWindowDimensions();
  const [size, setSize] = useState({ width: window.width, height: window.height });
  const [imageReady, setImageReady] = useState(false);
  const [systemReduced, setSystemReduced] = useState<boolean | null>(null);
  const [elapsed, setElapsed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const reduced = reduceMotion ?? systemReduced;
  const callbacks = useRef({ onFinish, onTransitionStart });
  callbacks.current = { onFinish, onTransitionStart };
  const a = useRef({ logo: new Animated.Value(0), name: new Animated.Value(0),
    divider: new Animated.Value(0), tagline: new Animated.Value(0),
    loader: new Animated.Value(0), progress: new Animated.Value(0),
    shine: new Animated.Value(0),
    opacity: new Animated.Value(1) }).current;

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (active) setSystemReduced(v); },
      () => { if (active) setSystemReduced(false); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduced);
    return () => { active = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    if (!imageReady || reduced === null) return;
    const revealValues = [a.logo, a.name, a.divider, a.tagline, a.loader, a.progress, a.shine];
    revealValues.forEach(value => value.setValue(reduced ? 1 : 0));
    // The reveal was authored to end at 2330ms (progress: 1480 delay + 850).
    // Squeeze it into the hold so the bar still completes one uninterrupted
    // 0-100% fill instead of being cut off mid-way by the fade.
    const scale = Math.min(1, minimumDuration / AUTHORED_END);
    const ms = (value: number) => Math.round(value * scale);
    const sequence = Animated.parallel([
      timing(a.logo, ms(900), ms(180), logoEase),
      timing(a.shine, ms(900), ms(950), Easing.bezier(0.42, 0, 0.58, 1)),
      timing(a.name, ms(650), ms(720)),
      timing(a.divider, ms(700), ms(1020), Easing.bezier(0.65, 0, 0.35, 1)),
      timing(a.tagline, ms(650), ms(1130)), timing(a.loader, ms(500), ms(1350)),
      // One uninterrupted, constant-speed fill (no intermediate keyframes).
      timing(a.progress, ms(850), ms(1480), Easing.linear),
    ]);
    if (!reduced) sequence.start();
    const timer = setTimeout(() => setElapsed(true), Math.max(0, minimumDuration));
    return () => { clearTimeout(timer); sequence.stop(); };
  }, [a, imageReady, minimumDuration, reduced]);

  useEffect(() => {
    if (!ready || !elapsed) return;
    callbacks.current.onTransitionStart?.();
    const animation = timing(a.opacity, reduced ? 0 : 550, 0, cssEase, 0);
    animation.start();
    const timer = setTimeout(() => { setHidden(true); callbacks.current.onFinish?.(); }, reduced ? 0 : 600);
    return () => { clearTimeout(timer); animation.stop(); };
  }, [a, ready, elapsed, reduced]);

  const { width: w, height: h } = size;
  const logoSize = Math.max(136, Math.min(w * 0.38, 168));
  const fontSize = Math.max(34, Math.min(w * 0.09, 42));
  const trackWidth = Math.min(164, w * 0.44);
  const short = h <= 620;
  const interp = (value: Animated.Value, from: number, to: number) =>
    value.interpolate({ inputRange: [0, 1], outputRange: [from, to] });
  const reveal = (value: Animated.Value, y: number) => ({ opacity: value,
    transform: [{ translateY: interp(value, y, 0) }] });
  const onLayout = ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    if (layout.width !== w || layout.height !== h) setSize({ width: layout.width, height: layout.height });
  };
  if (hidden) return null;

  return (
    <Animated.View onLayout={onLayout} style={[styles.root, { opacity: a.opacity }]}
      accessibilityViewIsModal>
      <SplashBackground width={w} height={h} />

      <View style={[styles.brand, { transform: [{ translateY: -h * (short ? 0.02 : 0.04) },
        { scale: short ? 0.84 : 1 }] }]} accessible accessibilityLabel="SalonOX is opening">
        <Animated.View style={[styles.logoWrap, { width: logoSize, height: logoSize,
          opacity: a.logo, transform: [{ translateY: interp(a.logo, 20, 0) },
            { scale: interp(a.logo, 0.82, 1) }] }]}>
          <Image source={SALONOX_LOGO} style={styles.logo} resizeMode="contain"
            onLoad={() => setImageReady(true)} />
          {!reduced && <Animated.View pointerEvents="none" style={{ position: 'absolute',
            width: logoSize * 0.3, height: logoSize * 1.4, top: -logoSize * 0.2,
            left: -logoSize * 0.75,
            transform: [{ translateX: interp(a.shine, 0, logoSize * 2.2) }, { rotate: '16deg' }],
          }}><Gradient colors={['#ffffff00', '#ffffffb8', '#ffffff00']} /></Animated.View>}
        </Animated.View>
        <Animated.View style={[styles.nameWrap, reveal(a.name, 14)]}>
          <Text allowFontScaling={false} style={[styles.name, { fontSize, lineHeight: fontSize }]}>
            salon<Text style={styles.accent}>ox</Text>
          </Text>
        </Animated.View>
        <Animated.View style={[styles.divider, { transform: [{ scaleX: a.divider }] }]}>
          <Gradient colors={['#062e7d', '#08d09f']} />
        </Animated.View>
        <Animated.Text allowFontScaling={false} style={[styles.tagline, reveal(a.tagline, 8)]}>
          SMART SALON MANAGEMENT
        </Animated.Text>
      </View>

      <Animated.View style={[styles.loader, { width: trackWidth, bottom: short ? 30 : Math.max(46, h * 0.07),
        opacity: a.loader }]} accessible accessibilityRole="progressbar"
        accessibilityLabel="Opening your workspace" accessibilityLiveRegion="polite">
        <View style={styles.track}>
          <Animated.View style={[styles.progress, { width: trackWidth,
            transform: [{ translateX: interp(a.progress, -trackWidth / 2, 0) }, { scaleX: a.progress }] }]}>
            <Gradient colors={['#062b76', '#08789a', '#08d19e']} offsets={[0, 0.55, 1]} />
          </Animated.View>
        </View>
        <Text allowFontScaling={false} style={styles.loadingText}>OPENING YOUR WORKSPACE</Text>
      </Animated.View>
    </Animated.View>
  );
}

function Gradient({ colors, offsets }: { colors: string[]; offsets?: number[] }) {
  const id = useId().replace(/:/g, '');
  return <Svg width="100%" height="100%"><Defs>
    <LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
      {colors.map((color, i) => {
        // react-native-svg ignores the alpha pair in #rrggbbaa on stopColor, so
        // '#ffffff00' renders as solid white. Split the alpha into stopOpacity.
        const rgba = /^#([0-9a-f]{6})([0-9a-f]{2})$/i.exec(color);
        return <Stop key={i} offset={offsets?.[i] ?? i / (colors.length - 1)}
          stopColor={rgba ? `#${rgba[1]}` : color}
          stopOpacity={rgba ? parseInt(rgba[2], 16) / 255 : 1} />;
      })}
    </LinearGradient>
  </Defs><Rect width="100%" height="100%" fill={`url(#${id})`} /></Svg>;
}

export function SplashBackground({ width: w, height: h }: { width: number; height: number }) {
  const id = useId().replace(/:/g, '');
  // CSS linear-gradient(145deg) endpoints, accounting for the screen aspect ratio.
  const dx = Math.sin(145 * Math.PI / 180), dy = -Math.cos(145 * Math.PI / 180);
  const length = Math.abs(w * dx) + Math.abs(h * dy);
  return <Svg pointerEvents="none" width={w} height={h} style={StyleSheet.absoluteFill}>
    <Defs>
      <LinearGradient id={`${id}base`} gradientUnits="userSpaceOnUse"
        x1={w / 2 - dx * length / 2} y1={h / 2 - dy * length / 2}
        x2={w / 2 + dx * length / 2} y2={h / 2 + dy * length / 2}>
        <Stop offset="0" stopColor="#f0ebfa" /><Stop offset="0.55" stopColor="#f5f2fa" />
        <Stop offset="1" stopColor="#eaf6f3" />
      </LinearGradient>
      <RadialGradient id={`${id}glow`} gradientUnits="userSpaceOnUse" cx={0} cy={0} r={1}
        fx={0} fy={0} gradientTransform={`translate(${w * 0.5} ${h * 0.45}) scale(${w * 0.52} ${h * 0.38})`}>
        <Stop offset="0" stopColor="#7365b8" stopOpacity={23 / 255} />
        <Stop offset="0.44" stopColor="#5ad3bc" stopOpacity={11 / 255} />
        <Stop offset="0.74" stopColor="#5ad3bc" stopOpacity={0} />
      </RadialGradient>
      <RadialGradient id={`${id}lavender`} gradientUnits="userSpaceOnUse" cx={0} cy={0} r={1}
        fx={0} fy={0} gradientTransform={`translate(${w * 0.08} ${h * 0.16}) scale(${w * 0.92} ${h * 0.42})`}>
        <Stop offset="0" stopColor="#a999df" stopOpacity={0.16} />
        <Stop offset="1" stopColor="#a999df" stopOpacity={0} />
      </RadialGradient>
      <RadialGradient id={`${id}mint`} gradientUnits="userSpaceOnUse" cx={0} cy={0} r={1}
        fx={0} fy={0} gradientTransform={`translate(${w * 0.96} ${h * 0.8}) scale(${w * 0.85} ${h * 0.36})`}>
        <Stop offset="0" stopColor="#5ad3bc" stopOpacity={0.13} />
        <Stop offset="1" stopColor="#5ad3bc" stopOpacity={0} />
      </RadialGradient>
    </Defs>
    <Rect width={w} height={h} fill={`url(#${id}base)`} />
    <Rect width={w} height={h} fill={`url(#${id}lavender)`} />
    <Rect width={w} height={h} fill={`url(#${id}mint)`} />
    <Rect width={w} height={h} fill={`url(#${id}glow)`} />
  </Svg>;
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 100, backgroundColor: '#f8f7fc',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  brand: { alignItems: 'center' },
  logoWrap: { borderRadius: 999, overflow: 'hidden' },
  logo: { width: '100%', height: '100%' },
  nameWrap: { marginTop: 24 },
  name: { fontFamily: 'DMSans_600SemiBold', color: '#031b48', letterSpacing: -2.4,
    includeFontPadding: false, textAlign: 'center' },
  accent: { color: '#08c99a' },
  divider: { width: 52, height: 2, borderRadius: 999, overflow: 'hidden', marginTop: 22 },
  tagline: { marginTop: 13, color: '#77778b', letterSpacing: 2.5, fontSize: 10,
    lineHeight: 15, fontFamily: 'DMSans_600SemiBold', includeFontPadding: false },
  loader: { position: 'absolute', alignItems: 'center' },
  track: { width: '100%', height: 3, borderRadius: 999, overflow: 'hidden', backgroundColor: '#05204d1a' },
  progress: { height: 3, borderRadius: 999, overflow: 'hidden' },
  loadingText: { marginTop: 12, color: '#91909f', letterSpacing: 0.99, fontSize: 9,
    lineHeight: 13.5, fontFamily: 'DMSans_500Medium', includeFontPadding: false,
    textAlign: 'center', width: 220 },
});

