import React, { useState, useRef, useEffect } from "react";
import "../styles/MemberRowMenu.scss";
interface MemberRowMenuProps {
  memberId: number;
  onSetRepeating: (id: number) => void;
  onUnassign: (id: number) => void;
  onDeleteAll: (id: number) => void;
  onViewMember: (id: number) => void;
  onEditMember: (id: number) => void;
}

const MemberRowMenu: React.FC<MemberRowMenuProps> = ({
  memberId,
  onSetRepeating,
  onUnassign,
  onDeleteAll,
  onViewMember,
  onEditMember,
}) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen((p) => !p);
  };

  const act = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  return (
    <div className="member-row-menu" ref={ref}>
      <button
        ref={triggerRef}
        className="member-row-menu__trigger"
        onClick={handleOpen}
        aria-label="Member options"
      >
        ✏️
      </button>

      {open && (
        <div
          className="member-row-menu__dropdown"
          style={{ "--menu-top": `${pos.top}px`, "--menu-left": `${pos.left}px` } as React.CSSProperties}
        >
          <p className="member-row-menu__section">Schedule</p>
          <button
            className="member-row-menu__item"
            onClick={() => act(() => onSetRepeating(memberId))}
          >
            Set repeating shifts
          </button>
          <button
            className="member-row-menu__item"
            onClick={() => act(() => onUnassign(memberId))}
          >
            Unassign from location
          </button>
          <button
            className="member-row-menu__item member-row-menu__item--red"
            onClick={() => act(() => onDeleteAll(memberId))}
          >
            Delete all shifts
          </button>
          <div className="member-row-menu__divider" />
          <p className="member-row-menu__section">Staff member</p>
          <button
            className="member-row-menu__item"
            onClick={() => act(() => onViewMember(memberId))}
          >
            View staff member
          </button>
          <button
            className="member-row-menu__item"
            onClick={() => act(() => onEditMember(memberId))}
          >
            Edit staff member
          </button>
        </div>
      )}
    </div>
  );
};

export default MemberRowMenu;
