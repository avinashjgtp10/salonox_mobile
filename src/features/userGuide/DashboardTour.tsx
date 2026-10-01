import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { BackHandler, FlatList, Keyboard, ScrollView, StyleSheet, TouchableOpacity, View, type FlatListProps, type ScrollViewProps, type TouchableOpacityProps, type ViewProps } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Portal } from "@/components/ui/Portal";
import { useAuth } from "@/context/AuthContext";
import { clipTourRect, dashboardTourSteps, type TourRect } from "./dashboardTourSteps";
import { screenTourStorage } from "./guideStorage";

export type ScreenTour = { title: string; steps: readonly { target: string; title: string; description: string }[] };
type TourList = Pick<FlatList<unknown>, "getNativeScrollRef" | "scrollToOffset">;

type TourContextValue = {
  active: boolean;
  /** False once this user has finished or skipped this tour; hide tour prompts then. */
  offerTour: boolean;
  start: () => void;
  register: (id: string, node: View | null) => void;
  scrollRef: RefObject<ScrollView | null>;
  scrollOffset: RefObject<number>;
  listRef: RefObject<TourList | null>;
};
const TourContext = createContext<TourContextValue | null>(null);

export const useDashboardTour = () => useContext(TourContext);

function useTargetRef(id: string) {
  const register = useDashboardTour()?.register;
  return useCallback((node: View | null) => { register?.(id, node); }, [id, register]);
}

// Attach to the native control itself so its layout and press behavior stay intact.
export function TourButton({ tourId, ...props }: TouchableOpacityProps & { tourId: string }) {
  const ref = useTargetRef(tourId);
  return <TouchableOpacity {...props} ref={ref} />;
}

export function TourView({ tourId, ...props }: ViewProps & { tourId: string }) {
  const ref = useTargetRef(tourId);
  return <View {...props} ref={ref} collapsable={false} />;
}

export function TourScrollView(props: ScrollViewProps) {
  const tour = useDashboardTour();
  return <ScrollView {...props} ref={tour?.scrollRef} removeClippedSubviews={false}
    scrollEnabled={tour?.active ? false : props.scrollEnabled} scrollEventThrottle={16}
    onScroll={(event) => { if (tour) tour.scrollOffset.current = event.nativeEvent.contentOffset.y; props.onScroll?.(event); }} />;
}

export function TourFlatList<T>(props: FlatListProps<T>) {
  const tour = useDashboardTour();
  const listRef = tour?.listRef;
  const ref = useCallback((node: FlatList<T> | null) => { if (listRef) listRef.current = node; }, [listRef]);
  return <FlatList {...props} ref={ref} removeClippedSubviews={false}
    scrollEnabled={tour?.active ? false : props.scrollEnabled} scrollEventThrottle={16}
    onScroll={(event) => { if (tour) tour.scrollOffset.current = event.nativeEvent.contentOffset.y; props.onScroll?.(event); }} />;
}

export function withScreenTour(Screen: () => ReactNode, config: ScreenTour) {
  return function GuidedScreen() {
    return <DashboardTourProvider config={config}><Screen /></DashboardTourProvider>;
  };
}

