import { useLocalSearchParams } from "expo-router";

import { PackageFormScreen } from "@/features/packages/PackageFormScreen";

export default function EditPackageScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  return <PackageFormScreen mode="edit" templateId={id} />;
}
