import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState, FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { fetchInboxConversationsThunk, fetchInboxMessagesThunk, sendInboxReplyThunk } from "@/middleware/inbox/inbox.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { inboxActivePhoneChanged, inboxDraftChanged, selectInboxConversationByPhone, selectInboxMessages, selectInboxMessagesError, selectInboxMessagesLoading, selectInboxSendError, selectInboxSending } from "@/store/inbox/inbox.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
import type { InboxMessage } from "@/types/inbox";
import { messageDay } from "@/utils/inboxPresentation";
import { canAttemptInboxReply, getReplyWindow } from "@/utils/whatsappReplyWindow";
import { hasCustomPermission } from "@/utils/permissions";
import { CustomerPanel } from "./CustomerPanel";
import { InboxAvatar, InboxIcon } from "./InboxControls";
import { MessageBubble } from "./MessageBubble";
import { useInboxTheme } from "./inboxTheme";

const QUICK_REPLIES = [
  { label: "Confirmed", text: "Your appointment is confirmed! We look forward to seeing you." },
  { label: "Thank you", text: "Thank you for visiting us! Hope to see you again soon." },
  { label: "Reschedule", text: "We need to reschedule your appointment. Please let us know a convenient time." },
  { label: "How can we help?", text: "Hello! How can we help you today?" },
];
const EMOJIS = ["😊", "👍", "❤️", "🙏", "✨", "🎉", "💇", "✅", "😍", "👋", "💚", "📅"];

