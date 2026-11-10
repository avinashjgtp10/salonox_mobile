import { useAuth } from "@/context/AuthContext";
import { canAccessLunox } from "@/utils/staffExperience";
/**
 * Lunox AI (prototype `lunox` sheet): a tall pearl sheet over the current tab with the
 * Lunox header, the conversation, suggestion chips and the "Ask Lunox anything…" bar.
 * Answers come from the existing backend endpoint /ai-assistant/ask-data.
 */
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated, Easing, Image, Keyboard, Modal, PanResponder, Pressable, ScrollView, StyleSheet,
  useWindowDimensions, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { pearl, pearlShadow } from "@/components/auth/pearl/tokens";
import { Icon } from "@/components/pearl/Icon";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";
import { useLunoxSuggestions } from "@/hooks/useLunoxSuggestions";
import { lunoxErrorMessage, lunoxService, type LunoxTurn } from "@/services/lunox.service";
import { LunoxMarkdown } from "./LunoxMarkdown";
import { isInvalidLunoxReply } from "@/utils/lunoxReply";

const LUNOX_MARK = require("../../../assets/images/brand/lunox-mark.png");
const LUNOX_WORD = require("../../../assets/images/brand/lunox-wordmark.png");

// Prototype .sheet-panel: transform .32s cubic-bezier(.2,.8,.2,1); .dim opacity .25s.
const PANEL_MS = 320;
const DIM_MS = 250;
const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);
const HISTORY_TURNS = 6; // the server keeps the last 6 turns
// .btn-primary / .send-b / .lx-btn gradient
const BUTTON_GRADIENT = ["#B3AEDA", "#8D87BF", "#6B669F"] as const;

const INTRO = "Hi! I’m Lunox. Ask me about your salon’s revenue, bookings, clients or staff.";

type Message =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; text: string }
  | { id: string; role: "error"; text: string; retry: string };

let nextId = 0;
const newId = () => `m${++nextId}`;

