import { useFooterClearance } from "@/hooks/useFooterClearance";
import { RefreshViewport } from "@/components/ui/RefreshViewport";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { maskPhone } from "@/utils/maskPhone";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { BackHandler, FlatList, Keyboard, Pressable, TouchableOpacity, View } from "react-native";
import { selectCurrentUser } from "@/store/user/user.slice";
import { hasCustomPermission } from "@/utils/permissions";
import { DeleteChatsModal } from "./DeleteChatsModal";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { fetchInboxConversationsThunk } from "@/middleware/inbox/inbox.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { filterInboxConversations } from "@/utils/inboxFilters";
import { sortInboxConversations } from "@/utils/inboxPresentation";
import { InboxAvatar, InboxIcon } from "./InboxControls";
import { useInboxTheme } from "./inboxTheme";
import { useChatKeyboard } from "./useChatKeyboard";

// `embedded` renders the list as the owner's WhatsApp tab: no back button, and
// the tab bar owns the bottom inset.
export default function InboxListScreen({ embedded = false }: { embedded?: boolean }) {
  const { styles: s, palette: p } = useInboxTheme();
  const footerClearance = useFooterClearance();
  // Keeps rows behind the keyboard (or the floating tab bar) reachable by scrolling.
  const keyboard = useChatKeyboard(embedded ? footerClearance : 0);
  const dispatch = useAppDispatch();
  const inbox = useAppSelector(state => state.inbox);
  const user = useAppSelector(selectCurrentUser);
  const canDelete = Boolean(user && (["salon_owner", "admin"].includes((user.role || "").toLowerCase()) || hasCustomPermission(user, "reply_to_conversation")));
  const [selecting, setSelecting] = useState(false);
  const [selectedPhones, setSelectedPhones] = useState<string[]>([]);
  const [deletePhones, setDeletePhones] = useState<string[] | null>(null);
  const selection = selectedPhones.filter(phone => inbox.conversations.some(item => item.contactPhone === phone));
  const cancelSelection = useCallback(() => { setSelecting(false); setSelectedPhones([]); }, []);
  const toggleSelection = (phone: string) => {
    setSelecting(true);
    setSelectedPhones(current => current.includes(phone) ? current.filter(value => value !== phone) : current.length < 500 ? [...current, phone] : current);
  };
  useFocusEffect(useCallback(() => {
    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!selecting) return false;
      cancelSelection(); return true;
    });
    return () => back.remove();
  }, [cancelSelection, selecting]));
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [unreadFirst, setUnreadFirst] = useState(false);
  const unread = inbox.conversations.reduce((sum, item) => sum + item.unreadCount, 0);
  const items = useMemo(() => sortInboxConversations(filterInboxConversations(inbox.conversations, search, unreadOnly), unreadFirst), [inbox.conversations, search, unreadOnly, unreadFirst]);
  const refresh = useCallback(() => { void dispatch(fetchInboxConversationsThunk({ refresh: true })); }, [dispatch]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  return <SafeAreaView edges={embedded ? ["top"] : ["top", "bottom"]} style={s.root}>
    <AppStatusBar />
    <Pressable accessible={false} onPress={Keyboard.dismiss}>
    <View style={s.header}>
      {selecting ? <>
        <InboxIcon name="close" label="Cancel selection" onPress={cancelSelection} />
        <Text style={s.title}>{selection.length} selected</Text>
        <InboxIcon name="trash-outline" label="Delete selected chats" disabled={!selection.length || !canDelete} onPress={() => setDeletePhones(selection)} />
      </> : <>
      {embedded ? null : <InboxIcon name="arrow-back" label="Back" onPress={() => router.canGoBack() ? router.back() : router.replace("/dashboard" as Href)} />}
      <Text style={s.title}>Inbox</Text>{unread > 0 && <View style={s.badge}><Text style={s.badgeText}>{unread > 999 ? "999+" : unread}</Text></View>}
      </>}
    </View>
    <View style={s.search}><Ionicons name="search-outline" size={18} color={p.muted} /><TextInput accessibilityLabel="Search conversations" value={search} onChangeText={setSearch} placeholder="Search conversations…" placeholderTextColor={p.muted} autoCorrect={false} autoCapitalize="none" returnKeyType="search" onSubmitEditing={Keyboard.dismiss} onFocus={keyboard.onFocus} style={s.searchInput} />{search ? <InboxIcon name="close" label="Clear search" onPress={() => setSearch("")} /> : <View style={{ width: 12 }} />}</View>
    <View style={s.filters}>
      {[false, true].map(value => <TouchableOpacity key={String(value)} accessibilityRole="button" accessibilityState={{ selected: unreadOnly === value }} onPress={() => setUnreadOnly(value)} style={[s.chip, unreadOnly === value && s.selected]}><Text style={[s.text, unreadOnly === value && s.selectedText]}>{value ? "Unread" : "All"}</Text>{value && unread > 0 && <Text style={[s.muted, s.accentText]}>{unread}</Text>}</TouchableOpacity>)}
      <View style={s.fill} /><TouchableOpacity accessibilityRole="button" accessibilityLabel={`Sort: ${unreadFirst ? "Unread first" : "Latest"}. Tap to change`} onPress={() => setUnreadFirst(value => !value)} style={s.chip}><Text style={s.muted}>{unreadFirst ? "Unread first" : "Latest"}</Text><Ionicons name="swap-vertical" color={p.muted} size={15} /></TouchableOpacity>
    </View>
    {selecting && <View style={s.filters}>
      <TouchableOpacity accessibilityRole="button" onPress={() => setSelectedPhones(items.slice(0, 500).map(item => item.contactPhone))} style={s.chip}><Text style={s.accentText}>Select all shown</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" onPress={() => setSelectedPhones([])} style={s.chip}><Text style={s.muted}>Clear</Text></TouchableOpacity>
      <Text style={s.muted}>Up to 500 chats</Text>
    </View>}
    </Pressable>
    {inbox.conversationsError && <TouchableOpacity accessibilityRole="button" onPress={refresh} style={s.banner}><Text style={s.error}>{inbox.conversationsError} · Tap to retry</Text></TouchableOpacity>}
    <View ref={keyboard.viewport} onLayout={keyboard.onLayout} style={s.fill}>
    <RefreshViewport><FlatList data={items} keyExtractor={item => item.contactPhone} onRefresh={refresh} refreshing={inbox.conversationsRefreshing} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ flexGrow: 1, paddingBottom: keyboard.inset }}
      ListEmptyComponent={inbox.conversationsStatus === "loading" || (inbox.conversationsRefreshing && !inbox.conversations.length) ? <View style={s.empty}><ActivityIndicator color={p.accent} /></View> : <View style={s.empty}><Ionicons name="chatbubbles-outline" size={36} color={p.accent} /><Text style={s.heading}>{search ? "No chats found" : unreadOnly ? "You’re all caught up" : "Your chats start here"}</Text><Text style={s.emptyText}>{search || unreadOnly ? "Try another search or switch to All." : "Client replies to your WhatsApp messages will appear here."}</Text></View>}
      extraData={selectedPhones}
      renderItem={({ item }) => <TouchableOpacity accessibilityRole={selecting ? "checkbox" : "button"} accessibilityState={selecting ? { checked: selection.includes(item.contactPhone) } : undefined} accessibilityLabel={`${item.contactName || maskPhone(item.contactPhone)}, ${item.unreadCount} unread messages`} delayLongPress={250} onLongPress={canDelete ? () => toggleSelection(item.contactPhone) : undefined} onPress={() => selecting ? toggleSelection(item.contactPhone) : router.push(`/inbox/${encodeURIComponent(item.contactPhone)}` as Href)} style={[s.conversation, selecting && selection.includes(item.contactPhone) && s.selected]}>
        {selecting && <Ionicons name={selection.includes(item.contactPhone) ? "checkbox" : "square-outline"} size={22} color={p.accent} />}
        <InboxAvatar name={item.contactName} phone={item.contactPhone} /><View style={[s.fill, { gap: 7 }]}><View style={s.row}><Text numberOfLines={1} style={[s.heading, s.fill]}>{item.contactName || maskPhone(item.contactPhone)}</Text><Text style={s.muted}>{item.lastMessageLabel}</Text></View><View style={s.row}><Text numberOfLines={1} style={[s.muted, s.fill, { fontSize: 13 }]}>{item.lastMessage || "Attachment"}</Text>{item.unreadCount > 0 && <View style={s.badge}><Text style={s.badgeText}>{item.unreadCount > 99 ? "99+" : item.unreadCount}</Text></View>}</View></View>
      </TouchableOpacity>} /></RefreshViewport>
    </View>
    {deletePhones && <DeleteChatsModal phones={deletePhones} onClose={() => setDeletePhones(null)} onDeleted={() => { setDeletePhones(null); cancelSelection(); refresh(); }} />}
  </SafeAreaView>;
}
