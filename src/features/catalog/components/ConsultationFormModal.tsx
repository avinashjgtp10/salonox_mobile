import React, { useEffect, useState } from "react";
import type { ServiceConsultationFormValues, ServiceForm, TeamMember } from "../types/catalog.types.ts";
import { useCurrency } from "../../../hooks/useCurrency";
import Dropdown from "../../../components/ui/Dropdown";

interface Props {
  form: ServiceForm;
  onClose: () => void;
  onSave: (values: ServiceConsultationFormValues) => void | Promise<void>;
  staffMembers?: TeamMember[];
}

const blankValues: ServiceConsultationFormValues = {
  customerName: "",
  mobileNumber: "",
  date: "",
  consultantName: "",
  serviceInterestedIn: "",
  customerRequirement: "",
  currentCondition: "",
  recommendedService: "",
  whyRecommended: "",
  expectedResult: {
    instantResult: false,
    gradualImprovement: false,
    multipleSessionsRequired: false,
  },
  expectedOutcome: "",
  sessionsRecommended: "",
  recommendedInterval: "",
  recommendedIntervalOther: "",
  homeCareProducts: "",
  homeCareInstructions: "",
  estimatedCost: "",
  packageSuggested: "",
  notes: "",
  customerDecision: "",
  decisionReason: "",
};

const INTERVAL_OPTIONS: { value: ServiceConsultationFormValues["recommendedInterval"]; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "every_15_days", label: "Every 15 Days" },
  { value: "monthly", label: "Monthly" },
  { value: "other", label: "Other" },
];

const DECISION_OPTIONS: { value: ServiceConsultationFormValues["customerDecision"]; label: string }[] = [
  { value: "accepted", label: "Accepted Service" },
  { value: "booked_later", label: "Booked for Later" },
  { value: "declined", label: "Declined" },
];

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h6 className="fw-bold text-dark mb-3 mt-4">{children}</h6>
);

type FieldErrors = Partial<Record<keyof ServiceConsultationFormValues, string>>;

const validate = (v: ServiceConsultationFormValues): FieldErrors => {
  const errors: FieldErrors = {};
  if (!v.customerName.trim()) errors.customerName = "Customer name is required";
  if (!v.mobileNumber.trim()) errors.mobileNumber = "Mobile number is required";
  else if (!/^\d{10}$/.test(v.mobileNumber.trim())) errors.mobileNumber = "Enter a valid 10-digit mobile number";
  if (!v.date) errors.date = "Date is required";
  if (!v.consultantName.trim()) errors.consultantName = "Consultant / stylist is required";
  if (!v.serviceInterestedIn.trim()) errors.serviceInterestedIn = "This field is required";
  if (!v.recommendedService.trim()) errors.recommendedService = "Recommended service is required";
  if (!v.estimatedCost.trim()) errors.estimatedCost = "Estimated cost is required";
  else if (isNaN(Number(v.estimatedCost)) || Number(v.estimatedCost) < 0) errors.estimatedCost = "Enter a valid cost";
  if (!v.customerDecision) errors.customerDecision = "Select the customer's decision";
  return errors;
};

