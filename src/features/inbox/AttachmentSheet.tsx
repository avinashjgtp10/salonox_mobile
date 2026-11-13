import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRef, useState } from "react";
import { ActivityIndicator, Image, TouchableOpacity, View } from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { sendInboxMediaThunk } from "@/middleware/inbox/inbox.thunk";
import { inboxService } from "@/services/inbox.service";
import { useAppDispatch } from "@/store/hooks";
import type { InboxMediaFile, InboxMessage } from "@/types/inbox";

import { useInboxTheme } from "./inboxTheme";

/** Mirrors the web composer's accept list, which in turn mirrors what Meta
 * takes. Anything outside this is rejected by the backend with UNSUPPORTED_MEDIA. */
const DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
];

/** Photos are the one type Meta narrows further: JPEG and PNG only. */
const PHOTO_TYPES = ["image/jpeg", "image/png"];
const VIDEO_TYPES = ["video/mp4", "video/3gpp"];

const extensionType = (name: string): string | null => {
  const ext = name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    mp4: "video/mp4", "3gp": "video/3gpp",
  };
  return ext ? (map[ext] ?? null) : null;
};

const describe = (file: InboxMediaFile) => {
  if (file.type.startsWith("image/")) return "Photo";
  if (file.type.startsWith("video/")) return "Video";
  if (file.type.startsWith("audio/")) return "Audio";
  return "Document";
};

export function AttachmentSheet({
  visible,
  phone,
  onClose,
  onSent,
}: {
  visible: boolean;
  phone: string;
  onClose: () => void;
  onSent: (message: InboxMessage | null) => void;
}) {
  const { palette: p, styles: s } = useInboxTheme();
  const dispatch = useAppDispatch();

  const [file, setFile] = useState<InboxMediaFile | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  // Guards against a second send while the first upload is still in flight.
  const sendLock = useRef(false);
  const sending = progress !== null;

  const reset = () => {
    setFile(null);
    setCaption("");
    setError(null);
    setProgress(null);
    sendLock.current = false;
  };

  const close = () => {
    if (sending) return;
    reset();
    onClose();
  };

  /** Checks the size against the same per-type limit the backend enforces, so
   * an oversized file never starts uploading. */
  const accept = (picked: InboxMediaFile, allowed: string[]) => {
    setError(null);
    const type = picked.type || extensionType(picked.name) || "";
    if (allowed.length && !allowed.includes(type.toLowerCase())) {
      setError(
        type.startsWith("image/")
          ? "Only JPEG and PNG photos can be sent."
          : "This file type can't be sent on WhatsApp.",
      );
      return;
    }
    const limitMb = inboxService.mediaLimitMb(type);
    if (picked.size !== null && picked.size > limitMb * 1024 * 1024) {
      setError(`This file is too large — the limit is ${limitMb} MB.`);
      return;
    }
    setFile({ ...picked, type });
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Allow photo access to attach a photo or video.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    accept(
      {
        uri: asset.uri,
        name: asset.fileName || `upload.${asset.type === "video" ? "mp4" : "jpg"}`,
        type: asset.mimeType || (asset.type === "video" ? "video/mp4" : "image/jpeg"),
        size: asset.fileSize ?? null,
      },
      [...PHOTO_TYPES, ...VIDEO_TYPES],
    );
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Allow camera access to take a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    accept(
      {
        uri: asset.uri,
        name: asset.fileName || "photo.jpg",
        type: asset.mimeType || "image/jpeg",
        size: asset.fileSize ?? null,
      },
      PHOTO_TYPES,
    );
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: DOCUMENT_TYPES,
      copyToCacheDirectory: true,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    accept(
      {
        uri: asset.uri,
        name: asset.name || "document",
        type: asset.mimeType || "application/octet-stream",
        size: asset.size ?? null,
      },
      [],
    );
  };

  const run = (action: () => Promise<void>) => () => {
    void action().catch(() => setError("Could not open that. Please try again."));
  };

  const send = () => {
    if (!file || sendLock.current) return;
    sendLock.current = true;
    setError(null);
    setProgress(0);
    void dispatch(
      sendInboxMediaThunk({
        phone,
        file,
        caption,
        onProgress: (fraction) => setProgress(fraction),
      }),
    )
      .unwrap()
      .then((response) => {
        reset();
        onSent(response.message);
        onClose();
      })
      .catch((rejected: { message?: string } | undefined) => {
        setProgress(null);
        sendLock.current = false;
        setError(rejected?.message ?? "Could not send the file. Please try again.");
      });
  };

  const options: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }[] = [
    { icon: "image-outline", label: "Photo or video", onPress: run(pickFromLibrary) },
    { icon: "camera-outline", label: "Camera", onPress: run(takePhoto) },
    { icon: "document-outline", label: "Document", onPress: run(pickDocument) },
  ];

  return (
    <BottomSheet
      visible={visible}
      pearlStyle
      centered={false}
      title={file ? "Send attachment" : "Attach"}
      onClose={close}
    >
      {!file ? (
        <View style={{ gap: 10, paddingTop: 4 }}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.label}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              onPress={option.onPress}
              style={[s.row, { padding: 14, borderRadius: 14, backgroundColor: p.field, gap: 12 }]}
            >
              <View style={s.icon}>
                <Ionicons name={option.icon} size={20} color={p.accent} />
              </View>
              <Text translate style={s.heading}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={{ gap: 12, paddingTop: 4 }}>
          <View style={[s.row, { gap: 12 }]}>
            {file.type.startsWith("image/") ? (
              <Image source={{ uri: file.uri }} style={{ width: 64, height: 64, borderRadius: 12 }} />
            ) : (
              <View style={s.icon}>
                <Ionicons name="document-text-outline" size={20} color={p.accent} />
              </View>
            )}
            <View style={s.fill}>
              <Text numberOfLines={1} style={s.heading}>{file.name}</Text>
              <Text style={s.muted}>
                {describe(file)}
                {file.size !== null ? ` · ${(file.size / (1024 * 1024)).toFixed(1)} MB` : ""}
              </Text>
            </View>
            {!sending && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Remove attachment"
                onPress={() => { setFile(null); setCaption(""); setError(null); }}
                style={s.icon}
              >
                <Ionicons name="close" size={18} color={p.muted} />
              </TouchableOpacity>
            )}
          </View>

          <TextInput
            accessibilityLabel="Add a caption"
            editable={!sending}
            maxLength={1024}
            multiline
            onChangeText={setCaption}
            placeholder="Add a caption…"
            placeholderTextColor={p.muted}
            style={s.input}
            value={caption}
          />

          {sending && (
            <View style={{ gap: 6 }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: p.field, overflow: "hidden" }}>
                <View
                  style={{
                    width: `${Math.round((progress ?? 0) * 100)}%`,
                    height: "100%",
                    backgroundColor: p.accent,
                  }}
                />
              </View>
              <Text style={s.muted}>
                {(progress ?? 0) >= 1 ? "Sending…" : `Uploading ${Math.round((progress ?? 0) * 100)}%`}
              </Text>
            </View>
          )}

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Send attachment"
            accessibilityState={{ disabled: sending }}
            disabled={sending}
            onPress={send}
            style={[s.button, { backgroundColor: p.accent }, sending && { opacity: 0.6 }]}
          >
            {sending ? (
              <ActivityIndicator color={p.onAccent} />
            ) : (
              <Text translate style={{ color: p.onAccent, fontWeight: "700" }}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {!!error && (
        <Text accessibilityRole="alert" style={[s.error, { marginTop: 12 }]}>
          {error}
        </Text>
      )}
    </BottomSheet>
  );
}
