import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Funnel, Search } from "react-bootstrap-icons";
import "./JiraFilterMenu.scss";

export interface FilterDropdownOption {
  id: string;
  label: string;
  /** Renders the option greyed out and untickable. For choices that exist in
   *  the product's vocabulary but have no data behind them yet (e.g. the Open
   *  Rate report's SMS/Email channels) — showing them keeps the intended shape
   *  discoverable, while disabling them avoids a tick that silently does
   *  nothing. */
  disabled?: boolean;
}

export interface JiraFilterField {
  key: string;
  label: string;
  options: FilterDropdownOption[];
  /** Shown only for fields with many options (Category/Brand/Supplier/
   *  Assigned Service) — omitted for short fixed lists (Stock Status, Base
   *  Unit, Product Type). */
  searchable?: boolean;
  /** Key of another field this one narrows against. When that field has a
   *  non-empty draft selection, `optionsFor` supplies this field's options
   *  instead of the flat `options` array — e.g. Service narrowing to only the
   *  services in the drafted Categories. Resolved from the LIVE draft, so the
   *  list narrows as soon as the parent field is ticked, not on Apply. */
  dependsOn?: string;
  /** Given the parent field's drafted ids (never empty) plus this field's own
   *  drafted ids, return the options to show. Ignored without `dependsOn`. */
  optionsFor?: (parentIds: string[], ownIds: string[]) => FilterDropdownOption[];
}

interface JiraFilterMenuProps {
  fields: JiraFilterField[];
  /** Currently APPLIED selection per field key. */
  selected: Record<string, string[]>;
  /** Fires once, only on "Apply Filters" — never per checkbox/field switch. */
  onApply: (next: Record<string, string[]>) => void;
  triggerLabel?: string;
}

/** Filter trigger + dropdown panel. With 2+ fields it's the Jira-style
 *  two-pane layout — field NAMES down the left, the active field's own
 *  searchable checkbox list on the right, one shared "Filter" trigger. With
 *  exactly 1 field it collapses to a plain single-field dropdown (no names
 *  pane, trigger shows that field's own label) — the same component covers
 *  both a lone standalone filter and a combined multi-field filter menu.
 *  Either way, every checkbox click only edits a local draft; nothing is
 *  fetched until "Apply Filters" is clicked, at which point the whole draft
 *  commits in one shot (one API call covering every changed field, not one
 *  per field). */
