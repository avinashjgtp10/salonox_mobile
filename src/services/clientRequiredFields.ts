import { useCallback, useEffect, useState } from "react";
import { api } from "@/services/api";

// App-only rule: when on, a new client can't be saved without a Date of Birth /
// Anniversary (Quick Sale, Calendar and Clients → Add). Its own salon_settings
// key — the web's "client_form_fields" (show/hide only) is deliberately left
// alone, so toggling these never changes how the web's add-client form behaves.
const KEY = "client_form_required_fields";

export type ClientRequiredFields = { require_dob: boolean; require_doa: boolean };

const DEFAULTS: ClientRequiredFields = { require_dob: false, require_doa: false };

type SettingRow = { id: string; key: string; value: unknown };

const parse = (value: unknown): ClientRequiredFields => {
  let parsed: unknown = value;
  if (typeof value === "string") {
    try { parsed = JSON.parse(value); } catch { return DEFAULTS; }
  }
  const record = (parsed ?? {}) as Partial<ClientRequiredFields>;
  return { require_dob: record.require_dob === true, require_doa: record.require_doa === true };
};

async function readRow() {
  const response = await api.get<{ data: SettingRow[] }>("/settings");
  return (response.data.data ?? []).find((item) => item.key === KEY);
}

// Last known value, so a form opened right after the toggle changes is already in step.
let cached: ClientRequiredFields = DEFAULTS;
const listeners = new Set<(value: ClientRequiredFields) => void>();
const publish = (value: ClientRequiredFields) => {
  cached = value;
  listeners.forEach((listener) => listener(value));
};

export const clientRequiredFieldsService = {
  async get(): Promise<ClientRequiredFields> {
    const row = await readRow();
    const value = row ? parse(row.value) : DEFAULTS;
    publish(value);
    return value;
  },

  async save(next: ClientRequiredFields) {
    const row = await readRow();
    const value = JSON.stringify(next);
    if (row) await api.put(`/settings/${encodeURIComponent(row.id)}`, { key: KEY, value });
    else await api.post("/settings", { key: KEY, value, description: "Mandatory DOB / anniversary when adding a client in the app" });
    publish(next);
  },
};

/** The salon's DOB / DOA requirement, refreshed from the server on mount. */
export function useClientRequiredFields() {
  const [config, setConfig] = useState(cached);

  useEffect(() => {
    listeners.add(setConfig);
    // Unreadable setting = not required, i.e. today's behavior.
    clientRequiredFieldsService.get().catch(() => undefined);
    return () => { listeners.delete(setConfig); };
  }, []);

  const toggle = useCallback(async (field: keyof ClientRequiredFields) => {
    const previous = cached;
    const next = { ...previous, [field]: !previous[field] };
    publish(next);
    try {
      await clientRequiredFieldsService.save(next);
    } catch (error) {
      publish(previous);
      throw error;
    }
  }, []);

  return { config, toggle };
}
