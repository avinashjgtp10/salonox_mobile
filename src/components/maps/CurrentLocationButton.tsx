import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCurrentLocation } from "../../hooks/useCurrentLocation";
import { type AddressDetails } from "../../types/location";
import type { ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

interface CurrentLocationButtonProps {
  onLocationFetched: (details: AddressDetails) => void;
  onError: (message: string) => void;
  disabled?: boolean;
  onLocationRequestStart?: () => number;
  shouldUseLocationResult?: (requestId: number) => boolean;
}

export function CurrentLocationButton({
  onLocationFetched,
  onError,
  disabled = false,
  onLocationRequestStart,
  shouldUseLocationResult,
}: CurrentLocationButtonProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { fetchLocation, loading, error, loadingState } = useCurrentLocation();

  const handlePress = async () => {
    if (disabled || loading) return;

    const requestId = onLocationRequestStart?.() ?? Date.now();
    const details = await fetchLocation();
    if (details) {
      if (shouldUseLocationResult && !shouldUseLocationResult(requestId)) {
        return;
      }
      onLocationFetched(details);
    } else if (error) {
      onError(error);
    }
  };

  const isButtonDisabled = disabled || loading;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handlePress}
        disabled={isButtonDisabled}
        accessibilityRole="button"
        accessibilityLabel="Detect my current location"
        accessibilityHint="Requests location permission and reverse-geocodes your address using GPS coordinates"
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          isButtonDisabled && styles.buttonDisabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} size="small" style={styles.icon} />
        ) : (
          <Ionicons
            name="location"
            size={18}
            color={Colors.primary}
            style={styles.icon}
          />
        )}
        <Text style={styles.text}>
          {loading ? loadingState || "Detecting location..." : "Use Current Location"}
        </Text>
      </Pressable>
      
      {error && !loading && (
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
    marginBottom: 12,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    height: 50,
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonPressed: {
    opacity: 0.8,
    backgroundColor: "rgba(73, 106, 93, 0.04)",
  },
  buttonDisabled: {
    opacity: 0.6,
    borderColor: Colors.border,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
    letterSpacing: 0,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 6,
    textAlign: "center",
  },
});