export function DashboardTourProvider({ children, config }: { children: ReactNode; config?: ScreenTour }) {
  const targets = useRef(new Map<string, View>());
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffset = useRef(0);
  const listRef = useRef<TourList>(null);
  const steps = config?.steps ?? dashboardTourSteps;
  const title = config?.title ?? "Dashboard";
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState<number | null>(null);
  const focused = useIsFocused();
  const { tour } = useLocalSearchParams<{ tour?: string }>();
  const router = useRouter();
  const register = useCallback((id: string, node: View | null) => {
    if (node) targets.current.set(id, node);
    else targets.current.delete(id);
  }, []);
  const start = useCallback(() => {
    Keyboard.dismiss();
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    scrollOffset.current = 0;
    setIndex(0);
  }, []);
  const close = useCallback(() => setIndex(null), []);

  // A screen offers its tour ("Show me around" bar, or the dashboard's
  // "Take a dashboard tour" link) until the user has finished or skipped it
  // once. `null` = still reading storage, so prompts stay hidden rather than
  // flashing in and out.
  const userId = useAuth().user?.id ?? "";
  const [offerTour, setOfferTour] = useState<boolean | null>(() =>
    userId && screenTourStorage.hasSeenThisSession(userId, title) ? false : null);

  useEffect(() => {
    let active = true;
    void screenTourStorage.hasSeen(userId, title).then((seen) => {
      if (active) setOfferTour(!seen);
    });
    return () => { active = false; };
  }, [title, userId]);

  // Skip, Done and the hardware back button end the tour for good; leaving
  // the screen mid-tour (the blur below) does not.
  const finish = useCallback(() => {
    setIndex(null);
    setOfferTour(false);
    void screenTourStorage.markSeen(userId, title);
  }, [title, userId]);

  useEffect(() => {
    if (!focused) close();
    else if (tour === "1") {
      start();
      router.setParams({ tour: undefined });
    }
  }, [close, focused, router, start, tour]);

  const value = useMemo(
    () => ({ active: index !== null, offerTour: offerTour === true, start, register, scrollRef, scrollOffset, listRef }),
    [index, offerTour, register, start],
  );
  return (
    <TourContext.Provider value={value}>
      {config ? <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }} accessibilityElementsHidden={index !== null} importantForAccessibility={index !== null ? "no-hide-descendants" : "auto"}>{children}</View>
        {/* This strip also supplies the bottom safe-area inset, so keep it when the button is hidden. */}
        <View style={{ backgroundColor: colors.surface, paddingBottom: insets.bottom }}>
          {offerTour ? <Button icon="compass-outline" onPress={start}>Show me around · {title}</Button> : null}
        </View>
      </View> : children}
      {focused && index !== null && (
        <Portal>
          <TourOverlay key={index} index={index} steps={steps} title={title} listRef={listRef} targets={targets.current} scrollRef={scrollRef} scrollOffset={scrollOffset}
            onClose={finish} onBack={() => setIndex(index - 1)}
            onNext={() => index === steps.length - 1 ? finish() : setIndex(index + 1)} />
        </Portal>
      )}
    </TourContext.Provider>
  );
}

