import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Trash } from "react-bootstrap-icons";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "../../../store/store";
import { fetchCategoriesThunk, createCategoryThunk } from "../../../middleware/services/categories.thunk";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import { selectAllCategories, selectAllStaff, selectStaffLoading } from "../../../store/selectors/slices.selectors";
import { useServiceForm } from "../hooks/useServiceForm.ts";
import type { ServiceCommissionKind } from "../types/catalog.types.ts";
import { splitDuration, joinDuration, formatDuration } from "../utils/duration";
import SearchSelect from "../components/form/SearchSelect";
import QuickAdd from "../components/form/QuickAdd";
import ConsumablesTab from "../components/tabs/ConsumablesTab.tsx";
import FormsTab from "../components/tabs/FormsTab.tsx";
import "../styles/ConsumableFormPage.scss";

// Single page for both create and edit, mirroring ProductFormPage. The old
// AddServicePage/EditServicePage pair used an 8-tab sidebar and had already
// drifted apart in what they submitted; one page and one hook removes that.
//
// Layout and styling come from the shared catalog form stylesheet
// (ConsumableFormPage.scss, the `cf-` system) so this page is visually
// identical to Add Product rather than a lookalike.

// Left-hand section nav. One section is shown at a time — clicking a name
// swaps the panel rather than scrolling to it. Price and Duration live in
// Basic Details rather than a section of their own.
type SectionId = "basic" | "staff" | "commission" | "inventory" | "forms";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "basic", label: "Basic Details" },
  { id: "staff", label: "Staff" },
  { id: "commission", label: "Commission" },
  { id: "inventory", label: "Consumables" },
  { id: "forms", label: "Consultation Forms" },
];

const ServiceFormPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { id } = useParams<{ id: string }>();
  const listPath = "/dashboard/catalog/services";

  const rawCategories = useSelector(selectAllCategories);
  const categories = (Array.isArray(rawCategories) ? rawCategories : []).map(
    (c) => ({ id: String(c.id), name: c.name }),
  );

  const rawStaff = useSelector(selectAllStaff);
  const staffLoading = useSelector(selectStaffLoading);
  const staffMembers = (Array.isArray(rawStaff) ? rawStaff : []).map((s) => ({
    id: String(s.id),
    firstName: s.first_name ?? "",
    lastName: s.last_name ?? "",
    role: s.designation ?? s.role ?? "",
  }));

  const allStaffIds = useMemo(() => staffMembers.map((s) => s.id), [staffMembers]);

  const {
    formData, updateField, handleSubmit,
    fetchLoading, loading, error, validationErrors, isEdit,
  } = useServiceForm(id, allStaffIds);

  useEffect(() => {
    dispatch(fetchCategoriesThunk());
    dispatch(fetchStaffThunk());
  }, [dispatch]);

  // ── Section nav ─────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<SectionId>("basic");

  // ── Staff picker ────────────────────────────────────────────────────────
  const [staffSearch, setStaffSearch] = useState("");
  const [showStaffDrop, setShowStaffDrop] = useState(false);
  // Everyone is ticked by default — a service is normally performable by the
  // whole team, so the common case needs no interaction.
  //
  // Applied once, and only after staff have loaded (the list is empty on the
  // first render). The ref stops it re-running and silently re-adding people
  // the user has just removed. On the edit path, a service with no
  // service_staff rows means "all staff", so it fills in the same way — while
  // a service with a real subset keeps that subset untouched.
  const staffDefaultApplied = useRef(false);
  useEffect(() => {
    if (staffDefaultApplied.current) return;
    if (fetchLoading || allStaffIds.length === 0) return;
    staffDefaultApplied.current = true;
    if (formData.team.selectedMemberIds.length === 0) {
      updateField("team", { selectedMemberIds: allStaffIds });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchLoading, allStaffIds]);

  const staffLabel = (s: { firstName: string; lastName: string; role: string }) => {
    const name = `${s.firstName} ${s.lastName}`.trim() || "Unnamed";
    return s.role ? `${name} · ${s.role}` : name;
  };

  const selectedIds = formData.team.selectedMemberIds;
  const selectedStaff = useMemo(
    () => selectedIds
      .map((id) => staffMembers.find((s) => s.id === id))
      .filter((s): s is typeof staffMembers[number] => !!s),
    [selectedIds, staffMembers],
  );

  // Already-assigned members drop out of the dropdown so the list can't
  // accumulate duplicates.
  const staffResults = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    return staffMembers
      .filter((s) => !selectedIds.includes(s.id))
      .filter((s) => !q || staffLabel(s).toLowerCase().includes(q));
  }, [staffMembers, selectedIds, staffSearch]);

  const assignStaff = (id: string) => {
    if (selectedIds.includes(id)) return;
    updateField("team", { selectedMemberIds: [...selectedIds, id] });
    setStaffSearch("");
  };

  const removeStaff = (id: string) => {
    updateField("team", { selectedMemberIds: selectedIds.filter((x) => x !== id) });
  };

  // Same inline-create affordance as the Product form's Category/Brand/
  // Supplier: create it, then select it, without leaving the page.
  async function handleAddCategory(name: string) {
    const created = await dispatch(createCategoryThunk({ name } as any));
    if (createCategoryThunk.fulfilled.match(created)) {
      const newId = (created.payload as any)?.id;
      if (newId) updateField("basic", { ...formData.basic, categoryId: String(newId) });
    }
    dispatch(fetchCategoriesThunk());
  }

  const onSubmit = async () => {
    const success = await handleSubmit();
    if (success) navigate(listPath);
  };

  const basicErrors = validationErrors.basic ?? [];
  const errFor = (needle: string) => basicErrors.find((e) => e.toLowerCase().includes(needle));
  const commissionError = (validationErrors.commission ?? [])[0];

  // Only one section is on screen at a time, so a validation error on a hidden
  // one would be invisible — the user would hit Save and see nothing happen.
  // Flagging it on the nav item points them at the section that's blocking.
  const sectionHasError: Record<SectionId, boolean> = {
    basic: basicErrors.length > 0,
    staff: false,
    commission: !!commissionError,
    inventory: false,
    forms: false,
  };

  const commission = formData.commission;

  const durationParts = splitDuration(formData.basic.duration);
  const setDuration = (hours: number, minutes: number) =>
    updateField("basic", { ...formData.basic, duration: joinDuration(hours, minutes) });

  if (fetchLoading) return <div className="cf-page cf-page--loading">Loading…</div>;

  return (
    <div className="cf-page">
      <div className="cf-topbar">
        <h1>{isEdit ? "Edit Service" : "Add Service"}</h1>
        <div className="cf-topbar-actions">
          <button className="cf-close" onClick={() => navigate(listPath)}>Close</button>
          <button className="cf-save-btn" disabled={loading} onClick={onSubmit}>
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error && <div className="cf-error-banner">{error}</div>}

      <div className="cf-layout">
        <nav className="cf-nav">
          <div className="cf-nav__list">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`cf-nav__item${activeSection === s.id ? " cf-nav__item--active" : ""}`}
                onClick={() => setActiveSection(s.id)}
              >
                {s.label}
                {sectionHasError[s.id] && <span className="cf-nav__dot" />}
              </button>
            ))}
          </div>
        </nav>

        <div className="cf-body">
        {/* 1. Basic Details */}
        {activeSection === "basic" && (<section className="cf-card" id="basic">
          <h3>Basic Details</h3>
          <div className="cf-field">
            <label>Service Name *</label>
            <input
              value={formData.basic.name}
              onChange={(e) => updateField("basic", { ...formData.basic, name: e.target.value })}
            />
            {errFor("name") && <span className="cf-field__error">{errFor("name")}</span>}
          </div>

          <div className="cf-field">
            <label>Category *</label>
            <SearchSelect
              value={formData.basic.categoryId}
              options={categories}
              placeholder="Search category…"
              onChange={(categoryId) => updateField("basic", { ...formData.basic, categoryId })}
            />
            {errFor("category") && <span className="cf-field__error">{errFor("category")}</span>}
            <QuickAdd label="Add a category" onAdd={handleAddCategory} />
          </div>

          <div className="cf-field">
            <label>Description</label>
            <textarea
              rows={3}
              value={formData.basic.description}
              onChange={(e) => updateField("basic", { ...formData.basic, description: e.target.value })}
            />
          </div>

          <div className="cf-row">
            <div className="cf-field">
              <label>Price *</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={formData.basic.price || ""}
                onChange={(e) => updateField("basic", { ...formData.basic, price: parseFloat(e.target.value) || 0 })}
              />
              {errFor("price") && <span className="cf-field__error">{errFor("price")}</span>}
            </div>
            {/* Hours + minutes rather than a single minutes box. Stored value
                is still total minutes — see utils/duration.ts for why an
                hours-only field would be wrong for this catalogue. */}
            <div className="cf-field">
              <label>Duration *</label>
              <div className="cf-duration">
                <div className="cf-duration__part">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    step={1}
                    value={durationParts.hours || ""}
                    placeholder="0"
                    onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0, durationParts.minutes)}
                  />
                  <span>hr</span>
                </div>
                <div className="cf-duration__part">
                  <input
                    type="number"
                    min={0}
                    max={59}
                    step={5}
                    value={durationParts.minutes || ""}
                    placeholder="0"
                    onChange={(e) => {
                      // Clamp rather than roll over into the hours box, so
                      // typing 90 here can't silently become 1 hr 30.
                      const m = Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0));
                      setDuration(durationParts.hours, m);
                    }}
                  />
                  <span>min</span>
                </div>
              </div>
              <span className="cf-hint cf-hint--inline">
                {formatDuration(formData.basic.duration)} total
              </span>
            </div>
          </div>

          <div className="cf-field">
            <label>Service Reminder (days)</label>
            <input
              type="number"
              min={1}
              step={1}
              placeholder="e.g. 30"
              value={formData.basic.reminderAfterDays ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                const n = raw === "" ? null : Math.max(1, parseInt(raw, 10) || 1);
                updateField("basic", { ...formData.basic, reminderAfterDays: n });
              }}
            />
            <span className="cf-hint cf-hint--inline">
              Optional — remind the client to redo this service after this many days. Leave blank if it has no redo cadence.
            </span>
          </div>

          <div className="cf-field">
            <label>Availability</label>
            {/* Label text is wrapped in a span rather than left as a bare text
                node: a loose text node is only an anonymous flex item, which
                makes the flex `gap` between box and label unreliable. */}
            <label className="cf-check">
              <input
                type="checkbox"
                checked={formData.onlineBooking.enabled}
                onChange={(e) => updateField("onlineBooking", { enabled: e.target.checked })}
              />
              {/* The only service field with a real external consumer — it
                  gates the public online-booking catalogue. */}
              <span>Available for online booking</span>
            </label>
            <label className="cf-check">
              <input
                type="checkbox"
                checked={formData.basic.active}
                onChange={(e) => updateField("basic", { ...formData.basic, active: e.target.checked })}
              />
              <span>Active (appears when booking appointments)</span>
            </label>
          </div>
        </section>)}

        {/* 3. Staff — same search-and-assign pattern as the Product form's
            Service Assignment card. */}
        {activeSection === "staff" && (<section className="cf-card" id="staff">
          <h3>Staff</h3>
          <p className="cf-hint">
            {staffMembers.length > 0 && selectedStaff.length === staffMembers.length
              ? "All staff can perform this service, including anyone added later. Remove members to restrict it."
              : selectedStaff.length === 0
                ? "No one selected — this service will be available to all staff."
                : `${selectedStaff.length} of ${staffMembers.length} staff can perform this service.`}
          </p>
          <div className="cf-service-search">
            <input
              placeholder={staffLoading.fetchAll ? "Loading staff…" : "Search a staff member to assign…"}
              disabled={staffLoading.fetchAll}
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              onFocus={() => setShowStaffDrop(true)}
              onBlur={() => setTimeout(() => setShowStaffDrop(false), 180)}
            />
            {showStaffDrop && staffResults.length > 0 && (
              <div className="cf-service-drop">
                {staffResults.map((s) => (
                  <div
                    key={s.id}
                    className="cf-service-drop__item"
                    onMouseDown={() => assignStaff(s.id)}
                  >
                    {staffLabel(s)}
                  </div>
                ))}
              </div>
            )}
          </div>
          {selectedStaff.length > 0 && (
            <div className="cf-assigned-list">
              {selectedStaff.map((s) => (
                <div key={s.id} className="cf-assigned-row">
                  <span className="cf-assigned-row__name">{staffLabel(s)}</span>
                  <button type="button" onClick={() => removeStaff(s.id)}>
                    <Trash size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>)}

        {/* 4. Commission — a rate set here replaces the staff-level rule for
            this service only. Left off, the service earns under whatever the
            staff member's rules say, which is how every service behaves by
            default. */}
        {activeSection === "commission" && (<section className="cf-card" id="commission">
          <h3>Commission</h3>
          <p className="cf-hint">
            By default this service earns commission from the staff member's own
            rules in Staff → Commissions. Set a rate here to override that for
            this service only — whoever performs it earns this instead.
          </p>

          <div className="cf-field">
            <label className="cf-check">
              <input
                type="checkbox"
                checked={commission.enabled}
                onChange={(e) =>
                  updateField("commission", { ...commission, enabled: e.target.checked })
                }
              />
              Set a commission rate for this service
            </label>
          </div>

          {commission.enabled && (
            <>
              <div className="cf-row">
                <div className="cf-field">
                  <label>Commission type *</label>
                  <SearchSelect
                    value={commission.kind}
                    options={[
                      { id: "percentage", name: "Percentage of service price" },
                      { id: "fixed", name: "Fixed amount per service" },
                    ]}
                    placeholder="Select type…"
                    onChange={(kind) =>
                      updateField("commission", {
                        ...commission,
                        kind: kind as ServiceCommissionKind,
                      })
                    }
                  />
                </div>
                <div className="cf-field">
                  <label>{commission.kind === "percentage" ? "Percentage (%) *" : "Amount (₹) *"}</label>
                  <input
                    type="number"
                    min={0}
                    max={commission.kind === "percentage" ? 100 : undefined}
                    step="0.01"
                    value={commission.value || ""}
                    onChange={(e) =>
                      updateField("commission", {
                        ...commission,
                        value: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                  {commissionError && <span className="cf-field__error">{commissionError}</span>}
                </div>
              </div>
              <p className="cf-hint">
                {commission.kind === "percentage"
                  ? `Staff earn ${commission.value || 0}% of what this service actually bills for.`
                  : `Staff earn ₹${commission.value || 0} each time they perform this service.`}
                {" "}
                Commission is calculated after any discount, membership or package
                coverage — a service fully covered by a package earns nothing.
              </p>
            </>
          )}
        </section>)}

        {/* 5. Inventory */}
        {activeSection === "inventory" && (<section className="cf-card" id="inventory">
          <h3>Inventory</h3>
          <ConsumablesTab
            data={formData.consumables}
            onChange={(v: any) => updateField("consumables", v)}
          />
        </section>)}

        {/* 6. Consultation Forms */}
        {activeSection === "forms" && (<section className="cf-card" id="forms">
          <h3>Consultation Forms</h3>
          <FormsTab
            data={formData.forms}
            onChange={(v: any) => updateField("forms", v)}
            serviceId={isEdit ? id : undefined}
            staffMembers={staffMembers}
          />
        </section>)}
        </div>
      </div>
    </div>
  );
};

export default ServiceFormPage;
