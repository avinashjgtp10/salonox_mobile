import { Text } from "@/components/ui/AppTypography";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState, type ComponentProps } from "react";
import { Image, TouchableOpacity, View } from "react-native";
import { API_BASE_URL } from "@/services/api";
import type { InboxMessage } from "@/types/inbox";
import { mediaSource } from "@/utils/inboxPresentation";
import { canPlayInboxVideoInApp, InboxMediaViewer } from "./InboxMediaViewer";
import { inboxMediaHeaders, openInboxMedia } from "./inboxMedia";
import { useInboxTheme } from "./inboxTheme";

export function MessageBubble({ message }: { message: InboxMessage }) {
  const { styles: s, palette: p } = useInboxTheme();
  const [failedImage, setFailedImage] = useState(false);
  const [openError, setOpenError] = useState(false);
  const [opening, setOpening] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const outgoing = message.direction === "OUTBOUND";
  const source = mediaSource(message.mediaUrl, API_BASE_URL);
  const type = message.mediaType || "attachment";
  const isImage = !!source && type === "image" && !failedImage;
  // Images and videos open in the in-app viewer; audio and documents use the system share sheet.
  const viewable = !!source && (type === "image" || (type === "video" && canPlayInboxVideoInApp));
  // undefined = still fetching the token for an authed image; null = no header needed.
  const [imageHeaders, setImageHeaders] = useState<Record<string, string> | null | undefined>(isImage && source.authenticated ? undefined : null);
  const status = message.status.toUpperCase();
  const statusIcon: ComponentProps<typeof Ionicons>["name"] = status === "FAILED" ? "alert-circle-outline" : status === "SENT" ? "checkmark" : status === "READ" || status === "DELIVERED" ? "checkmark-done" : "time-outline";

  useEffect(() => {
    if (!isImage || !source.authenticated) return;
    let active = true;
    inboxMediaHeaders().then(headers => { if (active) setImageHeaders(headers ?? null); }).catch(() => { if (active) setFailedImage(true); });
    return () => { active = false; };
  }, [isImage, source?.authenticated]);

  const open = async () => {
    if (!source || opening) return;
    if (viewable) {
      setViewerOpen(true);
      return;
    }
    setOpenError(false);
    setOpening(true);
    try { await openInboxMedia(source, message.mediaUrl!.trim(), type); }
    catch { setOpenError(true); }
    finally { setOpening(false); }
  };

  return <View style={[s.bubbleRow, { justifyContent: outgoing ? "flex-end" : "flex-start" }]}><View style={[s.bubble, outgoing ? s.outgoing : s.incoming]}>
    {!!(message.mediaType || message.mediaUrl) && <TouchableOpacity accessibilityRole={source ? "link" : undefined} accessibilityLabel={source ? `Open ${type}` : `${type} preview unavailable`} disabled={!source || opening} onPress={() => void open()}>
      {isImage
        ? <View>
          {imageHeaders === undefined
            ? <View style={[s.image, { alignItems: "center", justifyContent: "center", backgroundColor: p.field }]}><ActivityIndicator /></View>
            : <Image source={{ uri: source.uri, headers: imageHeaders ?? undefined }} style={s.image} resizeMode="cover" accessibilityLabel="Message image" onError={() => setFailedImage(true)} />}
          {opening && <View style={[s.image, { position: "absolute", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.25)" }]}><ActivityIndicator color="#FFFFFF" /></View>}
        </View>
        : <View style={s.attachment}>{opening ? <ActivityIndicator /> : <Ionicons name={type === "image" ? "image-outline" : type === "video" ? "videocam-outline" : type === "audio" ? "musical-notes-outline" : "document-text-outline"} size={30} color={p.muted} />}<Text style={s.heading}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text><Text style={[s.muted, { textAlign: "center" }]}>{source ? (type === "video" || type === "audio" ? "Tap to play" : "Tap to open attachment") : "Preview unavailable"}</Text></View>}
    </TouchableOpacity>}
    {openError && <Text style={s.error}>Couldn’t open attachment. Try again.</Text>}
    {!!message.body && <Text selectable style={s.messageText}>{message.body}</Text>}
    <View style={s.metadata}><Text style={[s.muted, { fontSize: 10 }]}>{message.sentAtLabel}</Text>{outgoing && <Ionicons accessibilityLabel={status} name={statusIcon} size={14} color={status === "FAILED" ? p.error : status === "READ" ? p.info : p.muted} />}</View>
    {status === "FAILED" && <Text style={s.error}>Message failed to deliver</Text>}
    {viewable && viewerOpen ? <InboxMediaViewer mediaId={message.mediaUrl!.trim()} onClose={() => setViewerOpen(false)} source={source} type={type as "image" | "video"} visible /> : null}
  </View></View>;
}
