import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Search } from "react-bootstrap-icons";
import { Modal, Button } from "../../../components/ui";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { saveDigitalMenuThunk } from "../../../middleware/digitalMenu/digitalMenu.thunk";
import { fetchAllActiveServices, groupByCategory } from "../utils/serviceSelection";
import { useCurrency } from "../../../hooks/useCurrency";
import type { Service } from "../types/catalog.types";
import type { DigitalMenuServiceMode } from "../types/digitalMenu.types";
import "../styles/DigitalMenu.scss";

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

const DigitalMenuConfigModal: React.FC<Props> = ({ onClose, onSaved }) => {
  const dispatch = useAppDispatch();
  const { formatAmount } = useCurrency();
  const menu = useAppSelector((s) => s.digitalMenu.menu);
  const saving = useAppSelector((s) => s.digitalMenu.saving);

  const [name, setName] = useState(menu?.name ?? "Main Menu");
  const [mode, setMode] = useState<DigitalMenuServiceMode>(menu?.service_selection_mode ?? "all_active");
  // Always string-keyed: Service.id is string | number depending on the
  // backend response, but menu.selected_service_ids is always string[] — every
  // s.id is coerced to String() before touching this set (see toggleService/
  // toggleCategory/the "checked" lookups below) so comparisons never miss a
  // previously-selected numeric id.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(menu?.selected_service_ids ?? []),
  );
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [allServices, setAllServices] = useState<Service[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const fetched = await fetchAllActiveServices();
        if (!cancelled) setAllServices(fetched);
      } catch (err) {
        console.error("[DigitalMenuConfigModal] failed to load services:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const pickerGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q ? allServices.filter((s) => s.name.toLowerCase().includes(q)) : allServices;
    return groupByCategory(filtered);
  }, [allServices, search]);

  const toggleService = useCallback((id: string | number) => {
    const key = String(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const toggleCategory = useCallback((category: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      allServices
        .filter((s) => (s.category_name?.trim() || "Other Services") === category)
        .forEach((s) => { if (checked) next.add(String(s.id)); else next.delete(String(s.id)); });
      return next;
    });
  }, [allServices]);

  const canSave = name.trim().length > 0 && (mode === "all_active" || selectedIds.size > 0);

  const handleSave = async () => {
    if (!canSave) return;
    const result = await dispatch(saveDigitalMenuThunk({
      id: menu?.id,
      name: name.trim(),
      status: menu?.status ?? "active",
      service_selection_mode: mode,
      selected_service_ids: mode === "specific" ? Array.from(selectedIds) : [],
    }));
    if (saveDigitalMenuThunk.fulfilled.match(result)) onSaved();
  };

  return (
    <Modal
      show
      onClose={onClose}
      title={menu ? "Edit Digital Menu" : "Create Digital Menu"}
      size="lg"
      footer={
        <>
          <Button variant="outline-secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving} disabled={!canSave}>
            Save Menu
          </Button>
        </>
      }
    >
      <div className="dm-config">
        <div className="dm-config__field">
          <label>Menu name</label>
          <input
            type="text"
            className="form-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Main Menu"
          />
        </div>

        <div className="dm-config__field">
          <label>Services</label>
          <div className="dm-config__mode">
            <label className="dm-config__radio">
              <input
                type="radio"
                checked={mode === "all_active"}
                onChange={() => setMode("all_active")}
              />
              <span>Show all active services</span>
            </label>
            <label className="dm-config__radio">
              <input
                type="radio"
                checked={mode === "specific"}
                onChange={() => setMode("specific")}
              />
              <span>Select specific services</span>
            </label>
          </div>
        </div>

        {mode === "specific" && (
          <div className="dm-config__picker-wrap">
            <div className="dm-config__picker-title">
              Choose services ({selectedIds.size} of {allServices.length})
            </div>
            <div className="dm-config__search">
              <Search size={14} />
              <input
                placeholder="Search services…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="dm-config__picker">
              {loading ? (
                <p className="text-muted small mb-0">Loading services…</p>
              ) : pickerGroups.length === 0 ? (
                <p className="text-muted small mb-0">No services match your search.</p>
              ) : (
                pickerGroups.map((g) => {
                  const checkedCount = g.services.filter((s) => selectedIds.has(String(s.id))).length;
                  const allChecked = checkedCount === g.services.length;
                  const someChecked = checkedCount > 0 && !allChecked;
                  return (
                    <div key={g.category} className="dm-config__cat-group">
                      <label className="dm-config__cat-header">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          ref={(el) => { if (el) el.indeterminate = someChecked; }}
                          onChange={(e) => toggleCategory(g.category, e.target.checked)}
                        />
                        <span>{g.category}</span>
                        <span className="dm-config__count">{checkedCount}/{g.services.length}</span>
                      </label>
                      {g.services.map((s) => (
                        <label key={s.id} className="dm-config__svc-row">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(String(s.id))}
                            onChange={() => toggleService(s.id)}
                          />
                          <span className="dm-config__svc-name">{s.name}</span>
                          <span className="dm-config__svc-price">{formatAmount(Number(s.price) || 0)}</span>
                        </label>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DigitalMenuConfigModal;
