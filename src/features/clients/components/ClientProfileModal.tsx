import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text } from "@/components/ui/AppTypography";
import { buildClientProfileMetrics } from "@/features/clients/utils/clientProfile";
import { getApiErrorMessage } from "@/services/api";
import { clientService } from "@/services/client.service";
import type { ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";
import type {
  ClientCommunication,
  ClientHistoryResult,
  ClientLedgerEntry,
  ClientNote,
  ClientReview,
} from "@/types/client";
import { formatCurrency } from "@/utils/currency";
import { formatAppDate } from "@/utils/dateTime";
import { maskPhone } from "@/utils/maskPhone";
import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Linking, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Same tabs, in the same order, as the web Client History modal (ClientHistoryDetail).
const TABS = [
  { key: "overview", label: "Overview" },
  { key: "history", label: "History" },
  { key: "services", label: "Services" },
  { key: "memberships", label: "Memberships" },
  { key: "packages", label: "Packages" },
  { key: "products", label: "Products" },
  { key: "payments", label: "Payments" },
  { key: "notes", label: "Notes" },
  { key: "ewallet", label: "E-Wallet" },
  { key: "referrals", label: "Referrals & Rewards" },
  { key: "communication", label: "Communication" },
  { key: "feedback", label: "Feedback & Review" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

type Loadable<T> = { loading: boolean; error: string | null; data: T | null };
const idle = <T,>(): Loadable<T> => ({ loading: false, error: null, data: null });

const WHATSAPP_GREEN = "#25D366";
const dash = (value: string | null | undefined) => (value && value.trim() ? value : "–");
const date = (value: string | null | undefined) => formatAppDate(value ?? null, "–");
const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "?";
// birthday_day_month is stored MM-DD; shown DD-MM(-YYYY) like the web.
const birthday = (dayMonth: string | null, year: number | null) => {
  const [mm, dd] = (dayMonth ?? "").split("-");
  if (!mm || !dd) return "–";
  return year ? `${dd}-${mm}-${year}` : `${dd}-${mm}`;
};
const toneOf = (status: string): "success" | "error" | "muted" => {
  const value = status.toLowerCase();
  if (["active", "paid", "completed", "credit", "earn", "delivered", "read", "sent"].includes(value)) return "success";
  if (["expired", "cancelled", "canceled", "failed", "debit", "redeem", "no_show", "refunded"].includes(value)) return "error";
  return "muted";
};
const titleCase = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

/**
 * The client profile as the web's Inbox "View Profile" shows it: header with
 * Book Appointment / Send WhatsApp, a stat bar, and the same twelve tabs.
 */
export function ClientProfileModal({
  clientId,
  onClose,
  onSendWhatsApp,
}: {
  clientId: string | null;
  onClose: () => void;
  /** Defaults to opening WhatsApp; the inbox passes "back to this chat". */
  onSendWhatsApp?: () => void;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [tab, setTab] = useState<TabKey>("overview");
  const [history, setHistory] = useState<Loadable<ClientHistoryResult>>(idle);
  const [notes, setNotes] = useState<Loadable<ClientNote[]>>(idle);
  const [ewallet, setEwallet] = useState<Loadable<ClientLedgerEntry[]>>(idle);
  const [rewards, setRewards] = useState<Loadable<{ points: ClientLedgerEntry[]; referral: ClientLedgerEntry[] }>>(idle);
  const [communications, setCommunications] = useState<Loadable<ClientCommunication[]>>(idle);
  const [reviews, setReviews] = useState<Loadable<ClientReview[]>>(idle);

  const loadHistory = useCallback(async (id: string) => {
    setHistory({ loading: true, error: null, data: null });
    try {
      setHistory({ loading: false, error: null, data: await clientService.getClientHistory(id) });
    } catch (error) {
      setHistory({ loading: false, error: getApiErrorMessage(error), data: null });
    }
  }, []);

  // A new client starts fresh on Overview; every lazy tab reloads on demand.
  useEffect(() => {
    setTab("overview");
    setNotes(idle());
    setEwallet(idle());
    setRewards(idle());
    setCommunications(idle());
    setReviews(idle());
    if (clientId) void loadHistory(clientId);
  }, [clientId, loadHistory]);

  // Like the web, the extra tabs fetch only the first time they're opened.
  useEffect(() => {
    if (!clientId) return;
    const lazy = <T,>(state: Loadable<T>, set: (next: Loadable<T>) => void, fetch: () => Promise<T>) => {
      if (state.loading || state.data || state.error) return;
      set({ loading: true, error: null, data: null });
      fetch()
        .then((data) => set({ loading: false, error: null, data }))
        .catch((error) => set({ loading: false, error: getApiErrorMessage(error), data: null }));
    };
    if (tab === "notes") lazy(notes, setNotes, () => clientService.getClientNotes(clientId));
    if (tab === "ewallet") lazy(ewallet, setEwallet, () => clientService.getClientLedger("ewallet", clientId));
    if (tab === "referrals") {
      lazy(rewards, setRewards, async () => {
        const [points, referral] = await Promise.all([
          clientService.getClientLedger("rewardPoints", clientId),
          clientService.getClientLedger("referral", clientId),
        ]);
        return { points, referral };
      });
    }
    if (tab === "communication") lazy(communications, setCommunications, () => clientService.getClientCommunications(clientId));
    if (tab === "feedback") lazy(reviews, setReviews, () => clientService.getClientReviews(clientId));
  }, [clientId, communications, ewallet, notes, reviews, rewards, tab]);

  const data = history.data;
  const client = data?.client ?? null;
  const metrics = useMemo(() => (data ? buildClientProfileMetrics(data) : null), [data]);
  const phone = client ? `${client.phoneCountryCode ?? ""}${client.phoneNumber}` : "";

  const leaveTo = (href: string) => {
    onClose();
    router.push(href as Href);
  };
  const sendWhatsApp = () => {
    if (onSendWhatsApp) return onSendWhatsApp();
    const digits = phone.replace(/\D/g, "");
    if (digits) void Linking.openURL(`https://wa.me/${digits}`);
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={!!clientId}>
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        {history.loading || (!data && !history.error) ? (
          <View style={styles.center}><ActivityIndicator color={Colors.primaryText} /><Text style={styles.muted}>Loading client profile…</Text></View>
        ) : history.error || !data || !client || !metrics ? (
          <View style={styles.center}>
            <Ionicons color={Colors.error} name="alert-circle-outline" size={30} />
            <Text style={styles.heading}>{"Couldn't load this client"}</Text>
            <Text style={[styles.muted, styles.centerText]}>{history.error ?? "Client not found."}</Text>
            <View style={styles.row}>
              {clientId ? <TouchableOpacity onPress={() => void loadHistory(clientId)} style={[styles.button, styles.primaryButton]}><Text style={styles.primaryButtonText}>Retry</Text></TouchableOpacity> : null}
              <TouchableOpacity onPress={onClose} style={[styles.button, styles.outlineButton]}><Text style={styles.heading}>Close</Text></TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <View style={styles.row}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{initials(client.fullName)}</Text></View>
                <View style={styles.headerCopy}>
                  <View style={[styles.row, styles.wrap]}>
                    <Text numberOfLines={1} style={styles.name}>{client.fullName}</Text>
                    {metrics.isGoldMember ? <View style={styles.goldBadge}><Ionicons color="#B7791F" name="star" size={11} /><Text style={styles.goldText}>Gold Member</Text></View> : null}
                    <TouchableOpacity accessibilityLabel="Edit client" hitSlop={8} onPress={() => leaveTo(`/clients/${client.id}/edit`)} style={styles.iconButton}><Ionicons color={Colors.heading} name="create-outline" size={16} /></TouchableOpacity>
                  </View>
                  {client.phoneNumber ? (
                    <View style={styles.row}>
                      <Ionicons color={Colors.text2} name="call-outline" size={13} />
                      <Text style={styles.contact}>{maskPhone(client.phoneNumber, client.phoneCountryCode)}</Text>
                      <TouchableOpacity accessibilityLabel="Open WhatsApp" hitSlop={8} onPress={sendWhatsApp} style={styles.waIcon}><Ionicons color="#FFFFFF" name="logo-whatsapp" size={14} /></TouchableOpacity>
                    </View>
                  ) : null}
                  {client.email ? <View style={styles.row}><Ionicons color={Colors.text2} name="mail-outline" size={13} /><Text numberOfLines={1} style={styles.contact}>{client.email}</Text></View> : null}
                  <Text style={styles.muted}>Customer Since: {date(client.createdAt)}</Text>
                </View>
                <TouchableOpacity accessibilityLabel="Close client profile" hitSlop={10} onPress={onClose} style={styles.closeButton}><Ionicons color={Colors.text2} name="close" size={24} /></TouchableOpacity>
              </View>
              <View style={styles.row}>
                <TouchableOpacity onPress={() => leaveTo(`/bookings/new?clientId=${encodeURIComponent(client.id)}`)} style={[styles.button, styles.flex, { backgroundColor: Colors.purple }]}>
                  <Ionicons color="#FFFFFF" name="calendar-outline" size={15} /><Text style={styles.actionText}>Book Appointment</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={sendWhatsApp} style={[styles.button, styles.flex, { backgroundColor: WHATSAPP_GREEN }]}>
                  <Ionicons color="#FFFFFF" name="logo-whatsapp" size={15} /><Text style={styles.actionText}>Send WhatsApp</Text>
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={styles.statBar} horizontal showsHorizontalScrollIndicator={false}>
                {[
                  ["Total Visits", String(metrics.totalVisits)],
                  ["Total Spend", formatCurrency(metrics.totalSpend)],
                  ["Avg. Ticket Size", formatCurrency(metrics.averageSpend)],
                  ["Last Visit", date(metrics.lastVisit)],
                  ["Next Appointment", date(metrics.nextAppointment)],
                ].map(([label, value]) => (
                  <View key={label} style={styles.statItem}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>
                ))}
              </ScrollView>
            </View>

            <View>
              <ScrollView contentContainerStyle={styles.tabs} horizontal showsHorizontalScrollIndicator={false}>
                {TABS.map((item) => (
                  <TouchableOpacity accessibilityState={{ selected: tab === item.key }} key={item.key} onPress={() => setTab(item.key)} style={[styles.tab, tab === item.key && styles.tabActive]}>
                    <Text style={[styles.tabText, tab === item.key && styles.tabTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <ScrollView contentContainerStyle={styles.body}>
              {tab === "overview" ? (
                <>
                  <View style={styles.grid}>
                    <StatCard label="Total Visits" styles={styles} value={String(metrics.totalVisits)} />
                    <StatCard label="Total Revenue" styles={styles} value={formatCurrency(metrics.totalSpend)} />
                    <StatCard label="Avg. Ticket Size" styles={styles} value={formatCurrency(metrics.averageSpend)} />
                    <StatCard label="E-Wallet Balance" styles={styles} value={formatCurrency(client.walletBalance)} />
                    <StatCard label="Reward Points Balance" styles={styles} value={String(client.rewardPointsBalance)} />
                    {client.referralCode ? <StatCard label="Referral Balance" styles={styles} value={formatCurrency(client.referralBalance)} /> : null}
                  </View>
                  <View style={styles.grid}>
                    <StatCard label="Service Revenue" styles={styles} sub={`${metrics.services.length} service${metrics.services.length === 1 ? "" : "s"}`} value={formatCurrency(metrics.serviceRevenue)} />
                    <StatCard label="Product Revenue" styles={styles} sub={`${metrics.products.length} product${metrics.products.length === 1 ? "" : "s"}`} value={formatCurrency(metrics.productRevenue)} />
                    <StatCard label="Package Revenue" styles={styles} sub={`${metrics.activePackageCount} active of ${data.packages.length}`} value={formatCurrency(metrics.packageRevenue)} />
                    <StatCard
                      label="Membership Revenue"
                      styles={styles}
                      sub={metrics.activeMembership
                        ? `Active · ${metrics.activeMembership.membershipName}${metrics.activeMembership.expiresAt ? ` · expires ${date(metrics.activeMembership.expiresAt)}` : ""}`
                        : "No active membership"}
                      value={formatCurrency(metrics.membershipRevenue)}
                    />
                  </View>
                  <View style={styles.card}>
                    {[
                      ["Client Name", client.fullName],
                      ["Mobile Number", client.phoneNumber ? maskPhone(client.phoneNumber, client.phoneCountryCode) : "–"],
                      ["Email", dash(client.email)],
                      ["Gender", dash(client.gender ? titleCase(client.gender) : "")],
                      ["Birth Date", birthday(client.birthdayDayMonth, client.birthdayYear)],
                      ["Member Since", date(client.createdAt)],
                      ["Last Visit", date(metrics.lastVisit)],
                      ["Next Appointment", date(metrics.nextAppointment)],
                      ["Active Memberships", String(data.stats.activeMemberships)],
                      ["Active Packages", String(data.stats.activePackages)],
                      ["Source", dash(client.clientSource)],
                      ...(client.referredBy ? [["Referred By", client.referredBy.fullName]] : []),
                      ...(client.referralCode ? [["Referral Code", client.referralCode]] : []),
                    ].map(([label, value], index) => (
                      <View key={label} style={[styles.infoRow, index > 0 && styles.divider]}>
                        <Text style={styles.infoLabel}>{label}</Text>
                        <Text selectable style={styles.infoValue}>{value}</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}

              {tab === "history" ? (
                <List empty="No visits yet." styles={styles}>
                  {data.history.map((item) => (
                    <ListRow key={item.id} styles={styles} title={item.title} subtitle={[item.dateLabel || date(item.date), item.staffName].filter(Boolean).join(" · ")} value={formatCurrency(item.amount)} status={item.paymentStatus || item.status} />
                  ))}
                </List>
              ) : null}

              {tab === "services" ? (
                <List empty="No services yet." styles={styles}>
                  {metrics.services.map((entry) => (
                    <ListRow key={entry.key} styles={styles} title={entry.name} subtitle={[date(entry.date), entry.invoiceNumber].filter(Boolean).join(" · ")} value={formatCurrency(entry.totalPrice)} />
                  ))}
                </List>
              ) : null}

              {tab === "memberships" ? (
                <List empty="No memberships yet." styles={styles}>
                  {data.memberships.map((membership) => (
                    <ListRow
                      key={membership.id}
                      styles={styles}
                      title={membership.membershipName}
                      subtitle={[`Bought ${date(membership.purchasedAt)}`, membership.expiresAt ? `Expires ${date(membership.expiresAt)}` : null, membership.totalSessions > 0 ? `${membership.usedSessions}/${membership.totalSessions} sessions used` : null].filter(Boolean).join(" · ")}
                      value={formatCurrency(membership.pricePaid)}
                      status={membership.status}
                    />
                  ))}
                </List>
              ) : null}

              {tab === "packages" ? (
                <List empty="No packages yet." styles={styles}>
                  {metrics.packages.map((pkg) => (
                    <ListRow
                      key={pkg.id}
                      styles={styles}
                      title={pkg.packageName}
                      subtitle={[`${pkg.remainingSessions}/${pkg.totalSessions} sessions left`, pkg.expiryDate ? `Expires ${date(pkg.expiryDate)}` : null, pkg.pendingAmount > 0 ? `Due ${formatCurrency(pkg.pendingAmount)}` : null].filter(Boolean).join(" · ")}
                      value={formatCurrency(pkg.totalAmount)}
                      status={pkg.status}
                    />
                  ))}
                </List>
              ) : null}

              {tab === "products" ? (
                <List empty="No products yet." styles={styles}>
                  {metrics.products.map((entry) => (
                    <ListRow key={entry.key} styles={styles} title={`${entry.name}${entry.quantity > 1 ? ` × ${entry.quantity}` : ""}`} subtitle={[date(entry.date), entry.invoiceNumber].filter(Boolean).join(" · ")} value={formatCurrency(entry.totalPrice)} />
                  ))}
                </List>
              ) : null}

              {tab === "payments" ? (
                <List empty="No payments yet." styles={styles}>
                  {[...data.sales].sort((left, right) => (right.createdAt ?? "").localeCompare(left.createdAt ?? "")).map((sale) => (
                    <ListRow key={sale.id} styles={styles} title={sale.invoiceNumber || "Invoice"} subtitle={[date(sale.createdAt), sale.paymentMethod ? titleCase(sale.paymentMethod) : null].filter(Boolean).join(" · ")} value={formatCurrency(sale.totalAmount)} status={sale.status} />
                  ))}
                </List>
              ) : null}

              {tab === "notes" ? (
                <Lazy state={notes} styles={styles} Colors={Colors}>
                  {(rows) => {
                    // Like the web, booking notes show here too (read-only), next to client notes.
                    const merged = [
                      ...rows.map((note) => ({ id: note.id, text: note.note, by: note.staffName, at: note.createdAt, tag: null as string | null })),
                      ...data.appointments.filter((appointment) => appointment.notes.trim()).map((appointment) => ({ id: `booking-${appointment.id}`, text: appointment.notes, by: appointment.staffName, at: appointment.scheduledAt, tag: "Booking note" })),
                    ].sort((left, right) => (right.at ?? "").localeCompare(left.at ?? ""));
                    return (
                      <List empty="No notes yet." styles={styles}>
                        {merged.map((note) => (
                          <View key={note.id} style={styles.listRow}>
                            <View style={styles.flex}>
                              <Text selectable style={styles.rowTitle}>{note.text}</Text>
                              <Text style={styles.muted}>{[date(note.at), note.by, note.tag].filter(Boolean).join(" · ")}</Text>
                            </View>
                          </View>
                        ))}
                      </List>
                    );
                  }}
                </Lazy>
              ) : null}

              {tab === "ewallet" ? (
                <>
                  <View style={styles.grid}><StatCard label="E-Wallet Balance" styles={styles} value={formatCurrency(client.walletBalance)} /></View>
                  <Lazy state={ewallet} styles={styles} Colors={Colors}>
                    {(rows) => <LedgerList empty="No e-wallet activity yet." money rows={rows} styles={styles} />}
                  </Lazy>
                </>
              ) : null}

              {tab === "referrals" ? (
                <>
                  <View style={styles.grid}>
                    <StatCard label="Reward Points Balance" styles={styles} value={String(client.rewardPointsBalance)} />
                    <StatCard label="Referral Balance" styles={styles} value={formatCurrency(client.referralBalance)} />
                    <StatCard label="Successful Referrals" styles={styles} value={String(client.totalSuccessfulReferrals)} />
                    <StatCard label="Referral Earnings" styles={styles} value={formatCurrency(client.totalReferralEarnings)} sub={client.referralCode ? `Code ${client.referralCode}` : undefined} />
                  </View>
                  <Lazy state={rewards} styles={styles} Colors={Colors}>
                    {({ points, referral }) => (
                      <>
                        <Text style={styles.sectionTitle}>Reward Points</Text>
                        <LedgerList empty="No reward points activity yet." rows={points} styles={styles} />
                        <Text style={styles.sectionTitle}>Referral</Text>
                        <LedgerList empty="No referral activity yet." money rows={referral} styles={styles} />
                      </>
                    )}
                  </Lazy>
                </>
              ) : null}

              {tab === "communication" ? (
                <Lazy state={communications} styles={styles} Colors={Colors}>
                  {(rows) => (
                    <List empty="No messages sent to this client yet." styles={styles}>
                      {rows.map((entry) => (
                        <ListRow key={entry.id} styles={styles} title={entry.label || "WhatsApp message"} subtitle={[date(entry.sentAt), entry.source ? titleCase(entry.source) : null, "WhatsApp"].filter(Boolean).join(" · ")} status={entry.status} />
                      ))}
                    </List>
                  )}
                </Lazy>
              ) : null}

              {tab === "feedback" ? (
                <Lazy state={reviews} styles={styles} Colors={Colors}>
                  {(rows) => (
                    <List empty="No feedback yet." styles={styles}>
                      {rows.map((review) => (
                        <View key={review.id} style={styles.listRow}>
                          <View style={[styles.flex, { gap: 4 }]}>
                            <View style={styles.row}>
                              {[1, 2, 3, 4, 5].map((star) => <Ionicons color="#F5A623" key={star} name={star <= Math.round(review.rating) ? "star" : "star-outline"} size={14} />)}
                              <Text style={styles.muted}>{[date(review.createdAt), review.staffName].filter(Boolean).join(" · ")}</Text>
                            </View>
                            {review.serviceRatings.map((entry, index) => <Text key={`${review.id}-${index}`} style={styles.muted}>{`${entry.serviceName}${entry.staffName ? ` (${entry.staffName})` : ""}: ${entry.rating}/5`}</Text>)}
                            {review.improvementTags.length ? <Text style={styles.muted}>Could improve: {review.improvementTags.join(", ")}</Text> : null}
                            {review.comments ? <Text selectable style={styles.rowTitle}>{review.comments}</Text> : null}
                          </View>
                        </View>
                      ))}
                    </List>
                  )}
                </Lazy>
              ) : null}
            </ScrollView>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

type Styles = ReturnType<typeof createStyles>;

function StatCard({ label, styles, sub, value }: { label: string; styles: Styles; sub?: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.statCardValue}>{value}</Text>
      <Text style={styles.statCardLabel}>{label}</Text>
      {sub ? <Text numberOfLines={2} style={styles.muted}>{sub}</Text> : null}
    </View>
  );
}

function List({ children, empty, styles }: { children: ReactNode[] | ReactNode; empty: string; styles: Styles }) {
  const items = Array.isArray(children) ? children : [children];
  return <View style={styles.card}>{items.length ? children : <Text style={[styles.muted, styles.emptyText]}>{empty}</Text>}</View>;
}

function ListRow({ status, styles, subtitle, title, value }: { status?: string; styles: Styles; subtitle?: string; title: string; value?: string }) {
  const tone = status ? toneOf(status) : null;
  return (
    <View style={styles.listRow}>
      <View style={styles.flex}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
      </View>
      <View style={styles.rowEnd}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {status ? <Text style={[styles.badge, tone === "success" ? styles.badgeSuccess : tone === "error" ? styles.badgeError : styles.badgeMuted]}>{titleCase(status)}</Text> : null}
      </View>
    </View>
  );
}

function LedgerList({ empty, money = false, rows, styles }: { empty: string; money?: boolean; rows: ClientLedgerEntry[]; styles: Styles }) {
  const show = (value: number) => (money ? formatCurrency(value) : String(value));
  return (
    <List empty={empty} styles={styles}>
      {rows.map((entry) => {
        const negative = ["debit", "redeem"].includes(entry.type.toLowerCase());
        return (
          <ListRow
            key={entry.id}
            styles={styles}
            title={entry.note || (entry.sourceType ? titleCase(entry.sourceType) : titleCase(entry.type))}
            subtitle={`${date(entry.createdAt)} · Balance ${show(entry.balanceAfter)}`}
            value={`${negative ? "−" : "+"}${show(Math.abs(entry.amount))}`}
            status={entry.type}
          />
        );
      })}
    </List>
  );
}

function Lazy<T>({ children, Colors, state, styles }: { children: (data: T) => ReactNode; Colors: ThemeColors; state: Loadable<T>; styles: Styles }) {
  if (state.error) return <View style={styles.card}><Text style={[styles.errorText, styles.emptyText]}>{state.error}</Text></View>;
  if (!state.data) return <View style={styles.card}><ActivityIndicator color={Colors.primaryText} /></View>;
  return <>{children(state.data)}</>;
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  actionText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  avatar: { alignItems: "center", alignSelf: "flex-start", backgroundColor: Colors.purple, borderRadius: 30, height: 60, justifyContent: "center", width: 60 },
  avatarText: { color: "#FFFFFF", fontSize: 22, fontWeight: "800" },
  badge: { borderRadius: 6, fontSize: 10, fontWeight: "800", overflow: "hidden", paddingHorizontal: 7, paddingVertical: 3 },
  badgeError: { backgroundColor: Colors.errorBg, color: Colors.error },
  badgeMuted: { backgroundColor: Colors.backgroundElement, color: Colors.text2 },
  badgeSuccess: { backgroundColor: Colors.successBg, color: Colors.success },
  body: { gap: 12, padding: 16, paddingBottom: 32 },
  button: { alignItems: "center", borderRadius: 12, flexDirection: "row", gap: 6, justifyContent: "center", minHeight: 44, paddingHorizontal: 14 },
  card: { backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 4 },
  center: { alignItems: "center", flex: 1, gap: 10, justifyContent: "center", padding: 24 },
  centerText: { textAlign: "center" },
  closeButton: { alignSelf: "flex-start" },
  contact: { color: Colors.text, flexShrink: 1, fontSize: 13 },
  divider: { borderTopColor: Colors.divider, borderTopWidth: StyleSheet.hairlineWidth },
  emptyText: { paddingVertical: 18, textAlign: "center" },
  errorText: { color: Colors.error, fontSize: 13 },
  flex: { flex: 1, minWidth: 0 },
  goldBadge: { alignItems: "center", backgroundColor: "#FEF3C7", borderRadius: 12, flexDirection: "row", gap: 3, paddingHorizontal: 8, paddingVertical: 3 },
  goldText: { color: "#B7791F", fontSize: 11, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  header: { backgroundColor: Colors.card, borderBottomColor: Colors.border, borderBottomWidth: 1, gap: 14, padding: 16 },
  headerCopy: { flex: 1, gap: 4, minWidth: 0 },
  heading: { color: Colors.heading, fontSize: 16, fontWeight: "800" },
  iconButton: { alignItems: "center", borderColor: Colors.border, borderRadius: 8, borderWidth: 1, height: 28, justifyContent: "center", width: 28 },
  infoLabel: { color: Colors.text2, flex: 1, fontSize: 13 },
  infoRow: { alignItems: "center", flexDirection: "row", gap: 12, paddingVertical: 12 },
  infoValue: { color: Colors.heading, flex: 1, fontSize: 13, fontWeight: "700", textAlign: "right" },
  listRow: { alignItems: "center", borderTopColor: Colors.divider, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 12, paddingVertical: 12 },
  muted: { color: Colors.text2, fontSize: 12 },
  name: { color: Colors.heading, flexShrink: 1, fontSize: 19, fontWeight: "900" },
  outlineButton: { borderColor: Colors.border, borderWidth: 1 },
  primaryButton: { backgroundColor: Colors.primary },
  primaryButtonText: { color: Colors.onPrimary, fontWeight: "800" },
  row: { alignItems: "center", flexDirection: "row", gap: 8 },
  rowEnd: { alignItems: "flex-end", gap: 4 },
  rowTitle: { color: Colors.heading, fontSize: 14, fontWeight: "700" },
  rowValue: { color: Colors.heading, fontSize: 14, fontWeight: "800" },
  safeArea: { backgroundColor: Colors.bg, flex: 1 },
  sectionTitle: { color: Colors.heading, fontSize: 15, fontWeight: "800", marginTop: 4 },
  statBar: { gap: 22, paddingRight: 8 },
  statCard: { backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: 14, borderWidth: 1, flexBasis: "47%", flexGrow: 1, gap: 4, padding: 14 },
  statCardLabel: { color: Colors.text, fontSize: 13, fontWeight: "600" },
  statCardValue: { color: Colors.heading, fontSize: 20, fontWeight: "900" },
  statItem: { alignItems: "center", gap: 2 },
  statLabel: { color: Colors.text2, fontSize: 11 },
  statValue: { color: Colors.heading, fontSize: 15, fontWeight: "900" },
  tab: { borderBottomColor: "transparent", borderBottomWidth: 3, justifyContent: "center", minHeight: 46, paddingHorizontal: 12 },
  tabActive: { borderBottomColor: Colors.purple },
  tabText: { color: Colors.text, fontSize: 14, fontWeight: "600" },
  tabTextActive: { color: Colors.purple, fontWeight: "800" },
  tabs: { borderBottomColor: Colors.border, borderBottomWidth: 1, paddingHorizontal: 8 },
  waIcon: { alignItems: "center", backgroundColor: WHATSAPP_GREEN, borderRadius: 6, height: 22, justifyContent: "center", width: 22 },
  wrap: { flexWrap: "wrap" },
});
