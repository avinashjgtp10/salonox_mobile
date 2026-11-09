import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { inboxService } from "@/services/inbox.service";
import { getApiErrorMessage } from "@/services/api";
import { SendTemplateSheet } from "./SendTemplateSheet";
import { InboxButton } from "./InboxButton";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { maskPhone } from "@/utils/maskPhone";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
  type Href,
} from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Clipboard,
  FlatList,
  Keyboard,
  Linking,
  Modal,
  Platform,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import {
  fetchInboxConversationsThunk,
  fetchInboxMessagesThunk,
  sendInboxReplyThunk,
} from "@/middleware/inbox/inbox.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  inboxActivePhoneChanged,
  inboxDraftChanged,
  inboxMessageReceived,
  inboxReactionChanged,
  selectInboxConversationByPhone,
  selectInboxMessages,
  selectInboxMessagesError,
  selectInboxMessagesLoading,
  selectInboxSendError,
  selectInboxSending,
} from "@/store/inbox/inbox.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
import type { InboxMessage, InboxCustomer } from "@/types/inbox";
import { messageDay } from "@/utils/inboxPresentation";
import {
  canAttemptInboxReply,
  getReplyWindow,
} from "@/utils/whatsappReplyWindow";
import { hasCustomPermission } from "@/utils/permissions";
import { ClientProfileModal } from "@/features/clients/components/ClientProfileModal";
import { CustomerPanel } from "./CustomerPanel";
import { InboxAvatar, InboxIcon } from "./InboxControls";
import { MessageBubble } from "./MessageBubble";
import { useInboxTheme } from "./inboxTheme";
import { EmojiPicker } from "./EmojiPicker";
import { useChatKeyboard } from "./useChatKeyboard";

const QUICK_REPLIES = [
  {
    label: "Confirmed",
    text: "Your appointment is confirmed! We look forward to seeing you.",
  },
  {
    label: "Thank you",
    text: "Thank you for visiting us! Hope to see you again soon.",
  },
  {
    label: "Reschedule",
    text: "We need to reschedule your appointment. Please let us know a convenient time.",
  },
  { label: "How can we help?", text: "Hello! How can we help you today?" },
];

