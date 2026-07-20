import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MapsService } from "../../services/maps/maps.service";
import { mapGoogleAddress } from "../../utils/addressMapper";
import { type AddressDetails } from "../../types/location";
import type { ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/theme/ThemeProvider";

/**
 * GoogleMapPreview
 *
 * Renders a non-interactive static map image via the Google Maps Static API.
 * This approach works in Expo Go (SDK 54+) without any native modules.
 *
 * Native interactive maps (react-native-maps) require a custom Development Build
 * and are incompatible with Expo Go in SDK 53+ due to the New Architecture
 * making TurboModuleRegistry.getEnforcing() non-catchable from JS.
 *
 * Zoom controls re-fetch the static image at the new zoom level.
 * Coordinate refinement is done via the Autocomplete or GPS button.
 */

const GOOGLE_API_BASE = "https://maps.googleapis.com/maps/api";

const createMapColors = (theme: ThemeColors, scheme: "light" | "dark") => ({
  ...theme,
  badgeBg: scheme === "dark" ? "rgba(20, 43, 69, 0.92)" : "rgba(255,255,255,0.88)",
  loadingOverlay: scheme === "dark" ? "rgba(8,17,31,0.78)" : "rgba(255,255,255,0.75)",
});

type MapColors = ReturnType<typeof createMapColors>;

interface GoogleMapPreviewProps {
  latitude: number | null;
  longitude: number | null;
  onAddressUpdated: (details: AddressDetails) => void;
  disabled?: boolean;
}

export function GoogleMapPreview({
  latitude,
  longitude,
  onAddressUpdated,
  disabled = false,
}: GoogleMapPreviewProps) {
  const { colors, scheme } = useAppTheme();
  const Colors = useMemo(() => createMapColors(colors, scheme), [colors, scheme]);
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [zoom, setZoom] = useState(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!latitude || !longitude) {
    return null;
  }

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  const staticMapUrl = apiKey
    ? `${GOOGLE_API_BASE}/staticmap?center=${latitude},${longitude}&zoom=${zoom}&size=600x300&scale=2&markers=color:0x1C1917%7C${latitude},${longitude}&style=feature:poi%7Cvisibility:off&key=${apiKey}`
    : null;

  const handleZoomIn = () => setZoom((z) => Math.min(z + 1, 20));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 1, 10));

  // Allow tapping the map to reverse-geocode at the same coordinates
  // (useful after GPS sets coordinates — refreshes address details)
  const handleRefreshAddress = async () => {
    if (disabled || loading) return;
    setLoading(true);
    setError(null);
    try {
      const geocodeResult = await MapsService.reverseGeocode(latitude, longitude);
      const details = mapGoogleAddress(
        geocodeResult.address_components,
        geocodeResult.formatted_address,
        latitude,
        longitude,
        geocodeResult.place_id,
      );
      onAddressUpdated(details);
    } catch (err: any) {
      setError(err.message || "Failed to resolve coordinates to an address.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        {/* Static Map Image */}
        {staticMapUrl ? (
          <Image
            source={{ uri: staticMapUrl }}
            style={styles.mapImage}
            resizeMode="cover"
            accessibilityLabel={`Map preview centered at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}
          />
        ) : (
          // No API key — show placeholder with coordinates
          <View style={styles.noKeyPlaceholder}>
            <Ionicons name="map-outline" size={32} color={Colors.text2} />
            <Text style={styles.noKeyText}>
              {`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
            </Text>
            <Text style={styles.noKeySubtext}>
              Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to .env to see map preview
            </Text>
          </View>
        )}

        {/* Loading overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.loadingText}>Fetching address details...</Text>
          </View>
        )}

        {/* Zoom controls */}
        <View style={styles.controlOverlay}>
          <Pressable
            onPress={handleZoomIn}
            style={styles.controlButton}
            accessibilityLabel="Zoom in"
          >
            <Ionicons name="add" size={20} color={Colors.primary} />
          </Pressable>
          <Pressable
            onPress={handleZoomOut}
            style={styles.controlButton}
            accessibilityLabel="Zoom out"
          >
            <Ionicons name="remove" size={20} color={Colors.primary} />
          </Pressable>
          <Pressable
            onPress={handleRefreshAddress}
            style={styles.controlButton}
            disabled={loading || disabled}
            accessibilityLabel="Refresh address from these coordinates"
          >
            <Ionicons name="refresh" size={18} color={Colors.primary} />
          </Pressable>
        </View>

        {/* Location pin label */}
        <View style={styles.coordinatesBadge}>
          <Ionicons name="location" size={12} color={Colors.primary} />
          <Text style={styles.coordinatesText} numberOfLines={1}>
            {`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
          </Text>
        </View>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const createStyles = (Colors: MapColors) => StyleSheet.create({
  container: {
    width: "100%",
    marginVertical: 12,
  },
  mapContainer: {
    width: "100%",
    height: 180,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.bg2,
    overflow: "hidden",
    position: "relative",
  },
  mapImage: {
    width: "100%",
    height: "100%",
  },
  noKeyPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 20,
  },
  noKeyText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.heading,
    fontVariant: ["tabular-nums"],
  },
  noKeySubtext: {
    fontSize: 11,
    color: Colors.text2,
    textAlign: "center",
    lineHeight: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.loadingOverlay,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
    marginTop: 8,
  },
  controlOverlay: {
    position: "absolute",
    right: 12,
    bottom: 12,
    gap: 8,
    zIndex: 5,
  },
  controlButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  coordinatesBadge: {
    position: "absolute",
    left: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.badgeBg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
    maxWidth: "60%",
  },
  coordinatesText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.primary,
    fontVariant: ["tabular-nums"],
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 6,
    textAlign: "center",
  },
});
