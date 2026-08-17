import { Redirect, type Href } from "expo-router";

import { useAuth } from "@/context/AuthContext";
import { resolveAuthenticatedRoute } from "@/utils/routeResolver";

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <Redirect
      href={(isAuthenticated ? resolveAuthenticatedRoute(user) : "/welcome") as Href}
    />
  );
}
