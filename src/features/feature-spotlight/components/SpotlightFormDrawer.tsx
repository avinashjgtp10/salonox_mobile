import React, { useEffect, useState } from "react";
import { X } from "react-bootstrap-icons";
import Button from "../../../components/ui/Button";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import { uploadSpotlightImage } from "../utils/uploadImage";
import { isValidYouTubeUrl, youTubeEmbedUrl } from "../utils/youtube";
import SpotlightSectionsEditor from "./SpotlightSectionsEditor";
import { TARGET_AUDIENCE_OPTIONS } from "../types";
import type { SpotlightFeature, SpotlightStatus, TargetAudience, SpotlightCreatePayload, SpotlightImage } from "../types";

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
  images: [],
  sections: [],
  videoDataUrl: "",
  releaseDate: new Date().toISOString().slice(0, 10),
  targetAudience: ["all"],
  status: "draft",
};

const STATUS_OPTIONS: SpotlightStatus[] = ["draft", "published", "archived"];

const SpotlightFormDrawer: React.FC<SpotlightFormDrawerProps> = ({ feature, onClose, onSave, externalError }) => {
  const [form, setForm] = useState<SpotlightCreatePayload>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");

  useEffect(() => {
    if (feature) {
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = feature;
      // Migrate older records that only had a single `imageDataUrl` into the
      // multi-image gallery shape so editing one doesn't silently drop it.
      const images =
        rest.images && rest.images.length > 0
          ? rest.images
          : rest.imageDataUrl
          ? [{ imageDataUrl: rest.imageDataUrl, description: "" }]
          : [];
      setForm({ ...rest, images, sections: rest.sections ?? [] });
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

  const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    // Uploads to the real S3-backed endpoint (see uploadImage.ts /
    // spotlight.endpoints.ts), falling back to a downscaled/re-encoded
    // base64 data URL only if that request fails. These images are shown
    // large (full document width) in "Why it works", not just as small
    // thumbnails — use a higher resolution/quality than the single hero
    // image so UI screenshot text stays readable there.
    const newImages: SpotlightImage[] = await Promise.all(
      files.map(async (file) => ({ imageDataUrl: await uploadSpotlightImage(file, 1280, 0.8), description: "" }))
    );
    setForm((prev) => {
      const images = [...(prev.images ?? []), ...newImages];
      return { ...prev, images, imageDataUrl: prev.imageDataUrl || images[0]?.imageDataUrl };
    });
    e.target.value = "";
  };

  const addImageByUrl = () => {
    const url = imageUrlInput.trim();
    if (!url) return;
    setForm((prev) => {
      const images = [...(prev.images ?? []), { imageDataUrl: url, description: "" }];
      return { ...prev, images, imageDataUrl: prev.imageDataUrl || images[0]?.imageDataUrl };
    });
    setImageUrlInput("");
  };

  const updateImageDescription = (index: number, description: string) => {
    setForm((prev) => {
      const images = [...(prev.images ?? [])];
      images[index] = { ...images[index], description };
      return { ...prev, images };
    });
  };

  const removeImage = (index: number) => {
    setForm((prev) => {
      const images = (prev.images ?? []).filter((_, i) => i !== index);
      return { ...prev, images, imageDataUrl: images[0]?.imageDataUrl ?? "" };
    });
  };

  const handleSubmit = async () => {
    if (!form.featureName.trim()) return setError("Feature Name is required.");
    if (!form.module.trim()) return setError("Module is required.");
    if (!form.shortDescription.trim()) return setError("Short Description is required.");
    if (form.videoDataUrl?.trim() && !isValidYouTubeUrl(form.videoDataUrl.trim())) {
      return setError("Video link must be a valid YouTube URL (e.g. youtube.com/watch?v=... or youtu.be/...).");
    }
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
            <label>Feature Images / Screenshots</label>
            <input type="file" accept="image/*" multiple onChange={handleImagesUpload} />
            <div className="sf-field__hint">Add one or more images — each can have its own description.</div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input
                type="url"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addImageByUrl(); } }}
                placeholder="Or paste an image URL"
                style={{ flex: 1 }}
              />
              <Button variant="outline-dark" size="sm" onClick={addImageByUrl} disabled={!imageUrlInput.trim()}>
                Add
              </Button>
            </div>
            {(form.images ?? []).length > 0 && (
              <div className="sf-image-list">
                {(form.images ?? []).map((img, i) => (
                  <div className="sf-image-list__item" key={i}>
                    <div className="sf-preview">
                      <img src={resolveMediaUrl(img.imageDataUrl)} alt={`Screenshot ${i + 1}`} />
                    </div>
                    <textarea
                      rows={2}
                      value={img.description ?? ""}
                      onChange={(e) => updateImageDescription(i, e.target.value)}
                      placeholder={`Description for image ${i + 1}`}
                    />
                    <button type="button" className="sf-image-list__remove" onClick={() => removeImage(i)}>
                      <X size={14} /> Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sf-field">
            <label>Walkthrough Sections</label>
            <div className="sf-field__hint">
              Group screenshots under named sections (e.g. "Booking an appointment", "Setting reminders") — each shows as its own titled block, with its own screenshots and descriptions, on a dedicated tab on the feature's page.
            </div>
            <SpotlightSectionsEditor
              sections={form.sections ?? []}
              onChange={(sections) => update("sections", sections)}
            />
          </div>

          <div className="sf-field">
            <label>Optional YouTube Video Link</label>
            <input
              type="url"
              value={form.videoDataUrl ?? ""}
              onChange={(e) => update("videoDataUrl", e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <div className="sf-field__hint">
              The cover image is shown by default; a Play button appears on it once a valid YouTube link is set, and clicking it embeds the video right there.
            </div>
            {form.videoDataUrl?.trim() && !isValidYouTubeUrl(form.videoDataUrl.trim()) && (
              <div className="sf-error">Not a recognized YouTube URL — it won't play until this is fixed.</div>
            )}
            {form.videoDataUrl?.trim() && isValidYouTubeUrl(form.videoDataUrl.trim()) && (
              <div className="sf-preview">
                <iframe
                  src={youTubeEmbedUrl(form.videoDataUrl.trim()) ?? undefined}
                  title="YouTube video preview"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ width: "100%", aspectRatio: "16 / 9", border: 0, borderRadius: 8 }}
                />
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
