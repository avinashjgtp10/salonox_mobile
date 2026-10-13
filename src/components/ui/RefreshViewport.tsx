import { cloneElement, isValidElement, useRef, useState, type ReactElement } from "react";
import { Platform, RefreshControl, StyleSheet, View, type RefreshControlProps, type ScrollViewProps, type ViewStyle } from "react-native";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { useThemeColors } from "@/theme/ThemeProvider";

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
export function RefreshViewport({ children }: { children: ReactElement<RefreshableProps> }) {
  const colors = useThemeColors();
  const [pulling, setPulling] = useState(false);
  const offset = useRef(0);
  const touchStart = useRef<number | null>(null);
  const { props } = children;
  const control = props.refreshControl ?? (props.onRefresh ? <RefreshControl refreshing={Boolean(props.refreshing)} onRefresh={props.onRefresh} progressViewOffset={props.progressViewOffset} /> : undefined);
  const validControl = isValidElement<RefreshControlProps>(control);
  const refreshing = validControl && control.props.refreshing;
  const enabled = validControl && control.props.enabled !== false && props.scrollEnabled !== false;
  const { outer, inner } = splitStyle(props.style);
  const showLoader = refreshing || (enabled && pulling);

  if (!validControl) return children;

  return (
    <View style={[styles.viewport, outer]}>
      {cloneElement(children, {
        style: [styles.scroll, inner],
        refreshControl: cloneElement(control, {
          tintColor: "transparent",
          colors: ["transparent"],
          progressBackgroundColor: "transparent",
          // Move Android's native progress disc (including its shadow) offscreen.
          progressViewOffset: Platform.OS === "android" ? -10000 : control.props.progressViewOffset,
          title: "",
          onRefresh: () => {
            setPulling(false);
            if (enabled && !refreshing) void control.props.onRefresh?.();
          },
        }),
        scrollEventThrottle: props.scrollEventThrottle ?? 16,
        onScroll: (event) => {
          offset.current = event.nativeEvent.contentOffset.y + (event.nativeEvent.contentInset?.top ?? 0);
          props.onScroll?.(event);
        },
        onTouchStart: (event) => {
          touchStart.current = offset.current <= 0 ? event.nativeEvent.pageY : null;
          props.onTouchStart?.(event);
        },
        onTouchMove: (event) => {
          setPulling(enabled && touchStart.current !== null && offset.current <= 0 && event.nativeEvent.pageY - touchStart.current > 12);
          props.onTouchMove?.(event);
        },
        onTouchEnd: (event) => {
          touchStart.current = null;
          setPulling(false);
          props.onTouchEnd?.(event);
        },
        onTouchCancel: (event) => {
          touchStart.current = null;
          setPulling(false);
          props.onTouchCancel?.(event);
        },
      })}
      {showLoader ? (
        <View pointerEvents="none" style={[styles.indicator, { top: Math.max(0, control.props.progressViewOffset ?? 0) + 12 }]}>
          <View style={[styles.badge, { backgroundColor: colors.card }]}>
            <ActivityIndicator size={28} color={colors.primary} accessibilityLabel={refreshing ? "Refreshing" : "Pull to refresh"} />
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
