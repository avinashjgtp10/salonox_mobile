import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const LOGO = require('../../assets/images/logo.png');
const LOGO_SOURCE = Image.resolveAssetSource(LOGO);

const BRAND = '#8b3a82';
const ACCENT = '#00c49e';
const BACKDROP = '#f8f5fb';
const GRADIENT = [BRAND, ACCENT] as const;

// Milliseconds from the first painted frame. The intro is one declarative
// timeline rather than a chain of state timers, so nothing has to be polled
// and every step is cancellable from a single place.
export const SPLASH_TIMELINE = {
  /** Arcs, dashed orbit, blobs, pulse rings and the orbiting dot fade in. */
  backdrop: 200,
  /** Logo springs up into position. */
  logo: 700,
  /** Tagline, status line and progress bar rise into place. */
  wording: 1400,
  /** Earliest point the closing transition is allowed to run. */
  handoff: 2800,
} as const;

const EXIT_MS = 700;
const ENTER = Easing.bezier(0.22, 1, 0.36, 1);
const BOUNCE = Easing.bezier(0.34, 1.56, 0.64, 1);
const ACCELERATE = Easing.bezier(0.4, 0, 1, 1);
const BAR = Easing.bezier(0.4, 0, 0.2, 1);

const RING_SIZES = [220, 174, 136] as const;
const BAR_WIDTH = 120;

type Props = {
  /** True once auth, theme and the initial route have all resolved. */
  isReady: boolean;
  /** Hides the native splash — called once the first frame can be shown. */
  onPrepared: () => Promise<void>;
  /** Tears the overlay down after the closing transition has played. */
  onComplete: () => void;
};

