import { useLocalSearchParams } from "expo-router";
import StaffProfileScreen from "@/features/staff/screens/StaffProfileScreen";
export default function StaffProfileRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StaffProfileScreen key={id} />;
}
