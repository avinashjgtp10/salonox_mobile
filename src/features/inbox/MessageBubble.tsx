import { Ionicons } from "@expo/vector-icons";
import { useState, type ComponentProps } from "react";
import { Image, Linking, Text, TouchableOpacity, View } from "react-native";
import type { InboxMessage } from "@/types/inbox";
import { mediaLink } from "@/utils/inboxPresentation";
import { useInboxTheme } from "./inboxTheme";

export function MessageBubble({ message }: { message: InboxMessage }) {
  const { styles: s, palette: p } = useInboxTheme();
  const [failedImage, setFailedImage] = useState(false);
  const [openError, setOpenError] = useState(false);
  const outgoing = message.direction === "OUTBOUND";
  const link = mediaLink(message.mediaUrl);
  const type = message.mediaType || "attachment";
  const status = message.status.toUpperCase();
  const statusIcon: ComponentProps<typeof Ionicons>["name"] = status === "FAILED" ? "alert-circle-outline" : status === "SENT" ? "checkmark" : status === "READ" || status === "DELIVERED" ? "checkmark-done" : "time-outline";
  return <View style={[s.bubbleRow, { justifyContent: outgoing ? "flex-end" : "flex-start" }]}><View style={[s.bubble, outgoing ? s.outgoing : s.incoming]}>
    {!!(message.mediaType || message.mediaUrl) && <TouchableOpacity accessibilityRole={link ? "link" : undefined} accessibilityLabel={link ? `Open ${type}` : `${type} preview unavailable`} disabled={!link} onPress={() => { if (link) void Linking.openURL(link).catch(() => setOpenError(true)); }}>
      {link && type === "image" && !failedImage ? <Image source={{ uri: link }} style={s.image} resizeMode="cover" accessibilityLabel="Message image" onError={() => setFailedImage(true)} />
        : <View style={s.attachment}><Ionicons name={type === "image" ? "image-outline" : type === "video" ? "videocam-outline" : type === "audio" ? "musical-notes-outline" : "document-text-outline"} size={30} color={p.muted} /><Text style={s.heading}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text><Text style={[s.muted, { textAlign: "center" }]}>{link ? "Tap to open attachment" : "Preview unavailable"}</Text></View>}
    </TouchableOpacity>}
    {openError && <Text style={s.error}>Couldn’t open attachment. Try again.</Text>}
    {!!message.body && <Text selectable style={s.messageText}>{message.body}</Text>}
    <View style={s.metadata}><Text style={[s.muted, { fontSize: 10 }]}>{message.sentAtLabel}</Text>{outgoing && <Ionicons accessibilityLabel={status} name={statusIcon} size={14} color={status === "FAILED" ? p.error : status === "READ" ? "#28A5E6" : p.muted} />}</View>
    {status === "FAILED" && <Text style={s.error}>Message failed to deliver</Text>}
  </View></View>;
}
