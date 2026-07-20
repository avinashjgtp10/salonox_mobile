import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePlacesAutocomplete } from "../../hooks/usePlacesAutocomplete";
import { MapsService } from "../../services/maps/maps.service";
import { mapGoogleAddress } from "../../utils/addressMapper";
import { type AddressDetails, type PlacePrediction } from "../../types/location";
import type { ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

interface AddressAutocompleteProps {
  onAddressSelected: (details: AddressDetails) => void;
  onError: (message: string) => void;
  disabled?: boolean;
  initialValue?: string;
}

export function AddressAutocomplete({
  onAddressSelected,
  onError,
  disabled = false,
  initialValue = "",
}: AddressAutocompleteProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [query, setQuery] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  const { suggestions, loading, error, search, clearSuggestions } = usePlacesAutocomplete();

  const handleTextChange = (text: string) => {
    setQuery(text);
    search(text);
  };

  const handleSuggestionPress = async (item: PlacePrediction) => {
    Keyboard.dismiss();
    setQuery(item.description);
    clearSuggestions();
    setFetchingDetails(true);

    try {
      const placeDetails = await MapsService.getPlaceDetails(item.placeId);
      const details = mapGoogleAddress(
        placeDetails.address_components,
        placeDetails.formatted_address,
        placeDetails.geometry.location.lat,
        placeDetails.geometry.location.lng,
        placeDetails.place_id
      );
      onAddressSelected(details);
    } catch (err: any) {
      onError(err.message || "Failed to fetch address location details.");
    } finally {
      setFetchingDetails(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    clearSuggestions();
  };

  const renderSuggestion = ({ item }: { item: PlacePrediction }) => {
    const mainText = item.structuredFormatting?.mainText || item.description;
    const secondaryText = item.structuredFormatting?.secondaryText || "";

    return (
      <Pressable
        onPress={() => handleSuggestionPress(item)}
        style={({ pressed }) => [
          styles.suggestionRow,
          pressed && styles.suggestionRowPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${mainText}, ${secondaryText}`}
      >
        <Ionicons
          name="location-sharp"
          size={18}
          color={Colors.secondary}
          style={styles.suggestionIcon}
        />
        <View style={styles.suggestionTextContainer}>
          <Text style={styles.mainText} numberOfLines={1}>
            {mainText}
          </Text>
          {secondaryText ? (
            <Text style={styles.secondaryText} numberOfLines={1}>
              {secondaryText}
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  };

  const showSuggestions = isFocused && suggestions.length > 0;
  const isInputDisabled = disabled || fetchingDetails;

  return (
    <View style={styles.container}>
      {/* Search Input Container */}
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          isInputDisabled && styles.inputContainerDisabled,
        ]}
      >
        <Ionicons
          name="search-outline"
          size={20}
          color={Colors.secondary}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.textInput}
          placeholder="Search salon address..."
          placeholderTextColor={Colors.placeholder}
          value={query}
          onChangeText={handleTextChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)} // delay to allow clicks
          editable={!isInputDisabled}
          returnKeyType="search"
          accessibilityLabel="Search address"
          accessibilityHint="Type to search for your salon address using Google Places"
        />
        {loading || fetchingDetails ? (
          <ActivityIndicator color={Colors.primary} size="small" style={styles.clearButton} />
        ) : query.length > 0 && !isInputDisabled ? (
          <Pressable onPress={handleClear} hitSlop={10} style={styles.clearButton}>
            <Ionicons name="close-circle" size={18} color={Colors.placeholder} />
          </Pressable>
        ) : null}
      </View>

      {/* Suggestion list overlay */}
      {showSuggestions && (
        <View style={styles.dropdownContainer}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.placeId}
            renderItem={renderSuggestion}
            keyboardShouldPersistTaps="handled"
            scrollEnabled
            style={styles.list}
          />
        </View>
      )}

      {/* Error Displays */}
      {error && (
        <Text style={styles.errorText} accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    width: "100%",
    position: "relative",
    zIndex: 100,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    height: 54,
  },
  inputContainerFocused: {
    borderColor: Colors.focusBorder,
  },
  inputContainerDisabled: {
    opacity: 0.6,
  },
  searchIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.heading,
    height: "100%",
  },
  clearButton: {
    marginLeft: 8,
  },
  dropdownContainer: {
    position: "absolute",
    top: 58,
    left: 0,
    right: 0,
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.border,
    maxHeight: 220,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
    overflow: "hidden",
  },
  list: {
    width: "100%",
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggestionRowPressed: {
    backgroundColor: Colors.bg2,
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  mainText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.heading,
  },
  secondaryText: {
    fontSize: 12,
    color: Colors.text2,
    marginTop: 2,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 6,
    paddingHorizontal: 4,
  },
});
