import { useLocalSearchParams } from "expo-router";

import PlaceholderScreen from "@/components/dashboard/PlaceholderScreen";

export default function StockDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  return (
    <PlaceholderScreen
      showBack
      icon="cube-outline"
      title="Stock Item"
      subtitle={`Stock detail route loaded${id ? ` for item ${id}` : ""}. Live inventory data can be integrated later.`}
    />
  );
}
