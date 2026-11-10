import { useAuth } from "@/context/AuthContext";
import { PaymentMethodsScreen } from "@/features/settings/PaymentMethodsScreen";

export default function PaymentMethodsRoute() {
  const { user } = useAuth();
  return <PaymentMethodsScreen key={`${user?.id}:${user?.salonId}`} />;
}
