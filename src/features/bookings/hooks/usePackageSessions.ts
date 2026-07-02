import { useState, useEffect, useCallback } from "react";
import api from "../../../services/api/axios";

export interface ActivePackage {
  id: string;
  packageId: string;
  packageName: string;
  sessionsRemaining: number;
  sessionsTotal: number;
  services: string[];
}

export interface PackageSessionState {
  packages: ActivePackage[];
  completed: Record<string, boolean>;
  loading: boolean;
}

/**
 * Manages package session completion for a client during checkout.
 * Fetches active packages, lets staff mark sessions complete.
 */
export function usePackageSessions(clientId: string | null | undefined) {
  const [packages, setPackages]   = useState<ActivePackage[]>([]);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (!clientId || clientId === 'walk-in') { setPackages([]); setCompleted({}); return; }

    setLoading(true);
    api.get(`/api/v1/client-packages?clientId=${clientId}&status=active`)
      .then((res) => {
        const items = res.data?.data ?? res.data ?? [];
        const mapped: ActivePackage[] = items.map((p: any) => ({
          id: String(p.id),
          packageId: String(p.package_id ?? p.packageId ?? p.id),
          packageName: p.package_name ?? p.packageName ?? p.name ?? "",
          sessionsRemaining: Number(p.sessions_remaining ?? p.sessionsRemaining ?? 0),
          sessionsTotal: Number(p.sessions_total ?? p.sessionsTotal ?? 0),
          services: (p.services ?? []).map((s: any) => s.name ?? s),
        }));
        setPackages(mapped);
      })
      .catch(() => setPackages([]))
      .finally(() => setLoading(false));
  }, [clientId]);

  const toggle = useCallback((packageId: string) => {
    setCompleted((prev) => ({ ...prev, [packageId]: !prev[packageId] }));
  }, []);

  /** Returns the list of package IDs that staff has marked as completed */
  const completedIds = Object.entries(completed)
    .filter(([, v]) => v)
    .map(([k]) => k);

  return { packages, completed, completedIds, loading, toggle };
}