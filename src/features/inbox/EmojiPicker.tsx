import { useMemo, useState } from "react";
import { FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { emojiCatalog, emojiCategories } from "./emojiCatalog";
import { InboxIcon } from "./InboxControls";
import { useInboxTheme } from "./inboxTheme";

export function EmojiPicker({ onSelect, onClose, disabled }: {
  onSelect: (emoji: string) => void; onClose: () => void; disabled: boolean;
}) {
  const { palette: p, styles: s } = useInboxTheme();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("Smileys");
  const [recent, setRecent] = useState<string[]>([]);
  const items = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term) return emojiCatalog.filter(item => `${item.label} ${item.category} ${item.emoji}`.toLowerCase().includes(term));
    if (category === "Recent") return recent.map(emoji => emojiCatalog.find(item => item.emoji === emoji)!);
    return emojiCatalog.filter(item => item.category === category);
  }, [query, category, recent]);
  return <Modal visible animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={s.header}><Text accessibilityRole="header" style={[s.title, s.fill]}>Emoji</Text><InboxIcon name="close" label="Close emoji picker" onPress={onClose} /></View>
        <View style={s.search}>
          <TextInput accessibilityLabel="Search emojis" placeholder="Search love, thanks, haircut…" placeholderTextColor={p.muted} value={query} onChangeText={setQuery} autoCorrect={false} style={s.searchInput} />
          {query ? <InboxIcon name="close" label="Clear emoji search" onPress={() => setQuery("")} /> : null}
        </View>
        <View><ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
          {["Recent", ...emojiCategories].map(name => <TouchableOpacity key={name} accessibilityRole="tab" accessibilityState={{ selected: !query && category === name }} onPress={() => { setCategory(name); setQuery(""); }} style={[s.chip, !query && category === name && s.selected]}><Text style={s.text}>{name}</Text></TouchableOpacity>)}
        </ScrollView></View>
        <Text accessibilityLiveRegion="polite" style={[s.muted, { paddingHorizontal: 16, paddingBottom: 8 }]}>{disabled ? "Message limit reached. Close the picker to edit your message." : query ? `${items.length} matching emojis` : "Tap emojis to add them, then tap Done."}</Text>
        <FlatList key={query || category} data={items} keyExtractor={item => item.emoji} numColumns={6} style={s.fill} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ padding: 8, flexGrow: 1 }}
          ListEmptyComponent={<Text style={[s.emptyText, { padding: 24 }]}>{category === "Recent" && !query ? "Emojis you use in this picker will appear here." : "No emojis found. Try another search."}</Text>}
          renderItem={({ item }) => <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Insert ${item.label}`} disabled={disabled} onPress={() => {
            onSelect(item.emoji); Keyboard.dismiss(); setRecent(previous => [item.emoji, ...previous.filter(emoji => emoji !== item.emoji)].slice(0, 30));
          }} style={{ width: "16.6667%", minHeight: 54, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.4 : 1 }}><Text style={{ fontSize: 28 }}>{item.emoji}</Text></TouchableOpacity>} />
        <TouchableOpacity accessibilityRole="button" onPress={onClose} style={[s.button, { margin: 16 }]}><Text style={s.heading}>Done</Text></TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
