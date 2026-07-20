import * as Location from "expo-location";
import { Alert, Linking, Platform } from "react-native";

export interface LocationPermissionResult {
  granted: boolean;
  status: Location.PermissionStatus;
  canAskAgain: boolean;
}

/**
 * Checks existing permission and requests coarse/fine location permission if needed.
 * Displays user-friendly configuration alert messages if permissions are permanently denied.
 */
export async function requestLocationPermission(): Promise<LocationPermissionResult> {
  try {
    const { status: existingStatus, canAskAgain: existingCanAskAgain } =
      await Location.getForegroundPermissionsAsync();

    if (existingStatus === Location.PermissionStatus.GRANTED) {
      return {
        granted: true,
        status: existingStatus,
        canAskAgain: existingCanAskAgain,
      };
    }

    if (existingStatus === Location.PermissionStatus.DENIED && !existingCanAskAgain) {
      showSettingsAlert();
      return {
        granted: false,
        status: existingStatus,
        canAskAgain: false,
      };
    }

    const { status, granted, canAskAgain } =
      await Location.requestForegroundPermissionsAsync();

    if (!granted && status === Location.PermissionStatus.DENIED && !canAskAgain) {
      showSettingsAlert();
    }

    return { granted, status, canAskAgain };
  } catch (error) {
    console.warn("[LocationPermission] Failed to check/request permission:", error);
    return {
      granted: false,
      status: Location.PermissionStatus.UNDETERMINED,
      canAskAgain: true,
    };
  }
}

function showSettingsAlert() {
  Alert.alert(
    "Location Permission Required",
    "SalonOX uses your device's location to detect your salon's address and coordinates. Please enable Location permissions in your device settings.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Open Settings",
        onPress: () => {
          if (Platform.OS === "ios") {
            Linking.openURL("app-settings:");
          } else {
            Linking.openSettings();
          }
        },
      },
    ],
    { cancelable: true },
  );
}
