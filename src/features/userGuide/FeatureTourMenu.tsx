import { useState } from "react";
import { Modal, ScrollView, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getFeatureTourRoutes } from "./featureTourRoutes";

export function FeatureTourMenu({ staff }: { staff: boolean }) {
  const [visible, setVisible] = useState(false);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return <>
    <Button mode="outlined" icon="cursor-default-click-outline" onPress={() => setVisible(true)}>Feature tours</Button>
    <Modal transparent visible={visible} animationType="fade" onRequestClose={() => setVisible(false)}>
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16, backgroundColor: "rgba(0,0,0,0.55)" }}>
        <View accessibilityViewIsModal style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 20, maxHeight: "100%" }}>
          <Text variant="titleLarge" accessibilityRole="header">What would you like to explore?</Text>
          <Text variant="bodyMedium" style={{ marginVertical: 12 }}>Choose a feature to open its screen and explore the controls.</Text>
          <ScrollView>
            {getFeatureTourRoutes(staff).map((entry) => <Button key={entry.route} contentStyle={{ justifyContent: "flex-start" }} onPress={() => {
              setVisible(false);
              router.navigate({ pathname: entry.route, params: { tour: "1" } });
            }}>{entry.title}</Button>)}
          </ScrollView>
          <Button onPress={() => setVisible(false)}>Close</Button>
        </View>
      </View>
    </Modal>
  </>;
}
