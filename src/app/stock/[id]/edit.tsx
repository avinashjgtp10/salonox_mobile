import { useLocalSearchParams } from "expo-router";

import ProductFormScreen from "@/features/products/components/ProductFormScreen";

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <ProductFormScreen id={id} mode="edit" />;
}
