import { Redirect, useLocalSearchParams, type Href } from "expo-router";

import { getReportConfig } from "@/features/reports/report-config";
import ReportScreen from "@/features/reports/screens/report-screen";

export default function ReportRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const config = getReportConfig(slug);

  if (!config) return <Redirect href={"/reports" as Href} />;
  return <ReportScreen config={config} />;
}
