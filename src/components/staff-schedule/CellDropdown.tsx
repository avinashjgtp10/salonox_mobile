import React, { useRef, useEffect, useState, useLayoutEffect } from "react";
import ReactDOM from "react-dom";

interface CellDropdownProps {
  onEditWorkingHours: () => void;
  onAddTimeOff: () => void;
  onManageDayOff: () => void;
  onManageBlockedDay: () => void;
  onDeleteTimeBlock?: () => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

const CellDropdown: React.FC<CellDropdownProps> = ({
  onEditWorkingHours,
  onAddTimeOff,
  onManageDayOff,
  onManageBlockedDay,
  onDeleteTimeBlock,
  onClose,
  anchorRef,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ visibility: "hidden" });

  // Position below the anchor using viewport coordinates (fixed)
  useLayoutEffect(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const menuWidth = 210;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top: number;
    let left = rect.left;

    if (spaceBelow >= 160 || spaceBelow >= spaceAbove) {
      top = rect.bottom + 4;
    } else {
      top = rect.top - 4;
      // will be shifted up by translateY below
    }

    // Prevent going off right edge
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }

    setStyle({
      position: "fixed",
      top,
      left,
      zIndex: 9999,
      minWidth: menuWidth,
      visibility: "visible",
    });
  }, [anchorRef]);

  // Close on outside click or scroll
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
    const onScroll = () => onClose();

    document.addEventListener("mousedown", handler);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [onClose, anchorRef]);

  const menu = (
    <div ref={menuRef} className="sched-dropdown" style={style} onClick={(e) => e.stopPropagation()}>
      <button className="sched-dropdown__item" onClick={(e) => { e.stopPropagation(); onEditWorkingHours(); onClose(); }}>
        Edit Working Hours
      </button>
      <button className="sched-dropdown__item" onClick={(e) => { e.stopPropagation(); onAddTimeOff(); onClose(); }}>
        Add Time Off
      </button>
      <button className="sched-dropdown__item" onClick={(e) => { e.stopPropagation(); onManageDayOff(); onClose(); }}>
        Manage Day Off
      </button>
      <button className="sched-dropdown__item" onClick={(e) => { e.stopPropagation(); onManageBlockedDay(); onClose(); }}>
        Manage Blocked Day
      </button>
      {onDeleteTimeBlock && (
        <button
          className="sched-dropdown__item sched-dropdown__item--danger"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
            setTimeout(() => {
              onDeleteTimeBlock();
            }, 0);
          }}
        >
          Delete Time Block
        </button>
      )}
    </div>
  );

  return ReactDOM.createPortal(menu, document.body);
};

export default CellDropdown;
