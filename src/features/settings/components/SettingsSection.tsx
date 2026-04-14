import type { ReactNode } from "react";

interface SettingsSectionProps {
  title: ReactNode;
  desc?: string;
  headerAction?: ReactNode;
  noPadding?: boolean;
  children: ReactNode;
}

export default function SettingsSection({
  title,
  desc,
  headerAction,
  noPadding,
  children,
}: SettingsSectionProps) {
  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <div>
          <p className="settings-section-title">{title}</p>
          {desc && <p className="settings-section-desc">{desc}</p>}
        </div>
        {headerAction}
      </div>
      <div className="settings-section-body" style={noPadding ? { padding: 0 } : undefined}>
        {children}
      </div>
    </div>
  );
}
