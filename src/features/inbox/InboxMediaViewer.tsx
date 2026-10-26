import { Text } from "@/components/ui/AppTypography";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Ionicons } from "@expo/vector-icons";
import { requireOptionalNativeModule } from "expo";
import { useEffect, useState, type ComponentType } from "react";
import { Image, Modal, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { inboxMediaHeaders, openInboxMedia } from "./inboxMedia";

type MediaSource = { uri: string; authenticated: boolean };
type InboxVideoProps = { headers?: Record<string, string>; onError: () => void; uri: string };

// Builds from before expo-video was added lack its native module; importing it
// there would crash the inbox, so the player loads only when it exists.
const InboxVideo: ComponentType<InboxVideoProps> | null = requireOptionalNativeModule("ExpoVideo")
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? (require("./InboxVideo") as typeof import("./InboxVideo")).InboxVideo
  : null;

/** Whether this build can play inbox videos in the app (otherwise they go to the share sheet). */
export const canPlayInboxVideoInApp = InboxVideo !== null;

const MAX_ZOOM = 5;
const DOUBLE_TAP_ZOOM = 2.5;

/** Full-screen, in-app viewer for a WhatsApp inbox image (pinch / double-tap zoom) or video. */
export function InboxMediaViewer({ mediaId, onClose, source, type, visible }: {
  mediaId: string;
  onClose: () => void;
  source: MediaSource;
  type: "image" | "video";
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();
  // undefined = still fetching the token for authed media; null = no header needed.
  const [headers, setHeaders] = useState<Record<string, string> | null | undefined>(source.authenticated ? undefined : null);
  const [failed, setFailed] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setFailed(false);
    if (!source.authenticated) {
      setHeaders(null);
      return;
    }
    let active = true;
    setHeaders(undefined);
    inboxMediaHeaders().then(value => { if (active) setHeaders(value ?? null); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [source.authenticated, source.uri, visible]);

  // Saving or sending elsewhere still goes through the system share sheet.
  const share = async () => {
    if (sharing) return;
    setSharing(true);
    try { await openInboxMedia(source, mediaId, type); }
    catch { /* The viewer stays open; the user can retry. */ }
    finally { setSharing(false); }
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} statusBarTranslucent visible={visible}>
      <GestureHandlerRootView style={styles.root}>
        {failed
          ? <View style={styles.center}><Ionicons name="alert-circle-outline" size={36} color="#FFFFFF" /><Text style={styles.message}>{`Couldn’t load this ${type}.`}</Text></View>
          : headers === undefined
            ? <View style={styles.center}><ActivityIndicator color="#FFFFFF" size="large" /></View>
            : type === "image"
              ? <ZoomableImage headers={headers ?? undefined} onError={() => setFailed(true)} uri={source.uri} />
              : InboxVideo ? <InboxVideo headers={headers ?? undefined} onError={() => setFailed(true)} uri={source.uri} /> : null}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity accessibilityLabel="Close" accessibilityRole="button" hitSlop={10} onPress={onClose} style={styles.iconButton}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity accessibilityLabel={`Share ${type}`} accessibilityRole="button" disabled={sharing} hitSlop={10} onPress={() => void share()} style={styles.iconButton}>
            {sharing ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="share-outline" size={24} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function ZoomableImage({ headers, onError, uri }: { headers?: Record<string, string>; onError: () => void; uri: string }) {
  const { width, height } = useWindowDimensions();
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  // Keep the zoomed image covering the screen instead of panning off into black.
  const clamp = (value: number, zoom: number, size: number) => {
    "worklet";
    const limit = (size * (zoom - 1)) / 2;
    return Math.min(limit, Math.max(-limit, value));
  };
  const reset = () => {
    "worklet";
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedX.value = 0;
    savedY.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.min(MAX_ZOOM, Math.max(1, savedScale.value * event.scale));
      translateX.value = clamp(savedX.value, scale.value, width);
      translateY.value = clamp(savedY.value, scale.value, height);
    })
    .onEnd(() => {
      if (scale.value <= 1.01) {
        reset();
        return;
      }
      savedScale.value = scale.value;
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });
  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((event) => {
      if (savedScale.value <= 1) return;
      translateX.value = clamp(savedX.value + event.translationX, scale.value, width);
      translateY.value = clamp(savedY.value + event.translationY, scale.value, height);
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (savedScale.value > 1) {
        reset();
        return;
      }
      scale.value = withTiming(DOUBLE_TAP_ZOOM);
      savedScale.value = DOUBLE_TAP_ZOOM;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
      <Animated.View style={[styles.fill, animatedStyle]}>
        <Image accessibilityLabel="Message image" onError={onError} resizeMode="contain" source={{ headers, uri }} style={styles.fill} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#000000", flex: 1 },
  fill: { flex: 1 },
  center: { alignItems: "center", flex: 1, gap: 12, justifyContent: "center", padding: 24 },
  message: { color: "#FFFFFF", fontSize: 15, textAlign: "center" },
  topBar: { flexDirection: "row", justifyContent: "space-between", left: 0, paddingHorizontal: 12, position: "absolute", right: 0, top: 0 },
  iconButton: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
});
