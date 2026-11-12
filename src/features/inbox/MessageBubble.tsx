import { Text } from "@/components/ui/AppTypography";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState, type ComponentProps } from "react";
import { Image, TouchableOpacity, View } from "react-native";
import { API_BASE_URL } from "@/services/api";
import type { InboxMessage } from "@/types/inbox";
import { mediaSource } from "@/utils/inboxPresentation";
import {
  loadInboxImage,
  openInboxMedia,
} from "./inboxMedia";
import { useInboxTheme } from "./inboxTheme";

export function MessageBubble({
  message,
  onAction,
}: {
  message: InboxMessage;
  onAction?: () => void;
}) {
  const { styles: s, palette: p } = useInboxTheme();
  const [failedImage, setFailedImage] = useState(false);
  const [openError, setOpenError] = useState(false);
  const [opening, setOpening] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageAttempt, setImageAttempt] = useState(0);
  const outgoing = message.direction === "OUTBOUND";
  const source = mediaSource(message.mediaUrl, API_BASE_URL);
  const type = message.mediaType || "attachment";
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  const isImage = !!source && type === "image" && !failedImage;
  const status = message.status.toUpperCase();
  const statusIcon: ComponentProps<typeof Ionicons>["name"] =
    status === "FAILED"
      ? "alert-circle-outline"
      : status === "SENT"
        ? "checkmark"
        : status === "READ" || status === "DELIVERED"
          ? "checkmark-done"
          : "time-outline";

  useEffect(() => {
    setFailedImage(false);
    setOpenError(false);
    setImageUri(null);
    if (!source || type !== "image") return;
    let active = true;
    loadInboxImage({ uri: source.uri, authenticated: source.authenticated })
      .then((uri) => {
        if (active) setImageUri(uri);
      })
      .catch(() => {
        if (active) setFailedImage(true);
      });
    return () => {
      active = false;
    };
  }, [source?.uri, source?.authenticated, type, imageAttempt]); // eslint-disable-line react-hooks/exhaustive-deps -- source is recreated each render; depend on its values

  const open = async () => {
    if (!source || opening) return;
    if (type === "image" && failedImage) {
      setImageAttempt(attempt => attempt + 1);
      return;
    }
    setOpenError(false);
    setOpening(true);
    try {
      await openInboxMedia(source, message.mediaUrl!.trim(), type);
    } catch {
      setOpenError(true);
    } finally {
      setOpening(false);
    }
  };

  const onImageError = () => {
    setFailedImage(true);
  };

  return (
    <View
      style={[
        s.bubbleRow,
        { justifyContent: outgoing ? "flex-end" : "flex-start" },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel="Message actions"
        onPress={onAction}
        onLongPress={onAction}
        style={[s.bubble, outgoing ? s.outgoing : s.incoming]}
      >
        {!!(message.mediaType || message.mediaUrl) && (
          <TouchableOpacity
            accessibilityRole={source ? "link" : undefined}
            accessibilityLabel={
              source ? (failedImage ? `Retry ${type}` : `Open ${type}`) : `${type} preview unavailable`
            }
            disabled={!source || opening}
            onPress={() => void open()}
          >
            {isImage ? (
              <View>
                {imageUri === null ? (
                  <View
                    style={[
                      s.image,
                      {
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: p.field,
                      },
                    ]}
                  >
                    <ActivityIndicator />
                  </View>
                ) : (
                  <Image
                    source={{
                      uri: imageUri,
                    }}
                    style={s.image}
                    resizeMode="cover"
                    accessibilityLabel="Message image"
                    onError={onImageError}
                  />
                )}
                {opening && (
                  <View
                    style={[
                      s.image,
                      {
                        position: "absolute",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(0,0,0,0.25)",
                      },
                    ]}
                  >
                    <ActivityIndicator color="#FFFFFF" />
                  </View>
                )}
              </View>
            ) : (
              <View style={s.attachment}>
                {opening ? (
                  <ActivityIndicator />
                ) : (
                  <Ionicons
                    name={
                      type === "image"
                        ? "image-outline"
                        : type === "video"
                          ? "videocam-outline"
                          : type === "audio"
                            ? "musical-notes-outline"
                            : "document-text-outline"
                    }
                    size={30}
                    color={p.muted}
                  />
                )}
                <Text style={s.heading}>{typeLabel}</Text>
                <Text style={[s.muted, { textAlign: "center" }]}>
                  {failedImage
                    ? "Couldn’t load image. Tap to retry."
                    : source
                      ? type === "video" || type === "audio"
                        ? "Tap to play"
                        : "Tap to open attachment"
                      : "Preview unavailable"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        {openError && (
          <Text translate style={s.error}>Couldn’t open attachment. Try again.</Text>
        )}
        {!!message.body && (
          <Text selectable={!onAction} style={s.messageText}>
            {message.body}
          </Text>
        )}
        <View style={s.metadata}>
          <Text style={[s.muted, { fontSize: 10 }]}>{message.sentAtLabel}</Text>
          {outgoing && (
            <Ionicons
              accessibilityLabel={status}
              name={statusIcon}
              size={14}
              color={
                status === "FAILED"
                  ? p.error
                  : status === "READ"
                    ? p.info
                    : p.muted
              }
            />
          )}
        </View>
        {status === "FAILED" && (
          <Text translate style={s.error}>Message failed to deliver</Text>
        )}
        {!!message.reaction && (
          <Text
            accessibilityLabel={`Reaction ${message.reaction}`}
            style={{
              alignSelf: "flex-start",
              backgroundColor: p.field,
              borderRadius: 12,
              paddingHorizontal: 7,
              paddingVertical: 3,
            }}
          >
            {message.reaction}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
