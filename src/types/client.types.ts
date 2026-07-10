// ── Client entity ─────────────────────────────────────────────────────────────
import type { EntityId } from "./common.types";

export interface Client {
  id: EntityId;
  fullName: string;
  email?: string;
  phone?: string;
  isBlocked?: boolean;
  // ── Refer & Earn ──────────────────────────────────────────────────────────
  referral_code?: string | null;                  // this client's own permanent referral code
  referred_by_client_id?: string | null;          // set once, at creation, if a referral code was used
  referral_reward_status?: "pending" | "completed" | null; // status of the reward tied to referred_by_client_id
  total_referral_earnings?: number;               // ₹ this client has earned from referring others
  total_successful_referrals?: number;            // count of referrals that reached a completed reward
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
