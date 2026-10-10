import { maskPhone } from "@/utils/maskPhone";
import { Text } from "@/components/ui/AppTypography";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { inboxService } from "@/services/inbox.service";
import { packageService } from "@/services/package.service";
import { getApiErrorMessage } from "@/services/api";
import type { InboxCustomer } from "@/types/inbox";
import type { ClientPackage } from "@/types/package";
import { inboxAvatar } from "@/utils/inboxPresentation";
import { formatAppDate } from "@/utils/dateTime";
import { useInboxTheme } from "./inboxTheme";

const dateLabel = (value: string | null) => formatAppDate(value, "—");

export function CustomerPanel({ phone, onClose }: { phone: string; onClose: () => void }) {
  const { styles: s, palette: p } = useInboxTheme();
  const [customer, setCustomer] = useState<InboxCustomer | null>(null);
  const [packages, setPackages] = useState<ClientPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packageError, setPackageError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const reload = useCallback(() => setRetry(value => value + 1), []);
  useEffect(() => {
    let current = true;
    setLoading(true); setCustomer(null); setPackages([]); setError(null); setPackageError(null);
    void (async () => {
      try {
        const info = await inboxService.getCustomer(phone);
        if (!current) return;
        setCustomer(info);
        if (info?.id) {
          try {
            const items = await packageService.getClientPackages(info.id);
            if (current) setPackages(items);
          } catch (err) { if (current) setPackageError(getApiErrorMessage(err)); }
        }
      } catch (err) { if (current) setError(getApiErrorMessage(err)); }
      finally { if (current) setLoading(false); }
    })();
    return () => { current = false; };
  }, [phone, retry]);
  const avatar = inboxAvatar(customer?.fullName, phone);
  return <View style={[s.fill, s.customer]}>
    <View style={s.header}>
      <Text style={[s.heading, s.fill]}>Customer Info</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close customer info" onPress={onClose} style={s.icon}><Ionicons name="close" size={22} color={p.muted} /></TouchableOpacity>
    </View>
    {loading ? <View style={s.empty}><ActivityIndicator color={p.accent} /><Text style={s.muted}>Loading customer details…</Text></View>
      : error ? <View style={s.empty}><Text style={s.error}>{error}</Text><TouchableOpacity accessibilityRole="button" onPress={reload} style={s.button}><Text style={s.accentText}>Retry</Text></TouchableOpacity></View>
      : !customer ? <View style={s.empty}><Ionicons name="person-outline" size={38} color={p.muted} /><Text style={s.heading}>Not a saved client yet</Text><Text style={s.emptyText}>{maskPhone(phone)} hasn’t been added to your Clients list.</Text></View>
      : <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={s.profile}>
          <View style={[s.avatar, s.largeAvatar, { backgroundColor: p.accent }]}><Text style={[s.avatarText, { fontSize: 26 }]}>{avatar.initials}</Text></View>
          <Text style={s.heading}>{customer.fullName || maskPhone(phone)}</Text><Text selectable style={s.muted}>{maskPhone(phone)}</Text>
          <TouchableOpacity accessibilityRole="button" style={s.button} onPress={() => { onClose(); router.push(`/clients/${customer.id}` as Href); }}><Text style={s.accentText}>View Profile →</Text></TouchableOpacity>
        </View>
        <View style={s.stats}>
          {[
            ["Total Visits", String(customer.totalVisits)], ["Total Spend", `₹${customer.lifetimeSpend.toLocaleString("en-IN")}`],
            ["Last Visit", dateLabel(customer.lastVisitDate)], ["Member", customer.membershipName || "No"],
          ].map(([label, value]) => <View key={label} style={s.stat}><Text style={s.muted}>{label}</Text><Text style={[s.heading, label === "Total Spend" && s.accentText]}>{value}</Text></View>)}
        </View>
        <View style={s.section}>
          <Text style={[s.muted, { fontWeight: "700", letterSpacing: 1 }]}>PACKAGES</Text>
          {packageError ? <TouchableOpacity accessibilityRole="button" onPress={reload}><Text style={s.error}>{packageError} · Tap to retry</Text></TouchableOpacity>
            : packages.length === 0 ? <Text style={s.muted}>No active packages</Text> : packages.map(item => <View key={item.id} style={s.package}>
              <View style={[s.avatar, { width: 36, height: 36, backgroundColor: p.active }]}><Ionicons name="cube-outline" size={19} color={p.accent} /></View>
              <View style={[s.fill, { gap: 6 }]}><Text style={s.heading}>{item.packageName}</Text><Text style={s.muted}>{item.services.reduce((sum, service) => sum + service.remainingSessions, 0)}/{item.services.reduce((sum, service) => sum + service.totalSessions, 0)} sessions left{item.expiryDate ? ` · Expires ${dateLabel(item.expiryDate)}` : ""}</Text></View>
            </View>)}
        </View>
      </ScrollView>}
  </View>;
}
