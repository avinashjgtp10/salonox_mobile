// Shared defensive-normalization helpers for reading loosely-typed API payloads.
// Several backend contracts in this app are undocumented, so service layers read
// responses defensively across common camelCase/snake_case key variants instead
// of trusting a single shape.

export type UnknownRecord = Record<string, unknown>;

export const asRecord = (value: unknown): UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};

export const toSafeString = (value: unknown, fallback = "") => {
  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (trimmedValue) {
      return trimmedValue;
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
};

export const toSafeNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return 0;
};

export const toOptionalBoolean = (value: unknown) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return false;
};

export const firstValue = (record: UnknownRecord, keys: string[]): unknown => {
  for (const key of keys) {
    const value = record[key];

    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
};

export const firstArray = (record: UnknownRecord, keys: string[]): UnknownRecord[] => {
  const value = firstValue(record, keys);

  return Array.isArray(value) ? value.map(asRecord) : [];
};

export const getEntryId = (entry: UnknownRecord, fallback: string) =>
  toSafeString(firstValue(entry, ["id", "_id"]), fallback);

const EXPLICIT_SALE_ID_KEYS = ["saleId", "sale_id", "saleID"] as const;

const getSaleIdFromRecord = (record: UnknownRecord, depth: number): string | null => {
  const directId = toSafeString(firstValue(record, [...EXPLICIT_SALE_ID_KEYS]));
  if (directId) {
    return directId;
  }

  const saleValue = record.sale;
  const scalarSaleId = toSafeString(saleValue);
  if (scalarSaleId) {
    return scalarSaleId;
  }

  const saleRecord = asRecord(saleValue);
  const nestedSaleId = toSafeString(
    firstValue(saleRecord, [...EXPLICIT_SALE_ID_KEYS, "id", "_id"]),
  );
  if (nestedSaleId) {
    return nestedSaleId;
  }

  if (depth <= 0) {
    return null;
  }

  const dataRecord = asRecord(record.data);
  return Object.keys(dataRecord).length > 0
    ? getSaleIdFromRecord(dataRecord, depth - 1)
    : null;
};

/**
 * Normalizes sale identifiers without treating an arbitrary record `id` as a
 * sale ID. This is important for appointment checkout responses, whose root
 * `id` belongs to the appointment rather than the generated sale.
 */
export const normalizeSaleId = (payload: unknown): string | null => {
  const record = asRecord(payload);
  return Object.keys(record).length > 0 ? getSaleIdFromRecord(record, 2) : null;
};

export const getTotalCount = (record: UnknownRecord, fallbackCount: number) =>
  toSafeNumber(firstValue(record, ["totalCount", "total_count", "total", "count"])) ||
  toSafeNumber(firstValue(asRecord(record.pagination), ["totalCount", "total_count", "total"])) ||
  fallbackCount;
