import { useState, useEffect } from "react";
import { Plus, Pencil, Star } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { fetchBranchesThunk, createBranchThunk, updateBranchThunk } from "../../../middleware/salon/salon.thunk";
import api from "../../../services/api/axios";
import { SALON } from "../../../services/api/endpoints";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import SettingsSection from "../components/SettingsSection";
import SettingsToggle from "../components/SettingsToggle";
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
    <>
      {overlay}
      <Modal
        show
        onClose={() => !saving && onClose()}
        title={isNew ? "Add Branch" : "Edit Branch"}
        size="lg"
        disableBackdropClose={saving}
        footer={
          <>
            <Button size="sm" variant="outline-secondary" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button size="sm" variant="primary" onClick={handleSave} loading={saving}>Save</Button>
          </>
        }
      >
        <div className="settings-form-grid">
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
          <div className="settings-form-group span-2 d-flex align-items-center gap-2">
            <SettingsToggle checked={form.is_main} onChange={() => setField("is_main")(!form.is_main)} />
            <label className="settings-label mb-0">Main branch</label>
          </div>
        </div>

        {!isNew && (
          <div className="mt-3">
            <p className="settings-label mb-2">Holidays</p>
            {holidays.map((h) => (
              <div key={h.id} className="d-flex justify-content-between align-items-center py-1" style={{ fontSize: 12.5, borderBottom: "1px solid #f3f4f6" }}>
                <span>{h.holiday_date} {h.reason && `— ${h.reason}`}</span>
                <Button size="sm" variant="ghost" onClick={() => deleteHoliday(h.id)}>Remove</Button>
              </div>
            ))}
            <div className="d-flex gap-2 mt-2">
              <input className="settings-input" type="date" value={newHolidayDate} onChange={(e) => setNewHolidayDate(e.target.value)} style={{ height: 34, maxWidth: 160 }} />
              <input className="settings-input" type="text" placeholder="Reason (optional)" value={newHolidayReason} onChange={(e) => setNewHolidayReason(e.target.value)} style={{ height: 34 }} />
              <Button size="sm" variant="outline-secondary" onClick={addHoliday}>Add</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function Field({ label, value, onChange, full, type = "text" }: { label: string; value: string; onChange: (v: string) => void; full?: boolean; type?: string }) {
  return (
    <div className={`settings-form-group${full ? " span-2" : ""}`}>
      <label className="settings-label">{label}</label>
      <input
        className="settings-input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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

      <SettingsSection
        title="All Branches"
        headerAction={
          <Button size="sm" variant="primary" onClick={() => setEditing("new")} iconLeft={<Plus size={14} />}>
            Add branch
          </Button>
        }
      >
        {loading ? (
          <p className="settings-hint">Loading branches…</p>
        ) : branches.length === 0 ? (
          <p className="settings-hint">No branches yet.</p>
        ) : (
          branches.map((b) => (
            <div key={b.id} className="settings-security-item">
              <div className="settings-security-info">
                <p className="settings-security-name">
                  {b.name}
                  {b.is_main && <span className="s-badge s-badge-warning" style={{ fontSize: 10, marginLeft: 6 }}><Star size={9} /> Main</span>}
                  {!b.is_active && <span className="s-badge s-badge-gray" style={{ fontSize: 10, marginLeft: 6 }}>Inactive</span>}
                </p>
                <p className="settings-security-desc">{b.address_line1}, {b.city}, {b.state} {b.pincode}</p>
              </div>
              <Button size="sm" variant="outline-secondary" onClick={() => setEditing(b)} iconLeft={<Pencil size={13} />}>
                Edit
              </Button>
            </div>
          ))
        )}
      </SettingsSection>

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
