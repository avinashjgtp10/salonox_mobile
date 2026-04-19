interface SettingsToggleProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}

export default function SettingsToggle({
  checked,
  onChange,
  disabled,
}: SettingsToggleProps) {
  return (
    <label className="settings-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className="settings-toggle-slider" />
    </label>
  );
}
