import { useLocalSearchParams } from "expo-router";

import { MembershipFormScreen } from "@/features/membership/MembershipFormScreen";

export default function EditMembershipScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  return <MembershipFormScreen membershipId={id} mode="edit" />;
}
