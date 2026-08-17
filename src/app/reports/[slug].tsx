import { Redirect, useLocalSearchParams, type Href } from "expo-router";

import ConsumableUsageReportScreen from "@/features/reports/screens/consumable-usage-report-screen";
import { getReportConfig } from "@/features/reports/report-config";
import ReportScreen from "@/features/reports/screens/report-screen";

export default function ReportRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const config = getReportConfig(slug);

  if (!config) return <Redirect href={"/reports" as Href} />;
  // Web-parity legacy report: local-only search/category filtering and
  // client-side pagination against a single full-dataset fetch, which the
  // generic ReportScreen doesn't support (it re-fetches from the network on
  // every filter change) — see report-config.ts for the full rationale.
  if (config.slug === "consumable-usage") return <ConsumableUsageReportScreen config={config} />;
  return <ReportScreen config={config} />;
}
