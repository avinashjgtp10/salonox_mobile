import React, { useEffect, useState } from "react";
import { X } from "react-bootstrap-icons";
import Button from "../../../components/ui/Button";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import { compressImage } from "../utils/compressImage";
import { TARGET_AUDIENCE_OPTIONS } from "../types";
import type { SpotlightFeature, SpotlightStatus, TargetAudience, SpotlightCreatePayload } from "../types";

interface SpotlightFormDrawerProps {
  feature: SpotlightFeature | null;
  onClose: () => void;
  onSave: (payload: SpotlightCreatePayload) => Promise<void> | void;
  externalError?: string;
}

const EMPTY_FORM: SpotlightCreatePayload = {
  featureName: "",
  module: "",
  moduleRoute: "",
  shortDescription: "",
  whatIsThis: "",
  howItWorks: "",
  benefits: "",
  imageDataUrl: "",
  videoDataUrl: "",
  releaseDate: new Date().toISOString().slice(0, 10),
  targetAudience: ["all"],
  status: "draft",
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const STATUS_OPTIONS: SpotlightStatus[] = ["draft", "published", "archived"];

const SpotlightFormDrawer: React.FC<SpotlightFormDrawerProps> = ({ feature, onClose, onSave, externalError }) => {
  const [form, setForm] = useState<SpotlightCreatePayload>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (feature) {
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = feature;
      setForm(rest);
    } else {
      setForm(EMPTY_FORM);
    }
  }, [feature]);

  const update = <K extends keyof SpotlightCreatePayload>(key: K, value: SpotlightCreatePayload[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleAudience = (value: TargetAudience) => {
    setForm((prev) => {
      const has = prev.targetAudience.includes(value);
      const next = has
        ? prev.targetAudience.filter((v) => v !== value)
        : [...prev.targetAudience, value];
      return { ...prev, targetAudience: next.length ? next : ["all"] };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Downscaled/re-encoded before storing — a full-resolution screenshot as
    // a raw base64 data URL can easily blow the localStorage quota this is
    // saved into (see spotlightStorage.ts / compressImage.ts).
    const dataUrl = await compressImage(file);
    update("imageDataUrl", dataUrl);
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    update("videoDataUrl", dataUrl);
  };

  const handleSubmit = async () => {
    if (!form.featureName.trim()) return setError("Feature Name is required.");
    if (!form.module.trim()) return setError("Module is required.");
    if (!form.shortDescription.trim()) return setError("Short Description is required.");
    setError("");
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="sf-backdrop" onClick={onClose} />
      <div className="sf-panel">
        <div className="sf-panel__header">
          <h3 className="sf-panel__title">{feature ? "Edit Spotlight Feature" : "New Spotlight Feature"}</h3>
          <button className="sf-panel__close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="sf-panel__body">
          {(error || externalError) && <div className="sf-error">{error || externalError}</div>}

          <div className="sf-field">
            <label>Feature Name</label>
            <input
              type="text"
              value={form.featureName}
              onChange={(e) => update("featureName", e.target.value)}
              placeholder="e.g. Inclusive & Exclusive Tax"
            />
          </div>

          <div className="sf-field__row">
            <div className="sf-field">
              <label>Module</label>
              <input
                type="text"
                value={form.module}
                onChange={(e) => update("module", e.target.value)}
                placeholder="e.g. Catalog → Services"
              />
            </div>
            <div className="sf-field">
              <label>Module Route (for Try Feature)</label>
              <input
                type="text"
                value={form.moduleRoute}
                onChange={(e) => update("moduleRoute", e.target.value)}
                placeholder="/dashboard/catalog/services"
              />
            </div>
          </div>

          <div className="sf-field">
            <label>Short Description</label>
            <textarea
              rows={2}
              value={form.shortDescription}
              onChange={(e) => update("shortDescription", e.target.value)}
              placeholder="One-line summary shown on the Spotlight card"
            />
          </div>

          <div className="sf-field">
            <label>What is this feature?</label>
            <textarea
              rows={3}
              value={form.whatIsThis}
              onChange={(e) => update("whatIsThis", e.target.value)}
            />
          </div>

          <div className="sf-field">
            <label>How does it work?</label>
            <textarea
              rows={4}
              value={form.howItWorks}
              onChange={(e) => update("howItWorks", e.target.value)}
              placeholder={"One step per line"}
            />
            <div className="sf-field__hint">Enter one step per line — shown as a numbered list.</div>
          </div>

          <div className="sf-field">
            <label>Benefits</label>
            <textarea
              rows={4}
              value={form.benefits}
              onChange={(e) => update("benefits", e.target.value)}
              placeholder={"One benefit per line"}
            />
            <div className="sf-field__hint">Enter one benefit per line — shown as a bullet list.</div>
          </div>

          <div className="sf-field">
            <label>Feature Image / Screenshot</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} />
            {form.imageDataUrl && (
              <div className="sf-preview">
                <img src={resolveMediaUrl(form.imageDataUrl)} alt="Preview" />
              </div>
            )}
          </div>

          <div className="sf-field">
            <label>Optional Video / GIF</label>
            <input type="file" accept="video/*,image/gif" onChange={handleVideoUpload} />
            {form.videoDataUrl && (
              <div className="sf-preview">
                <video src={resolveMediaUrl(form.videoDataUrl)} controls />
              </div>
            )}
          </div>

          <div className="sf-field__row">
            <div className="sf-field">
              <label>Release Date</label>
              <input
                type="date"
                value={form.releaseDate}
                onChange={(e) => update("releaseDate", e.target.value)}
              />
            </div>
            <div className="sf-field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => update("status", e.target.value as SpotlightStatus)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="sf-field">
            <label>Target Audience</label>
            <div className="sf-chip-group">
              {TARGET_AUDIENCE_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  className={`sf-chip ${form.targetAudience.includes(opt.value) ? "sf-chip--active" : ""}`}
                  onClick={() => toggleAudience(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sf-panel__footer">
          <Button variant="outline-dark" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving}>
            {feature ? "Save Changes" : "Create Feature"}
          </Button>
        </div>
      </div>
    </>
  );
};

export default SpotlightFormDrawer;
