/**
 * BottomSheet and SideDrawer — pearl glass panels that slide over the current screen
 * (prototype). Modal + Animated; swipe down / left, tap outside or Android back closes.
 */
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, PanResponder, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { pearl, pearlType } from "@/components/auth/pearl/tokens";
import { Text } from "@/components/ui/AppTypography";
import { IconButton } from "./ui";

// Prototype: transform .32s cubic-bezier(.2,.8,.2,1) both ways; backdrop opacity .25s.
const PANEL_MS = 320;
const DIM_MS = 250;
const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

type SheetProps = {
  visible: boolean; onClose: () => void; title?: string; subtitle?: string;
  headerRight?: ReactNode; children: ReactNode; tall?: boolean;
};

/** Keeps the panel mounted while its closing animation runs. */
function useMounted(visible: boolean, show: () => void, hide: (done: () => void) => void) {
  const [mounted, setMounted] = useState(visible);
  useEffect(() => {
    if (visible) { setMounted(true); requestAnimationFrame(show); }
    else if (mounted) hide(() => setMounted(false));
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps -- show/hide are stable for a mount
  return mounted;
}

export function BottomSheet({ visible, onClose, title, subtitle, headerRight, children, tall }: SheetProps) {
  const insets = useSafeAreaInsets();
  const { height: H } = useWindowDimensions();
  const y = useRef(new Animated.Value(H)).current;
  const dim = useRef(new Animated.Value(0)).current;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const show = () => Animated.parallel([
    Animated.timing(y, { toValue: 0, duration: PANEL_MS, easing: EASE, useNativeDriver: true }),
    Animated.timing(dim, { toValue: 1, duration: DIM_MS, useNativeDriver: true }),
  ]).start();
  const hide = (done: () => void) => Animated.parallel([
    Animated.timing(y, { toValue: H, duration: PANEL_MS, easing: EASE, useNativeDriver: true }),
    Animated.timing(dim, { toValue: 0, duration: DIM_MS, useNativeDriver: true }),
  ]).start(done);
  const mounted = useMounted(visible, show, hide);

  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_, g) => { if (g.dy > 0) y.setValue(g.dy); },
    onPanResponderRelease: (_, g) => (g.dy > 90 || g.vy > 1
      ? closeRef.current()
      : Animated.timing(y, { toValue: 0, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()),
  })).current;

  if (!mounted) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, styles.dim, { opacity: dim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View accessibilityViewIsModal style={[styles.sheet, tall ? { top: insets.top + 76 } : { maxHeight: H * 0.88 }, { paddingBottom: insets.bottom + 30, transform: [{ translateY: y }] }]}>
        <View {...pan.panHandlers} style={styles.grab}><View style={styles.handle} /></View>
        {title ? (
          <View style={styles.head} {...pan.panHandlers}>
            <View style={{ flex: 1 }}>
              <Text style={[pearlType.h3, { fontSize: 18 }]} accessibilityRole="header">{title}</Text>
              {subtitle ? <Text style={pearlType.small}>{subtitle}</Text> : null}
            </View>
            {headerRight}
            <IconButton icon="x" label="Close" size={36} onPress={onClose} />
          </View>
        ) : null}
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

export function SideDrawer({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const W = Math.min(318, width * 0.84);
  const x = useRef(new Animated.Value(-W * 1.05)).current;
  const dim = useRef(new Animated.Value(0)).current;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const show = () => Animated.parallel([
    Animated.timing(x, { toValue: 0, duration: PANEL_MS, easing: EASE, useNativeDriver: true }),
    Animated.timing(dim, { toValue: 1, duration: DIM_MS, useNativeDriver: true }),
  ]).start();
  const hide = (done: () => void) => Animated.parallel([
    Animated.timing(x, { toValue: -W * 1.05, duration: PANEL_MS, easing: EASE, useNativeDriver: true }),
    Animated.timing(dim, { toValue: 0, duration: DIM_MS, useNativeDriver: true }),
  ]).start(done);
  const mounted = useMounted(visible, show, hide);
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dx < -8 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderMove: (_, g) => { if (g.dx < 0) x.setValue(g.dx); },
    onPanResponderRelease: (_, g) => (g.dx < -70
      ? closeRef.current()
      : Animated.timing(x, { toValue: 0, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()),
  })).current;
  if (!mounted) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, styles.dim, { opacity: dim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" />
      </Animated.View>
      <Animated.View {...pan.panHandlers} accessibilityViewIsModal
        style={[styles.drawer, { width: W, paddingTop: Math.max(insets.top + 10, 54), paddingBottom: insets.bottom + 30, transform: [{ translateX: x }] }]}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }} showsVerticalScrollIndicator={false}>{children}</ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { backgroundColor: "rgba(59,57,80,0.22)" },
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0, borderTopLeftRadius: 30, borderTopRightRadius: 30,
    backgroundColor: "#FAF9FC", borderTopWidth: 1, borderColor: pearl.white,
    shadowColor: "#46446E", shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: -14 }, elevation: 16,
  },
  grab: { alignItems: "center", paddingTop: 10, paddingBottom: 6 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: "rgba(138,136,156,0.35)" },
  head: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, paddingBottom: 12 },
  body: { gap: 14, paddingHorizontal: 18, paddingBottom: 8 },
  drawer: {
    position: "absolute", top: 0, bottom: 0, left: 0, borderTopRightRadius: 30, borderBottomRightRadius: 30,
    backgroundColor: "#FAF9FC", borderRightWidth: 1, borderColor: pearl.white, elevation: 16,
    shadowColor: "#3C3A5F", shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 8, height: 0 },
  },
});
