import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { EmptyState, ErrorState } from "@/components/ui/StateViews";
import { AppLayout } from "@/constants/layout";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { fetchInboxMessagesThunk, sendInboxReplyThunk } from "@/middleware/inbox/inbox.thunk";
import {
  selectInboxConversationByPhone,
  selectInboxMessages,
  selectInboxMessagesError,
  selectInboxMessagesLoading,
  selectInboxSendError,
  selectInboxSending,
} from "@/store/inbox/inbox.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { InboxMessage } from "@/types/inbox";
import { getReplyWindow } from "@/utils/whatsappReplyWindow";

function MessageBubble({ message }: { message: InboxMessage }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const isOutbound = message.direction === "OUTBOUND";
  const isFailed = message.status === "FAILED";

  return (
    <View style={[styles.bubbleRow, isOutbound ? styles.bubbleRowOut : styles.bubbleRowIn]}>
      <View style={[styles.bubble, isOutbound ? styles.bubbleOut : styles.bubbleIn]}>
        <Text style={[styles.bubbleText, isOutbound && styles.bubbleTextOut]}>{message.body}</Text>
        <View style={styles.bubbleMeta}>
          <Text style={[styles.bubbleTime, isOutbound && styles.bubbleTimeOut]}>
            {message.sentAtLabel}
          </Text>
          {isOutbound ? (
            <Ionicons
              color={isFailed ? Colors.error : message.status === "READ" ? Colors.info : Colors.hint}
              name={isFailed ? "alert-circle-outline" : message.status === "SENT" ? "checkmark" : "checkmark-done"}
              size={13}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function InboxThreadScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ phone?: string }>();
  const listRef = useRef<FlatList<InboxMessage>>(null);
  const [draft, setDraft] = useState("");

  // expo-router hands back the decoded segment, but the encodeURIComponent on
  // the way in means a double-encoded value is possible on a cold deep link.
  const phone = useMemo(() => {
    const raw = typeof params.phone === "string" ? params.phone : "";

    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [params.phone]);

  const conversation = useAppSelector((state) => selectInboxConversationByPhone(state, phone));
  const messages = useAppSelector((state) => selectInboxMessages(state, phone));
  const loading = useAppSelector((state) => selectInboxMessagesLoading(state, phone));
  const error = useAppSelector((state) => selectInboxMessagesError(state, phone));
  const sending = useAppSelector((state) => selectInboxSending(state, phone));
  const sendError = useAppSelector((state) => selectInboxSendError(state, phone));

  const replyWindow = useMemo(() => getReplyWindow(messages), [messages]);
  const trimmedDraft = draft.trim();
  const canSend = replyWindow.isOpen && trimmedDraft.length > 0 && !sending;

  const refresh = useCallback(() => {
    if (!phone) {
      return;
    }

    void dispatch(fetchInboxMessagesThunk({ phone }));
  }, [dispatch, phone]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Socket `inbox:message` appends live, so a new arrival grows the list —
  // keep the newest message in view either way.
  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);

    return () => clearTimeout(timer);
  }, [messages.length]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/inbox" as Href);
  };

  const handleSend = () => {
    if (!canSend) {
      return;
    }

    const message = trimmedDraft;

    // Clear straight away so the field feels responsive; the bubble itself
    // only appears once the server confirms Meta accepted it.
    setDraft("");

    void dispatch(sendInboxReplyThunk({ message, phone })).then((result) => {
      if (sendInboxReplyThunk.rejected.match(result)) {
        // Hand the text back rather than losing what they typed.
        setDraft((current) => (current.length > 0 ? current : message));
      }
    });
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />

      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.84} hitSlop={12} onPress={handleBack} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {conversation?.contactName || phone}
          </Text>
          {conversation?.contactName ? (
            <Text numberOfLines={1} style={styles.headerSubtitle}>
              {phone}
            </Text>
          ) : null}
        </View>
        <View style={styles.iconButton} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        style={styles.flex}
      >
        {error && messages.length === 0 ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : loading && messages.length === 0 ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        ) : (
          <FlatList
            contentContainerStyle={styles.listContent}
            data={messages}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <EmptyState
                accent="green"
                description="No messages in this conversation yet."
                icon="chatbubble-ellipses-outline"
                title="Nothing here yet"
              />
            }
            ref={listRef}
            renderItem={({ item }) => <MessageBubble message={item} />}
            showsVerticalScrollIndicator={false}
          />
        )}

        {sendError ? (
          <View style={styles.sendErrorBanner}>
            <Ionicons color={Colors.error} name="alert-circle-outline" size={16} />
            <Text style={styles.sendErrorText}>{sendError}</Text>
          </View>
        ) : null}

        {replyWindow.isOpen ? (
          <View style={styles.composer}>
            <TextInput
              editable={!sending}
              multiline
              onChangeText={setDraft}
              placeholder="Type a message"
              placeholderTextColor={Colors.placeholder}
              style={styles.input}
              value={draft}
            />
            <TouchableOpacity
              activeOpacity={0.84}
              disabled={!canSend}
              onPress={handleSend}
              style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            >
              {sending ? (
                <ActivityIndicator color={Colors.onPrimary} size="small" />
              ) : (
                <Ionicons color={Colors.onPrimary} name="send" size={17} />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          // WhatsApp only allows free-form replies for 24h after the client's
          // last message. Meta rejects anything later, so the composer is
          // closed rather than letting a send fail after the fact.
          <View style={styles.windowClosed}>
            <Ionicons color={Colors.warning} name="time-outline" size={16} />
            <Text style={styles.windowClosedText}>
              {replyWindow.lastInboundAt
                ? "The 24-hour reply window has closed. WhatsApp only allows a reply within 24 hours of the client's last message."
                : "You can only reply after this client messages you first."}
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      backgroundColor: Colors.bg,
      flex: 1,
    },
    flex: {
      flex: 1,
    },
    header: {
      alignItems: "center",
      borderBottomColor: Colors.divider,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
      gap: Spacing.md,
      paddingHorizontal: AppLayout.contentHorizontalPadding,
      paddingVertical: Spacing.md,
    },
    iconButton: {
      alignItems: "center",
      backgroundColor: Colors.bg2,
      borderRadius: Radius.full,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    headerCopy: {
      flex: 1,
      minWidth: 0,
    },
    headerTitle: {
      color: Colors.heading,
      fontSize: 16,
      fontWeight: "700",
    },
    headerSubtitle: {
      color: Colors.text2,
      fontSize: 12,
      marginTop: 2,
    },
    centerState: {
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
    },
    listContent: {
      flexGrow: 1,
      gap: Spacing.sm,
      paddingHorizontal: AppLayout.contentHorizontalPadding,
      paddingVertical: Spacing.lg,
    },
    bubbleRow: {
      flexDirection: "row",
    },
    bubbleRowIn: {
      justifyContent: "flex-start",
    },
    bubbleRowOut: {
      justifyContent: "flex-end",
    },
    bubble: {
      borderRadius: Radius.lg,
      gap: Spacing.xs,
      maxWidth: "82%",
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    bubbleIn: {
      backgroundColor: Colors.card,
      borderColor: Colors.border,
      borderWidth: StyleSheet.hairlineWidth,
    },
    bubbleOut: {
      backgroundColor: Colors.primary,
    },
    bubbleText: {
      color: Colors.text,
      fontSize: 14,
      lineHeight: 19,
    },
    bubbleTextOut: {
      color: Colors.onPrimary,
    },
    bubbleMeta: {
      alignItems: "center",
      alignSelf: "flex-end",
      flexDirection: "row",
      gap: Spacing.xs,
    },
    bubbleTime: {
      color: Colors.hint,
      fontSize: 11,
    },
    bubbleTimeOut: {
      color: Colors.onPrimary,
      opacity: 0.78,
    },
    sendErrorBanner: {
      alignItems: "center",
      backgroundColor: Colors.errorBg,
      borderColor: Colors.errorBorder,
      borderRadius: Radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
      gap: Spacing.sm,
      marginHorizontal: AppLayout.contentHorizontalPadding,
      marginBottom: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    sendErrorText: {
      color: Colors.error,
      flex: 1,
      fontSize: 12,
      fontWeight: "600",
    },
    composer: {
      alignItems: "flex-end",
      borderTopColor: Colors.divider,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
      gap: Spacing.sm,
      paddingHorizontal: AppLayout.contentHorizontalPadding,
      paddingVertical: Spacing.md,
    },
    input: {
      backgroundColor: Colors.bg2,
      borderColor: Colors.border,
      borderRadius: Radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      color: Colors.text,
      flex: 1,
      fontSize: 14,
      maxHeight: 120,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    sendButton: {
      alignItems: "center",
      backgroundColor: Colors.primary,
      borderRadius: Radius.full,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    sendButtonDisabled: {
      opacity: 0.45,
    },
    windowClosed: {
      alignItems: "center",
      backgroundColor: Colors.warningBg,
      borderTopColor: Colors.divider,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
      gap: Spacing.sm,
      paddingHorizontal: AppLayout.contentHorizontalPadding,
      paddingVertical: Spacing.lg,
    },
    windowClosedText: {
      color: Colors.text2,
      flex: 1,
      fontSize: 12,
      lineHeight: 17,
    },
  });
