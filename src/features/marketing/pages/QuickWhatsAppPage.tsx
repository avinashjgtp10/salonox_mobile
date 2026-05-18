import { useEffect, useState, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchClientsThunk } from "../../../middleware/client/client.thunk";
import { Input } from "../../../components/ui";
import { Whatsapp, TelephoneFill } from "react-bootstrap-icons";
import "../styles/QuickWhatsAppPage.scss";

function getInitials(name: string) {
  const parts = name.trim().split(" ");
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function cleanPhone(phone: string): string {
  let p = phone.replace(/[\s\-().]/g, "");
  if (p.startsWith("0")) p = "91" + p.slice(1);
  if (p.startsWith("+")) p = p.slice(1);
  if (p.length === 10) p = "91" + p;
  return p;
}

export default function QuickWhatsAppPage() {
  const dispatch = useAppDispatch();
  const { items: clientItems, loading } = useAppSelector((s) => s.client);
  const [search, setSearch] = useState("");

  useEffect(() => { dispatch(fetchClientsThunk()); }, [dispatch]);

  const clients: any[] = useMemo(() => {
    const raw = Array.isArray(clientItems) ? clientItems
      : Array.isArray((clientItems as any)?.items) ? (clientItems as any).items
      : Array.isArray((clientItems as any)?.data)  ? (clientItems as any).data
      : [];

    return raw.map((c: any) => ({
      id:    c.id,
      name:  (c.fullName || c.full_name || (`${c.first_name || ""} ${c.last_name || ""}`).trim()) || "Unknown",
      phone: c.phone ?? c.phone_number ?? c.phoneNumber ?? "",
      email: c.email ?? "",
    })).filter((c: any) => c.phone && c.phone.trim().length > 0);
  }, [clientItems]);

  const filtered = useMemo(() =>
    clients.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
    ),
  [clients, search]);

  const openWhatsApp = (phone: string) => {
    window.open(`https://wa.me/${cleanPhone(phone)}`, "_blank", "noopener,noreferrer");
  };

  const openCall = (phone: string) => {
    window.open(`tel:+${cleanPhone(phone)}`, "_self");
  };

  return (
    <div className="qwa-page">
      <div className="qwa-header">
        <div>
          <h1 className="qwa-title">Quick WhatsApp</h1>
          <p className="qwa-sub">Open a free WhatsApp chat or call any client instantly</p>
        </div>
        <div className="qwa-badge">
          <span className="qwa-badge-dot" />
          Free messaging · No template needed
        </div>
      </div>

      <div className="qwa-search-wrap">
        <Input
          placeholder="Search by name or phone number..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          containerClass="mb-0 flex-1"
        />
        {clients.length > 0 && (
          <span className="qwa-count">{filtered.length} of {clients.length} clients</span>
        )}
      </div>

      {loading?.fetchAll ? (
        <div className="qwa-loading">Loading clients...</div>
      ) : clients.length === 0 ? (
        <div className="qwa-empty">
          <div className="qwa-empty-icon">👥</div>
          <p>No clients with phone numbers found.</p>
          <span>Add clients with phone numbers to use Quick WhatsApp.</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="qwa-empty">
          <div className="qwa-empty-icon">🔍</div>
          <p>No clients match "{search}"</p>
        </div>
      ) : (
        <div className="qwa-list">
          {filtered.map(c => (
            <div key={c.id} className="qwa-row">
              <div className="qwa-avatar">{getInitials(c.name)}</div>
              <div className="qwa-info">
                <span className="qwa-name">{c.name}</span>
                <span className="qwa-phone">{c.phone}</span>
              </div>
              {c.email && <span className="qwa-email">{c.email}</span>}
              <div className="qwa-actions">
                {/* Call button */}
                <button
                  className="qwa-call-btn"
                  onClick={() => openCall(c.phone)}
                  title={`Call ${c.name}`}
                >
                  <TelephoneFill size={14} />
                  Call
                </button>
                {/* WhatsApp button */}
                <button
                  className="qwa-wa-btn"
                  onClick={() => openWhatsApp(c.phone)}
                  title={`WhatsApp ${c.name}`}
                >
                  <Whatsapp size={15} />
                  Chat
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}