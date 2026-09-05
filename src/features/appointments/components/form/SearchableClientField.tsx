import { CLIENT_SEARCH_MIN_LETTERS } from "@/features/appointments/constants/appointmentConstants";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import type { ClientBookingMode } from "@/features/appointments/types/appointmentForm";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ClientListItem } from "@/types/client";
import { Ionicons } from "@expo/vector-icons";
import type { RefObject } from "react";
import { useMemo } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

export function SearchableClientField({
  bookingMode,
  dropdownOpen,
  error,
  onDismiss,
  onNewClient,
  onSearchChange,
  onSelectClient,
  onSelectExisting,
  onSelectWalkIn,
  searchInputRef,
  results,
  resultsError,
  resultsLoading,
  search,
  selectedClient,
  selectedClientId,
}: {
  bookingMode: ClientBookingMode;
  dropdownOpen: boolean;
  error?: string;
  onDismiss: () => void;
  onNewClient: () => void;
  onSearchChange: (value: string) => void;
  onSelectClient: (client: ClientListItem) => void;
  onSelectExisting: () => void;
  onSelectWalkIn: () => void;
  searchInputRef?: RefObject<TextInput | null>;
  results: ClientListItem[];
  resultsError: string | null;
  resultsLoading: boolean;
  search: string;
  selectedClient: ClientListItem | undefined;
  selectedClientId: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const query = search.trim().toLowerCase();
  const showDropdown =
    dropdownOpen && bookingMode === "existing" && query.length >= CLIENT_SEARCH_MIN_LETTERS;
  const showMinimumHint =
    dropdownOpen && bookingMode === "existing" && query.length > 0 && query.length < CLIENT_SEARCH_MIN_LETTERS;

  return (
    <View style={[styles.inputGroup, styles.clientSearchGroup]}>
      <View style={styles.clientSectionHeader}>
        <Text style={styles.inputLabel}>Client</Text>
        {bookingMode === "walkIn" ? (
          <Text style={styles.clientModeHint}>Walk-in booking</Text>
        ) : selectedClient ? (
          <Text numberOfLines={1} style={styles.clientModeHint}>
            {selectedClient.fullName}
          </Text>
        ) : null}
      </View>

      <View style={styles.clientQuickActions}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={onSelectExisting}
          style={[styles.clientActionChip, bookingMode === "existing" && styles.clientActionChipActive]}
        >
          <Ionicons
            name="person-outline"
            size={16}
            color={bookingMode === "existing" ? Colors.appointmentAccentDark : Colors.appointmentTextSecondary}
          />
          <Text style={[styles.clientActionText, bookingMode === "existing" && styles.clientActionTextActive]}>
            Existing Client
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.84}
          onPress={onSelectWalkIn}
          style={[styles.clientActionChip, bookingMode === "walkIn" && styles.clientActionChipActive]}
        >
          <Ionicons
            name="walk-outline"
            size={16}
            color={bookingMode === "walkIn" ? Colors.appointmentAccentDark : Colors.appointmentTextSecondary}
          />
          <Text style={[styles.clientActionText, bookingMode === "walkIn" && styles.clientActionTextActive]}>
            Walk-in Client
          </Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.84} onPress={onNewClient} style={styles.clientActionChip}>
          <Ionicons name="person-add-outline" size={16} color={Colors.appointmentTextSecondary} />
          <Text style={styles.clientActionText}>New Client</Text>
        </TouchableOpacity>
      </View>

      {bookingMode === "existing" ? (
        <>
          <View style={styles.autocompleteAnchor}>
            <View style={[styles.searchWrap, error && styles.inputError]}>
              <Ionicons name="search-outline" size={18} color={Colors.text2} />
              <TextInput
                ref={searchInputRef}
                onChangeText={onSearchChange}
                onFocus={onSelectExisting}
                placeholder="Type at least 3 letters to search clients"
                placeholderTextColor={Colors.placeholder}
                style={styles.searchInput}
                value={search}
              />
              {search ? (
                <TouchableOpacity
                  accessibilityLabel="Clear client search"
                  activeOpacity={0.8}
                  onPress={() => {
                    onSearchChange("");
                    onDismiss();
                  }}
                >
                  <Ionicons name="close-circle" size={18} color={Colors.text2} />
                </TouchableOpacity>
              ) : null}
            </View>

            {showDropdown ? (
              <Animated.View
                entering={FadeIn.duration(120)}
                exiting={FadeOut.duration(90)}
                style={styles.stickySearchDropdown}
              >
                {resultsError ? (
                  <View style={styles.serviceDropdownState}>
                    <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
                    <Text style={styles.fieldHintError}>{resultsError}</Text>
                  </View>
                ) : resultsLoading ? (
                  <View style={styles.serviceDropdownState}>
                    <ActivityIndicator color={Colors.primary} size="small" />
                    <Text style={styles.fieldHint}>Searching clients...</Text>
                  </View>
                ) : results.length === 0 ? (
                  <View style={styles.serviceDropdownState}>
                    <Ionicons name="search-outline" size={16} color={Colors.text2} />
                    <Text style={styles.fieldHint}>No clients found.</Text>
                  </View>
                ) : (
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={results.length > 4}
                    style={styles.serviceDropdownScroll}
                  >
                    {results.map((client) => {
                      const selected = client.id === selectedClientId;

                      return (
                        <TouchableOpacity
                          key={`client-${client.id}`}
                          activeOpacity={0.84}
                          onPress={() => onSelectClient(client)}
                          style={[styles.clientOptionRow, selected && styles.serviceOptionRowActive]}
                        >
                          <View style={styles.serviceOptionCopy}>
                            <Text style={[styles.serviceOptionName, selected && styles.serviceOptionNameActive]}>
                              {client.fullName}
                            </Text>
                            <Text style={[styles.serviceOptionMeta, selected && styles.serviceOptionMetaActive]}>
                              {[client.phone, client.email].filter(Boolean).join(" | ")}
                            </Text>
                          </View>
                          {selected ? <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" /> : null}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </Animated.View>
            ) : null}
          </View>

          {!search.trim() ? (
            <Text style={styles.fieldHint}>Start typing to find an existing client.</Text>
          ) : null}
          {showMinimumHint ? (
            <Text style={styles.fieldHint}>Type at least 3 letters to search clients.</Text>
          ) : null}
        </>
      ) : null}

      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}
