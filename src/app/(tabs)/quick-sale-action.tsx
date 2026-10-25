import { Redirect } from "expo-router";

// The tab press opens the existing stack screen; this handles direct links.
export default function QuickSaleActionRoute() {
  return <Redirect href="/quick-sale" />;
}
