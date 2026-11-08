import { useMemo, useState } from "react";
import { SectionList, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { pearl, pearlTones } from "@/components/auth/pearl/tokens";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { AppBackButton } from "@/components/ui/AppBackButton";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { LunoxHeaderButton } from "@/components/lunox/LunoxHeaderButton";
import { VISIBLE_REPORT_CONFIGS, VISIBLE_REPORT_GROUPS } from "../report-config";

export default function ReportsHomeScreen() {
  const [search, setSearch] = useState("");
  const sections = useMemo(() => VISIBLE_REPORT_GROUPS.map((title) => ({ title: title === "Customers" ? "Clients" : title, data: VISIBLE_REPORT_CONFIGS.filter((report) => report.group === title && [report.title, report.subtitle].join(" ").toLowerCase().includes(search.trim().toLowerCase())) })).filter((section) => section.data.length), [search]);
  return <PearlBackground><SafeAreaView style={s.safe} edges={["top"]}><AppStatusBar />
    <SectionList sections={sections} keyExtractor={(item) => item.slug} stickySectionHeadersEnabled={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}
      ListHeaderComponent={<View style={s.top}><View style={s.header}><AppBackButton onPress={() => router.back()} /><View style={s.copy}><Text style={s.title}>Reports</Text><Text style={s.subtitle}>Find the answer you need</Text></View><LunoxHeaderButton /></View>
        <View style={s.search}><Ionicons name="search-outline" size={18} color={pearl.muted} /><TextInput accessibilityLabel="Search reports" placeholder="Search reports" placeholderTextColor={pearl.muted} value={search} onChangeText={setSearch} underlineColorAndroid="transparent" style={s.input} />{search ? <TouchableOpacity accessibilityLabel="Clear search" onPress={() => setSearch("")}><Ionicons name="close-circle" size={18} color={pearl.muted} /></TouchableOpacity> : null}</View></View>}
      renderSectionHeader={({ section }) => <Text style={s.group}>{section.title}</Text>}
      renderItem={({ item, index, section }) => {
        const tone = [pearlTones.rose, pearlTones.lilac, pearlTones.peach][index % 3];
        return <TouchableOpacity accessibilityRole="button" onPress={() => router.push(('/reports/' + item.slug) as Href)} activeOpacity={0.8} style={[s.row, index === 0 && s.first, index === section.data.length - 1 && s.last]}><View style={[s.icon, { backgroundColor: tone.bg }]}><Ionicons name={item.icon} size={20} color={tone.fg} /></View><View style={s.copy}><Text style={s.name}>{item.title}</Text><Text style={s.description}>{item.subtitle}</Text></View><Ionicons name="chevron-forward" size={17} color={pearl.muted} /></TouchableOpacity>;
      }}
      ListEmptyComponent={<Text style={s.empty}>No reports found. Try another search.</Text>}
    />
  </SafeAreaView></PearlBackground>;
}
const s = StyleSheet.create({ safe: { flex: 1 }, content: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 120 }, top: { gap: 20 }, header: { flexDirection: "row", alignItems: "center", gap: 12 }, copy: { flex: 1, minWidth: 0 }, title: { fontSize: 23, fontWeight: "700", color: pearl.ink }, subtitle: { fontSize: 12, color: pearl.muted, marginTop: 2 }, search: { flexDirection: "row", alignItems: "center", gap: 9, minHeight: 48, borderWidth: 1, borderColor: pearl.glassBorder, borderRadius: 16, paddingHorizontal: 14, backgroundColor: pearl.glass }, input: { flex: 1, color: pearl.ink, fontSize: 14, backgroundColor: "transparent", paddingVertical: 12 }, group: { fontSize: 14, fontWeight: "700", color: pearl.ink, marginTop: 22, marginBottom: 10 }, row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: pearl.glass, borderBottomWidth: 1, borderBottomColor: pearl.divider }, first: { borderTopLeftRadius: 22, borderTopRightRadius: 22 }, last: { borderBottomLeftRadius: 22, borderBottomRightRadius: 22, borderBottomWidth: 0 }, icon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" }, name: { color: pearl.ink, fontSize: 14, fontWeight: "700" }, description: { color: pearl.muted, fontSize: 12, lineHeight: 18, marginTop: 3 }, empty: { color: pearl.muted, paddingVertical: 24, textAlign: "center" } });