const JiraFilterMenu: React.FC<JiraFilterMenuProps> = ({ fields, selected, onApply, triggerLabel }) => {
  const isSingle = fields.length <= 1;
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState(fields[0]?.key ?? "");
  const [draft, setDraft] = useState<Record<string, string[]>>(selected);
  const [search, setSearch] = useState<Record<string, string>>({});
  const rootRef = useRef<HTMLDivElement>(null);

  const totalApplied = useMemo(
    () => Object.values(selected).reduce((sum, ids) => sum + (ids?.length ?? 0), 0),
    [selected],
  );

  useEffect(() => {
    if (!open) return;
    setDraft(selected);
    setSearch({});
    setActiveKey((prev) => (fields.some((f) => f.key === prev) ? prev : fields[0]?.key ?? ""));
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEscape);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const activeField = fields.find((f) => f.key === activeKey);
  const activeSelectedIds = draft[activeKey] ?? [];
  const activeSearch = search[activeKey] ?? "";

  const noParentIds: string[] = [];
  const dependsOnIds = activeField?.dependsOn ? (draft[activeField.dependsOn] ?? noParentIds) : noParentIds;
  const baseOptions = useMemo(() => {
    if (!activeField) return [];
    if (activeField.optionsFor && dependsOnIds.length > 0) {
      return activeField.optionsFor(dependsOnIds, draft[activeKey] ?? []);
    }
    return activeField.options;
  }, [activeField, dependsOnIds, draft, activeKey]);

  const activeOptions = activeField?.searchable && activeSearch.trim()
    ? baseOptions.filter((o) => o.label.toLowerCase().includes(activeSearch.trim().toLowerCase()))
    : baseOptions;

  const toggleOption = (id: string) => {
    setDraft((prev) => {
      const current = prev[activeKey] ?? [];
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      return { ...prev, [activeKey]: next };
    });
  };

  const clearActive = () => setDraft((prev) => ({ ...prev, [activeKey]: [] }));
  // Unlike clearActive (a within-panel convenience while still adjusting
  // other fields), "Clear all"/"Clear" is a footer action presented next to
  // Apply — it reads as final, so it must actually commit the cleared state
  // and close, not just reset the draft and leave the applied filters (and
  // the table) untouched until a separate Apply click.
  const clearAll = () => {
    setDraft({});
    onApply({});
    setOpen(false);
  };

  const resolvedTriggerLabel = triggerLabel ?? (isSingle ? fields[0]?.label ?? "Filter" : "Filter");

  return (
    <div className="jfm-root" ref={rootRef}>
      <button type="button" className={`jfm-trigger${totalApplied ? " jfm-trigger--active" : ""}`} onClick={() => setOpen((v) => !v)}>
        {!isSingle && <Funnel size={13} />}
        <span>{resolvedTriggerLabel}</span>
        {totalApplied > 0 && <span className="jfm-trigger__badge">{totalApplied}</span>}
        {isSingle && <ChevronDown size={12} />}
      </button>

      {open && (
        <div className={`jfm-panel${isSingle ? " jfm-panel--single" : ""}`}>
          <div className="jfm-panel__body">
            {!isSingle && (
              <div className="jfm-panel__names">
                {fields.map((f) => {
                  const count = (draft[f.key] ?? []).length;
                  return (
                    <button
                      type="button"
                      key={f.key}
                      className={`jfm-name${f.key === activeKey ? " jfm-name--active" : ""}`}
                      onClick={() => setActiveKey(f.key)}
                    >
                      <span>{f.label}</span>
                      {count > 0 && <span className="jfm-name__badge">{count}</span>}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="jfm-panel__options">
              {activeField?.dependsOn && dependsOnIds.length > 0 && (
                <div className="jfm-panel__hint">
                  Showing {activeField.label.toLowerCase()}s in the selected{" "}
                  {fields.find((f) => f.key === activeField.dependsOn)?.label.toLowerCase()}
                </div>
              )}
              {activeField?.searchable && (
                <div className="jfm-panel__search">
                  <Search size={13} />
                  <input
                    autoFocus
                    placeholder={`Search ${activeField.label.toLowerCase()}…`}
                    value={activeSearch}
                    onChange={(e) => setSearch((prev) => ({ ...prev, [activeKey]: e.target.value }))}
                  />
                </div>
              )}
              <div className="jfm-panel__list">
                {activeOptions.length === 0 ? (
                  <div className="jfm-panel__empty">No options</div>
                ) : (
                  activeOptions.map((o) => (
                    <label key={o.id} className={`jfm-option${o.disabled ? " jfm-option--disabled" : ""}`}>
                      <input
                        type="checkbox"
                        disabled={o.disabled}
                        checked={activeSelectedIds.includes(o.id)}
                        onChange={() => { if (!o.disabled) toggleOption(o.id); }}
                      />
                      <span>{o.label}</span>
                    </label>
                  ))
                )}
              </div>
              {!isSingle && activeSelectedIds.length > 0 && (
                <button type="button" className="jfm-panel__clear-field" onClick={clearActive}>
                  Clear {activeField?.label}
                </button>
              )}
            </div>
          </div>

          <div className="jfm-panel__footer">
            <button type="button" className="jfm-panel__btn jfm-panel__btn--clear" onClick={clearAll}>
              Clear{isSingle ? "" : " all"}
            </button>
            <button
              type="button"
              className="jfm-panel__btn jfm-panel__btn--apply"
              onClick={() => { onApply(draft); setOpen(false); }}
            >
              Apply{isSingle ? "" : " Filters"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JiraFilterMenu;