function Thread({ phone }: { phone: string }) {
  const chatKeyboard = useChatKeyboard();
  const { styles: s, palette: p } = useInboxTheme();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const allowed = Boolean(
    user &&
      (["salon_owner", "admin"].includes((user.role || "").toLowerCase()) ||
        hasCustomPermission(user, "reply_to_conversation")),
  );
  const conversation = useAppSelector((state) =>
    selectInboxConversationByPhone(state, phone),
  );
  const messages = useAppSelector((state) => selectInboxMessages(state, phone));
  const loading = useAppSelector((state) =>
    selectInboxMessagesLoading(state, phone),
  );
  const error = useAppSelector((state) =>
    selectInboxMessagesError(state, phone),
  );
  const sending = useAppSelector((state) => selectInboxSending(state, phone));
  const sendError = useAppSelector((state) =>
    selectInboxSendError(state, phone),
  );
  const draft = useAppSelector(
    (state) => state.inbox.draftsByPhone[phone] ?? "",
  );
  const connected = useAppSelector((state) => state.inbox.connected);
  const [now, setNow] = useState(Date.now());
  const [templateOpen, setTemplateOpen] = useState(false);
  const [customer, setCustomer] = useState<InboxCustomer | null>(null);
  const [customerKnown, setCustomerKnown] = useState(false);
  const [actionMessage, setActionMessage] = useState<InboxMessage | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const canCreateClient = Boolean(
    user &&
      (["salon_owner", "admin"].includes((user.role || "").toLowerCase()) ||
        hasCustomPermission(user, "create_clients")),
  );
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setCustomerKnown(false);
      setCustomer(null);
      void inboxService
        .getCustomer(phone)
        .then((value) => {
          if (active) {
            setCustomer(value);
            setCustomerKnown(true);
          }
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }, [phone]),
  );
  const addClient = () => {
    setInfoOpen(false);
    Keyboard.dismiss();
    router.push({
      pathname: "/clients/new",
      params: {
        phoneNumber: phone,
        contactName: conversation?.contactName || "",
        returnTo: "inbox",
      },
    } as Href);
  };
  const openTemplates = () => {
    Keyboard.dismiss();
    setTray(null);
    setTemplateOpen(true);
  };
  const [infoOpen, setInfoOpen] = useState(false);
  // View Profile: the web's client profile popup, opened over this chat.
  const [profileClientId, setProfileClientId] = useState<string | null>(null);
  const viewProfile = (clientId: string) => {
    setInfoOpen(false);
    // iOS can't present a modal while the info sheet is still dismissing.
    setTimeout(
      () => setProfileClientId(clientId),
      Platform.OS === "ios" ? 450 : 0,
    );
  };
  const [tray, setTray] = useState<"quick" | "emoji" | null>(null);
  // Newest first for the inverted list below: the chat opens on the latest
  // message and new messages appear at the bottom on their own. The only
  // programmatic scroll is jumping to the bottom when the user sends.
  const newestFirst = useMemo(() => [...messages].reverse(), [messages]);
  const list = useRef<FlatList<InboxMessage>>(null);
  const focused = useRef(false);
  const sendLock = useRef(false);
  const setDraft = (text: string) =>
    dispatch(inboxDraftChanged({ phone, text }));
  // The first (non-silent) fetch on focus marks the thread as loading, which
  // holds the composer until the fresh history arrives. Cached messages stay
  // visible meanwhile and are replaced in place, so the chat never blanks.
  const refresh = useCallback(
    (silent = true) => {
      if (phone)
        void dispatch(
          fetchInboxMessagesThunk({ phone, refresh: true, silent }),
        );
    },
    [dispatch, phone],
  );
  const callCustomer = useCallback(() => {
    const dialNumber = phone
      .trim()
      .replace(/[^\d+]/g, "")
      .replace(/(?!^)\+/g, "");
    if (!/\d/.test(dialNumber)) return;
    void Linking.openURL(`tel:${dialNumber}`).catch(() => {
      Alert.alert(
        "Unable to make a call",
        "This device could not open the phone dialer.",
      );
    });
  }, [phone]);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      dispatch(inboxActivePhoneChanged(phone));
      refresh(false);
      void dispatch(fetchInboxConversationsThunk({ refresh: true }));
      const timer = setInterval(() => {
        if (AppState.currentState === "active") refresh();
      }, 30_000);
      const clock = setInterval(() => setNow(Date.now()), 1000);
      const subscription = AppState.addEventListener("change", (state) => {
        dispatch(inboxActivePhoneChanged(state === "active" ? phone : null));
        if (state === "active") {
          refresh();
          setNow(Date.now());
        }
      });
      return () => {
        focused.current = false;
        clearInterval(timer);
        clearInterval(clock);
        subscription.remove();
        dispatch(inboxActivePhoneChanged(null));
      };
    }, [dispatch, phone, refresh]),
  );
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
  const lastInboundId = [...messages]
    .reverse()
    .find((item) => item.direction === "INBOUND")?.id;
  const previousInbound = useRef<string | undefined>(undefined);
  useEffect(() => {
    const changed =
      previousInbound.current !== undefined &&
      previousInbound.current !== lastInboundId;
    previousInbound.current = lastInboundId;
    if (!changed || !focused.current || AppState.currentState !== "active")
      return;
    const timer = setTimeout(refresh, 600);
    return () => clearTimeout(timer);
  }, [lastInboundId, refresh]);
  const replyAllowed = canAttemptInboxReply(messages, now);
  const canSend =
    allowed && replyAllowed && !!draft.trim() && !sending && !loading && !error;
  const send = () => {
    if (!canSend || sendLock.current || !canAttemptInboxReply(messages)) return;
    sendLock.current = true;
    setTray(null);
    // Like WhatsApp: sending while scrolled up brings the chat to the latest message.
    list.current?.scrollToOffset({ offset: 0, animated: true });
    void dispatch(
      sendInboxReplyThunk({ phone, message: draft.trim() }),
    ).finally(() => {
      sendLock.current = false;
    });
  };
  return (
    <PearlBackground>
      <View
        ref={chatKeyboard.viewport}
        collapsable={false}
        onLayout={chatKeyboard.onLayout}
        style={s.root}
      >
        <SafeAreaView
          edges={["top"]}
          style={[s.root, { paddingBottom: chatKeyboard.inset }]}
        >
          <AppStatusBar />
          <View style={[s.header, { gap: 6, paddingHorizontal: 8 }]}>
            <InboxIcon
              name="arrow-back"
              label="Back to inbox"
              onPress={() =>
                router.canGoBack()
                  ? router.back()
                  : router.replace("/inbox" as Href)
              }
            />
            <InboxAvatar name={customer?.fullName || conversation?.contactName} phone={phone} />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Show customer info"
              onPress={() =>
                customer ? viewProfile(customer.id) : setInfoOpen(true)
              }
              style={[s.fill, { gap: 5 }]}
            >
              <Text numberOfLines={1} style={s.heading}>
                {customer?.fullName || conversation?.contactName || maskPhone(phone)}
              </Text>
              <Text numberOfLines={1} style={s.muted}>
                {replyWindow.isOpen
                  ? `Can reply \u00b7 ${Math.max(1, replyWindow.hoursRemaining)} h left`
                  : customer
                    ? `Client \u00b7 ${customer.totalVisits} ${customer.totalVisits === 1 ? "visit" : "visits"}`
                    : maskPhone(phone)}
              </Text>
            </TouchableOpacity>
            {customerKnown && !customer && canCreateClient && (
              <InboxIcon
                name="person-add-outline"
                label="Add client"
                onPress={addClient}
              />
            )}
            <InboxIcon
              name="call-outline"
              label={`Call ${conversation?.contactName || phone}`}
              onPress={callCustomer}
              disabled={!/\d/.test(phone)}
            />
            <InboxIcon
              name="information-circle-outline"
              label="Show customer info"
              onPress={() => setInfoOpen(true)}
            />
          </View>
          <View style={s.chat}>
            {!!error && (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => refresh(false)}
                style={s.banner}
              >
                <Text style={s.error}>{error} · Tap to retry</Text>
              </TouchableOpacity>
            )}
            <FlatList
              ref={list}
              inverted
              data={newestFirst}
              keyExtractor={(item) => item.id}
              style={s.fill}
              contentContainerStyle={[
                s.messageList,
                { paddingTop: 24, paddingBottom: 18 },
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              ListEmptyComponent={
                <View style={[s.empty, { transform: [{ scaleY: -1 }] }]}>
                  {loading ? (
                    <ActivityIndicator color={p.accent} />
                  ) : (
                    <>
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={36}
                        color={p.muted}
                      />
                      <Text style={s.emptyText}>
                        {error
                          ? "Messages couldn’t be loaded."
                          : "No messages in this conversation yet."}
                      </Text>
                    </>
                  )}
                </View>
              }
              renderItem={({ item, index }) => (
                <View>
                  {(index === newestFirst.length - 1 ||
                    messageDay(newestFirst[index + 1].sentAt) !==
                      messageDay(item.sentAt)) && (
                    <View style={s.day}>
                      <Text style={s.muted}>{messageDay(item.sentAt)}</Text>
                    </View>
                  )}
                  <MessageBubble
                    message={item}
                    onAction={() => {
                      Keyboard.dismiss();
                      setActionError(null);
                      setActionMessage(item);
                    }}
                  />
                </View>
              )}
            />
            {!!sendError && (
              <View accessibilityRole="alert" style={s.banner}>
                <Text style={s.error}>
                  {sendError} Your draft has been kept.
                </Text>
              </View>
            )}
            {!loading && (!allowed || !replyAllowed) ? (
              <View style={s.banner}>
                <Text style={[s.muted, { lineHeight: 19 }]}>
                  {!allowed
                    ? "Your account doesn’t have permission to reply to conversations."
                    : "The 24-hour reply window has closed. Only approved templates can be sent now."}
                </Text>
                {allowed && (
                  <View style={s.row}>
                    <InboxButton
                      label="Send a template"
                      onPress={openTemplates}
                    />
                  </View>
                )}
                {!!draft && (
                  <Text numberOfLines={2} style={[s.muted, { marginTop: 8 }]}>
                    Saved draft: {draft}
                  </Text>
                )}
              </View>
            ) : (
              <>
                {replyWindow.isOpen && replyWindow.hoursRemaining < 8 && (
                  <View style={s.banner}>
                    <Text style={s.muted}>
                      Reply window closes in{" "}
                      {Math.max(
                        1,
                        Math.ceil(
                          ((replyWindow.expiresAt?.getTime() ?? now) - now) /
                            60_000,
                        ),
                      )}{" "}
                      min
                    </Text>
                  </View>
                )}
                {tray === "quick" && (
                  <View style={s.tray}>
                    <View style={s.row}>
                      <Text style={[s.heading, s.fill]}>Quick replies</Text>
                      <InboxIcon
                        name="close"
                        label="Close picker"
                        onPress={() => setTray(null)}
                      />
                    </View>
                    {QUICK_REPLIES.map((reply) => (
                      <TouchableOpacity
                        accessibilityRole="button"
                        key={reply.label}
                        onPress={() => {
                          setDraft(reply.text);
                          setTray(null);
                        }}
                        style={s.quickReply}
                      >
                        <Text style={s.heading}>{reply.label}</Text>
                        <Text numberOfLines={1} style={s.muted}>
                          {reply.text}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {tray === "emoji" && (
                  <EmojiPicker
                    disabled={sending || loading || draft.length >= 4096}
                    onClose={() => setTray(null)}
                    onSelect={(emoji) => {
                      if (draft.length + emoji.length <= 4096)
                        setDraft(draft + emoji);
                    }}
                  />
                )}
                <View style={s.composer}>
                  <InboxIcon
                    name="add"
                    label="Send a template"
                    disabled={sending || loading}
                    onPress={openTemplates}
                  />
                  <InboxIcon
                    name="flash-outline"
                    label="Quick replies"
                    disabled={sending || loading}
                    onPress={() => {
                      Keyboard.dismiss();
                      setTray(tray === "quick" ? null : "quick");
                    }}
                  />
                  <InboxIcon
                    name="happy-outline"
                    label="Insert emoji"
                    disabled={sending || loading}
                    onPress={() => {
                      Keyboard.dismiss();
                      setTray(tray === "emoji" ? null : "emoji");
                    }}
                  />
                  <TextInput
                    accessibilityLabel="Type a WhatsApp message"
                    multiline
                    maxLength={4096}
                    editable={!sending && !loading && allowed && replyAllowed}
                    value={draft}
                    onFocus={onComposerFocus}
                    onChangeText={(text) => {
                      if (text === "/" && !draft) {
                        Keyboard.dismiss();
                        setTray("quick");
                        return;
                      }
                      setDraft(text);
                    }}
                    placeholder="Type a message…"
                    placeholderTextColor={p.muted}
                    style={s.input}
                  />
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Send message"
                    accessibilityState={{ disabled: !canSend }}
                    disabled={!canSend}
                    onPress={send}
                    style={[s.icon, s.send, !canSend && { opacity: 0.4 }]}
                  >
                    {sending ? (
                      <ActivityIndicator color={p.onAccent} />
                    ) : (
                      <Ionicons name="send" size={20} color={p.onAccent} />
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
          {templateOpen && (
            <SendTemplateSheet
              phone={phone}
              name={customer?.fullName || conversation?.contactName}
              onClose={() => setTemplateOpen(false)}
              onSent={(message) => {
                if (message)
                  dispatch(
                    inboxMessageReceived({
                      contactPhone: phone,
                      contactName: customer?.fullName || conversation?.contactName || null,
                      message,
                    }),
                  );
                setTemplateOpen(false);
                refresh();
                void dispatch(fetchInboxConversationsThunk({ refresh: true }));
                list.current?.scrollToOffset({ offset: 0, animated: true });
              }}
            />
          )}
          <BottomSheet
            visible={!!actionMessage}
            pearlStyle
            centered={false}
            title="Message actions"
            onClose={() => {
              if (!actionBusy) setActionMessage(null);
            }}
          >
            {!!actionMessage?.body && (
              <TouchableOpacity
                accessibilityRole="button"
                disabled={actionBusy}
                onPress={() => {
                  try {
                    Clipboard.setString(actionMessage.body);
                    setActionMessage(null);
                  } catch {
                    setActionError("Could not copy message. Please try again.");
                  }
                }}
                style={s.button}
              >
                <Text style={s.text}>Copy</Text>
              </TouchableOpacity>
            )}
            {allowed && actionMessage?.direction === "INBOUND" && (
              <View style={[s.row, { flexWrap: "wrap", marginTop: 12 }]}>
                {[
                  "\u{1F44D}",
                  "\u2764\uFE0F",
                  "\u{1F602}",
                  "\u{1F62E}",
                  "\u{1F64F}",
                ].map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    accessibilityRole="button"
                    accessibilityLabel={`React ${emoji}`}
                    disabled={actionBusy}
                    onPress={() => {
                      if (!actionMessage || actionBusy) return;
                      setActionBusy(true);
                      void inboxService
                        .reactToMessage(
                          actionMessage.id,
                          actionMessage.reaction === emoji ? "" : emoji,
                        )
                        .then(() => {
                          dispatch(
                            inboxReactionChanged({
                              phone,
                              id: actionMessage.id,
                              reaction:
                                actionMessage.reaction === emoji ? null : emoji,
                            }),
                          );
                          setActionMessage(null);
                          refresh();
                        })
                        .catch((err) => setActionError(getApiErrorMessage(err)))
                        .finally(() => setActionBusy(false));
                    }}
                    style={s.icon}
                  >
                    <Text style={{ fontSize: 22 }}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {!!actionError && (
              <Text accessibilityRole="alert" style={s.error}>
                {actionError}
              </Text>
            )}
          </BottomSheet>
          <Modal
            visible={infoOpen}
            transparent
            presentationStyle="overFullScreen"
            statusBarTranslucent
            animationType="slide"
            onRequestClose={() => setInfoOpen(false)}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.35)",
                justifyContent: "flex-end",
              }}
            >
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close customer info"
                onPress={() => setInfoOpen(false)}
                style={{ flex: 1 }}
              />
              <SafeAreaView
                edges={["bottom"]}
                style={{
                  height: "88%",
                  backgroundColor: "#F8F7FB",
                  borderTopLeftRadius: 30,
                  borderTopRightRadius: 30,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: 5,
                    width: 38,
                    backgroundColor: "rgba(126,120,176,0.3)",
                    borderRadius: 3,
                    alignSelf: "center",
                    marginTop: 10,
                  }}
                />
                {infoOpen && (
                  <CustomerPanel
                    phone={phone}
                    onClose={() => setInfoOpen(false)}
                    onViewProfile={viewProfile}
                    onAddClient={canCreateClient ? addClient : undefined}
                  />
                )}
              </SafeAreaView>
            </View>
          </Modal>
          {/* Send WhatsApp just returns to this chat — it already is the client's WhatsApp. */}
          <ClientProfileModal
            clientId={profileClientId}
            onClose={() => setProfileClientId(null)}
            onSendWhatsApp={() => setProfileClientId(null)}
          />
        </SafeAreaView>
      </View>
    </PearlBackground>
  );
}

export default function InboxThreadScreen() {
  const params = useLocalSearchParams<{ phone?: string }>();
  let phone = typeof params.phone === "string" ? params.phone : "";
  try {
    phone = decodeURIComponent(phone);
  } catch {}
  const user = useAppSelector(selectCurrentUser);
  return <Thread key={`${user?.id}:${user?.salonId}:${phone}`} phone={phone} />;
}
