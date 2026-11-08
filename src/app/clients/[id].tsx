import { useLocalSearchParams } from "expo-router";
import ClientDetailsScreen from "@/features/clients/screens/ClientDetailsScreen";

export default function ClientDetailRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <ClientDetailsScreen key={id} />;
}