const ConsultationFormModal: React.FC<Props> = ({ form, onClose, onSave, staffMembers = [] }) => {
  const { currencySymbol } = useCurrency();
  const [values, setValues] = useState<ServiceConsultationFormValues>({
    ...blankValues,
    ...form.values,
    expectedResult: { ...blankValues.expectedResult, ...form.values?.expectedResult },
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Re-run validation live once a save has been attempted, so inline errors
  // clear as soon as the field is fixed instead of waiting for another click.
  useEffect(() => {
    if (isSubmitted) setErrors(validate(values));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, isSubmitted]);

  const set = <K extends keyof ServiceConsultationFormValues>(
    key: K,
    value: ServiceConsultationFormValues[K],
  ) => setValues((prev) => ({ ...prev, [key]: value }));

  const toggleExpectedResult = (key: keyof ServiceConsultationFormValues["expectedResult"]) =>
    setValues((prev) => ({
      ...prev,
      expectedResult: { ...prev.expectedResult, [key]: !prev.expectedResult[key] },
    }));

  const handleSave = async () => {
    setIsSubmitted(true);
    const fieldErrors = validate(values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSaving(true);
    setSaveError(null);
    try {
      await onSave(values);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save the form");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
          <div className="modal-content border-0 rounded-4 shadow">
            <div className="modal-header border-0 px-4 pt-4 pb-0">
              <div>
                <h5 className="modal-title fw-bold mb-0">Service Consultation Form</h5>
                <p className="text-muted small mb-0">{form.name}</p>
              </div>
              <button className="btn-close shadow-none" onClick={onClose} aria-label="Close" />
            </div>

            <div className="modal-body px-4 pb-2">
              {/* ── Customer Details ───────────────────────────────────── */}
              <SectionTitle>Customer Details</SectionTitle>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small text-muted">Customer Name <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className={`form-control premium-input ${errors.customerName ? "is-invalid" : ""}`}
                    value={values.customerName}
                    onChange={(e) => set("customerName", e.target.value)}
                  />
                  {errors.customerName && <div className="invalid-feedback">{errors.customerName}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label small text-muted">Mobile Number <span className="text-danger">*</span></label>
                  <input
                    type="tel"
                    className={`form-control premium-input ${errors.mobileNumber ? "is-invalid" : ""}`}
                    value={values.mobileNumber}
                    onChange={(e) => set("mobileNumber", e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                  />
                  {errors.mobileNumber && <div className="invalid-feedback">{errors.mobileNumber}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label small text-muted">Date <span className="text-danger">*</span></label>
                  <input
                    type="date"
                    className={`form-control premium-input ${errors.date ? "is-invalid" : ""}`}
                    value={values.date}
                    onChange={(e) => set("date", e.target.value)}
                  />
                  {errors.date && <div className="invalid-feedback">{errors.date}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label small text-muted">Consultant / Stylist <span className="text-danger">*</span></label>
                  {staffMembers.length > 0 ? (
                    <Dropdown
                      className={`form-select premium-input ${errors.consultantName ? "is-invalid" : ""}`}
                      placeholder="Select a staff member"
                      value={values.consultantName}
                      options={staffMembers.map((m) => {
                        const name = `${m.firstName} ${m.lastName}`.trim();
                        return { id: name, name: `${name}${m.role ? ` — ${m.role}` : ""}` };
                      })}
                      onChange={(id) => set("consultantName", id)}
                    />
                  ) : (
                    <input
                      type="text"
                      className={`form-control premium-input ${errors.consultantName ? "is-invalid" : ""}`}
                      value={values.consultantName}
                      onChange={(e) => set("consultantName", e.target.value)}
                    />
                  )}
                  {errors.consultantName && <div className="invalid-feedback d-block">{errors.consultantName}</div>}
                </div>
              </div>

              {/* ── Service Consultation ───────────────────────────────── */}
              <SectionTitle>Service Consultation</SectionTitle>
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label small text-muted">Service Customer Is Interested In <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className={`form-control premium-input ${errors.serviceInterestedIn ? "is-invalid" : ""}`}
                    value={values.serviceInterestedIn}
                    onChange={(e) => set("serviceInterestedIn", e.target.value)}
                  />
                  {errors.serviceInterestedIn && <div className="invalid-feedback">{errors.serviceInterestedIn}</div>}
                </div>
                <div className="col-12">
                  <label className="form-label small text-muted">Customer's Requirement / Concern</label>
                  <textarea
                    className="form-control premium-input"
                    rows={2}
                    value={values.customerRequirement}
                    onChange={(e) => set("customerRequirement", e.target.value)}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small text-muted">Current Condition (Observation by Stylist)</label>
                  <textarea
                    className="form-control premium-input"
                    rows={2}
                    value={values.currentCondition}
                    onChange={(e) => set("currentCondition", e.target.value)}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small text-muted">Recommended Service <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className={`form-control premium-input ${errors.recommendedService ? "is-invalid" : ""}`}
                    value={values.recommendedService}
                    onChange={(e) => set("recommendedService", e.target.value)}
                  />
                  {errors.recommendedService && <div className="invalid-feedback">{errors.recommendedService}</div>}
                </div>
                <div className="col-12">
                  <label className="form-label small text-muted">Why This Service Is Recommended</label>
                  <textarea
                    className="form-control premium-input"
                    rows={2}
                    value={values.whyRecommended}
                    onChange={(e) => set("whyRecommended", e.target.value)}
                  />
                </div>
              </div>

              {/* ── Expected Result ─────────────────────────────────────── */}
              <SectionTitle>Expected Result</SectionTitle>
              <div className="d-flex flex-wrap gap-4 mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="expected-instant"
                    checked={values.expectedResult.instantResult}
                    onChange={() => toggleExpectedResult("instantResult")}
                  />
                  <label className="form-check-label" htmlFor="expected-instant">Instant Result</label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="expected-gradual"
                    checked={values.expectedResult.gradualImprovement}
                    onChange={() => toggleExpectedResult("gradualImprovement")}
                  />
                  <label className="form-check-label" htmlFor="expected-gradual">Gradual Improvement</label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="expected-multiple"
                    checked={values.expectedResult.multipleSessionsRequired}
                    onChange={() => toggleExpectedResult("multipleSessionsRequired")}
                  />
                  <label className="form-check-label" htmlFor="expected-multiple">Multiple Sessions Required</label>
                </div>
              </div>
              <label className="form-label small text-muted">Expected Outcome</label>
              <textarea
                className="form-control premium-input"
                rows={2}
                value={values.expectedOutcome}
                onChange={(e) => set("expectedOutcome", e.target.value)}
              />

              {/* ── Treatment Plan ──────────────────────────────────────── */}
              <SectionTitle>Treatment Plan</SectionTitle>
              <div className="row g-3 align-items-start">
                <div className="col-md-6">
                  <label className="form-label small text-muted">Number of Sessions Recommended</label>
                  <input
                    type="text"
                    className="form-control premium-input"
                    value={values.sessionsRecommended}
                    onChange={(e) => set("sessionsRecommended", e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small text-muted d-block">Recommended Interval</label>
                  <div className="d-flex flex-wrap gap-3">
                    {INTERVAL_OPTIONS.map((opt) => (
                      <div className="form-check" key={opt.value}>
                        <input
                          className="form-check-input"
                          type="radio"
                          name="recommendedInterval"
                          id={`interval-${opt.value}`}
                          checked={values.recommendedInterval === opt.value}
                          onChange={() => set("recommendedInterval", opt.value)}
                        />
                        <label className="form-check-label" htmlFor={`interval-${opt.value}`}>{opt.label}</label>
                      </div>
                    ))}
                  </div>
                  {values.recommendedInterval === "other" && (
                    <input
                      type="text"
                      className="form-control premium-input mt-2"
                      placeholder="Specify interval"
                      value={values.recommendedIntervalOther}
                      onChange={(e) => set("recommendedIntervalOther", e.target.value)}
                    />
                  )}
                </div>
              </div>

              {/* ── Home Care Recommendation ───────────────────────────── */}
              <SectionTitle>Home Care Recommendation</SectionTitle>
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label small text-muted">Recommended Products</label>
                  <textarea
                    className="form-control premium-input"
                    rows={2}
                    value={values.homeCareProducts}
                    onChange={(e) => set("homeCareProducts", e.target.value)}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small text-muted">Instructions</label>
                  <textarea
                    className="form-control premium-input"
                    rows={2}
                    value={values.homeCareInstructions}
                    onChange={(e) => set("homeCareInstructions", e.target.value)}
                  />
                </div>
              </div>

              {/* ── Estimated Cost ──────────────────────────────────────── */}
              <SectionTitle>Estimated Cost</SectionTitle>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small text-muted">Recommended Service Cost <span className="text-danger">*</span></label>
                  <div className={`input-group premium-group ${errors.estimatedCost ? "border-danger" : ""}`} style={{ height: "40px" }}>
                    <span className="input-group-text bg-white border-0 pe-1 text-muted" style={{ fontSize: "14px" }}>{currencySymbol}</span>
                    <input
                      type="number"
                      min="0"
                      className="form-control border-0 ps-2 shadow-none"
                      value={values.estimatedCost}
                      onChange={(e) => {
                        const parsed = parseFloat(e.target.value);
                        set("estimatedCost", e.target.value === "" ? "" : String(Number.isFinite(parsed) ? Math.max(0, parsed) : ""));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "-" || e.key === "e" || e.key === "E") e.preventDefault();
                      }}
                    />
                  </div>
                  {errors.estimatedCost && <div className="text-danger small mt-1">{errors.estimatedCost}</div>}
                </div>
                <div className="col-md-6">
                  <label className="form-label small text-muted">Package Suggested (if any)</label>
                  <input
                    type="text"
                    className="form-control premium-input"
                    value={values.packageSuggested}
                    onChange={(e) => set("packageSuggested", e.target.value)}
                  />
                </div>
              </div>

              {/* ── Notes ───────────────────────────────────────────────── */}
              <SectionTitle>Notes</SectionTitle>
              <textarea
                className="form-control premium-input"
                rows={3}
                value={values.notes}
                onChange={(e) => set("notes", e.target.value)}
              />

              {/* ── Customer Decision ───────────────────────────────────── */}
              <SectionTitle>Customer Decision <span className="text-danger">*</span></SectionTitle>
              <div className="d-flex flex-wrap gap-3 mb-1">
                {DECISION_OPTIONS.map((opt) => (
                  <div className="form-check" key={opt.value}>
                    <input
                      className="form-check-input"
                      type="radio"
                      name="customerDecision"
                      id={`decision-${opt.value}`}
                      checked={values.customerDecision === opt.value}
                      onChange={() => set("customerDecision", opt.value)}
                    />
                    <label className="form-check-label" htmlFor={`decision-${opt.value}`}>{opt.label}</label>
                  </div>
                ))}
              </div>
              {errors.customerDecision && <div className="text-danger small mb-2">{errors.customerDecision}</div>}
              <label className="form-label small text-muted">Reason (Optional)</label>
              <textarea
                className="form-control premium-input"
                rows={2}
                value={values.decisionReason}
                onChange={(e) => set("decisionReason", e.target.value)}
              />

              {saveError && (
                <div className="alert alert-danger border-0 rounded-3 small mb-0">{saveError}</div>
              )}
            </div>

            <div className="modal-footer border-0 px-4 pb-4">
              <button className="btn btn-outline-dark rounded-pill px-4 fw-bold" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary rounded-pill px-4 fw-bold" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                Save form
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show opacity-0" onClick={onClose} />
    </>
  );
};

export default ConsultationFormModal;
