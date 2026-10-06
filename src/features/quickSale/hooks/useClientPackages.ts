import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  ClientPackageLoadState,
  ClientPackageLoadStatus,
} from "@/features/quickSale/types";
import { getApiErrorMessage } from "@/services/api";
import { packageService } from "@/services/package.service";
import type { ClientPackage } from "@/types/package";

const IDLE_LOAD_STATE: ClientPackageLoadState = {
  clientId: "",
  error: null,
  isRetrying: false,
  status: "loaded",
};

type UseClientPackagesArgs = {
  clientId: string;
  onPackagesLoaded: (packages: ClientPackage[]) => void;
  salonId: string | null;
};

export function useClientPackages({ clientId, onPackagesLoaded, salonId }: UseClientPackagesArgs) {
  const [packages, setPackages] = useState<ClientPackage[]>([]);
  const [packagesClientId, setPackagesClientId] = useState("");
  const [loadState, setLoadState] = useState<ClientPackageLoadState>(IDLE_LOAD_STATE);
  const requestIdRef = useRef(0);
  const requestClientIdRef = useRef<string | null>(null);

  const cancelPendingRequest = useCallback(() => {
    requestIdRef.current += 1;
    requestClientIdRef.current = null;
  }, []);

  const load = useCallback(
    async (targetClientId: string, retry = false) => {
      if (!targetClientId) {
        cancelPendingRequest();
        setPackages([]);
        setPackagesClientId("");
        setLoadState(IDLE_LOAD_STATE);
        onPackagesLoaded([]);
        return;
      }

      if (requestClientIdRef.current === targetClientId) {
        return;
      }

      const requestId = ++requestIdRef.current;
      requestClientIdRef.current = targetClientId;
      setLoadState({
        clientId: targetClientId,
        error: null,
        isRetrying: retry,
        status: "loading",
      });

      try {
        const loadedPackages = await packageService.getClientPackages(targetClientId, salonId);
        if (requestId !== requestIdRef.current) {
          return;
        }

        setPackages(loadedPackages);
        setPackagesClientId(targetClientId);
        onPackagesLoaded(loadedPackages);
        setLoadState({
          clientId: targetClientId,
          error: null,
          isRetrying: false,
          status: "loaded",
        });
      } catch (error) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setLoadState({
          clientId: targetClientId,
          error: getApiErrorMessage(error),
          isRetrying: false,
          status: "error",
        });
      } finally {
        if (requestId === requestIdRef.current) {
          requestClientIdRef.current = null;
        }
      }
    },
    [cancelPendingRequest, onPackagesLoaded, salonId],
  );

  useEffect(() => {
    void load(clientId);
  }, [clientId, load]);

  useEffect(() => cancelPendingRequest, [cancelPendingRequest]);

  const reset = useCallback(() => {
    cancelPendingRequest();
    setPackages([]);
    setPackagesClientId("");
    setLoadState(IDLE_LOAD_STATE);
  }, [cancelPendingRequest]);

  const retry = useCallback(() => void load(clientId, true), [clientId, load]);

  const isCurrentClient = loadState.clientId === clientId;
  const status: ClientPackageLoadStatus = isCurrentClient ? loadState.status : "loading";
  const visiblePackages = useMemo(
    () => (packagesClientId === clientId ? packages : []),
    [clientId, packages, packagesClientId],
  );

  return {
    error: isCurrentClient ? loadState.error : null,
    isReliable:
      !clientId ||
      (isCurrentClient && loadState.status === "loaded" && packagesClientId === clientId),
    packages: visiblePackages,
    reset,
    retry,
    status,
  };
}
