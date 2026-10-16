import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { maskPhone } from "@/utils/maskPhone";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState, FlatList, Keyboard, Linking, Modal, TouchableOpacity, View } from "react-native";
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
import { useChatKeyboard } from "./useChatKeyboard";

const QUICK_REPLIES = [
  { label: "Confirmed", text: "Your appointment is confirmed! We look forward to seeing you." },
  { label: "Thank you", text: "Thank you for visiting us! Hope to see you again soon." },
  { label: "Reschedule", text: "We need to reschedule your appointment. Please let us know a convenient time." },
  { label: "How can we help?", text: "Hello! How can we help you today?" },
];
const EMOJIS = ["😊", "👍", "❤️", "🙏", "✨", "🎉", "💇", "✅", "😍", "👋", "💚", "📅"];

function Thread({ phone }: { phone: string }) {
  const chatKeyboard = useChatKeyboard();
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
  // Newest first for the inverted list below: the chat opens on the latest
  // message and new messages appear at the bottom on their own. The only
  // programmatic scroll is jumping to the bottom when the user sends.
  const newestFirst = useMemo(() => [...messages].reverse(), [messages]);
  const list = useRef<FlatList<InboxMessage>>(null);
  const focused = useRef(false);
  const sendLock = useRef(false);
  const setDraft = (text: string) => dispatch(inboxDraftChanged({ phone, text }));
  // The first (non-silent) fetch on focus marks the thread as loading, which
  // holds the composer until the fresh history arrives. Cached messages stay
  // visible meanwhile and are replaced in place, so the chat never blanks.
  const refresh = useCallback((silent = true) => { if (phone) void dispatch(fetchInboxMessagesThunk({ phone, refresh: true, silent })); }, [dispatch, phone]);
  const callCustomer = useCallback(() => {
    const dialNumber = phone.trim().replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
    if (!/\d/.test(dialNumber)) return;
    void Linking.openURL(`tel:${dialNumber}`).catch(() => {
      Alert.alert("Unable to make a call", "This device could not open the phone dialer.");
    });
  }, [phone]);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    dispatch(inboxActivePhoneChanged(phone));
    refresh(false);
    void dispatch(fetchInboxConversationsThunk({ refresh: true }));
    const timer = setInterval(() => { if (AppState.currentState === "active") refresh(); }, 30_000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    const subscription = AppState.addEventListener("change", state => {
      dispatch(inboxActivePhoneChanged(state === "active" ? phone : null));
      if (state === "active") { refresh(); setNow(Date.now()); }
    });
    return () => { focused.current = false; clearInterval(timer); clearInterval(clock); subscription.remove(); dispatch(inboxActivePhoneChanged(null)); };
  }, [dispatch, phone, refresh]));
  const onComposerFocus = () => {
    setTray(null);
    chatKeyboard.onFocus();
  };
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
    sendLock.current = true; setTray(null);
    // Like WhatsApp: sending while scrolled up brings the chat to the latest message.
    list.current?.scrollToOffset({ offset: 0, animated: true });
    void dispatch(sendInboxReplyThunk({ phone, message: draft.trim() })).finally(() => { sendLock.current = false; });
  };
  return <View ref={chatKeyboard.viewport} collapsable={false} onLayout={chatKeyboard.onLayout} style={s.root}>
    <SafeAreaView edges={["top"]} style={[s.root, { paddingBottom: chatKeyboard.inset }]}>
    <AppStatusBar />
    <View style={[s.header, { gap: 6, paddingHorizontal: 8 }]}>
      <InboxIcon name="arrow-back" label="Back to inbox" onPress={() => router.canGoBack() ? router.back() : router.replace("/inbox" as Href)} />
      <InboxAvatar name={conversation?.contactName} phone={phone} />
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Show customer info" onPress={() => setInfoOpen(true)} style={[s.fill, { gap: 5 }]}><Text numberOfLines={1} style={s.heading}>{conversation?.contactName || maskPhone(phone)}</Text><Text numberOfLines={1} style={s.muted}>{conversation?.contactName ? maskPhone(phone) : "WhatsApp"}</Text></TouchableOpacity>
      <InboxIcon name="call-outline" label={`Call ${conversation?.contactName || phone}`} onPress={callCustomer} disabled={!/\d/.test(phone)} />
      <InboxIcon name="information-circle-outline" label="Show customer info" onPress={() => setInfoOpen(true)} />
    </View>
    <View style={s.chat}>
      {!!error && <TouchableOpacity accessibilityRole="button" onPress={() => refresh(false)} style={s.banner}><Text style={s.error}>{error} · Tap to retry</Text></TouchableOpacity>}
      <View pointerEvents="none" style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, overflow: "hidden", justifyContent: "space-around" }}>{Array.from({ length: 6 }, (_, i) => <View key={i} style={{ flexDirection: "row", justifyContent: "space-around" }}>{[0, 1].map(j => <Text key={j} style={{ color: p.muted, opacity: 0.08, letterSpacing: 5, fontSize: 17, transform: [{ rotate: "-20deg" }] }}>SalonOX</Text>)}</View>)}</View>
      <FlatList ref={list} inverted data={newestFirst} keyExtractor={item => item.id} style={s.fill} contentContainerStyle={[s.messageList, { paddingTop: 24, paddingBottom: 18 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
        ListEmptyComponent={<View style={[s.empty, { transform: [{ scaleY: -1 }] }]}>{loading ? <ActivityIndicator color={p.accent} /> : <><Ionicons name="chatbubble-ellipses-outline" size={36} color={p.muted} /><Text style={s.emptyText}>{error ? "Messages couldn’t be loaded." : "No messages in this conversation yet."}</Text></>}</View>}
        renderItem={({ item, index }) => <View>{(index === newestFirst.length - 1 || messageDay(newestFirst[index + 1].sentAt) !== messageDay(item.sentAt)) && <View style={s.day}><Text style={s.muted}>{messageDay(item.sentAt)}</Text></View>}<MessageBubble message={item} /></View>} />
      {!!sendError && <View accessibilityRole="alert" style={s.banner}><Text style={s.error}>{sendError} Your draft has been kept.</Text></View>}
      {!loading && (!allowed || !replyAllowed) ? <View style={s.banner}><Text style={[s.muted, { lineHeight: 19 }]}>{!allowed ? "Your account doesn’t have permission to reply to conversations." : "The 24-hour reply window has closed. Send an approved campaign template to re-engage this client."}</Text>{!!draft && <Text numberOfLines={2} style={[s.muted, { marginTop: 8 }]}>Saved draft: {draft}</Text>}</View>
        : <>
          {replyWindow.isOpen && replyWindow.hoursRemaining < 8 && <View style={s.banner}><Text style={s.muted}>Reply window closes in {Math.max(1, Math.ceil(((replyWindow.expiresAt?.getTime() ?? now) - now) / 60_000))} min</Text></View>}
          {tray && <View style={s.tray}><View style={s.row}><Text style={[s.heading, s.fill]}>{tray === "quick" ? "Quick replies" : "Emoji"}</Text><InboxIcon name="close" label="Close picker" onPress={() => setTray(null)} /></View>{tray === "quick" ? QUICK_REPLIES.map(reply => <TouchableOpacity accessibilityRole="button" key={reply.label} onPress={() => { setDraft(reply.text); setTray(null); }} style={s.quickReply}><Text style={s.heading}>{reply.label}</Text><Text numberOfLines={1} style={s.muted}>{reply.text}</Text></TouchableOpacity>) : <View style={{ flexDirection: "row", flexWrap: "wrap" }}>{EMOJIS.map(emoji => <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Insert ${emoji}`} key={emoji} onPress={() => setDraft(draft + emoji)} style={s.icon}><Text style={{ fontSize: 24 }}>{emoji}</Text></TouchableOpacity>)}</View>}</View>}
          <View style={s.composer}>
            <InboxIcon name="flash-outline" label="Quick replies" disabled={sending || loading} onPress={() => { Keyboard.dismiss(); setTray(tray === "quick" ? null : "quick"); }} />
            <InboxIcon name="happy-outline" label="Insert emoji" disabled={sending || loading} onPress={() => setTray(tray === "emoji" ? null : "emoji")} />
            <TextInput accessibilityLabel="Type a WhatsApp message" multiline maxLength={4096} editable={!sending && !loading && allowed && replyAllowed} value={draft} onFocus={onComposerFocus} onChangeText={text => { if (text === "/" && !draft) { Keyboard.dismiss(); setTray("quick"); return; } setDraft(text); }} placeholder="Type a message…" placeholderTextColor={p.muted} style={s.input} />
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Send message" accessibilityState={{ disabled: !canSend }} disabled={!canSend} onPress={send} style={[s.icon, s.send, !canSend && { opacity: 0.4 }]}>{sending ? <ActivityIndicator color={p.onAccent} /> : <Ionicons name="send" size={20} color={p.onAccent} />}</TouchableOpacity>
          </View>
        </>}
    </View>
    <Modal visible={infoOpen} transparent animationType="slide" onRequestClose={() => setInfoOpen(false)}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close customer info" onPress={() => setInfoOpen(false)} style={{ flex: 1 }} />
        <SafeAreaView edges={["bottom"]} style={{ height: "88%", backgroundColor: p.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: "hidden" }}>
          <View style={{ height: 5, width: 38, backgroundColor: p.line, borderRadius: 3, alignSelf: "center", marginTop: 10 }} />
          {infoOpen && <CustomerPanel phone={phone} onClose={() => setInfoOpen(false)} />}
        </SafeAreaView>
      </View>
    </Modal>
  </SafeAreaView></View>;
}

export default function InboxThreadScreen() {
  const params = useLocalSearchParams<{ phone?: string }>();
  let phone = typeof params.phone === "string" ? params.phone : "";
  try { phone = decodeURIComponent(phone); } catch {   }
  return <Thread key={phone} phone={phone} />;
}
