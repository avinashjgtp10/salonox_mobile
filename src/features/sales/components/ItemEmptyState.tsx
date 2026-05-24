interface Props {
  icon: string;
  text: string;
  hint: string;
  onClick: () => void;
}

export default function ItemEmptyState({ icon, text, hint, onClick }: Props) {
  return (
    <div className="qs-empty-rows qs-empty-rows--clickable" onClick={onClick}>
      <div className="qs-empty-rows__icon">{icon}</div>
      <span className="qs-empty-rows__text">{text}</span>
      <span className="qs-empty-rows__hint">{hint}</span>
    </div>
  );
}
