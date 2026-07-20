import { useLocalSearchParams } from "expo-router";
import BrandFormScreen from "@/features/products/components/BrandFormScreen";

export default function EditBrandScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <BrandFormScreen id={id} mode="edit" />;
}
