import React, { useState } from "react";
import { toTitleCase } from "../../../../utils/titleCase";

// Inline "+ Add X" affordance — types a name, saves via the given handler,
// and lets the caller select the newly created record. Shared across
// Category/Brand/Supplier on the Product form and Category on the Service
// form, so a missing option never forces a trip to another page.
//
// Extracted from ProductFormPage so both catalog forms use the same control.
// Styles live in ../../styles/ConsumableFormPage.scss (.cf-quick-add-*).
export const QuickAdd: React.FC<{
  label: string;
  onAdd: (name: string) => Promise<void>;
}> = ({ label, onAdd }) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!value.trim() || saving) return;
    setSaving(true);
    try {
      await onAdd(toTitleCase(value.trim()));
      setValue("");
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="cf-quick-add-link" onClick={() => setOpen(true)}>
        + {label}
      </button>
    );
  }

  return (
    <div className="cf-quick-add-row">
      <input
        autoFocus
        placeholder={`${label.replace(/^Add a /i, "")} name`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setOpen(false); setValue(""); } }}
      />
      <button type="button" className="cf-quick-add-save" onClick={submit} disabled={!value.trim() || saving}>
        {saving ? "Saving…" : "Save"}
      </button>
      <button type="button" className="cf-quick-add-cancel" onClick={() => { setOpen(false); setValue(""); }}>
        Cancel
      </button>
    </div>
  );
};

export default QuickAdd;
