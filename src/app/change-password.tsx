import { router, type Href } from "expo-router";
import { View } from "react-native";
import { ChangePasswordSheet } from "@/features/settings/ChangePasswordSheet";
const close = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/more" as Href);
};
export default function SettingsOverlayRoute() {
  return (
    <View style={{ flex: 1 }}>
      <ChangePasswordSheet onClose={close} renderInline />
    </View>
  );
}
