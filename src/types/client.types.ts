// ── Client entity ─────────────────────────────────────────────────────────────
import type { EntityId } from "./common.types";

export interface Client {
  id: EntityId;
  fullName: string;
  email?: string;
  phone?: string;
  isBlocked?: boolean;
  [key: string]: any; // allow extra fields from API
}

export interface ClientItem {
  id: EntityId;
  fullName?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  phone_number?: string;
  mobile?: string;
  mobile_number?: string;
  email?: string;
  isBlocked?: boolean;
  [key: string]: any;
}

// ── Payloads ──────────────────────────────────────────────────────────────────
export interface CreateClientPayload {
  fullName: string;
  email?: string;
  phone?: string;
  [key: string]: any;
}

export interface BlockClientsPayload {
  ids: EntityId[];
  reason: string;
}

export interface UnblockClientsPayload {
  ids: EntityId[];
}

export interface MergeSelectedClientsPayload {
  primaryId: EntityId;
  secondaryId: EntityId;
}

// ── API responses ─────────────────────────────────────────────────────────────
export interface ClientResponse {
  data: Client;
}

export interface ClientsListResponse {
  data: Client[];
}
