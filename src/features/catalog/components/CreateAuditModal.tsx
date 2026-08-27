import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { Dropdown } from "../../../components/ui/Dropdown";
import type { AppDispatch } from "../../../store/store";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import { selectAllStaff, selectUserProfile } from "../../../store/selectors/slices.selectors";

interface Props {
  defaultBranchId: string;
  onClose: () => void;
  onCreate: (draft: { name: string; branch: string; notes: string; auditorId: string }) => void | Promise<void>;
}

export default function CreateAuditModal({ defaultBranchId, onClose, onCreate }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const staff = useSelector(selectAllStaff);
  const userProfile = useSelector(selectUserProfile);

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [auditorId, setAuditorId] = useState("");
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { dispatch(fetchStaffThunk()); }, [dispatch]);

  // Default to the logged-in user once their staff row is known — still
  // freely changeable from the dropdown below.
  useEffect(() => {
    if (auditorId) return;
    const self = staff.find((s: any) => s.user_id === userProfile?.id);
    if (self) setAuditorId(String(self.user_id));
    else if (userProfile?.id) setAuditorId(String(userProfile.id));
  }, [staff, userProfile, auditorId]);

  const staffOptions = useMemo(
    () => staff
      .filter((s: any) => s.user_id)
      .map((s: any) => ({ id: String(s.user_id), name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Unnamed" })),
    [staff],
  );

  const error = useMemo(() => (name.trim() === "" ? "Enter an audit name" : null), [name]);

  const submit = async () => {
    setTouched(true);
    if (error) return;
    setSaving(true);
    try {
      await onCreate({ name: name.trim(), branch: defaultBranchId, notes: notes.trim(), auditorId });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      show
      onClose={onClose}
      title="New Product Audit"
      scrollable={false}
      footer={
        <div className="d-flex justify-content-end gap-2 w-100">
          <Button variant="outline-dark" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="dark" onClick={submit} disabled={(!!error && touched) || saving} loading={saving}>
            Create Audit
          </Button>
        </div>
      }
    >
      <Input
        label="Audit name"
        placeholder="e.g. Monthly Audit — Hair Care"
        value={name}
        onChange={(e) => { setName(e.target.value); setTouched(true); }}
      />
      {touched && error && <div className="paudit-field-err">{error}</div>}

      <label className="paudit-label mt-3">Auditor</label>
      <Dropdown
        value={auditorId}
        options={staffOptions}
        placeholder="Select staff member"
        onChange={setAuditorId}
      />

      <label className="paudit-label mt-3">Notes <span className="paudit-optional">(optional)</span></label>
      <textarea
        className="paudit-textarea"
        rows={3}
        placeholder="Reason for this audit, scope, etc."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <p className="paudit-hint mt-3">
        You can add products to count after creating the audit.
      </p>
    </Modal>
  );
}
