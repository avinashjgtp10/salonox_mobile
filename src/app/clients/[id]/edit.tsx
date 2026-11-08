import { useLocalSearchParams } from "expo-router";
import ClientFormScreen from "@/features/clients/screens/ClientFormScreen";

export default function EditClientRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <ClientFormScreen key={id} />;
}