function LunoxSheetContent({ visible, onClose, seed }: { visible: boolean; onClose: () => void; seed?: string | null }) {
  const insets = useSafeAreaInsets();
  const { height: H } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const { suggestions, dismissSuggestion } = useLunoxSuggestions();
  // Measures how much the keyboard really covers this sheet; handles Android's
  // first keyboard report of height 0 (same hook as the sign-in screens).
  const keyboard = useKeyboardInset();
  const scrollRef = useRef<ScrollView>(null);
  const y = useRef(new Animated.Value(H)).current;
  const dim = useRef(new Animated.Value(0)).current;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      requestAnimationFrame(() => Animated.parallel([
        Animated.timing(y, { toValue: 0, duration: PANEL_MS, easing: EASE, useNativeDriver: true }),
        Animated.timing(dim, { toValue: 1, duration: DIM_MS, useNativeDriver: true }),
      ]).start());
    } else if (mounted) {
      Keyboard.dismiss();
      Animated.parallel([
        Animated.timing(y, { toValue: H, duration: PANEL_MS, easing: EASE, useNativeDriver: true }),
        Animated.timing(dim, { toValue: 0, duration: DIM_MS, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps -- animate only on open / close

  // Opened from the dashboard's AI insight card: start the chat with that tip so follow-ups have context.
  useEffect(() => {
    if (!visible || !seed) return;
    setMessages(list => (list.some(m => m.role === "assistant" && m.text === seed) ? list : [...list, { id: newId(), role: "assistant", text: seed }]));
  }, [seed, visible]);

  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_, g) => { if (g.dy > 0) y.setValue(g.dy); },
    onPanResponderRelease: (_, g) => (g.dy > 90 || g.vy > 1
      ? closeRef.current()
      : Animated.timing(y, { toValue: 0, duration: 180, easing: EASE, useNativeDriver: true }).start()),
  })).current;

  const ask = useCallback(async (question: string) => {
    const text = question.trim();
    if (!text || busy) return;
    // Only real questions and answers go back as history (no intro, no error notes).
    const history: LunoxTurn[] = messages
      .filter((m): m is Extract<Message, { role: "user" | "assistant" }> => m.role !== "error")
      .filter(m => m.role !== "assistant" || !isInvalidLunoxReply(m.text))
      .slice(-HISTORY_TURNS)
      .map(m => ({ role: m.role, content: m.text }));
    setDraft("");
    setBusy(true);
    setMessages(list => [...list.filter(m => m.role !== "error"), { id: newId(), role: "user", text }]);
    try {
      const reply = await lunoxService.ask(text, history);
      setMessages(list => [...list, { id: newId(), role: "assistant", text: reply }]);
    } catch (error) {
      setMessages(list => [...list, { id: newId(), role: "error", text: lunoxErrorMessage(error), retry: text }]);
    } finally {
      setBusy(false);
    }
  }, [busy, messages]);

  if (!mounted) return null;
  const canSend = draft.trim().length > 0 && !busy;
  const keyboardOpen = keyboard.inset > insets.bottom + 1;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View ref={keyboard.viewport} collapsable={false} onLayout={keyboard.onLayout} onTouchEndCapture={keyboard.onTouchEndCapture} style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.dim, { opacity: dim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close Lunox" />
      </Animated.View>
      <Animated.View accessibilityViewIsModal
        style={[styles.panel, { top: keyboardOpen ? insets.top + 12 : insets.top + 76, paddingBottom: keyboardOpen ? keyboard.inset + 12 : insets.bottom + 30, transform: [{ translateY: y }] }]}>
        <View {...pan.panHandlers} style={styles.grab}><View style={styles.handle} /></View>

        {/* Header: orb · wordmark · "Your salon assistant" · close */}
        <View style={styles.head} {...pan.panHandlers}>
          <View style={styles.headLeft}>
            <LunoxOrb />
            <View>
              <Image source={LUNOX_WORD} style={styles.word} resizeMode="contain" accessibilityLabel="lunox" />
              <Text translate style={styles.subtitle}>Your salon assistant</Text>
            </View>
          </View>
          <Pressable onPress={onClose} hitSlop={6} accessibilityRole="button" accessibilityLabel="Close"
            style={({ pressed }) => [styles.close, pressed && { opacity: 0.8 }]}>
            <Icon name="x" size={18} color={pearl.ink} />
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.chat}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          <View style={[styles.bubble, styles.ai]}><LunoxMarkdown text={INTRO} /></View>
          {messages.map((message: Message) => message.role === "user" ? (
            <LinearGradient key={message.id} colors={["#A7A2D0", "#7E78B0"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bubble, styles.me]}>
              <Text style={styles.meText}>{message.text}</Text>
            </LinearGradient>
          ) : message.role === "assistant" ? (
            <View key={message.id} style={[styles.bubble, styles.ai]}><LunoxMarkdown text={message.text} /></View>
          ) : (
            <View key={message.id} style={[styles.bubble, styles.ai]} accessibilityLiveRegion="polite">
              <Text style={styles.errorText}>{message.text}</Text>
              <Pressable onPress={() => void ask(message.retry)} style={({ pressed }) => [styles.ghost, pressed && { opacity: 0.8 }]} accessibilityRole="button">
                <Text translate style={styles.ghostText}>Try again</Text>
              </Pressable>
            </View>
          ))}
          {busy ? <ThinkingBubble /> : null}
        </ScrollView>

        {keyboardOpen || suggestions.length === 0 ? null : (
        <View style={styles.sugg}>
          {suggestions.map(question => (
            <View key={question} style={styles.chip}>
              <Pressable onPress={() => void ask(question)} disabled={busy} accessibilityRole="button"
                style={({ pressed }) => [styles.chipQuestion, (pressed || busy) && { opacity: 0.7 }]}>
                <Text style={styles.chipText}>{question}</Text>
              </Pressable>
              <Pressable onPress={() => dismissSuggestion(question)}
                accessibilityRole="button" accessibilityLabel={`Remove suggestion: ${question}`}
                style={({ pressed }) => [styles.chipClose, pressed && { opacity: 0.6 }]}>
                <Icon name="x" size={14} color={pearl.accentDeep} />
              </Pressable>
            </View>
          ))}
        </View>
        )}

        <View style={styles.askBar}>
          <Image source={LUNOX_MARK} style={{ width: 18, height: 18 }} resizeMode="contain" />
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask Lunox anything…"
            placeholderTextColor={pearl.muted}
            style={styles.input}
            maxLength={2000}
            returnKeyType="send"
            onSubmitEditing={() => void ask(draft)}
            submitBehavior="submit"
            editable={!busy}
            accessibilityLabel="Ask Lunox anything"
          />
          <Pressable onPress={() => void ask(draft)} disabled={!canSend} accessibilityRole="button" accessibilityLabel="Send"
            accessibilityState={{ disabled: !canSend }} style={({ pressed }) => [pressed && { opacity: 0.85 }, !canSend && { opacity: 0.55 }]}>
            <LinearGradient colors={BUTTON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.send}>
              <Icon name="send" size={19} color="#fff" strokeWidth={2} />
            </LinearGradient>
          </Pressable>
        </View>
      </Animated.View>
      </View>
    </Modal>
  );
}

