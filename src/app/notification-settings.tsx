import { router, type Href } from "expo-router";
import { View } from "react-native";
import { NotificationSettingsSheet } from "@/features/settings/NotificationSettingsSheet";
const close = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/more" as Href);
};
export default function SettingsOverlayRoute() {
  return (
    <View style={{ flex: 1 }}>
      <NotificationSettingsSheet onClose={close} renderInline />
    </View>
  );
}
