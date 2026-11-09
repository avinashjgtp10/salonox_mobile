import { LinearGradient } from "expo-linear-gradient";
import { router, type Href } from "expo-router";
import { useRef, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { pearl, pearlGradients, pearlShadow } from "@/components/auth/pearl/tokens";
import { Icon, type IconName } from "@/components/pearl/Icon";
import { Page } from "@/components/pearl/Page";
import { Card, Divider, IconButton, SectionHeader, StatusPill, Tile } from "@/components/pearl/ui";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text } from "@/components/ui/AppTypography";
import { useAppToast } from "@/hooks/useAppToast";
import { getApiErrorMessage } from "@/services/api";
import { supportService } from "@/services/support.service";

export type DisconnectedScreen = "whatsapp" | "marketing" | "insights";
type Row = { icon: IconName; title: string; body: string };
const tones = ["lavender", "lilac", "sky", "lavender"] as const;
const benefits: Row[] = [
  { icon: "calendar", title: "Automatic booking confirmations", body: "Sent the moment an appointment is booked" },
  { icon: "clock", title: "Reminders that cut no-shows", body: "A day and 2 hours before each visit" },
  { icon: "send", title: "Campaigns & offers", body: "Birthday wishes, win-backs, festive offers" },
  { icon: "chat", title: "One shared inbox", body: "Every client reply, right inside SalonOX" },
];
const prerequisites: Row[] = [
  { icon: "phone", title: "A phone number for the business", body: "It can’t be active on the WhatsApp app at the same time" },
  { icon: "idCard", title: "Your Facebook / Meta login", body: "Used to create or pick your Meta Business account" },
  { icon: "store", title: "Business name & category", body: "Shown to clients on your WhatsApp profile" },
];
const charges: Row[] = [
  { icon: "send", title: "Marketing", body: "Offers, festive campaigns, win-backs · charged per message" },
  { icon: "check", title: "Utility", body: "Booking confirmations & reminders · lower rate" },
  { icon: "shield", title: "Authentication", body: "Login codes · lowest rate" },
  { icon: "chat", title: "Service replies", body: "Free when you reply within 24 hours of a client’s message" },
];
const ideas: (Row & { audience: string })[] = [
  { icon: "gift", title: "Birthday wishes + 15% off", body: "Sent automatically on each client’s birthday", audience: "— birthdays this week" },
  { icon: "repeat", title: "Win back lapsed clients", body: "For clients who haven’t visited in 60 days", audience: "— clients" },
  { icon: "sparkles", title: "Festive offer", body: "A one-time offer for Diwali or Eid", audience: "All opted-in · —" },
];

function Rows({ rows, offset = 0 }: { rows: Row[]; offset?: number }) {
  return <Card style={styles.list}>{rows.map((row, index) => <View key={row.title}>
    {index > 0 ? <Divider inset={66} /> : null}
    <View style={styles.row}>
      <Tile icon={row.icon} tone={tones[(index + offset) % tones.length]} size={38} />
      <View style={styles.grow}><Text translate style={styles.rowTitle}>{row.title}</Text><Text style={styles.body}>{row.body}</Text></View>
    </View>
  </View>)}</Card>;
}

function Note({ children }: { children: ReactNode }) {
  return <View style={styles.note}><Icon name="info" size={18} color="#6A4F98" /><Text style={styles.noteText}>{children}</Text></View>;
}

function ConnectButton({ onPress, small = false }: { onPress: () => void; small?: boolean }) {
  return <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [small && { alignSelf: "center" }, pressed && styles.pressed]}>
    <LinearGradient colors={pearlGradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.primary, pearlShadow.button, small && styles.smallPrimary]}>
      {!small ? <Icon name="chat" size={20} color="#fff" /> : null}
      <Text translate style={[styles.primaryText, small && { fontSize: 13 }]}>Connect WhatsApp</Text>
    </LinearGradient>
  </Pressable>;
}

