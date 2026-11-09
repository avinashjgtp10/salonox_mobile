import { useLocalSearchParams } from "expo-router";
import { StaffFormScreen } from "@/features/staff/screens/StaffFormScreen";
export default function EditStaffRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StaffFormScreen key={id} mode="edit" />;
}
