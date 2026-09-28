import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { EmptyState, ErrorState } from "@/components/ui/StateViews";
import { AppLayout } from "@/constants/layout";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { fetchInboxConversationsThunk } from "@/middleware/inbox/inbox.thunk";
import {
  selectInboxConversations,
  selectInboxConversationsError,
  selectInboxConversationsLoading,
  selectInboxConversationsRefreshing,
} from "@/store/inbox/inbox.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useAppTheme } from "@/theme/ThemeProvider";
import { filterInboxConversations } from "@/utils/inboxFilters";
import type { InboxConversation } from "@/types/inbox";

const getInitials = (conversation: InboxConversation) => {
  const name = conversation.contactName?.trim();

  if (!name) {
    // Last two digits of the phone is more distinguishing than a generic icon
    // when the contact never shared a WhatsApp profile name.
    return conversation.contactPhone.slice(-2);
  }

  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
};

function ConversationRow({
  conversation,
  onPress,
}: {
  conversation: InboxConversation;
  onPress: () => void;
}) {
  const { colors: Colors, scheme } = useAppTheme();
  const styles = useMemo(() => createStyles(Colors, scheme === "dark"), [Colors, scheme]);
  const hasUnread = conversation.unreadCount > 0;

  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${conversation.contactName || conversation.contactPhone}${hasUnread ? `, ${conversation.unreadCount} unread messages` : ""}`} activeOpacity={0.7} onPress={onPress} style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(conversation)}</Text>
      </View>

      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.title}>
            {conversation.contactName || conversation.contactPhone}
          </Text>
          <Text style={[styles.time, hasUnread && styles.unreadTime]}>{conversation.lastMessageLabel}</Text>
        </View>

        <View style={styles.previewRow}>
          <Text numberOfLines={1} style={[styles.preview, hasUnread && styles.previewUnread]}>
            {conversation.lastMessage || "No messages yet"}
          </Text>
          {hasUnread ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function InboxScreen() {
  const { colors: Colors, scheme } = useAppTheme();
  const styles = useMemo(() => createStyles(Colors, scheme === "dark"), [Colors, scheme]);
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const dispatch = useAppDispatch();
  const conversations = useAppSelector(selectInboxConversations);
  const loading = useAppSelector(selectInboxConversationsLoading);
  const refreshing = useAppSelector(selectInboxConversationsRefreshing);
  const error = useAppSelector(selectInboxConversationsError);
  const filteredConversations = useMemo(
    () => filterInboxConversations(conversations, query, unreadOnly),
    [conversations, query, unreadOnly],
  );
  const unreadChats = conversations.filter((conversation) => conversation.unreadCount > 0).length;
  const isFiltered = Boolean(query.trim()) || unreadOnly;

  const refresh = useCallback(
    (args?: { refresh?: boolean }) => {
      void dispatch(fetchInboxConversationsThunk(args));
    },
    [dispatch],
  );

  // Socket `inbox:conversations` keeps this live while mounted; the focus
  // fetch covers the cold open and anything missed while backgrounded.
  useFocusEffect(
    useCallback(() => {
      refresh({ refresh: conversations.length > 0 });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refresh]),
  );

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/dashboard" as Href);
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />

      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" activeOpacity={0.84} hitSlop={8} onPress={handleBack} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.heading} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>WhatsApp</Text>
        <Text style={styles.headerLabel}>INBOX</Text>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={22} color={Colors.hint} />
        <TextInput
          accessibilityLabel="Search chats by name, phone or message"
          placeholder="Search chats"
          placeholderTextColor={Colors.hint}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={styles.searchInput}
        />
        {query.length > 0 && (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery("")} style={styles.iconButton}>
            <Ionicons name="close" size={20} color={Colors.text2} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filters}>
        {[false, true].map((unread) => (
          <TouchableOpacity key={String(unread)} accessibilityRole="button" accessibilityState={{ selected: unreadOnly === unread }} onPress={() => setUnreadOnly(unread)} style={[styles.filter, unreadOnly === unread && styles.filterActive]}>
            <Text style={[styles.filterText, unreadOnly === unread && styles.filterTextActive]}>
              {unread ? `Unread${unreadChats ? `  ${unreadChats}` : ""}` : "All"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error && conversations.length > 0 ? (
        <TouchableOpacity accessibilityRole="button" onPress={() => refresh({ refresh: true })} style={styles.errorBanner}>
          <Text style={styles.errorText}>Couldn’t refresh chats. Tap to retry.</Text>
        </TouchableOpacity>
      ) : null}

      {error && conversations.length === 0 ? (
        <ErrorState message={error} onRetry={() => refresh()} />
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={filteredConversations}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          keyExtractor={(item) => item.contactPhone}
          ListEmptyComponent={
            loading && conversations.length === 0 ? <View style={styles.loading}><ActivityIndicator accessibilityLabel="Loading chats" color="#25D366" size="large" /></View> : (
              <EmptyState
                accent="green"
                description={isFiltered ? "Try another search or switch to All to see your conversations." : "Client replies to your WhatsApp messages will appear here."}
                icon="chatbubbles-outline"
                title={isFiltered ? (query.trim() ? "No chats found" : "You’re all caught up") : "Your chats start here"}
              />
            )
          }
          onRefresh={() => refresh({ refresh: true })}
          refreshing={refreshing}
          renderItem={({ item }) => (
            <ConversationRow
              conversation={item}
              onPress={() => router.push(`/inbox/${encodeURIComponent(item.contactPhone)}` as Href)}
            />
          )}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={filteredConversations.length > 0 ? (
            <View style={styles.footer}><Ionicons name="chatbubble-ellipses-outline" size={14} color={Colors.hint} /><Text style={styles.footerText}>Your salon’s conversations, all in one place</Text></View>
          ) : null}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors, dark: boolean) =>
  StyleSheet.create({
    safeArea: {
      backgroundColor: dark ? "#0B141A" : "#FFFFFF",
      flex: 1,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      gap: Spacing.sm,
      paddingHorizontal: AppLayout.contentHorizontalPadding,
      paddingVertical: Spacing.md,
    },
    iconButton: {
      alignItems: "center",
      borderRadius: Radius.full,
      height: 44,
      justifyContent: "center",
      width: 44,
    },
    headerTitle: {
      color: dark ? "#E9EDEF" : "#075E54",
      flex: 1,
      fontSize: 28,
      fontWeight: "700",
    },
    listContent: {
      flexGrow: 1,
      paddingBottom: Spacing.xxxl,
      paddingHorizontal: AppLayout.contentHorizontalPadding,
    },
    row: {
      alignItems: "center",
      flexDirection: "row",
      gap: Spacing.md,
      paddingVertical: 15,
    },
    avatar: {
      alignItems: "center",
      backgroundColor: dark ? "#223B36" : "#E1F3EA",
      borderRadius: Radius.full,
      height: 56,
      justifyContent: "center",
      width: 56,
    },
    avatarText: {
      color: dark ? "#80D9AA" : "#256A50",
      fontSize: 19,
      fontWeight: "700",
    },
    copy: {
      flex: 1,
      gap: Spacing.xs,
      minWidth: 0,
    },
    titleRow: {
      alignItems: "baseline",
      flexDirection: "row",
      gap: Spacing.sm,
      justifyContent: "space-between",
    },
    title: {
      color: Colors.heading,
      flex: 1,
      fontSize: 17,
      fontWeight: "600",
    },
    time: {
      color: Colors.hint,
      fontSize: 12,
    },
    previewRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: Spacing.sm,
    },
    preview: {
      color: Colors.text2,
      flex: 1,
      fontSize: 14,
    },
    previewUnread: {
      color: Colors.text,
      fontWeight: "600",
    },
    badge: {
      alignItems: "center",
      backgroundColor: "#25D366",
      borderRadius: Radius.full,
      minWidth: 22,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    badgeText: {
      color: "#073B22",
      fontSize: 11,
      fontWeight: "700",
    },
    headerLabel: { color: Colors.hint, fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },
    searchBar: { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: AppLayout.contentHorizontalPadding, backgroundColor: dark ? "#202C33" : "#F1F3F5", borderRadius: 28, paddingLeft: 18, paddingRight: 6, minHeight: 52 },
    searchInput: { flex: 1, color: Colors.heading, fontSize: 16, paddingVertical: 14 },
    filters: { flexDirection: "row", gap: 10, paddingHorizontal: AppLayout.contentHorizontalPadding, paddingTop: 16, paddingBottom: 8 },
    filter: { borderRadius: 24, paddingHorizontal: 18, minHeight: 44, justifyContent: "center", backgroundColor: dark ? "#202C33" : "#F1F3F5" },
    filterActive: { backgroundColor: dark ? "#103D30" : "#D9FDD3" },
    filterText: { color: Colors.text2, fontSize: 14, fontWeight: "600" },
    filterTextActive: { color: dark ? "#71DEAA" : "#166534" },
    unreadTime: { color: dark ? "#25D366" : "#168246", fontWeight: "600" },
    loading: { padding: 48 },
    footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 28 },
    footerText: { color: Colors.hint, fontSize: 11, flexShrink: 1 },
    errorBanner: { paddingHorizontal: 24, paddingVertical: 12 },
    errorText: { color: Colors.error, fontSize: 13 },
  });
