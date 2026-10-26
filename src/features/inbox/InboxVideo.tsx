import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { useEvent } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

// Loaded only through InboxMediaViewer's guarded require: builds made before
// expo-video was added don't have its native module.
export function InboxVideo({ headers, onError, uri }: { headers?: Record<string, string>; onError: () => void; uri: string }) {
  // Streams with the auth header, so playback starts without downloading the whole file first.
  const player = useVideoPlayer({ headers, uri }, (instance) => instance.play());
  const { status } = useEvent(player, "statusChange", { status: player.status });

  useEffect(() => {
    if (status === "error") onError();
  }, [onError, status]);

  return (
    <View style={styles.fill}>
      <VideoView allowsFullscreen contentFit="contain" nativeControls player={player} style={styles.fill} />
      {status === "loading" ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}><ActivityIndicator color="#FFFFFF" size="large" /></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
});
