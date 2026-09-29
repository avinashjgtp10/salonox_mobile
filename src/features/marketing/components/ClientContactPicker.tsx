import { useEffect, useMemo, useState } from "react";
import api from "../../../services/api/axios";
import { CLIENT } from "../../../services/api/endpoints/client.endpoints";
import "../styles/ClientContactPicker.scss";

interface Contact {
  phone: string;
  name?: string;
  [key: string]: string | undefined;
}

interface PickerClient {
  id: string;
  name: string;
  phone: string;
}

interface Props {
  onContactsLoaded: (contacts: Contact[]) => void;
}

// Fetches the trimmed "list" projection (fields=list) — same opt-in the
// Client List table itself uses — rather than the full client record, since
// this picker only ever needs name + phone. Pages through everything up
// front (same pattern fetchClientsThunk uses) so search/select-all work
// against the full set, not just one page.
async function fetchAllClientsForPicker(): Promise<PickerClient[]> {
  const pageSize = 200;
  let page = 1;
  const out: PickerClient[] = [];
  while (true) {
    const res = await api.get(CLIENT.BASE, { params: { page, pageSize, fields: "list" } });
    const payload = res.data.data;
    const items: any[] = Array.isArray(payload?.items) ? payload.items : [];
    for (const c of items) {
      if (c.is_blocked) continue;
      const phone = String(c.phone_number ?? "").trim();
      if (!phone) continue;
      const name = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
      out.push({ id: c.id, name: name || phone, phone });
    }
    const total = payload?.totalRecords ?? payload?.total ?? out.length;
    if (items.length < pageSize || out.length >= total) break;
    page += 1;
  }
  return out;
}

export default function ClientContactPicker({ onContactsLoaded }: Props) {
  const [clients,  setClients]  = useState<PickerClient[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAllClientsForPicker()
      .then((list) => { if (!cancelled) setClients(list); })
      .catch(() => { if (!cancelled) setError("Could not load your client list."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [clients, search]);

  const allFilteredSelected = filtered.length > 0 && filtered.every(c => selected.has(c.id));

  const emitSelection = (next: Set<string>) => {
    setSelected(next);
    const contacts = clients.filter(c => next.has(c.id)).map(c => ({ phone: c.phone, name: c.name }));
    onContactsLoaded(contacts);
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    emitSelection(next);
  };

  const toggleAllFiltered = () => {
    const next = new Set(selected);
    if (allFilteredSelected) filtered.forEach(c => next.delete(c.id));
    else filtered.forEach(c => next.add(c.id));
    emitSelection(next);
  };

  if (loading) return <div className="ccp-state">Loading your clients…</div>;
  if (error)   return <div className="ccp-state ccp-state--error">{error}</div>;
  if (clients.length === 0) return <div className="ccp-state">No clients with a phone number found.</div>;

  return (
    <div className="ccp-wrap">
      <div className="ccp-toolbar">
        <input
          className="ccp-search"
          placeholder="Search clients by name or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <label className="ccp-select-all">
          <input type="checkbox" checked={allFilteredSelected} onChange={toggleAllFiltered} />
          Select all {filtered.length.toLocaleString()}
        </label>
      </div>

      <div className="ccp-list">
        {filtered.map(c => (
          <label key={c.id} className="ccp-row">
            <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleOne(c.id)} />
            <span className="ccp-row-name">{c.name}</span>
            <span className="ccp-row-phone">{c.phone}</span>
          </label>
        ))}
      </div>

      <div className="ccp-footer">{selected.size.toLocaleString()} client{selected.size === 1 ? "" : "s"} selected</div>
    </div>
  );
}