export default function AnimatedSplash({ isReady, onPrepared, onComplete }: Props) {
  const { width, height } = useWindowDimensions();
  const [laidOut, setLaidOut] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [started, setStarted] = useState(false);
  const [handoffReached, setHandoffReached] = useState(false);

  const backdrop = useSharedValue(0);
  const rings = useSharedValue(0);
  const logo = useSharedValue(0);
  const wording = useSharedValue(0);
  const bar = useSharedValue(0);
  const spin = useSharedValue(0);
  const orbit = useSharedValue(0);
  const blink = useSharedValue(0);
  const exit = useSharedValue(0);

  // Everything is sized off the viewport so the composition holds together
  // from a small Android phone up to a tablet.
  const metrics = useMemo(() => {
    const logoWidth = Math.min(200, width * 0.54);
    const scale = logoWidth / 200;
    const arc = Math.max(width * 1.08, 360);

    return {
      arc,
      arcOffset: -Math.round(arc / 3),
      dashed: arc * 0.76,
      dashedOffset: -Math.round((arc * 0.76) / 3.2),
      logoHeight: (logoWidth * LOGO_SOURCE.height) / LOGO_SOURCE.width,
      logoWidth,
      orbit: 180 * scale,
      ringScale: scale,
      short: height < 640,
    };
  }, [height, width]);

  // The native splash stays up until our first frame is painted, so the
  // handover never flashes a blank screen.
  useEffect(() => {
    if (!laidOut || !logoLoaded || started) {
      return;
    }

    let active = true;
    void onPrepared().then(() => {
      if (active) {
        setStarted(true);
      }
    });

    return () => {
      active = false;
    };
  }, [laidOut, logoLoaded, onPrepared, started]);

  useEffect(() => {
    if (!started) {
      return;
    }

    backdrop.value = withDelay(
      SPLASH_TIMELINE.backdrop,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }),
    );
    rings.value = withDelay(SPLASH_TIMELINE.backdrop, withTiming(1, { duration: 700, easing: ENTER }));
    logo.value = withDelay(SPLASH_TIMELINE.logo, withTiming(1, { duration: 650, easing: BOUNCE }));
    wording.value = withDelay(SPLASH_TIMELINE.wording, withTiming(1, { duration: 700, easing: ENTER }));
    bar.value = withDelay(SPLASH_TIMELINE.wording + 600, withTiming(1, { duration: 1600, easing: BAR }));
    spin.value = withRepeat(withTiming(1, { duration: 18000, easing: Easing.linear }), -1, false);
    orbit.value = withRepeat(withTiming(1, { duration: 5000, easing: Easing.linear }), -1, false);
    blink.value = withDelay(
      SPLASH_TIMELINE.wording,
      withRepeat(withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }), -1, true),
    );

    // The only timer in the screen: it marks the point the intro has fully
    // played, after which the exit waits on app readiness alone.
    const timer = setTimeout(() => setHandoffReached(true), SPLASH_TIMELINE.handoff);

    return () => {
      clearTimeout(timer);
      cancelAnimation(backdrop);
      cancelAnimation(rings);
      cancelAnimation(logo);
      cancelAnimation(wording);
      cancelAnimation(bar);
      cancelAnimation(spin);
      cancelAnimation(orbit);
      cancelAnimation(blink);
    };
  }, [backdrop, bar, blink, logo, orbit, rings, spin, started, wording]);

  // Both conditions matter: the intro must have played out, and the app must
  // actually have somewhere to go. Neither alone drives the handover.
  useEffect(() => {
    if (!started || !handoffReached || !isReady) {
      return;
    }

    exit.value = withTiming(1, { duration: EXIT_MS, easing: ACCELERATE }, (finished) => {
      'worklet';
      if (finished) {
        scheduleOnRN(onComplete);
      }
    });

    return () => cancelAnimation(exit);
  }, [exit, handoffReached, isReady, onComplete, started]);

  const screenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(exit.value, [0.2, 0.95], [1, 0], Extrapolation.CLAMP),
    transform: [{ scale: 1 + exit.value * 3 }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  const dashedStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(logo.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(logo.value, [0, 1], [0.6, 1]) },
      { translateY: interpolate(logo.value, [0, 1], [24, 0]) },
    ],
  }));

  const orbitStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
    transform: [{ rotate: `${orbit.value * 360}deg` }],
  }));

  const wordingStyle = useAnimatedStyle(() => ({
    opacity: wording.value,
    transform: [{ translateY: interpolate(wording.value, [0, 1], [18, 0]) }],
  }));

  const blinkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(blink.value, [0, 1], [1, 0.35]),
    transform: [{ scale: interpolate(blink.value, [0, 1], [1, 0.65]) }],
  }));

  const barTrackStyle = useAnimatedStyle(() => ({ opacity: wording.value }));

  // scaleX alone would grow from the centre, so the fill is nudged back by
  // half of what it is missing to keep it pinned to the left edge.
  const barFillStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -(BAR_WIDTH * (1 - bar.value)) / 2 },
      { scaleX: Math.max(bar.value, 0.0001) },
    ],
  }));

  return (
    <View style={styles.root} onLayout={() => setLaidOut(true)}>
      <Animated.View style={[styles.screen, screenStyle]}>
        <View style={[styles.content, metrics.short && styles.contentTight]}>
          <View style={styles.glow} pointerEvents="none" />

          <Animated.View
            pointerEvents="none"
            style={[
              styles.arc,
              backdropStyle,
              { top: metrics.arcOffset, width: metrics.arc, height: metrics.arc, borderRadius: metrics.arc / 2, marginLeft: -metrics.arc / 2 },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.arc,
              styles.dashed,
              dashedStyle,
              { top: metrics.dashedOffset, width: metrics.dashed, height: metrics.dashed, borderRadius: metrics.dashed / 2, marginLeft: -metrics.dashed / 2 },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.arc,
              backdropStyle,
              { bottom: metrics.arcOffset, width: metrics.arc, height: metrics.arc, borderRadius: metrics.arc / 2, marginLeft: -metrics.arc / 2 },
            ]}
          />

          {BLOBS.map((blob, index) => (
            <FloatingBlob key={index} active={started} blob={blob} delay={index * 100} enter={backdrop} />
          ))}

          <View style={styles.logoArea}>
            {RING_SIZES.map((size, index) => (
              <PulseRing
                key={size}
                active={started}
                delay={1100 + index * 350}
                duration={2400 + index * 500}
                enter={rings}
                size={size * metrics.ringScale}
                strong={index === RING_SIZES.length - 1}
              />
            ))}

            <Animated.Image
              accessibilityLabel="SalonOX"
              onError={() => setLogoLoaded(true)}
              onLoad={() => setLogoLoaded(true)}
              resizeMode="contain"
              source={LOGO}
              style={[styles.logo, logoStyle, { width: metrics.logoWidth, height: metrics.logoHeight }]}
            />

            <Animated.View
              pointerEvents="none"
              style={[styles.orbit, orbitStyle, { width: metrics.orbit, height: metrics.orbit }]}
            >
              <LinearGradient colors={GRADIENT} style={styles.orbitDot} />
            </Animated.View>
          </View>

          <Animated.View style={[styles.wording, wordingStyle]}>
            <View style={styles.taglineRow}>
              <View style={styles.rule} />
              <Text allowFontScaling={false} style={styles.tagline}>
                Smart Salon Management
              </Text>
              <View style={styles.rule} />
            </View>
            <View style={styles.statusRow}>
              <Animated.View style={[styles.statusDot, blinkStyle]} />
              <Text allowFontScaling={false} style={styles.status}>
                {'Opening your workspace…'}
              </Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.barTrack, barTrackStyle]}>
            <Animated.View style={barFillStyle}>
              <LinearGradient colors={GRADIENT} end={END} start={START} style={styles.barFill} />
            </Animated.View>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const START = { x: 0, y: 0 };
