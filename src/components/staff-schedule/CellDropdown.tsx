import React, { useRef, useEffect } from "react";

interface CellDropdownProps {
  onEditWorkingHours: () => void;
  onAddTimeOff: () => void;
  onManageDayOff: () => void;
  onManageBlockedDay: () => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

const CellDropdown: React.FC<CellDropdownProps> = ({
  onEditWorkingHours,
  onAddTimeOff,
  onManageDayOff,
  onManageBlockedDay,
  onClose,
  anchorRef,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  const item = (label: string, fn: () => void) => (
    <button
      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
      onClick={() => { fn(); onClose(); }}
    >
      {label}
    </button>
  );

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-white border border-gray-200 rounded shadow-lg min-w-[190px] py-1"
      style={{ top: "100%", left: 0 }}
    >
      {item("Edit Working Hours", onEditWorkingHours)}
      {item("Add Time Off", onAddTimeOff)}
      {item("Manage Day Off", onManageDayOff)}
      {item("Manage Blocked Day", onManageBlockedDay)}
    </div>
  );
};

export default CellDropdown;
