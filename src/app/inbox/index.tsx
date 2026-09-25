import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useMemo } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
import { useThemeColors } from "@/theme/ThemeProvider";
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
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const hasUnread = conversation.unreadCount > 0;

  return (
    <TouchableOpacity activeOpacity={0.84} onPress={onPress} style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(conversation)}</Text>
      </View>

      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.title}>
            {conversation.contactName || conversation.contactPhone}
          </Text>
          <Text style={styles.time}>{conversation.lastMessageLabel}</Text>
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
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const conversations = useAppSelector(selectInboxConversations);
  const loading = useAppSelector(selectInboxConversationsLoading);
  const refreshing = useAppSelector(selectInboxConversationsRefreshing);
  const error = useAppSelector(selectInboxConversationsError);

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
        <TouchableOpacity activeOpacity={0.84} hitSlop={12} onPress={handleBack} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>WhatsApp Inbox</Text>
        <View style={styles.iconButton} />
      </View>

      {error && conversations.length === 0 ? (
        <ErrorState message={error} onRetry={() => refresh()} />
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={conversations}
          keyExtractor={(item) => item.contactPhone}
          ListEmptyComponent={
            loading ? null : (
              <EmptyState
                accent="green"
                description="When a client replies to one of your WhatsApp campaigns, the conversation appears here."
                icon="chatbubbles-outline"
                title="No conversations yet"
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
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      backgroundColor: Colors.bg,
      flex: 1,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      gap: Spacing.md,
      paddingHorizontal: AppLayout.contentHorizontalPadding,
      paddingVertical: Spacing.md,
    },
    iconButton: {
      alignItems: "center",
      backgroundColor: Colors.bg2,
      borderRadius: Radius.full,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    headerTitle: {
      color: Colors.heading,
      flex: 1,
      fontSize: AppLayout.headerTitleFontSize,
      fontWeight: "700",
    },
    listContent: {
      flexGrow: 1,
      paddingBottom: Spacing.xxxl,
      paddingHorizontal: AppLayout.contentHorizontalPadding,
    },
    row: {
      alignItems: "center",
      borderBottomColor: Colors.divider,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
      gap: Spacing.md,
      paddingVertical: Spacing.lg,
    },
    avatar: {
      alignItems: "center",
      backgroundColor: Colors.successBg,
      borderRadius: Radius.full,
      height: 46,
      justifyContent: "center",
      width: 46,
    },
    avatarText: {
      color: Colors.success,
      fontSize: 15,
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
      fontSize: 15,
      fontWeight: "700",
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
      fontSize: 13,
    },
    previewUnread: {
      color: Colors.text,
      fontWeight: "600",
    },
    badge: {
      alignItems: "center",
      backgroundColor: Colors.primary,
      borderRadius: Radius.full,
      minWidth: 20,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    badgeText: {
      color: Colors.onPrimary,
      fontSize: 11,
      fontWeight: "700",
    },
  });
