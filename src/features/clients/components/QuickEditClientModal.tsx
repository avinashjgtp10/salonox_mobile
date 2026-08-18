// Lightweight client-detail correction from the Calendar/Quick Sale Client
// panel — covers the essentials (name, phone, email, DOB, source) without
// leaving the booking flow. Full profile edit (address, gender, referral,
// avatar...) still lives at AddClientPage via the clients list.
// Popup-over-calendar pattern, same shell as ClientHistoryModal/EwalletTopupModal.
import { useEffect, useState } from "react";
import { X } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { CLIENT } from "../../../services/api/endpoints";
import ClientSelect from "./ClientSelect";
import { DatePicker } from "../../../components/ui";
import "../styles/ClientHistoryModal.scss";
import "./QuickEditClientModal.scss";

interface Props {
  clientId: string;
  onClose: () => void;
  onSaved: (updated: { id: string; name: string; phone: string }) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same fallback AddClientPage.tsx uses — a client with a day/month on record
// but no year still needs a valid full date to populate the native date
// input, so an arbitrary placeholder year fills the gap.
const DOB_PLACEHOLDER_YEAR = 2000;

const CLIENT_SOURCE_OPTIONS = [
  { value: "walk_in", label: "Walk-in" },
  { value: "instagram", label: "Instagram" },
  { value: "google", label: "Google" },
];

export default function QuickEditClientModal({ clientId, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneCountryCode, setPhoneCountryCode] = useState("+91");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [clientSource, setClientSource] = useState("walk_in");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(CLIENT.BY_ID(clientId));
        const c = res.data?.data ?? res.data;
        if (cancelled) return;
        setFirstName(c.first_name || "");
        setLastName(c.last_name || "");
        setPhone(c.phone_number || "");
        setPhoneCountryCode(c.phone_country_code || "+91");
        setEmail(c.email || "");
        setDob(c.birthday_day_month ? `${c.birthday_year || DOB_PLACEHOLDER_YEAR}-${c.birthday_day_month}` : "");
        setClientSource(c.client_source || "walk_in");
      } catch {
        if (!cancelled) setError("Failed to load client details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  const phoneValid = /^\d{10}$/.test(phone.trim());
  const emailValid = email.trim() === "" || EMAIL_RE.test(email.trim());
  const today = new Date().toISOString().slice(0, 10);

  const handleSubmit = async () => {
    if (!firstName.trim()) { setError("First name is required."); return; }
    if (!phoneValid) { setError("Enter a valid 10-digit phone number."); return; }
    if (!emailValid) { setError("Enter a valid email address."); return; }

    setSubmitting(true);
    setError(null);
    try {
      // Same split AddClientPage.tsx uses — the backend stores day/month and
      // year separately so a year-less birthday can still be tracked precisely.
      let birthday_day_month: string | undefined;
      let birthday_year: number | undefined;
      if (dob) {
        const [y, m, d] = dob.split("-");
        birthday_day_month = `${m}-${d}`;
        birthday_year = Number(y);
      }

      // Partial PATCH — only these fields are touched server-side, everything
      // else on the client record (address, gender, referral...) is left
      // exactly as it was.
      await api.patch(CLIENT.BY_ID(clientId), {
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        phone_number: phone.trim(),
        phone_country_code: phoneCountryCode,
        email: email.trim() || null,
        birthday_day_month: birthday_day_month ?? null,
        birthday_year: birthday_year ?? null,
        client_source: clientSource || null,
      });
      onSaved({ id: clientId, name: `${firstName.trim()} ${lastName.trim()}`.trim(), phone: phone.trim() });
      onClose();
    } catch (err: any) {
      const status = err?.status;
      const code = err?.code;
      const serverMessage = err?.message;
      if (status === 409) {
        const isEmailDup = code === "DUPLICATE_EMAIL" || (code === "DUPLICATE_ENTRY" && /email/i.test(serverMessage || ""));
        setError(isEmailDup
          ? (serverMessage || "This email address is already registered.")
          : (serverMessage || "A client with this phone number already exists."));
      } else {
        setError(serverMessage || "Failed to update client.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="chm-overlay" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="chm-panel qec-panel" onClick={(e) => e.stopPropagation()}>
        <div className="qec-header">
          <h3>Edit Client</h3>
          <button className="qec-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="qec-body qec-loading">Loading…</div>
        ) : (
          <>
            <div className="qec-body">
              <label className="qec-label">First Name<span className="qec-req-star">*</span></label>
              <input
                className="qec-input"
                value={firstName}
                autoFocus
                onChange={(e) => { setFirstName(e.target.value.replace(/[^a-zA-Z ]/g, "")); setError(null); }}
              />

              <label className="qec-label">Last Name</label>
              <input
                className="qec-input"
                value={lastName}
                onChange={(e) => { setLastName(e.target.value.replace(/[^a-zA-Z ]/g, "")); setError(null); }}
              />

              <label className="qec-label">Phone<span className="qec-req-star">*</span></label>
              <input
                className="qec-input"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              />

              <label className="qec-label">Email</label>
              <input
                className="qec-input"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              />

              <label className="qec-label">Date of Birth</label>
              <DatePicker
                max={today}
                value={dob}
                onChange={(d) => { setDob(d); setError(null); }}
              />

              <label className="qec-label">Client Source</label>
              <ClientSelect
                value={clientSource}
                onChange={(val) => { setClientSource(val); setError(null); }}
                options={CLIENT_SOURCE_OPTIONS}
                placeholder="Select source"
                searchPlaceholder="Search source..."
              />

              {error && <p className="qec-error">{error}</p>}
            </div>

            <div className="qec-actions">
              <button className="qec-btn qec-btn--outline" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button
                className="qec-btn qec-btn--dark"
                onClick={handleSubmit}
                disabled={submitting || !firstName.trim() || !phoneValid || !emailValid}
              >
                {submitting ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
