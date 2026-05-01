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
      className="block w-full text-left px-4 py-2.5 text-[13px] font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all first:rounded-t-xl last:rounded-b-xl"
      onClick={() => { fn(); onClose(); }}
    >
      {label}
    </button>
  );

  return (
    <div
      ref={menuRef}
      className="absolute z-[80] bg-white rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] min-w-[200px] py-1 border border-gray-100/50"
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
