import type { ReactNode } from "react";

export interface SettingsHomeItem {
  id: string;
  label: string;
  description: string;
  icon: ReactNode;
}

export interface SettingsHomeGroup {
  groupLabel: string;
  items: SettingsHomeItem[];
}

interface Props {
  groups: SettingsHomeGroup[];
  onSelect: (id: string) => void;
}

export default function SettingsHomePage({ groups, onSelect }: Props) {
  return (
    <div className="settings-home">
      {groups.map((group) => (
        <div className="settings-home-group" key={group.groupLabel}>
          <p className="settings-home-group-label">{group.groupLabel}</p>
          <div className="settings-home-grid">
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="settings-home-card"
                onClick={() => onSelect(item.id)}
              >
                <span className="settings-home-card-icon">{item.icon}</span>
                <span className="settings-home-card-title">{item.label}</span>
                <span className="settings-home-card-desc">{item.description}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
