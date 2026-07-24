import { Ionicons } from "@expo/vector-icons";
import { memo, useMemo, useRef } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from "react-native";
import type { TextInput as TextInputType } from "react-native";

import { AppLayout, AppRadius } from "@/constants/layout";
import { type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

type GlobalSearchBarProps = {
  isActive: boolean;
  isLoading?: boolean;
  onChangeQuery: (value: string) => void;
  onClear: () => void;
  onFocus: () => void;
  placeholder?: string;
  query: string;
};

function GlobalSearchBarComponent({
  isActive,
  isLoading,
  onChangeQuery,
  onClear,
  onFocus,
  placeholder = "Search clients, services, products...",
  query,
}: GlobalSearchBarProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const inputRef = useRef<TextInputType>(null);

  return (
    <Pressable
      onPress={() => {
        onFocus();
        inputRef.current?.focus();
      }}
      style={[styles.searchBar, isActive && styles.searchBarFocused]}
    >
      <Ionicons name="search-outline" size={AppLayout.searchBarIconSize} color={Colors.placeholder} />
      <TextInput
        ref={inputRef}
        onChangeText={onChangeQuery}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor={Colors.placeholder}
        returnKeyType="search"
        style={styles.searchInput}
        value={query}
      />
      {isLoading ? (
        <ActivityIndicator color={Colors.primary} size="small" />
      ) : query ? (
        <Pressable accessibilityLabel="Clear search" hitSlop={10} onPress={onClear} style={styles.clearButton}>
          <Ionicons name="close-circle" size={20} color={Colors.text2} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export const GlobalSearchBar = memo(GlobalSearchBarComponent);

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  searchBar: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.search,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    minHeight: AppLayout.searchBarHeight,
    paddingHorizontal: AppLayout.searchBarPaddingX,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.045,
    shadowRadius: 14,
    elevation: 1,
  },
  searchBarFocused: {
    borderColor: Colors.focusBorder,
    shadowOpacity: 0.09,
  },
  searchInput: {
    color: Colors.heading,
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
    minHeight: AppLayout.searchBarHeight - 2,
  },
  clearButton: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36,
  },
});
