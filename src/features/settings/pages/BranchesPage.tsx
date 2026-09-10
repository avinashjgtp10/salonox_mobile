import { useState, useEffect } from "react";
import { Plus, Pencil, Star } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { fetchBranchesThunk, createBranchThunk, updateBranchThunk } from "../../../middleware/salon/salon.thunk";
import api from "../../../services/api/axios";
import { SALON } from "../../../services/api/endpoints";
import Button from "../../../components/ui/Button";
import type { Branch } from "../../../types/salon.types";

interface BranchFormState {
  name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  phone: string;
  email: string;
  opening_time: string;
  closing_time: string;
  is_main: boolean;
}

const emptyForm: BranchFormState = {
  name: "", address_line1: "", address_line2: "", city: "", state: "", pincode: "",
  country: "", phone: "", email: "", opening_time: "", closing_time: "", is_main: false,
};

interface Holiday { id: string; holiday_date: string; reason: string | null }

function BranchEditor({ branch, onClose, onSaved }: { branch: Branch | "new"; onClose: () => void; onSaved: () => void }) {
  const dispatch = useAppDispatch();
  const { showSuccess, showError, overlay } = useStatusOverlay();
  const currentSalonId = useAppSelector((s) => (s.salon as any).currentSalon?.id);
  const isNew = branch === "new";

  const [form, setForm] = useState<BranchFormState>(() =>
    isNew ? emptyForm : {
      name: branch.name, address_line1: branch.address_line1, address_line2: branch.address_line2 ?? "",
      city: branch.city, state: branch.state, pincode: branch.pincode, country: branch.country ?? "",
      phone: branch.phone ?? "", email: branch.email ?? "",
      opening_time: branch.opening_time ?? "", closing_time: branch.closing_time ?? "", is_main: branch.is_main,
    }
  );
  const [saving, setSaving] = useState(false);

  // Holidays — kept simple: fetched/managed directly against the branches
  // API for this branch, no separate Redux slice for what's a small,
  // rarely-touched list.
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayReason, setNewHolidayReason] = useState("");

  useEffect(() => {
    if (isNew) return;
    api.get<any>(SALON.BRANCH_HOLIDAYS((branch as Branch).id))
      .then((res) => setHolidays(res.data?.data?.items ?? res.data?.data ?? []))
      .catch(() => {});
  }, [isNew, branch]);

  const setField = (key: keyof BranchFormState) => (value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.address_line1.trim() || !form.city.trim() || !form.state.trim() || !form.pincode.trim()) {
      showError("Name, address, city, state and pincode are required");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(), address_line1: form.address_line1.trim(),
      address_line2: form.address_line2.trim() || undefined,
      city: form.city.trim(), state: form.state.trim(), pincode: form.pincode.trim(),
      country: form.country.trim() || undefined, phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      opening_time: form.opening_time || undefined, closing_time: form.closing_time || undefined,
      is_main: form.is_main,
    };
    const result = isNew
      ? await dispatch(createBranchThunk({ salon_id: currentSalonId, ...payload }))
      : await dispatch(updateBranchThunk({ id: (branch as Branch).id, data: payload }));
    setSaving(false);
    const ok = isNew ? createBranchThunk.fulfilled.match(result) : updateBranchThunk.fulfilled.match(result);
    if (ok) {
      showSuccess(isNew ? "Branch created" : "Branch updated");
      onSaved();
    } else {
      showError((result as any)?.payload ?? "Failed to save branch");
    }
  };

  const addHoliday = async () => {
    if (isNew || !newHolidayDate) return;
    try {
      const res = await api.post<any>(SALON.BRANCH_HOLIDAYS((branch as Branch).id), {
        holiday_date: newHolidayDate, reason: newHolidayReason || undefined,
      });
      setHolidays((prev) => [...prev, res.data.data]);
      setNewHolidayDate("");
      setNewHolidayReason("");
    } catch {
      showError("Failed to add holiday");
    }
  };

  const deleteHoliday = async (holidayId: string) => {
    try {
      await api.delete(SALON.BRANCH_HOLIDAY_BY_ID(holidayId));
      setHolidays((prev) => prev.filter((h) => h.id !== holidayId));
    } catch {
      showError("Failed to delete holiday");
    }
  };

  return (
    <div className="spm-overlay" onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      {overlay}
      <div className="spm-panel" style={{ maxWidth: 620 }}>
        <div className="spm-header">
          <p className="spm-name">{isNew ? "Add Branch" : "Edit Branch"}</p>
        </div>
        <div style={{ padding: "12px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Branch name" value={form.name} onChange={setField("name")} full />
          <Field label="Address line 1" value={form.address_line1} onChange={setField("address_line1")} full />
          <Field label="Address line 2" value={form.address_line2} onChange={setField("address_line2")} full />
          <Field label="City" value={form.city} onChange={setField("city")} />
          <Field label="State" value={form.state} onChange={setField("state")} />
          <Field label="Pincode" value={form.pincode} onChange={setField("pincode")} />
          <Field label="Country" value={form.country} onChange={setField("country")} />
          <Field label="Phone" value={form.phone} onChange={setField("phone")} />
          <Field label="Email" value={form.email} onChange={setField("email")} />
          <Field label="Opening time" value={form.opening_time} onChange={setField("opening_time")} type="time" />
          <Field label="Closing time" value={form.closing_time} onChange={setField("closing_time")} type="time" />
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, gridColumn: "1 / -1" }}>
            <input type="checkbox" checked={form.is_main} onChange={(e) => setField("is_main")(e.target.checked)} />
            Main branch
          </label>
        </div>

        {!isNew && (
          <div style={{ padding: "0 20px 12px" }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Holidays</p>
            {holidays.map((h) => (
              <div key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "4px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span>{h.holiday_date} {h.reason && `— ${h.reason}`}</span>
                <button className="spm-reset-link" onClick={() => deleteHoliday(h.id)}>Remove</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <input type="date" value={newHolidayDate} onChange={(e) => setNewHolidayDate(e.target.value)} style={{ fontSize: 12, padding: "4px 6px", border: "1px solid #e5e7eb", borderRadius: 4 }} />
              <input type="text" placeholder="Reason (optional)" value={newHolidayReason} onChange={(e) => setNewHolidayReason(e.target.value)} style={{ fontSize: 12, padding: "4px 6px", border: "1px solid #e5e7eb", borderRadius: 4, flex: 1 }} />
              <Button size="sm" variant="outline-secondary" onClick={addHoliday}>Add</Button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 20px", borderTop: "1px solid #f3f4f6" }}>
          <Button size="sm" variant="outline-secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" variant="primary" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, full, type = "text" }: { label: string; value: string; onChange: (v: string) => void; full?: boolean; type?: string }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13, marginTop: 4 }}
      />
    </div>
  );
}

export default function BranchesPage() {
  const dispatch = useAppDispatch();
  const branches = useAppSelector((s) => s.salon.branches);
  const loading = useAppSelector((s) => s.salon.loading.branches);
  const currentSalonId = useAppSelector((s) => (s.salon as any).currentSalon?.id);
  const [editing, setEditing] = useState<Branch | "new" | null>(null);

  useEffect(() => {
    if (currentSalonId) dispatch(fetchBranchesThunk(currentSalonId));
  }, [dispatch, currentSalonId]);

  return (
    <>
      <div className="settings-page-header">
        <h2 className="settings-page-title">Branches</h2>
        <p className="settings-page-subtitle">Manage your salon's locations, hours and holidays.</p>
      </div>

      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-title">All Branches</p>
          </div>
          <Button size="sm" variant="primary" onClick={() => setEditing("new")}>
            <Plus size={14} /> Add branch
          </Button>
        </div>
        <div className="settings-section-body">
          {loading ? (
            <p style={{ fontSize: 13, color: "#6b7280" }}>Loading branches…</p>
          ) : branches.length === 0 ? (
            <p style={{ fontSize: 13, color: "#6b7280" }}>No branches yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {branches.map((b) => (
                <div key={b.id} className="settings-security-item">
                  <div className="settings-security-info">
                    <p className="settings-security-name">
                      {b.name}
                      {b.is_main && <span className="s-badge s-badge-warning" style={{ fontSize: 10, marginLeft: 6 }}><Star size={9} /> Main</span>}
                      {!b.is_active && <span className="s-badge s-badge-gray" style={{ fontSize: 10, marginLeft: 6 }}>Inactive</span>}
                    </p>
                    <p className="settings-security-desc">{b.address_line1}, {b.city}, {b.state} {b.pincode}</p>
                  </div>
                  <button className="spm-customize-btn" onClick={() => setEditing(b)}>
                    <Pencil size={13} /> Edit
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <BranchEditor
          branch={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            if (currentSalonId) dispatch(fetchBranchesThunk(currentSalonId));
          }}
        />
      )}
    </>
  );
}
