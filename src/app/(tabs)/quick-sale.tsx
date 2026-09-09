import { Redirect } from "expo-router";

import { OWNER_CALENDAR_ROUTE } from "@/utils/routeResolver";

export default function RemovedQuickSaleTab() {
  return <Redirect href={OWNER_CALENDAR_ROUTE} />;
}
