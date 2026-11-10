import { useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { ExpensesScreen } from "@/features/expenses/ExpensesScreen";

export default function ExpensesRoute() {
  const { user } = useAuth();
  const { create } = useLocalSearchParams<{ create?: string }>();
  return <ExpensesScreen key={`${user?.id}:${user?.salonId}`} openNew={create === "1"} />;
}
