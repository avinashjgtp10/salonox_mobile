import { Text, TextInput } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { memo, useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { ClientOptionRow } from "@/features/quickSale/components/ClientOptionRow";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ClientListItem } from "@/types/client";

type ClientStepProps = {
  clients: ClientListItem[];
  error: string | null;
  isLoading: boolean;
  isSearching: boolean;
  onAddNewClient: () => void;
  onChangeSearchQuery: (query: string) => void;
  onContinue: () => void;
  onRetry: () => void;
  onSelectClient: (client: ClientListItem | null) => void;
  onViewAllClients: () => void;
  searchQuery: string;
  selectedClientId: string | null;
};

function ClientStepComponent({
  clients,
  error,
  isLoading,
  isSearching,
  onAddNewClient,
  onChangeSearchQuery,
  onContinue,
  onRetry,
  onSelectClient,
  onViewAllClients,
  searchQuery,
  selectedClientId,
}: ClientStepProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const hasSelection = selectedClientId !== null;

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={Colors.text2} />
          <TextInput
            autoCapitalize="none"
            onChangeText={onChangeSearchQuery}
            placeholder="Search client by name or mobile number"
            placeholderTextColor={Colors.placeholder}
            returnKeyType="search"
            style={styles.searchInput}
            value={searchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity activeOpacity={0.74} onPress={() => onChangeSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color={Colors.text2} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {isSearching ? "Search Results" : "Recent Clients"}
          </Text>
          <TouchableOpacity activeOpacity={0.84} onPress={onViewAllClients}>
            <Text style={styles.sectionAction}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.clientsCard}>
          {error && clients.length === 0 ? (
            <View style={styles.stateBlock}>
              <Text style={styles.stateTitle}>Unable to load clients</Text>
              <TouchableOpacity activeOpacity={0.84} onPress={onRetry}>
                <Text style={styles.sectionAction}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : isLoading && clients.length === 0 ? (
            <View style={styles.stateBlock}>
              <ActivityIndicator color={Colors.primary} size="small" />
              <Text style={styles.stateText}>Loading clients...</Text>
            </View>
          ) : clients.length === 0 ? (
            <View style={styles.stateBlock}>
              <Text style={styles.stateTitle}>
                {isSearching ? "No matching client" : "No recent clients"}
              </Text>
              <Text style={styles.stateText}>Use Walk-In or add a new client to continue.</Text>
            </View>
          ) : (
            clients.map((client, index) => (
              <ClientOptionRow
                key={`quick-sale-client-${client.id}`}
                initials={client.initials}
                isSelected={selectedClientId === client.id}
                onPress={() => onSelectClient(client)}
                phone={client.phone}
                title={client.fullName}
                withBorder={index < clients.length - 1}
              />
            ))
          )}
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => onSelectClient(null)}
            style={[styles.actionCard, selectedClientId === "" && styles.actionCardSelected]}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="walk-outline" size={20} color={Colors.primaryDark} />
            </View>
            <Text style={styles.actionTitle}>Walk-In</Text>
            <Text style={styles.actionText}>Create bill for walk-in client</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.84} onPress={onAddNewClient} style={styles.actionCard}>
            <View style={styles.actionIcon}>
              <Ionicons name="person-add-outline" size={20} color={Colors.primaryDark} />
            </View>
            <Text style={styles.actionTitle}>Add New Client</Text>
            <Text style={styles.actionText}>Add and select a new client</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.88}
          disabled={!hasSelection}
          onPress={onContinue}
          style={[styles.continueButton, !hasSelection && styles.continueButtonDisabled]}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </>
  );
}

export const ClientStep = memo(ClientStepComponent);

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  content: {
    paddingBottom: 120,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingTop: Spacing.lg,
  },
  searchWrap: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.035,
    shadowRadius: 14,
    elevation: 1,
  },
  searchInput: {
    color: Colors.heading,
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
  },
  sectionAction: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  clientsCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 1,
  },
  stateBlock: {
    alignItems: "center",
    gap: 6,
    minHeight: 96,
    justifyContent: "center",
    padding: Spacing.lg,
  },
  stateTitle: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  stateText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  quickActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  actionCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    flex: 1,
    minHeight: 118,
    padding: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.035,
    shadowRadius: 16,
    elevation: 1,
  },
  actionCardSelected: {
    backgroundColor: Colors.bg2,
  },
  actionIcon: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    height: 38,
    justifyContent: "center",
    marginBottom: Spacing.sm,
    width: 38,
  },
  actionTitle: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  actionText: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    marginTop: 4,
    textAlign: "center",
  },
  footer: {
    backgroundColor: Colors.bg,
    borderTopColor: Colors.divider,
    borderTopWidth: 1,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  continueButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: AppRadius.control,
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "center",
    minHeight: 52,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 3,
  },
  continueButtonDisabled: {
    opacity: 0.45,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
});
