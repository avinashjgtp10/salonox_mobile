import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import { fetchServicesThunk } from "../../../middleware/services/services.thunk";
import ClientSelect from "../../clients/components/ClientSelect";
import PhoneInput from "../../../components/ui/PhoneInput";
import api from "../../../services/api/axios";
import { ENQUIRY } from "../../../services/api/endpoints";
import { datetimeLocalToIso, isoToDatetimeLocal } from "../utils/enquiryFormat";
import { DEFAULT_ENQUIRY_STATUSES, ENQUIRY_SOURCES, type EnquiryFormValues } from "../types/enquiry.types";
import "../styles/EnquiryAddPage.scss";

/** Enquiry stores a plain national number (no country code field), so the
 * E.164 value from PhoneInput (e.g. "+915555555555") must be stripped down
 * to just the 10 local digits before it's sent — otherwise the backend's
 * 10-digit check rejects the extra "91" prefix digits. */
function toNationalPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

const EMPTY_FORM: EnquiryFormValues = {
  name: "",
  phone: "",
  service_id: "",
  staff_id: "",
  status: "New",
  notes: "",
  source: "",
  custom_source: "",
  follow_up_at: "",
};

export default function EnquiryAddPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id && id !== "add";

  const dispatch = useAppDispatch();
  const staffItems = useAppSelector((s) => s.staff.items);
  const serviceItems = useAppSelector((s) => s.services.items);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const [form, setForm] = useState<EnquiryFormValues>(EMPTY_FORM);
  const [statuses, setStatuses] = useState<string[]>(DEFAULT_ENQUIRY_STATUSES);

  const [touched, setTouched] = useState({ name: false, phone: false });
  const [isPhoneFieldValid, setIsPhoneFieldValid] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  const baselineRef = useRef<EnquiryFormValues>(EMPTY_FORM);
  const isDirty = () => JSON.stringify(form) !== JSON.stringify(baselineRef.current);

  useEffect(() => {
    dispatch(fetchStaffThunk());
    dispatch(fetchServicesThunk({ limit: 200 }));
  }, [dispatch]);

  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      try {
        setIsLoading(true);
        const res = await api.get(ENQUIRY.BY_ID(id!));
        const e = res.data?.data || res.data;
        const loadedStatus = e.status || "New";

        if (loadedStatus && !DEFAULT_ENQUIRY_STATUSES.includes(loadedStatus)) {
          setStatuses((prev) => (prev.includes(loadedStatus) ? prev : [...prev, loadedStatus]));
        }

        const rawSource = e.source || "";
        const isKnownSource = ENQUIRY_SOURCES.some((s) => s.value === rawSource);
        const sourceVal = isKnownSource ? rawSource : rawSource ? "other" : "";
        const customSourceVal = e.custom_source || (!isKnownSource && rawSource ? rawSource : "");

        const loaded: EnquiryFormValues = {
          name: e.name || "",
          phone: e.phone || "",
          service_id: e.service_id ?? "",
          staff_id: e.staff_id ?? "",
          status: loadedStatus,
          notes: e.notes ?? "",
          source: sourceVal,
          custom_source: customSourceVal,
          follow_up_at: isoToDatetimeLocal(e.follow_up_at),
        };
        setForm(loaded);
        baselineRef.current = loaded;
      } catch (error) {
        console.error("Error fetching enquiry:", error);
        showError("Failed to load enquiry data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  const serviceOptions = useMemo(
    () => (serviceItems ?? []).map((s: any) => ({ value: String(s.id), label: s.name })),
    [serviceItems],
  );
  const staffOptions = useMemo(
    () =>
      (staffItems ?? [])
        .map((s: any) => ({
          value: String(s.id),
          label: (s.fullName ?? s.full_name ?? s.name ?? `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim()) || "",
        }))
        .filter((o) => o.label),
    [staffItems],
  );
  const statusOptions = useMemo(
    () => statuses.map((s) => ({ value: s, label: s })),
    [statuses],
  );

  const isNameValid = form.name.trim().length >= 2;
  const isPhoneValid = !!form.phone.trim() && isPhoneFieldValid;
  const showNameError = (touched.name || attemptedSubmit) && !isNameValid;
  const showPhoneError = (touched.phone || attemptedSubmit) && !isPhoneValid;

  const patch = (p: Partial<EnquiryFormValues>) => setForm((prev) => ({ ...prev, ...p }));

  const handleCloseClick = () => {
    if (isDirty()) setShowUnsavedDialog(true);
    else navigate("/dashboard/enquiries");
  };

  const handleSave = async () => {
    setAttemptedSubmit(true);
    if (!isNameValid || !isPhoneValid) return;

    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: toNationalPhone(form.phone.trim()),
        service_id: form.service_id || null,
        staff_id: form.staff_id || null,
        status: form.status,
        notes: form.notes.trim() || null,
        source: form.source || null,
        custom_source: form.source === "other" ? form.custom_source.trim() || null : null,
        follow_up_at: datetimeLocalToIso(form.follow_up_at),
      };
      if (isEdit) {
        await api.patch(ENQUIRY.BY_ID(id!), payload);
      } else {
        await api.post(ENQUIRY.BASE, payload);
      }
      showSuccess(isEdit ? "Enquiry updated successfully" : "Enquiry added successfully");
      navigate("/dashboard/enquiries");
    } catch (error: any) {
      console.error("Error saving enquiry:", error);
      showError(error?.message || "Failed to save enquiry");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="enq-add">
      {overlay}
      <div className="enq-add__header">
        <h5 className="enq-add__header-title">{isEdit ? "Edit Enquiry" : "Create Enquiry"}</h5>
        <div className="enq-add__header-actions">
          <button className="btn enq-add__btn-close" onClick={handleCloseClick}>
            Close
          </button>
          <button className="btn enq-add__btn-save" onClick={handleSave} disabled={isSaving}>
            {isSaving && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />}
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {showUnsavedDialog && (
        <div className="enq-add__dialog-overlay">
          <div className="enq-add__dialog">
            <button className="enq-add__dialog-close" onClick={() => setShowUnsavedDialog(false)}>&times;</button>
            <h5 className="enq-add__dialog-title">Unsaved changes</h5>
            <p className="enq-add__dialog-desc">You have unsaved changes. Are you sure you want to leave?</p>
            <div className="enq-add__dialog-actions">
              <button className="btn enq-add__dialog-btn enq-add__dialog-btn--cancel" onClick={() => setShowUnsavedDialog(false)}>
                Cancel
              </button>
              <button className="btn enq-add__dialog-btn enq-add__dialog-btn--discard" onClick={() => navigate("/dashboard/enquiries")}>
                Discard changes
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="enq-add-page">
        <div className="enq-add-card">
          <h6 className="enq-add-card__title">Details</h6>
          {isLoading ? (
            <p className="text-muted small">Loading…</p>
          ) : (
            <div className="enq-add-grid">
              <div className="enq-add-field">
                <label className="enq-add-field__label">
                  Name <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  className={`enq-add-input ${showNameError ? "enq-add-input--invalid" : ""}`}
                  placeholder="Client name"
                  value={form.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                />
                {showNameError && <span className="enq-add-field__error">Name must be at least 2 characters</span>}
              </div>

              <div className="enq-add-field">
                <PhoneInput
                  label="Phone"
                  required
                  value={form.phone}
                  onChange={(val) => patch({ phone: val })}
                  onValidityChange={setIsPhoneFieldValid}
                  onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                  placeholder="Mobile number"
                  containerClass=""
                  error={showPhoneError ? "Enter a valid 10-digit phone number" : undefined}
                />
              </div>

              <div className="enq-add-field">
                <label className="enq-add-field__label">Service</label>
                <ClientSelect
                  value={form.service_id}
                  onChange={(val) => patch({ service_id: val })}
                  options={serviceOptions}
                  placeholder="Select service"
                  searchPlaceholder="Search service..."
                />
              </div>

              <div className="enq-add-field">
                <label className="enq-add-field__label">Staff</label>
                <ClientSelect
                  value={form.staff_id}
                  onChange={(val) => patch({ staff_id: val })}
                  options={staffOptions}
                  placeholder="Select staff"
                  searchPlaceholder="Search staff..."
                />
              </div>

              <div className="enq-add-field">
                <label className="enq-add-field__label">Status</label>
                <ClientSelect
                  value={form.status}
                  onChange={(val) => patch({ status: val })}
                  options={statusOptions}
                  placeholder="Select status"
                  searchPlaceholder="Search status..."
                />
              </div>

              <div className="enq-add-field">
                <label className="enq-add-field__label">Source</label>
                <ClientSelect
                  value={form.source}
                  onChange={(val) => patch({ source: val })}
                  options={ENQUIRY_SOURCES.map((s) => ({ value: s.value, label: s.label }))}
                  placeholder="Select source"
                  searchPlaceholder="Search source..."
                />
              </div>

              {form.source === "other" && (
                <div className="enq-add-field">
                  <label className="enq-add-field__label">
                    Custom Source <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    className="enq-add-input"
                    placeholder="Specify source (e.g. Banner, Pamphlet, Exhibition)"
                    value={form.custom_source}
                    onChange={(e) => patch({ custom_source: e.target.value })}
                  />
                </div>
              )}

              <div className="enq-add-field">
                <label className="enq-add-field__label">Follow-up Date &amp; Time</label>
                <input
                  type="datetime-local"
                  className="enq-add-input"
                  value={form.follow_up_at}
                  onChange={(e) => patch({ follow_up_at: e.target.value })}
                />
              </div>

              <div className="enq-add-field enq-add-field--full">
                <label className="enq-add-field__label">Notes</label>
                <textarea
                  className="enq-add-input enq-add-textarea"
                  placeholder="Anything the team should know…"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => patch({ notes: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