const END = { x: 1, y: 0 };

const BLOBS: { duration: number; drift: number; style: ViewStyle }[] = [
  { duration: 6000, drift: 0, style: { top: '8%', left: '6%', width: 56, height: 56, backgroundColor: 'rgba(139,58,130,0.06)' } },
  { duration: 7000, drift: 5, style: { top: '14%', right: '8%', width: 36, height: 36, backgroundColor: 'rgba(0,196,158,0.09)' } },
  { duration: 5000, drift: 0, style: { bottom: '18%', left: '8%', width: 30, height: 30, backgroundColor: 'rgba(0,196,158,0.07)' } },
  { duration: 8000, drift: 5, style: { bottom: '12%', right: '6%', width: 48, height: 48, backgroundColor: 'rgba(139,58,130,0.05)' } },
];

function FloatingBlob({
  active,
  blob,
  delay,
  enter,
}: {
  active: boolean;
  blob: (typeof BLOBS)[number];
  delay: number;
  enter: SharedValue<number>;
}) {
  const float = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      return;
    }

    float.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: blob.duration / 2, easing: Easing.inOut(Easing.ease) }), -1, true),
    );

    return () => cancelAnimation(float);
  }, [active, blob.duration, delay, float]);

  const style = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { translateY: interpolate(float.value, [0, 1], [0, blob.drift ? -8 : -12]) },
      { translateX: interpolate(float.value, [0, 1], [0, blob.drift]) },
    ],
  }));

  return <Animated.View pointerEvents="none" style={[styles.blob, blob.style, style]} />;
}

function PulseRing({
  active,
  delay,
  duration,
  enter,
  size,
  strong,
}: {
  active: boolean;
  delay: number;
  duration: number;
  enter: SharedValue<number>;
  size: number;
  strong: boolean;
}) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      return;
    }

    pulse.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.out(Easing.ease) }), -1, false),
    );

    return () => cancelAnimation(pulse);
  }, [active, delay, duration, pulse]);

  const style = useAnimatedStyle(() => ({
    opacity: enter.value * interpolate(pulse.value, [0, 1], [0.7, 0]),
    transform: [
      { scale: interpolate(enter.value, [0, 1], [0.3, 1]) * interpolate(pulse.value, [0, 1], [1, 1.4]) },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        style,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strong ? 2 : 1,
          borderColor: strong ? 'rgba(139,58,130,0.22)' : 'rgba(139,58,130,0.1)',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden', backgroundColor: BACKDROP },
  screen: { flex: 1, backgroundColor: BACKDROP, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', gap: 36 },
  contentTight: { gap: 24 },
  glow: { position: 'absolute', width: 280, height: 360, borderRadius: 180, backgroundColor: 'rgba(139,58,130,0.025)' },
  arc: { position: 'absolute', left: '50%', borderWidth: 1, borderColor: 'rgba(139,58,130,0.09)' },
  dashed: { borderStyle: 'dashed', borderColor: 'rgba(139,58,130,0.11)' },
  blob: { position: 'absolute', borderRadius: 100 },
  logoArea: { alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  ring: { position: 'absolute' },
  logo: { zIndex: 1 },
  orbit: { position: 'absolute' },
  orbitDot: { position: 'absolute', top: -4, left: '50%', marginLeft: -4.5, width: 9, height: 9, borderRadius: 4.5 },
  wording: { width: '100%', paddingHorizontal: 12, alignItems: 'center', gap: 14, zIndex: 2 },
  taglineRow: { maxWidth: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  rule: { width: 28, height: 1, backgroundColor: 'rgba(139,58,130,0.3)', borderRadius: 1 },
  tagline: { flexShrink: 1, fontSize: 11, fontWeight: '600', lineHeight: 16, letterSpacing: 2.64, textAlign: 'center', textTransform: 'uppercase', color: BRAND },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT },
  // Sized by its own text, never clipped, so the full sentence always shows.
  status: { fontSize: 11, fontWeight: '500', lineHeight: 20, letterSpacing: 0.44, textAlign: 'center', color: '#b0a0bc' },
  barTrack: { width: BAR_WIDTH, height: 3, borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(139,58,130,0.1)', zIndex: 2 },
  barFill: { width: BAR_WIDTH, height: 3, borderRadius: 8 },
});
