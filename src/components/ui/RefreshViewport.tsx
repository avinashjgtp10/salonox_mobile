import { cloneElement, isValidElement, useEffect, useRef, useState, type ReactElement } from "react";
import { PanResponder, Platform, RefreshControl, StyleSheet, View, type RefreshControlProps, type ScrollViewProps, type ViewStyle } from "react-native";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { useThemeColors } from "@/theme/ThemeProvider";
import { useScrollFooter } from "@/hooks/useScrollFooter";

// Keep the scrolling child's content styles inside; move its parent-facing
// layout onto the viewport so margins and fixed heights are applied only once.
const layoutKeys = new Set([
  "flex", "flexGrow", "flexShrink", "flexBasis", "alignSelf",
  "height", "minHeight", "maxHeight", "width", "minWidth", "maxWidth",
  "position", "top", "bottom", "left", "right", "start", "end",
  "transform", "transformOrigin", "zIndex", "display",
]);

function splitStyle(style: ScrollViewProps["style"]) {
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(StyleSheet.flatten(style) ?? {})) {
    (layoutKeys.has(key) || key.startsWith("margin") ? outer : inner)[key] = value;
  }
  return { outer: outer as ViewStyle, inner: inner as ViewStyle };
}

type RefreshableProps = ScrollViewProps & { refreshing?: boolean; onRefresh?: () => void; progressViewOffset?: number };

/** Retains native pull detection but draws our Paper loader above the viewport.
 * It never inserts a row into the list (preserving sticky indices and offsets).
 */
