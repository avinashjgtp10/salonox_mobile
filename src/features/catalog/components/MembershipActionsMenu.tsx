import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./MembershipActionsMenu.scss";

interface MembershipActionsMenuProps {
  onAddMembership?: () => void;
}

const MembershipActionsMenu: React.FC<MembershipActionsMenuProps> = ({
  onAddMembership,
}) => {
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setAddOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="membership-actions-menu" ref={menuRef}>
      <button
        className="btn btn-primary btn-sm d-flex align-items-center gap-2"
        onClick={() => { setOpen(!open); setAddOpen(false); }}
      >
        <i className="bi bi-lightning-fill" />
        Options
        <i className={`bi bi-chevron-${open ? "up" : "down"} small`} />
      </button>

      {open && (
        <div className="membership-actions-menu__dropdown shadow-sm border rounded bg-white">
          {/* Add submenu */}
          <div
            className="membership-actions-menu__item membership-actions-menu__item--has-sub"
            onMouseEnter={() => setAddOpen(true)}
            onMouseLeave={() => setAddOpen(false)}
          >
            <span className="d-flex align-items-center gap-2">
              <i className="bi bi-plus-circle" />
              Add
            </span>
            <i className="bi bi-chevron-right small ms-auto" />

            {addOpen && (
              <div className="membership-actions-menu__submenu shadow-sm border rounded bg-white">
                <button
                  className="membership-actions-menu__sub-item"
                  onClick={() => {
                    onAddMembership?.();
                    navigate("/dashboard/catalog/memberships/create");
                    setOpen(false);
                  }}
                >
                  <i className="bi bi-person-badge me-2" />
                  New Membership
                </button>
                <button
                  className="membership-actions-menu__sub-item"
                  onClick={() => setOpen(false)}
                >
                  <i className="bi bi-collection me-2" />
                  Duplicate Plan
                </button>
              </div>
            )}
          </div>

          <div className="membership-actions-menu__divider" />

          <button
            className="membership-actions-menu__item"
            onClick={() => setOpen(false)}
          >
            <i className="bi bi-arrow-down-circle me-2" />
            Export Members
          </button>
          <button
            className="membership-actions-menu__item"
            onClick={() => setOpen(false)}
          >
            <i className="bi bi-gear me-2" />
            Settings
          </button>
        </div>
      )}
    </div>
  );
};

export default MembershipActionsMenu;