function Thread({ phone }: { phone: string }) {
  const { styles: s, palette: p } = useInboxTheme();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const allowed = Boolean(user && (["salon_owner", "admin"].includes((user.role || "").toLowerCase()) || hasCustomPermission(user, "reply_to_conversation")));
  const conversation = useAppSelector(state => selectInboxConversationByPhone(state, phone));
  const messages = useAppSelector(state => selectInboxMessages(state, phone));
  const loading = useAppSelector(state => selectInboxMessagesLoading(state, phone));
  const error = useAppSelector(state => selectInboxMessagesError(state, phone));
  const sending = useAppSelector(state => selectInboxSending(state, phone));
  const sendError = useAppSelector(state => selectInboxSendError(state, phone));
  const draft = useAppSelector(state => state.inbox.draftsByPhone[phone] ?? "");
  const connected = useAppSelector(state => state.inbox.connected);
  const [now, setNow] = useState(Date.now());
  const [infoOpen, setInfoOpen] = useState(false);
  const [tray, setTray] = useState<"quick" | "emoji" | null>(null);
  // View-only deletion, matching Web's local action. Keep the actual history
  // intact for reply-window calculation and retain hidden IDs across polling.
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const visibleMessages = messages.filter(message => !hiddenIds.includes(message.id));
  const deleteFromView = (id: string) => Alert.alert(
    "Delete message from this view?",
    "This only hides it while this chat is open. It stays in server history and on the client’s WhatsApp. Reopening the chat restores it.",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Delete from view", style: "destructive", onPress: () => setHiddenIds(ids => ids.includes(id) ? ids : [...ids, id]) },
    ],
  );
  const list = useRef<FlatList<InboxMessage>>(null);
  const nearBottom = useRef(true);
  const focused = useRef(false);
  const sendLock = useRef(false);
  const setDraft = (text: string) => dispatch(inboxDraftChanged({ phone, text }));
  const refresh = useCallback(() => { if (phone) void dispatch(fetchInboxMessagesThunk({ phone, refresh: true })); }, [dispatch, phone]);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    dispatch(inboxActivePhoneChanged(phone));
    refresh();
    void dispatch(fetchInboxConversationsThunk({ refresh: true }));
    const timer = setInterval(() => { if (AppState.currentState === "active") refresh(); }, 30_000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    const subscription = AppState.addEventListener("change", state => {
      dispatch(inboxActivePhoneChanged(state === "active" ? phone : null));
      if (state === "active") { refresh(); setNow(Date.now()); }
    });
    return () => { focused.current = false; clearInterval(timer); clearInterval(clock); subscription.remove(); dispatch(inboxActivePhoneChanged(null)); };
  }, [dispatch, phone, refresh]));
  const replyWindow = getReplyWindow(messages, now);
  const previousConnection = useRef(connected);
  useEffect(() => {
    if (connected && !previousConnection.current && focused.current) refresh();
    previousConnection.current = connected;
  }, [connected, refresh]);
  const lastInboundId = [...messages].reverse().find(item => item.direction === "INBOUND")?.id;
  const previousInbound = useRef<string | undefined>(undefined);
  useEffect(() => {
    const changed = previousInbound.current !== undefined && previousInbound.current !== lastInboundId;
    previousInbound.current = lastInboundId;
    if (!changed || !focused.current || AppState.currentState !== "active") return;
    const timer = setTimeout(refresh, 600);
    return () => clearTimeout(timer);
  }, [lastInboundId, refresh]);
  const replyAllowed = canAttemptInboxReply(messages, now);
  const canSend = allowed && replyAllowed && !!draft.trim() && !sending && !loading && !error;
  const send = () => {
    if (!canSend || sendLock.current || !canAttemptInboxReply(messages)) return;
    sendLock.current = true; nearBottom.current = true; setTray(null);
    void dispatch(sendInboxReplyThunk({ phone, message: draft.trim() })).finally(() => { sendLock.current = false; });
  };
  return <SafeAreaView edges={["top", "bottom"]} style={s.root}>
    <AppStatusBar />
    <View style={s.header}>
      <InboxIcon name="arrow-back" label="Back to inbox" onPress={() => router.canGoBack() ? router.back() : router.replace("/inbox" as Href)} />
      <InboxAvatar name={conversation?.contactName} phone={phone} />
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Show customer info" onPress={() => setInfoOpen(true)} style={[s.fill, { gap: 5 }]}><Text numberOfLines={1} style={s.heading}>{conversation?.contactName || phone}</Text><Text numberOfLines={1} style={s.muted}>{conversation?.contactName ? phone : "WhatsApp"}</Text></TouchableOpacity>
      <InboxIcon name="refresh-outline" label="Refresh messages" onPress={refresh} disabled={loading} />
      <InboxIcon name="information-circle-outline" label="Show customer info" onPress={() => setInfoOpen(true)} />
    </View>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.chat}>
      {!!error && <TouchableOpacity accessibilityRole="button" onPress={refresh} style={s.banner}><Text style={s.error}>{error} · Tap to retry</Text></TouchableOpacity>}
      <View pointerEvents="none" style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, overflow: "hidden", justifyContent: "space-around" }}>{Array.from({ length: 6 }, (_, i) => <View key={i} style={{ flexDirection: "row", justifyContent: "space-around" }}>{[0, 1].map(j => <Text key={j} style={{ color: p.muted, opacity: 0.08, letterSpacing: 5, fontSize: 17, transform: [{ rotate: "-20deg" }] }}>SalonOX</Text>)}</View>)}</View>
      <FlatList ref={list} data={visibleMessages} keyExtractor={item => item.id} style={s.fill} contentContainerStyle={s.messageList} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
        onScroll={event => { const { contentSize, contentOffset, layoutMeasurement } = event.nativeEvent; nearBottom.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 100; }} scrollEventThrottle={100}
        onContentSizeChange={() => { if (nearBottom.current) list.current?.scrollToEnd({ animated: false }); }}
        ListEmptyComponent={<View style={s.empty}>{loading ? <ActivityIndicator color={p.green} /> : <><Ionicons name="chatbubble-ellipses-outline" size={36} color={p.muted} /><Text style={s.emptyText}>{error ? "Messages couldn’t be loaded." : hiddenIds.length ? "Messages are hidden from this view." : "No messages in this conversation yet."}</Text></>}</View>}
        renderItem={({ item, index }) => <View>{(index === 0 || messageDay(visibleMessages[index - 1].sentAt) !== messageDay(item.sentAt)) && <View style={s.day}><Text style={s.muted}>{messageDay(item.sentAt)}</Text></View>}<MessageBubble message={item} onDelete={deleteFromView} /></View>} />
      {hiddenIds.length > 0 && <View style={[s.banner, s.row]}><Text style={[s.muted, s.fill]}>Message hidden from this view</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Undo last message deletion" onPress={() => setHiddenIds(ids => ids.slice(0, -1))} style={s.button}><Text style={s.greenText}>Undo</Text></TouchableOpacity></View>}
      {!!sendError && <View accessibilityRole="alert" style={s.banner}><Text style={s.error}>{sendError} Your draft has been kept.</Text></View>}
      {!loading && (!allowed || !replyAllowed) ? <View style={s.banner}><Text style={[s.muted, { lineHeight: 19 }]}>{!allowed ? "Your account doesn’t have permission to reply to conversations." : "The 24-hour reply window has closed. Send an approved campaign template to re-engage this client."}</Text>{!!draft && <Text numberOfLines={2} style={[s.muted, { marginTop: 8 }]}>Saved draft: {draft}</Text>}</View>
        : <>
          {replyWindow.isOpen && replyWindow.hoursRemaining < 8 && <View style={s.banner}><Text style={s.muted}>Reply window closes in {Math.max(1, Math.ceil(((replyWindow.expiresAt?.getTime() ?? now) - now) / 60_000))} min</Text></View>}
          {tray && <ScrollView style={s.tray} keyboardShouldPersistTaps="handled"><View style={s.row}><Text style={[s.heading, s.fill]}>{tray === "quick" ? "Quick replies" : "Emoji"}</Text><InboxIcon name="close" label="Close picker" onPress={() => setTray(null)} /></View>{tray === "quick" ? QUICK_REPLIES.map(reply => <TouchableOpacity accessibilityRole="button" key={reply.label} onPress={() => { setDraft(reply.text); setTray(null); }} style={s.quickReply}><Text style={s.heading}>{reply.label}</Text><Text style={s.muted}>{reply.text}</Text></TouchableOpacity>) : <View style={{ flexDirection: "row", flexWrap: "wrap" }}>{EMOJIS.map(emoji => <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Insert ${emoji}`} key={emoji} onPress={() => setDraft(draft + emoji)} style={s.icon}><Text style={{ fontSize: 24 }}>{emoji}</Text></TouchableOpacity>)}</View>}</ScrollView>}
          <View style={s.composer}>
            <InboxIcon name="flash-outline" label="Quick replies" disabled={sending || loading} onPress={() => setTray(tray === "quick" ? null : "quick")} />
            <InboxIcon name="happy-outline" label="Insert emoji" disabled={sending || loading} onPress={() => setTray(tray === "emoji" ? null : "emoji")} />
            <TextInput accessibilityLabel="Type a WhatsApp message" multiline maxLength={4096} editable={!sending && !loading && allowed && replyAllowed} value={draft} onChangeText={text => { if (text === "/" && !draft) { setTray("quick"); return; } setDraft(text); }} placeholder="Type a message…" placeholderTextColor={p.muted} style={s.input} />
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Send message" accessibilityState={{ disabled: !canSend }} disabled={!canSend} onPress={send} style={[s.icon, s.send, !canSend && { opacity: 0.4 }]}>{sending ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="send" size={20} color="#FFFFFF" />}</TouchableOpacity>
          </View>
        </>}
    </KeyboardAvoidingView>
    <Modal visible={infoOpen} transparent animationType="slide" onRequestClose={() => setInfoOpen(false)}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close customer info" onPress={() => setInfoOpen(false)} style={{ flex: 1 }} />
        <SafeAreaView edges={["bottom"]} style={{ height: "88%", backgroundColor: p.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: "hidden" }}>
          <View style={{ height: 5, width: 38, backgroundColor: p.line, borderRadius: 3, alignSelf: "center", marginTop: 10 }} />
          {infoOpen && <CustomerPanel phone={phone} onClose={() => setInfoOpen(false)} />}
        </SafeAreaView>
      </View>
    </Modal>
  </SafeAreaView>;
}

export default function InboxThreadScreen() {
  const params = useLocalSearchParams<{ phone?: string }>();
  let phone = typeof params.phone === "string" ? params.phone : "";
  try { phone = decodeURIComponent(phone); } catch { /* Preserve malformed deep links. */ }
  return <Thread key={phone} phone={phone} />;
}