export function RefreshViewport({ children, stationaryOnIOS = false }: { children: ReactElement<RefreshableProps>; stationaryOnIOS?: boolean }) {
  const onFooterScroll = useScrollFooter();
  const colors = useThemeColors();
  const [pulling, setPulling] = useState(false);
  const offset = useRef(0);
  const touchStart = useRef<number | null>(null);
  const touchStartX = useRef(0);
  const pullDistance = useRef(0);
  const userRefreshRequested = useRef(false);
  const { props } = children;
  const control = props.refreshControl ?? (props.onRefresh ? <RefreshControl refreshing={Boolean(props.refreshing)} onRefresh={props.onRefresh} progressViewOffset={props.progressViewOffset} /> : undefined);
  const validControl = isValidElement<RefreshControlProps>(control);
  const refreshing = validControl && control.props.refreshing;
  const enabled = validControl && control.props.enabled !== false && props.scrollEnabled !== false;
  // iOS's native refresh control changes contentInset and moves the entire list.
  // For the inbox, detect the pull without native bounce and keep the loader over it.
  const stationary = stationaryOnIOS && Platform.OS === "ios";
  const { outer, inner } = splitStyle(props.style);
  // Focus, socket and polling refreshes retain visible content without a
  // spinner. Only an intentional pull displays the refresh indicator.
  const showLoader = (refreshing && userRefreshRequested.current) || (enabled && pulling);
  const requestRefresh = () => {
    setPulling(false);
    if (validControl && enabled && !refreshing && !userRefreshRequested.current) {
      userRefreshRequested.current = true;
      void control.props.onRefresh?.();
    }
  };
  const gestureState = useRef({ enabled, refreshing, requestRefresh });
  gestureState.current = { enabled, refreshing, requestRefresh };
  const startedAtTop = useRef(false);
  const pullResponder = useRef<ReturnType<typeof PanResponder.create> | null>(null);
  if (!pullResponder.current) pullResponder.current = PanResponder.create({
    onStartShouldSetPanResponderCapture: () => { startedAtTop.current = offset.current <= 0; return false; },
    onMoveShouldSetPanResponderCapture: (_event, gesture) => startedAtTop.current && offset.current <= 0 && gestureState.current.enabled && !gestureState.current.refreshing && gesture.dy > 10 && gesture.dy > Math.abs(gesture.dx),
    onPanResponderMove: (_event, gesture) => setPulling(gesture.dy > 40),
    onPanResponderRelease: (_event, gesture) => { if (gesture.dy >= 64) gestureState.current.requestRefresh(); else setPulling(false); },
    onPanResponderTerminate: () => setPulling(false),
    onPanResponderTerminationRequest: () => false,
  });
  useEffect(() => {
    if (!refreshing) userRefreshRequested.current = false;
  }, [refreshing]);

  if (!validControl) return cloneElement(children, {
    scrollEventThrottle: props.scrollEventThrottle ?? 16,
    onScrollBeginDrag: event => { if (!props.horizontal) onFooterScroll.onScrollBeginDrag(event); props.onScrollBeginDrag?.(event); },
    onScrollEndDrag: event => { onFooterScroll.onScrollEndDrag(); props.onScrollEndDrag?.(event); },
    onScroll: event => { if (!props.horizontal) onFooterScroll.onScroll(event); props.onScroll?.(event); },
  });

  return (
    <View {...(stationary ? pullResponder.current.panHandlers : {})} style={[styles.viewport, outer]}>
      {cloneElement(children, {
        style: [styles.scroll, inner],
        ...(stationary ? {
          // FlatList otherwise recreates RefreshControl from onRefresh/refreshing.
          onRefresh: undefined,
          refreshing: false,
          bounces: false,
          alwaysBounceVertical: false,
          contentInsetAdjustmentBehavior: "never" as const,
          automaticallyAdjustContentInsets: false,
        } : {}),
        refreshControl: stationary ? undefined : cloneElement(control, {
          tintColor: "transparent",
          colors: ["transparent"],
          progressBackgroundColor: "transparent",
          // Move Android's native progress disc (including its shadow) offscreen.
          progressViewOffset: Platform.OS === "android" ? -10000 : control.props.progressViewOffset,
          title: "",
          onRefresh: requestRefresh,
        }),
        scrollEventThrottle: props.scrollEventThrottle ?? 16,
    onScrollBeginDrag: event => { if (!props.horizontal) onFooterScroll.onScrollBeginDrag(event); props.onScrollBeginDrag?.(event); },
    onScrollEndDrag: event => { onFooterScroll.onScrollEndDrag(); props.onScrollEndDrag?.(event); },
        onScroll: (event) => {
          if (!props.horizontal) onFooterScroll.onScroll(event);
          offset.current = event.nativeEvent.contentOffset.y + (event.nativeEvent.contentInset?.top ?? 0);
          props.onScroll?.(event);
        },
        onTouchStart: (event) => {
          touchStart.current = offset.current <= 0 ? event.nativeEvent.pageY : null;
          touchStartX.current = event.nativeEvent.pageX;
          pullDistance.current = 0;
          props.onTouchStart?.(event);
        },
        onTouchMove: (event) => {
          if (stationary) { props.onTouchMove?.(event); return; }
          const dy = touchStart.current !== null ? event.nativeEvent.pageY - touchStart.current : 0;
          const dx = Math.abs(event.nativeEvent.pageX - touchStartX.current);
          pullDistance.current = enabled && touchStart.current !== null && offset.current <= 0 && (!stationary || dy > dx) ? Math.max(0, dy) : 0;
          setPulling(pullDistance.current > 40);
          props.onTouchMove?.(event);
        },
        onTouchEnd: (event) => {
          touchStart.current = null;
          pullDistance.current = 0;
          setPulling(false);
          props.onTouchEnd?.(event);
        },
        onTouchCancel: (event) => {
          touchStart.current = null;
          pullDistance.current = 0;
          setPulling(false);
          props.onTouchCancel?.(event);
        },
      })}
      {showLoader ? (
        <View pointerEvents="none" style={[styles.indicator, { top: Math.max(0, control.props.progressViewOffset ?? 0) + 12 }]}>
          <View style={[styles.badge, { backgroundColor: colors.card }]}>
            <ActivityIndicator size={28} color={colors.primaryText} accessibilityLabel={refreshing ? "Refreshing" : "Pull to refresh"} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: { flexGrow: 1, flexShrink: 1, minHeight: 0 },
  scroll: { flexGrow: 1, flexShrink: 1 },
  indicator: { position: "absolute", left: 0, right: 0, alignItems: "center", zIndex: 10 },
  badge: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
