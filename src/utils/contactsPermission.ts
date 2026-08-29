import * as Contacts from "expo-contacts";
import { Alert, Linking, Platform } from "react-native";

export interface ContactsPermissionResult {
  granted: boolean;
  status: Contacts.PermissionStatus;
  canAskAgain: boolean;
}

/**
 * Checks existing permission and requests Contacts permission if needed.
 * Displays user-friendly configuration alert messages if permissions are permanently denied.
 */
export async function requestContactsPermission(): Promise<ContactsPermissionResult> {
  try {
    const { status: existingStatus, canAskAgain: existingCanAskAgain } =
      await Contacts.getPermissionsAsync();

    if (existingStatus === Contacts.PermissionStatus.GRANTED) {
      return {
        granted: true,
        status: existingStatus,
        canAskAgain: existingCanAskAgain,
      };
    }

    if (existingStatus === Contacts.PermissionStatus.DENIED && !existingCanAskAgain) {
      showSettingsAlert();
      return {
        granted: false,
        status: existingStatus,
        canAskAgain: false,
      };
    }

    const { status, granted, canAskAgain } =
      await Contacts.requestPermissionsAsync();

    if (!granted && status === Contacts.PermissionStatus.DENIED && !canAskAgain) {
      showSettingsAlert();
    }

    return { granted, status, canAskAgain };
  } catch (error) {
    console.warn("[ContactsPermission] Failed to check/request permission:", error);
    return {
      granted: false,
      status: Contacts.PermissionStatus.UNDETERMINED,
      canAskAgain: true,
    };
  }
}

function showSettingsAlert() {
  Alert.alert(
    "Contacts Permission Required",
    "SalonOX needs access to your contacts to import them as clients. Please enable Contacts permission in your device settings.",
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
