// src/hooks/packages/usePackages.ts

import { useCallback } from "react";
import {
  useListPackagesQuery,
  useCreatePackageMutation,
  useUpdatePackageMutation,
  useListClientPackagesQuery,
  useCreateClientPackageMutation,
  useCompleteClientPackageSessionMutation,
  type CreatePackageDTO,
  type PackagesListQuery,
  type CreateClientPackageDTO,
  type ClientPackagesListQuery,
  type CompleteSessionDTO,
} from "../../services/api/endpoints/packages.endpoints";

// ─── Catalog package hooks ────────────────────────────────────────────────────

export function useGetPackages(params?: PackagesListQuery) {
  const { data, isLoading, isFetching, isError, error, refetch } =
    useListPackagesQuery(params ?? {});

  return {
    packages:   data?.items ?? [],
    total:      data?.total ?? 0,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  };
}

export function useCreatePackage() {
  const [mutate, { isLoading, isError, isSuccess, error, reset }] =
    useCreatePackageMutation();

  const createPackage = useCallback(
    (dto: CreatePackageDTO) => mutate(dto).unwrap(),
    [mutate],
  );

  return { createPackage, isLoading, isError, isSuccess, error, reset };
}

export function useUpdatePackage() {
  const [mutate, { isLoading, isError, isSuccess }] = useUpdatePackageMutation();

  const updatePackage = useCallback(
    (id: string, data: Partial<CreatePackageDTO>) => mutate({ id, data }).unwrap(),
    [mutate],
  );

  return { updatePackage, isLoading, isError, isSuccess };
}

// ─── Client package hooks ─────────────────────────────────────────────────────

export function useGetClientPackages(params?: ClientPackagesListQuery) {
  const { data, isLoading, isFetching, isError, error, refetch } =
    useListClientPackagesQuery(params ?? {}, { skip: !params?.clientId });

  return {
    packages:   data?.items ?? [],
    total:      data?.total ?? 0,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  };
}

export function useCreateClientPackage() {
  const [mutate, { isLoading, isError, isSuccess, error, reset }] =
    useCreateClientPackageMutation();

  const createClientPackage = useCallback(
    (dto: CreateClientPackageDTO) => mutate(dto).unwrap(),
    [mutate],
  );

  return { createClientPackage, isLoading, isError, isSuccess, error, reset };
}

export function useCompleteSession() {
  const [mutate, { isLoading, isError, isSuccess, reset }] =
    useCompleteClientPackageSessionMutation();

  const completeSession = useCallback(
    (id: string, body: CompleteSessionDTO) => mutate({ id, body }).unwrap(),
    [mutate],
  );

  return { completeSession, isLoading, isError, isSuccess, reset };
}