export function WhatsAppDisconnectedScreen({ screen, salonId, embedded, loading, checking, onCheckAgain }: {
  screen: DisconnectedScreen; salonId: string; embedded: boolean; loading: boolean; checking: boolean; onCheckAgain: () => void;
}) {
  const toast = useAppToast();
  const sending = useRef(false);
  const [requestState, setRequestState] = useState<"idle" | "sending" | "sent">("idle");
  const back = () => router.canGoBack() ? router.back() : router.replace("/(tabs)/dashboard");
  const connect = () => screen === "whatsapp"
    ? toast.showInfo("WhatsApp connection setup is not available in the app yet. Ask our team to set it up below.")
    : router.push("/(tabs)/whatsapp" as Href);
  const draft = () => toast.showInfo("Campaign drafting is not available in the app yet.");
  const requestHelp = async () => {
    if (sending.current || requestState === "sent") return;
    if (!salonId) { toast.showError("No salon associated with this account"); return; }
    sending.current = true;
    setRequestState("sending");
    try {
      // /support derives salon_id from the authenticated session on the server.
      // Never accept a client-selected salon ID for this request.
      await supportService.submitRequest({ category: "technical", priority: "medium", subject: "WhatsApp setup request", message: "Please help set up WhatsApp Business for my salon in SalonOX. I requested assistance from the WhatsApp not connected screen." });
      setRequestState("sent");
      toast.showSuccess("A SalonOX specialist will call you within 1 working day");
    } catch (error) {
      setRequestState("idle");
      toast.showError(getApiErrorMessage(error));
    } finally { sending.current = false; }
  };

  return <View style={styles.root}>
    <Page refreshing={checking && !loading} onRefresh={onCheckAgain}>
      {screen === "whatsapp" ? <View style={styles.whatsappHeader}>
        {!embedded ? <IconButton icon="chevronLeft" label="Back" onPress={back} /> : null}
        <View><Text translate style={styles.heading}>WhatsApp</Text><View style={styles.status}><View style={styles.offDot} /><Text translate style={styles.body}>Not connected yet</Text></View></View>
      </View> : <View style={styles.pageHeader}><IconButton icon="chevronLeft" label="Back" onPress={back} /><View style={styles.grow}><Text translate style={styles.heading}>{screen === "marketing" ? "Marketing" : "WhatsApp insights"}</Text><Text translate style={styles.body}>{screen === "marketing" ? "WhatsApp campaigns" : "From Meta billing"}</Text></View>
        {screen === "marketing" ? <IconButton icon="chart" label="Insights" onPress={() => router.push("/marketing/insights" as Href)} /> : null}</View>}
      {loading ? <View style={styles.loading}><ActivityIndicator color={pearl.accent} /></View> : screen === "whatsapp" ? <>
        <Card style={styles.hero}>
          <View style={styles.illustration}>
            <View style={styles.heroIcon}><Icon name="chat" size={34} color={pearl.accentDeep} /></View>
            <View style={[styles.bubble, styles.firstBubble]}><Text translate style={styles.bubbleText}>Booking confirmed ✓</Text></View>
            <View style={[styles.bubble, styles.secondBubble]}><Text translate style={styles.bubbleText}>See you at 4 PM 💇‍♀️</Text></View>
          </View>
          <Text translate style={[styles.heading, styles.center, { fontSize: 22 }]}>Talk to clients on WhatsApp</Text>
          <Text translate style={[styles.body, styles.center, { fontSize: 13, lineHeight: 19.5 }]}>Connect your salon’s WhatsApp Business number once. SalonOX then sends confirmations, reminders and offers for you, and replies land here.</Text>
          <ConnectButton onPress={connect} />
          <Text translate style={[styles.hint, styles.center]}>Takes about 5 minutes · free to connect · Meta charges per conversation</Text>
        </Card>
        <SectionHeader title="What you’ll unlock" /><Rows rows={benefits} />
        <SectionHeader title="Before you start" /><Rows rows={prerequisites} offset={1} />
        <Note><Text translate style={styles.bold}>Already use WhatsApp Business on this number?</Text> Delete that account in the app first (Settings → Account → Delete), or use a different number. Your chats there won’t move over.</Note>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: requestState !== "idle", busy: requestState === "sending" }} disabled={requestState !== "idle"} onPress={requestHelp} style={({ pressed }) => [styles.help, pressed && styles.pressed]}>
          {requestState === "sending" ? <ActivityIndicator color={pearl.accentDeep} size="small" /> : requestState === "sent" ? <Icon name="check" size={18} color={pearl.accentDeep} /> : null}
          <Text translate style={styles.helpText}>Need help? Ask our team to set it up</Text>
        </Pressable>
      </> : screen === "marketing" ? <>
        <Card style={styles.connectionCard}>
          <View style={styles.connectionRow}><Tile icon="chat" tone="neutral" size={40} /><View style={styles.grow}><Text translate style={styles.rowTitle}>WhatsApp not connected</Text><View style={styles.status}><View style={styles.offDot} /><Text translate style={[styles.body, styles.grow]}>Connect a business number to start</Text></View></View><StatusPill tone="neutral" label="Not set up" /></View>
          <ConnectButton onPress={connect} />
        </Card>
        <LinearGradient colors={["rgba(255,255,255,0.7)", "rgba(214,196,240,0.45)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ready}>
          <Tile icon="users" tone="lilac" size={44} /><View style={styles.grow}><Text translate style={styles.value}>— clients</Text><Text translate style={styles.body}>have agreed to receive WhatsApp offers. They’re ready the moment you connect.</Text></View>
        </LinearGradient>
        <SectionHeader title="Campaign ideas" action="You can draft now" />
        <Card style={styles.list}>{ideas.map((idea, index) => <View key={idea.title}>
          {index > 0 ? <Divider /> : null}
          <Pressable accessibilityRole="button" accessibilityLabel={`Draft: ${idea.title}`} onPress={draft} style={({ pressed }) => [styles.row, { alignItems: "flex-start" }, pressed && styles.pressed]}>
            <Tile icon={idea.icon} tone={tones[index]} size={40} /><View style={styles.grow}><Text translate style={styles.rowTitle}>{idea.title}</Text><Text style={styles.body}>{idea.body}</Text><View style={styles.audience}><Icon name="users" size={12} color="#6A4F98" /><Text style={styles.audienceText}>{idea.audience}</Text></View></View><View style={styles.draft}><Text translate style={styles.draftText}>Draft</Text></View>
          </Pressable>
        </View>)}</Card>
        <SectionHeader title="After you connect, you’ll see" />
        <View style={styles.stats}>{([{ icon: "send", label: "Campaigns", hint: "Sent & scheduled" }, { icon: "check", label: "Delivered", hint: "Reached phones" }, { icon: "eye", label: "Read", hint: "Opened by clients" }] as const).map((stat, i) => <Card key={stat.label} style={styles.stat}><Tile icon={stat.icon} tone={tones[i]} size={34} /><Text translate style={styles.statLabel}>{stat.label}</Text><Text translate style={styles.value}>—</Text><Text style={styles.hint}>{stat.hint}</Text></Card>)}</View>
        <Card style={styles.limit}><View style={styles.between}><Text translate style={styles.hint}>Daily message limit</Text><Text translate style={[styles.hint, styles.bold, { color: pearl.ink }]}>Starts at 250 a day</Text></View><View style={styles.track} /><Text translate style={styles.hint}>Meta raises the limit as your number keeps a good quality rating.</Text></Card>

      </> : <>
        <Card style={styles.empty}><Tile icon="chart" tone="lilac" size={52} /><Text translate style={[styles.rowTitle, styles.center, { marginTop: 6 }]}>No WhatsApp spend yet</Text><Text translate style={[styles.body, styles.center]}>Once WhatsApp is connected, your Meta charges and message counts appear here, updated daily.</Text><View style={{ marginTop: 8 }}><ConnectButton small onPress={connect} /></View></Card>
        <SectionHeader title="How Meta charges for WhatsApp" /><Rows rows={charges} />
        <Note>Meta bills you directly. Rates vary by country and exclude 18% GST. SalonOX doesn’t add a markup.</Note>
      </>}
    </Page>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, grow: { flex: 1, minWidth: 0 }, center: { textAlign: "center" }, bold: { fontWeight: "700" }, pressed: { opacity: 0.75 },
  heading: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5, color: pearl.ink },
  whatsappHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 8, paddingBottom: 4 },
  pageHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 8, paddingBottom: 12 },
  status: { flexDirection: "row", alignItems: "center", gap: 5 }, offDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: pearl.muted },
  body: { fontSize: 12.5, lineHeight: 18, fontWeight: "500", color: pearl.muted, marginTop: 2 },
  hint: { fontSize: 11.5, lineHeight: 16.1, fontWeight: "500", color: pearl.muted },
  rowTitle: { fontSize: 14.5, fontWeight: "700", color: pearl.ink },
  list: { paddingVertical: 4 }, row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  hero: { borderRadius: 26, paddingVertical: 20, paddingHorizontal: 18, gap: 12 },
  illustration: { height: 118, alignItems: "center", justifyContent: "center" },
  heroIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: "rgba(230,227,243,0.6)", alignItems: "center", justifyContent: "center" },
  bubble: { position: "absolute", paddingVertical: 7, paddingHorizontal: 11, borderRadius: 14, shadowColor: "#1F3A45", shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  firstBubble: { left: 8, top: 12, borderBottomLeftRadius: 4, backgroundColor: "rgba(220,248,198,0.95)" },
  secondBubble: { right: 6, bottom: 10, borderBottomRightRadius: 4, backgroundColor: "#fff" }, bubbleText: { fontSize: 11.5, fontWeight: "700", color: pearl.ink },
  primary: { minHeight: 52, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  primaryText: { fontSize: 15.5, fontWeight: "700", color: "#fff" }, smallPrimary: { minHeight: 36, borderRadius: 12, paddingVertical: 8 },
  note: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: "rgba(214,196,240,0.3)", borderWidth: 1, borderColor: "rgba(255,255,255,0.8)" },
  noteText: { flex: 1, fontSize: 12.5, lineHeight: 18.125, fontWeight: "500", color: pearl.ink2 },
  help: { minHeight: 48, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.6)", borderWidth: 1, borderColor: pearl.glassBorder, padding: 12, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" },
  helpText: { fontSize: 14, fontWeight: "700", color: pearl.ink, textAlign: "center", flexShrink: 1 },
  loading: { minHeight: 240, alignItems: "center", justifyContent: "center" },
  connectionCard: { padding: 14, gap: 12 }, connectionRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  ready: { padding: 14, borderRadius: 22, borderWidth: 1, borderColor: pearl.glassBorder, flexDirection: "row", alignItems: "center", gap: 12 }, value: { fontSize: 19, fontWeight: "800", color: pearl.ink },
  audience: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8, backgroundColor: "rgba(214,196,240,0.5)" },
  audienceText: { fontSize: 11, fontWeight: "700", color: "#6A4F98", flexShrink: 1 },
  draft: { minHeight: 36, paddingHorizontal: 14, borderRadius: 12, marginTop: 2, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.65)", borderWidth: 1, borderColor: "#fff" }, draftText: { fontSize: 13, fontWeight: "700", color: pearl.accentDeep },
  stats: { flexDirection: "row", gap: 10, opacity: 0.6 }, stat: { flex: 1, padding: 12, borderRadius: 20, gap: 4 }, statLabel: { fontSize: 12, color: pearl.muted, fontWeight: "600", marginTop: 6 },
  limit: { opacity: 0.6, paddingVertical: 12, paddingHorizontal: 14, gap: 8 }, between: { flexDirection: "row", justifyContent: "space-between", gap: 8 }, track: { height: 7, borderRadius: 4, backgroundColor: "rgba(120,118,150,0.14)" },
  empty: { paddingVertical: 22, paddingHorizontal: 16, alignItems: "center", gap: 6 },
});
