import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PencilSquare, ThreeDotsVertical, Trash } from "react-bootstrap-icons";

interface Props {
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
}

const MENU_WIDTH_PX = 152;

// Kebab-menu replacement for a row's separate Edit/Delete buttons — keeps
// the Actions column compact instead of two always-visible buttons per row.
//
// Portaled to document.body: the table wrapper (.cash-mgmt__table-shell)
// has `overflow: auto` for horizontal scrolling, which clips any
// absolutely-positioned child — an in-place dropdown here would render but
// get cut off (invisible) whenever the trigger was near the table's edge.
// Rendering into the body and positioning with getBoundingClientRect side-
// steps that clipping entirely.
export default function CashMgmtRowActionsMenu({ onEdit, onDelete, disabled = false }: Props) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({
      top: rect.bottom + 6,
      left: Math.max(8, rect.right - MENU_WIDTH_PX),
    });
  };

  const toggleOpen = () => {
    if (!open) updatePosition();
    setOpen((current) => !current);
  };

  useEffect(() => {
    if (!open) return;

    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onReposition = () => updatePosition();

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEscape);
    // capture:true so this also fires for scroll on the table's own
    // overflow container, not just the window — keeps the menu glued to
    // the trigger (or closes it) instead of drifting while scrolling.
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEscape);
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open]);

  return (
    <div className="cash-mgmt__row-menu">
      <button
        type="button"
        ref={triggerRef}
        className="cash-mgmt__row-menu-trigger"
        onClick={toggleOpen}
        disabled={disabled}
        aria-label="Row actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ThreeDotsVertical size={16} />
      </button>

      {open && position
        ? createPortal(
            // .cash-mgmt wrapper re-applied here (display:contents — no box
            // of its own) purely so the dropdown still inherits the
            // --cash-mgmt-* CSS custom properties, which are scoped to that
            // class and otherwise wouldn't reach a node portaled to
            // document.body, outside the page's own .cash-mgmt subtree.
            <div className="cash-mgmt" style={{ display: "contents" }}>
              <div
                ref={menuRef}
                className="cash-mgmt__row-menu-dropdown"
                role="menu"
                style={{ top: position.top, left: position.left, width: MENU_WIDTH_PX }}
              >
                <button
                  type="button"
                  className="cash-mgmt__row-menu-item"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    onEdit();
                  }}
                >
                  <PencilSquare size={14} /> Edit
                </button>
                <button
                  type="button"
                  className="cash-mgmt__row-menu-item cash-mgmt__row-menu-item--danger"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    onDelete();
                  }}
                >
                  <Trash size={14} /> Delete
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
