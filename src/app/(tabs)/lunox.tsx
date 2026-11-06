import { Redirect } from "expo-router";

// Lunox AI opens over the current tab from the tab bar; this only handles direct links.
export default function LunoxRoute() {
  return <Redirect href="/dashboard" />;
}
