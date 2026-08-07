import React, { useState } from "react";
import { useDispatch } from "react-redux";
import Input from "../../../../components/ui/Input";
import ClientSelect from "../../../clients/components/ClientSelect";
import type { BasicDetailsData } from "../../types/catalog.types.ts";
import { useCurrency } from "../../../../hooks/useCurrency";
import type { AppDispatch } from "../../../../store/store";
import { createCategoryThunk, fetchCategoriesThunk } from "../../../../middleware/services/categories.thunk";

interface CategoryOption {
  id: string | number;
  name: string;
}

interface Props {
  data: BasicDetailsData;
  onChange: (data: BasicDetailsData) => void;
  serviceType: "single" | "bundle";
  errors?: string[];
  categories?: CategoryOption[];
}

const GENDER_PREFERENCE_OPTIONS = [
  { value: "", label: "No preference" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const PRICE_TYPE_OPTIONS = [
  { value: "Fixed", label: "Fixed" },
  { value: "Variable", label: "Variable" },
];

const DURATION_OPTIONS = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "1 h" },
  { value: "90", label: "1 h 30 min" },
  { value: "120", label: "2 h" },
  { value: "150", label: "2 h 30 min" },
  { value: "180", label: "3 h" },
];

const BasicDetailsTab: React.FC<Props> = ({ data, onChange, errors = [], categories = [] }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { currencySymbol } = useCurrency();
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    setSavingCategory(true);
    const result = await dispatch(createCategoryThunk({ name: newCategory.trim() }));
    setSavingCategory(false);
    if (createCategoryThunk.fulfilled.match(result)) {
      update("categoryId", String(result.payload.id));
      dispatch(fetchCategoriesThunk());
    }
    setNewCategory("");
    setShowAddCategory(false);
  };

  const update = (key: keyof BasicDetailsData, value: any) =>
    onChange({ ...data, [key]: value });

  const hasError = (field: string) =>
    errors.some((err) => err.toLowerCase().includes(field.toLowerCase()));

  const categoryOptions = categories.map((cat) => ({
    value: String(cat.id),
    label: cat.name,
  }));

  return (
    <div className="tab-content-panel">
      <h5 className="tab-content-panel__title">Basic details</h5>

      <div className="form-section mb-5">
        <div className="row g-3">
          <div className="col-12">
            <Input
              label={<>Service name <span className="text-danger">*</span></>}
              containerClass=""
              className="premium-input"
              type="text"
              placeholder="Add a service name, e.g. Men's Haircut"
              value={data.name}
              onChange={(e) => update("name", e.target.value)}
              maxLength={255}
              showCharCount
              error={hasError("name") ? "Service name is required" : undefined}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Menu category <span className="text-danger">*</span></label>
            <ClientSelect
              value={data.categoryId ? String(data.categoryId) : ""}
              onChange={(val: string) => update("categoryId", val)}
              options={categoryOptions}
              placeholder="Select category"
              searchPlaceholder="Search category..."
              invalid={hasError("category")}
            />

            {hasError("category") && (
              <div className="text-danger small mt-1">Category is required</div>
            )}

            {!showAddCategory ? (
              <button
                type="button"
                className="btn btn-link p-0 mt-1 text-decoration-none fw-medium"
                style={{ fontSize: "13px", color: "#6366f1" }}
                onClick={() => setShowAddCategory(true)}
              >
                + Add a category
              </button>
            ) : (
              <div className="d-flex flex-wrap align-items-center gap-2 mt-2 p-3 rounded-3 border bg-white" style={{ fontSize: "13px" }}>
                <input
                  autoFocus
                  type="text"
                  className="form-control form-control-sm shadow-none border-secondary-subtle"
                  placeholder="Category name"
                  style={{ flex: "1 1 200px", minWidth: 160 }}
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(); if (e.key === "Escape") setShowAddCategory(false); }}
                />
                <button
                  type="button"
                  className="btn btn-dark btn-sm rounded-pill px-3 fw-medium flex-shrink-0"
                  onClick={handleAddCategory}
                  disabled={!newCategory.trim() || savingCategory}
                >
                  {savingCategory ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  className="btn btn-light btn-sm rounded-pill px-3 fw-medium flex-shrink-0 border"
                  onClick={() => { setShowAddCategory(false); setNewCategory(""); }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="col-md-6">
            <label className="form-label">Gender preference (Optional)</label>
            <ClientSelect
              value={data.genderPreference ?? ""}
              onChange={(val: string) => update("genderPreference" as any, val || null)}
              options={GENDER_PREFERENCE_OPTIONS}
              placeholder="No preference"
              searchPlaceholder="Search gender preference..."
            />
            <div className="text-muted extra-small mt-2">
              Service availability preference for clients
            </div>
          </div>

          <div className="col-12">
            <Input
              label={<>Description <span className="text-muted fw-normal">(Optional)</span></>}
              containerClass=""
              className="premium-input"
              multiline
              rows={3}
              maxLength={1000}
              showCharCount
              placeholder="Add a short description"
              value={data.description}
              onChange={(e) => update("description", e.target.value.slice(0, 1000))}
            />
          </div>
        </div>
      </div>

      <div className="pricing-section pt-4 mt-2">
        <h5 className="tab-content-panel__title">Pricing and duration</h5>
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label">Price type</label>
            <ClientSelect
              value={data.priceType || "Fixed"}
              onChange={(val: string) => update("priceType" as any, val)}
              options={PRICE_TYPE_OPTIONS}
              placeholder="Select price type"
              searchPlaceholder="Search price type..."
            />
          </div>

          <div className="col-md-4">
            <label className="form-label">Price <span className="text-danger">*</span></label>
            <div
              className={`input-group premium-group ${hasError("price") ? "border-danger" : ""}`}
              style={{ height: "40px" }}
            >
              <span
                className="input-group-text bg-white border-0 pe-1 text-muted"
                style={{ fontSize: "14px" }}
              >
                {currencySymbol}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-control border-0 ps-2 shadow-none"
                placeholder="0.00"
                style={{ fontSize: "14.5px" }}
                value={data.price || ""}
                onChange={(e) => {
                  const parsed = parseFloat(e.target.value);
                  update("price", Number.isFinite(parsed) ? Math.max(0, parsed) : 0);
                }}
                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "-" || e.key === "e" || e.key === "E") e.preventDefault();
                }}
              />
            </div>
            {hasError("price") && (
              <div className="text-danger small mt-1">Price is required</div>
            )}
          </div>


          <div className="col-md-4">
            <label className="form-label">Duration</label>
            <ClientSelect
              value={String(data.duration)}
              onChange={(val: string) => update("duration", Number(val))}
              options={DURATION_OPTIONS}
              placeholder="Select duration"
              searchPlaceholder="Search duration..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicDetailsTab;
