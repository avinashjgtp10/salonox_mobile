import React, { useState } from "react";
import { PlusCircle, Trash3, ChevronDown, ChevronUp, GripVertical } from "react-bootstrap-icons";
import type { ServiceAddOnsData, AddOnGroup, AddOnOption } from "../../types/catalog.types.ts";

interface Props {
  data: ServiceAddOnsData;
  onChange: (data: ServiceAddOnsData) => void;
}

const newOption = (): AddOnOption => ({
  id: crypto.randomUUID(),
  name: "",
  duration: 15,
  price: 0,
});

const newGroup = (): AddOnGroup => ({
  id: crypto.randomUUID(),
  name: "",
  prompt: "",
  options: [newOption()],
  minQuantityRequired: false,
  maxQuantityEnabled: false,
  allowMultipleSame: false,
  linkedServiceIds: [],
});

const DURATIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];

const ServiceAddOnsTab: React.FC<Props> = ({ data, onChange }) => {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups = data.availableGroups ?? [];

  const updateGroups = (next: AddOnGroup[]) =>
    onChange({ ...data, availableGroups: next });

  const addGroup = () => {
    const g = newGroup();
    updateGroups([...groups, g]);
    setCollapsed((prev) => ({ ...prev, [g.id]: false }));
  };

  const removeGroup = (id: string) =>
    updateGroups(groups.filter((g) => g.id !== id));

  const updateGroup = (id: string, patch: Partial<AddOnGroup>) =>
    updateGroups(groups.map((g) => (g.id === id ? { ...g, ...patch } : g)));

  const addOption = (groupId: string) => {
    const g = groups.find((g) => g.id === groupId);
    if (!g) return;
    updateGroup(groupId, { options: [...g.options, newOption()] });
  };

  const removeOption = (groupId: string, optId: string) => {
    const g = groups.find((g) => g.id === groupId);
    if (!g) return;
    updateGroup(groupId, { options: g.options.filter((o) => o.id !== optId) });
  };

  const updateOption = (groupId: string, optId: string, patch: Partial<AddOnOption>) => {
    const g = groups.find((g) => g.id === groupId);
    if (!g) return;
    updateGroup(groupId, {
      options: g.options.map((o) => (o.id === optId ? { ...o, ...patch } : o)),
    });
  };

  const toggle = (id: string) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  if (groups.length === 0) {
    return (
      <div className="tab-content-panel">
        <h5 className="tab-content-panel__title">Service add-ons</h5>
        <div className="sao-empty">
          <div className="sao-empty__icon">
            <i className="bi bi-plus-square-dotted" />
          </div>
          <h6>Service add-ons</h6>
          <p>
            Allow clients to add customisations and extras to their booking.{" "}
            <a href="#" className="sao-link" onClick={(e) => e.preventDefault()}>
              Learn more
            </a>
          </p>
          <button className="sao-btn-outline" onClick={addGroup}>
            Add group
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content-panel">
      <div className="sao-header">
        <h5 className="tab-content-panel__title mb-0">Service add-ons</h5>
        <button className="sao-btn-outline" onClick={addGroup}>
          <PlusCircle size={13} /> Add group
        </button>
      </div>

      <div className="sao-groups">
        {groups.map((group, gi) => (
          <div key={group.id} className="sao-group">
            {/* Group header */}
            <div className="sao-group__head" onClick={() => toggle(group.id)}>
              <GripVertical size={14} className="sao-grip" />
              <span className="sao-group__num">{gi + 1}</span>
              <span className="sao-group__name">
                {group.name || <span className="sao-placeholder">Unnamed group</span>}
              </span>
              <span className="sao-group__opt-count">
                {group.options.length} option{group.options.length !== 1 ? "s" : ""}
              </span>
              <button
                className="sao-icon-btn sao-icon-btn--danger"
                onClick={(e) => { e.stopPropagation(); removeGroup(group.id); }}
                title="Remove group"
              >
                <Trash3 size={13} />
              </button>
              {collapsed[group.id] ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </div>

            {/* Group body */}
            {!collapsed[group.id] && (
              <div className="sao-group__body">
                {/* Group name */}
                <div className="sao-field">
                  <label className="sao-label">Group name</label>
                  <input
                    className="sao-input"
                    placeholder="e.g. Extra services, Add-ons"
                    value={group.name}
                    onChange={(e) => updateGroup(group.id, { name: e.target.value })}
                  />
                </div>

                {/* Client prompt */}
                <div className="sao-field">
                  <label className="sao-label">Client prompt <span className="sao-optional">(Optional)</span></label>
                  <input
                    className="sao-input"
                    placeholder="e.g. Would you like to add anything?"
                    value={group.prompt}
                    onChange={(e) => updateGroup(group.id, { prompt: e.target.value })}
                  />
                </div>

                {/* Options */}
                <div className="sao-options-label">Options</div>
                {group.options.map((opt, oi) => (
                  <div key={opt.id} className="sao-option-row">
                    <span className="sao-option-num">{oi + 1}</span>
                    <input
                      className="sao-input sao-input--flex"
                      placeholder="Option name"
                      value={opt.name}
                      onChange={(e) => updateOption(group.id, opt.id, { name: e.target.value })}
                    />
                    <div className="sao-input-prefix-wrap">
                      <span className="sao-prefix">₹</span>
                      <input
                        className="sao-input sao-input--sm"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={opt.price || ""}
                        onChange={(e) => updateOption(group.id, opt.id, { price: parseFloat(e.target.value) || 0 })}
                        onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                      />
                    </div>
                    <select
                      className="sao-select sao-select--sm"
                      value={opt.duration}
                      onChange={(e) => updateOption(group.id, opt.id, { duration: Number(e.target.value) })}
                    >
                      {DURATIONS.map((d) => (
                        <option key={d} value={d}>{d} min</option>
                      ))}
                    </select>
                    <button
                      className="sao-icon-btn sao-icon-btn--danger"
                      onClick={() => removeOption(group.id, opt.id)}
                      disabled={group.options.length === 1}
                      title="Remove option"
                    >
                      <Trash3 size={12} />
                    </button>
                  </div>
                ))}

                <button className="sao-add-option-btn" onClick={() => addOption(group.id)}>
                  <PlusCircle size={13} /> Add option
                </button>

                {/* Settings */}
                <div className="sao-settings">
                  <label className="sao-toggle">
                    <input
                      type="checkbox"
                      checked={group.minQuantityRequired}
                      onChange={(e) => updateGroup(group.id, { minQuantityRequired: e.target.checked })}
                    />
                    <span>Require at least one selection</span>
                  </label>
                  <label className="sao-toggle">
                    <input
                      type="checkbox"
                      checked={group.allowMultipleSame}
                      onChange={(e) => updateGroup(group.id, { allowMultipleSame: e.target.checked })}
                    />
                    <span>Allow multiple of the same option</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServiceAddOnsTab;
