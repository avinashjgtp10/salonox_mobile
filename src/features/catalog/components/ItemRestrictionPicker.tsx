// Lets a membership benefit be narrowed to specific services/products within
// a category, not just the whole category — e.g. pick 4-5 services out of a
// 30-service category instead of every one of them. Clicking a category
// expands it to show its individual items with checkboxes; a "select all"
// checkbox on the category header is the shortcut for wanting the whole
// thing, same as before this component existed.
//
// Fully controlled — all selection state (categoryIds/itemIds) lives in the
// parent's FormState via patch(), same convention the rest of
// AddMembershipModal.tsx already follows. The only state kept here is which
// categories are currently expanded, plus whether the whole panel itself is
// open, both purely display concerns.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "react-bootstrap-icons";

export interface PickerCategory {
  id: string;
  name: string;
}

export interface PickerItem {
  id: string;
  name: string;
  categoryId: string | null;
}

interface Props {
  label: string;
  categories: PickerCategory[];
  items: PickerItem[];
  categoryIds: string[];
  itemIds: string[];
  onChangeCategoryIds: (ids: string[]) => void;
  onChangeItemIds: (ids: string[]) => void;
}

const ItemRestrictionPicker: React.FC<Props> = ({
  label, categories, items, categoryIds, itemIds, onChangeCategoryIds, onChangeItemIds,
}) => {
  // Closed by default, same as the flat Dropdown this replaced — the
  // category/item list is a click-to-open panel, not permanently visible.
  const [panelOpen, setPanelOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!panelOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setPanelOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [panelOpen]);

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, PickerItem[]>();
    items.forEach((it) => {
      const key = it.categoryId ?? "";
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    });
    return map;
  }, [items]);

  const toggleExpanded = (catId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  };

  // Checking "select all" for a category supersedes any individually-picked
  // items in it — clear them so coverage is never ambiguous about whether a
  // category counts because of "select all" or a pile of individual picks.
  // Unchecking it just removes the category; individual picks (there
  // shouldn't be any, since they're cleared going in) are left untouched.
  const toggleSelectAll = (catId: string) => {
    if (categoryIds.includes(catId)) {
      onChangeCategoryIds(categoryIds.filter((id) => id !== catId));
    } else {
      onChangeCategoryIds([...categoryIds, catId]);
      const idsInCategory = new Set((itemsByCategory.get(catId) ?? []).map((it) => it.id));
      onChangeItemIds(itemIds.filter((id) => !idsInCategory.has(id)));
    }
  };

  const toggleItem = (itemId: string) => {
    onChangeItemIds(
      itemIds.includes(itemId) ? itemIds.filter((id) => id !== itemId) : [...itemIds, itemId],
    );
  };

  const selectedCount = categoryIds.length + itemIds.length;
  const triggerLabel = selectedCount === 0
    ? `All ${label.toLowerCase()}`
    : `${categoryIds.length} categor${categoryIds.length === 1 ? "y" : "ies"}, ${itemIds.length} item${itemIds.length === 1 ? "" : "s"}`;

  return (
    <div className="irp" ref={containerRef}>
      <button
        type="button"
        className={`irp__trigger${panelOpen ? " irp__trigger--open" : ""}`}
        onClick={() => setPanelOpen((o) => !o)}
      >
        <span>{triggerLabel}</span>
        <ChevronDown size={13} className="irp__trigger-icon" />
      </button>
      <p className="irp__hint">
        {selectedCount === 0
          ? `None selected — the benefit applies to every ${label.toLowerCase()} category.`
          : `${categoryIds.length} whole categor${categoryIds.length === 1 ? "y" : "ies"}, ${itemIds.length} individual item${itemIds.length === 1 ? "" : "s"} selected.`}
      </p>
      {panelOpen && (
      <div className="irp__list">
        {categories.map((cat) => {
          const catId = String(cat.id);
          const isOpen = expanded.has(catId);
          const isWholeCategory = categoryIds.includes(catId);
          const catItems = itemsByCategory.get(catId) ?? [];
          return (
            <div key={catId} className="irp__category">
              <div className="irp__category-head" onClick={() => toggleExpanded(catId)}>
                <span className={`irp__chevron${isOpen ? " irp__chevron--open" : ""}`}>
                  <ChevronRight size={13} />
                </span>
                <span className="irp__category-name">{cat.name}</span>
                <span className="irp__category-count">
                  {isWholeCategory ? "all" : catItems.filter((it) => itemIds.includes(it.id)).length || ""}
                </span>
                <label className="irp__select-all" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isWholeCategory}
                    onChange={() => toggleSelectAll(catId)}
                  />
                  Select all
                </label>
              </div>
              {isOpen && (
                <div className="irp__items">
                  {catItems.length === 0 ? (
                    <div className="irp__empty">No items in this category.</div>
                  ) : (
                    catItems.map((it) => (
                      <label
                        key={it.id}
                        className={`irp__item${isWholeCategory ? " irp__item--disabled" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={isWholeCategory || itemIds.includes(it.id)}
                          disabled={isWholeCategory}
                          onChange={() => toggleItem(it.id)}
                        />
                        {it.name}
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};

export default ItemRestrictionPicker;
