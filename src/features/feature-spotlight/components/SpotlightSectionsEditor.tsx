import React, { useState } from "react";
import { X, Plus, ChevronUp, ChevronDown } from "react-bootstrap-icons";
import Button from "../../../components/ui/Button";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import { uploadSpotlightImage } from "../utils/uploadImage";
import type { SpotlightSection, SpotlightImage } from "../types";

interface Props {
  sections: SpotlightSection[];
  onChange: (sections: SpotlightSection[]) => void;
}

const newSection = (): SpotlightSection => ({
  id: crypto.randomUUID(),
  title: "",
  description: "",
  images: [],
});

// One named walkthrough block (e.g. "Booking an appointment") within the
// Sections editor below — its own title, description, and independent
// image gallery (upload or URL, each with its own caption), mirroring the
// same upload/URL/description pattern the top-level Feature Images field
// already uses, just scoped to this one section instead of the whole feature.
const SectionEditor: React.FC<{
  section: SpotlightSection;
  index: number;
  total: number;
  onUpdate: (patch: Partial<SpotlightSection>) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}> = ({ section, index, total, onUpdate, onRemove, onMove }) => {
  const [imageUrlInput, setImageUrlInput] = useState("");

  const handleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const newImages: SpotlightImage[] = await Promise.all(
      files.map(async (file) => ({ imageDataUrl: await uploadSpotlightImage(file, 1280, 0.8), description: "" }))
    );
    onUpdate({ images: [...section.images, ...newImages] });
    e.target.value = "";
  };

  const addImageByUrl = () => {
    const url = imageUrlInput.trim();
    if (!url) return;
    onUpdate({ images: [...section.images, { imageDataUrl: url, description: "" }] });
    setImageUrlInput("");
  };

  const updateImage = (i: number, patch: Partial<SpotlightImage>) => {
    const images = [...section.images];
    images[i] = { ...images[i], ...patch };
    onUpdate({ images });
  };

  const removeImage = (i: number) => {
    onUpdate({ images: section.images.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="sf-section-editor">
      <div className="sf-section-editor__header">
        <span className="sf-section-editor__index">Section {index + 1}</span>
        <div className="sf-section-editor__header-actions">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move up">
            <ChevronUp size={14} />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} aria-label="Move down">
            <ChevronDown size={14} />
          </button>
          <button type="button" className="sf-section-editor__remove" onClick={onRemove} aria-label="Remove section">
            <X size={14} /> Remove Section
          </button>
        </div>
      </div>

      <div className="sf-field">
        <label>Section Title</label>
        <input
          type="text"
          value={section.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="e.g. Booking an appointment"
        />
      </div>

      <div className="sf-field">
        <label>Section Description</label>
        <textarea
          rows={3}
          value={section.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Explain this part of the feature — one step per line works well here too."
        />
      </div>

      <div className="sf-field">
        <label>Section Screenshots</label>
        <input type="file" accept="image/*" multiple onChange={handleFilesUpload} />
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
        {section.images.length > 0 && (
          <div className="sf-image-list">
            {section.images.map((img, i) => (
              <div className="sf-image-list__item" key={i}>
                <div className="sf-preview">
                  <img src={resolveMediaUrl(img.imageDataUrl)} alt={`${section.title || "Section"} screenshot ${i + 1}`} />
                </div>
                <textarea
                  rows={2}
                  value={img.description ?? ""}
                  onChange={(e) => updateImage(i, { description: e.target.value })}
                  placeholder={`Description for screenshot ${i + 1}`}
                />
                <button type="button" className="sf-image-list__remove" onClick={() => removeImage(i)}>
                  <X size={14} /> Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default function SpotlightSectionsEditor({ sections, onChange }: Props) {
  const addSection = () => onChange([...sections, newSection()]);

  const updateSection = (id: string, patch: Partial<SpotlightSection>) => {
    onChange(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeSection = (id: string) => onChange(sections.filter((s) => s.id !== id));

  const moveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="sf-sections-editor">
      {sections.map((section, i) => (
        <SectionEditor
          key={section.id}
          section={section}
          index={i}
          total={sections.length}
          onUpdate={(patch) => updateSection(section.id, patch)}
          onRemove={() => removeSection(section.id)}
          onMove={(direction) => moveSection(i, direction)}
        />
      ))}
      <Button variant="outline-dark" size="sm" iconLeft={<Plus size={14} />} onClick={addSection}>
        Add Section
      </Button>
    </div>
  );
}