/** .lunox-orb.lg — white pearl centre inside a lavender/lilac/sky ring. */
function LunoxOrb() {
  return (
    <LinearGradient colors={["#CFCBE8", "#C9B5EC", "#BCD6E8", "#A7A2D0"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.orbRing}>
      <LinearGradient colors={["#FFFFFF", "#FAF9FC", "#ECEBF2"]} start={{ x: 0.3, y: 0.15 }} end={{ x: 0.8, y: 1 }} style={styles.orbCore}>
        <Image source={LUNOX_MARK} style={{ width: 27, height: 27 }} resizeMode="contain" />
      </LinearGradient>
    </LinearGradient>
  );
}

/** "Lunox is thinking…" with three pulsing dots. */
function ThinkingBubble() {
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.stagger(160, dots.map(dot => Animated.sequence([
      Animated.timing(dot, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(dot, { toValue: 0.3, duration: 320, useNativeDriver: true }),
    ]))));
    loop.start();
    return () => loop.stop();
  }, [dots]);
  return (
    <View style={[styles.bubble, styles.ai, styles.thinking]} accessibilityLabel="Lunox is thinking">
      <Text translate style={styles.thinkingText}>Lunox is thinking</Text>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {dots.map((dot, index) => <Animated.View key={index} style={[styles.dot, { opacity: dot }]} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { backgroundColor: "rgba(59,57,80,0.22)" },
  // .screen.sheet .sheet-panel (tall)
  panel: {
    position: "absolute", left: 0, right: 0, bottom: 0, borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingHorizontal: 18, paddingTop: 10, gap: 14,
    backgroundColor: "#FAF9FC", borderTopWidth: 1, borderColor: "#FFFFFF",
    shadowColor: "#46446E", shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: -14 }, elevation: 16,
  },
  grab: { alignItems: "center", marginTop: -4, marginBottom: -8 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: "rgba(138,136,156,0.35)" },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  orbRing: {
    width: 52, height: 52, borderRadius: 26, padding: 2.5,
    shadowColor: "#1F3A45", shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 6 }, elevation: 5,
  },
  orbCore: { flex: 1, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  word: { height: 21, width: 72 },
  subtitle: { fontSize: 12.5, fontWeight: "500", color: pearl.muted, marginTop: 3 },
  // .icon-btn.glass.sm
  close: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: pearl.glass, borderWidth: 1, borderColor: pearl.glassBorder, ...pearlShadow.card },
  chat: { gap: 14, paddingBottom: 4 },
  // .bubble / .bubble.me / .bubble.ai
  bubble: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 20 },
  me: { alignSelf: "flex-end", maxWidth: "86%", borderBottomRightRadius: 6 },
  meText: { fontSize: 13.5, lineHeight: 19.5, fontWeight: "600", color: "#FFFFFF" },
  ai: { alignSelf: "flex-start", maxWidth: "94%", backgroundColor: "rgba(255,255,255,0.75)", borderWidth: 1, borderColor: "#FFFFFF", borderBottomLeftRadius: 6, gap: 10 },
  errorText: { fontSize: 13.5, lineHeight: 19.5, fontWeight: "600", color: pearl.dangerText },
  thinking: { flexDirection: "row", alignItems: "center", gap: 8 },
  thinkingText: { fontSize: 13.5, fontWeight: "600", color: pearl.muted },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: pearl.accent },
  // .lx-ghost
  ghost: { alignSelf: "flex-start", height: 36, paddingHorizontal: 12, borderRadius: 12, justifyContent: "center", backgroundColor: "rgba(255,255,255,0.6)", borderWidth: 1, borderColor: "rgba(255,255,255,0.9)" },
  ghostText: { fontSize: 13, fontWeight: "700", color: pearl.accentDeep },
  // .sugg
  sugg: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", maxWidth: "100%", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.6)", borderWidth: 1, borderColor: "rgba(255,255,255,0.9)" },
  chipQuestion: { flexShrink: 1, paddingVertical: 10, paddingLeft: 11, paddingRight: 4, minHeight: 44, justifyContent: "center" },
  chipClose: { width: 44, minHeight: 44, alignSelf: "stretch", alignItems: "center", justifyContent: "center" },
  chipText: { fontSize: 12, fontWeight: "700", color: pearl.accentDeep },
  // .ask-bar.glass / .mic / .send-b
  askBar: {
    flexDirection: "row", alignItems: "center", gap: 10, height: 56, paddingLeft: 14, paddingRight: 6, borderRadius: 20,
    backgroundColor: pearl.glass, borderWidth: 1, borderColor: pearl.glassBorder, ...pearlShadow.card,
  },
  input: { flex: 1, height: "100%", paddingVertical: 0, fontSize: 14.5, fontWeight: "500", color: pearl.ink },
  send: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});

export function LunoxSheet(props: { visible: boolean; onClose: () => void; seed?: string | null }) {
 const { user } = useAuth();
 return canAccessLunox(user) ? <LunoxSheetContent {...props} /> : null;
}