function TourOverlay({ index, steps, title, targets, listRef, scrollRef, scrollOffset, onClose, onBack, onNext }: {
  index: number;
  steps: ScreenTour["steps"];
  title: string;
  listRef: RefObject<TourList | null>;
  targets: Map<string, View>;
  scrollRef: RefObject<ScrollView | null>;
  scrollOffset: RefObject<number>;
  onClose: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const root = useRef<View>(null);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const [rect, setRect] = useState<TourRect | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [cardHeight, setCardHeight] = useState(210);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const step = steps[index];

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => { onClose(); return true; });
    return () => subscription.remove();
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    let measuring = false;
    let scrollAttempts = 0;
    let timedOut = false;
    const measure = () => {
      if (measuring || !bounds.width) return;
      const target = targets.get(step.target);
      const nativeScroll = scrollRef.current?.getNativeScrollRef() ?? listRef.current?.getNativeScrollRef();
      if (!target || !root.current) {
        setRect(null);
        setUnavailable(timedOut);
        return;
      }
      measuring = true;
      root.current.measureInWindow((rootX, rootY) => {
        const measureTarget = (_sx: number, sy: number, _sw: number, sh: number) => {
          target.measureInWindow((x, y, width, height) => {
            measuring = false;
            if (cancelled || width <= 0 || height <= 0) return;
            // Native measurements also work for deeply nested cards. Scroll before
            // drawing the spotlight, then measure again after the scroll settles.
            if (nativeScroll && scrollAttempts < 3 && (y < sy + 12 || y + height > sy + sh - 12)) {
              scrollAttempts += 1;
              const offset = Math.max(0, scrollOffset.current + y - sy - 24);
              if (scrollRef.current) scrollRef.current.scrollTo({ y: offset, animated: false });
              else listRef.current?.scrollToOffset({ offset, animated: false });
              setRect(null);
              return;
            }
            const next = clipTourRect({ x: x - rootX, y: y - rootY, width, height }, bounds.width, bounds.height);
            setRect((old) => JSON.stringify(old) === JSON.stringify(next) ? old : next);
            if (next) setUnavailable(false);
          });
        };
        if (nativeScroll && "measureInWindow" in nativeScroll) nativeScroll.measureInWindow(measureTarget);
        else measureTarget(rootX, rootY, bounds.width, bounds.height);
      });
    };
    measure();
    const timer = setInterval(measure, 200);
    const timeout = setTimeout(() => {
      timedOut = true;
      if (!cancelled) setUnavailable(true);
    }, 5000);
    return () => { cancelled = true; clearInterval(timer); clearTimeout(timeout); };
  }, [bounds.height, bounds.width, listRef, scrollOffset, scrollRef, step.target, targets]);

  const topLimit = insets.top + 12;
  const bottomLimit = bounds.height - insets.bottom - 12;
  const below = rect ? rect.y + rect.height + 16 : topLimit;
  const placeBelow = !rect || below + cardHeight <= bottomLimit || rect.y - cardHeight - 16 < topLimit;
  const cardTop = rect
    ? Math.max(topLimit, Math.min(placeBelow ? below : rect.y - cardHeight - 16, bottomLimit - cardHeight))
    : Math.max(topLimit, (bounds.height - cardHeight) / 2);
  const cardWidth = Math.min(360, Math.max(0, bounds.width - 32));
  const cardLeft = Math.max(16, Math.min(rect ? rect.x + rect.width / 2 - cardWidth / 2 : 16, bounds.width - cardWidth - 16));
  const arrowLeft = rect ? Math.max(18, Math.min(rect.x + rect.width / 2 - cardLeft - 8, cardWidth - 34)) : 18;

  return (
    <View ref={root} collapsable={false} style={StyleSheet.absoluteFill} accessibilityViewIsModal onStartShouldSetResponder={() => true}
      onLayout={(event) => setBounds({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}>
      {rect ? <>
        <View style={[styles.shade, { left: 0, top: 0, width: bounds.width, height: rect.y }]} />
        <View style={[styles.shade, { left: 0, top: rect.y, width: rect.x, height: rect.height }]} />
        <View style={[styles.shade, { left: rect.x + rect.width, top: rect.y, right: 0, height: rect.height }]} />
        <View style={[styles.shade, { left: 0, top: rect.y + rect.height, right: 0, bottom: 0 }]} />
        <View style={[styles.highlight, { left: rect.x, top: rect.y, width: rect.width, height: rect.height, borderColor: colors.primary }]} />
      </> : <View style={[StyleSheet.absoluteFill, styles.shade]} />}
      <View style={[styles.card, { top: cardTop, left: cardLeft, width: cardWidth, maxHeight: Math.max(100, bottomLimit - topLimit), backgroundColor: colors.surface }]}
        onLayout={(event) => setCardHeight(event.nativeEvent.layout.height)}>
        {rect && <View style={[styles.arrow, { left: arrowLeft, backgroundColor: colors.surface }, placeBelow ? { top: -8 } : { bottom: -8 }]} />}
        <ScrollView bounces={false} contentContainerStyle={styles.copy}>
          <Text variant="labelSmall" style={{ color: colors.primary }}>{title.toUpperCase()} TOUR · {index + 1} / {steps.length}</Text>
          <Text accessibilityRole="header" accessibilityLiveRegion="polite" variant="titleMedium" style={styles.title}>{rect ? step.title : unavailable ? "This feature isn't available right now" : "Finding your next feature…"}</Text>
          <Text variant="bodyMedium">{rect ? step.description : unavailable ? "You can skip this step or replay the tour when this feature is available." : "Moving to the feature on this screen."}</Text>
        </ScrollView>
        <View style={styles.actions}>
          <Button onPress={onClose} accessibilityLabel={`Skip ${title.toLowerCase()} tour`}>Skip</Button>
          <Button disabled={index === 0} onPress={onBack}>Back</Button>
          <Button mode="contained" disabled={!rect && !unavailable} onPress={onNext}>{index === steps.length - 1 ? "Done" : "Next"}</Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shade: { position: "absolute", backgroundColor: "rgba(0,0,0,0.65)" },
  highlight: { position: "absolute", borderWidth: 3, borderRadius: 12 },
  card: { position: "absolute", borderRadius: 20, paddingBottom: 12, elevation: 12, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  arrow: { position: "absolute", width: 16, height: 16, transform: [{ rotate: "45deg" }] },
  copy: { padding: 18, gap: 8 },
  title: { fontWeight: "700" },
  actions: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", paddingHorizontal: 8 },
});
