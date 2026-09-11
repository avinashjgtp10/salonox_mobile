import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSelector as useReduxSelector } from "react-redux";
import { X, Search, Printer, InfoCircle, ChevronDown } from "react-bootstrap-icons";
import type { Service } from "../types/catalog.types";
import { fetchAllActiveServices, groupByCategory } from "../utils/serviceSelection";
import { useAppSelector, useAppDispatch } from "../../../hooks/useAppRedux";
import { usePermissions } from "../../../hooks/usePermissions";
import { showPermissionDenied } from "../../../store/permissionDialogSlice";
import { selectCurrentSalon } from "../../../store/selectors/slices.selectors";
import { fetchSettingsThunk } from "../../../middleware/setting/setting.thunk";
import { getActiveTaxes } from "../../settings/utils/taxSettings";
import { useCurrency } from "../../../hooks/useCurrency";
import {
  MENU_CARD_TEMPLATES,
  type MenuCardTemplateId,
  buildMenuCardDocument,
  openMenuCardPrintWindow,
  formatServicePrice,
} from "../utils/menuCardPrint";

interface Props {
  onClose: () => void;
}

const TEXT_SIZE_OPTIONS: { id: string; label: string; scale: number }[] = [
  { id: "small",  label: "Small",  scale: 0.85 },
  { id: "medium", label: "Medium", scale: 1 },
  { id: "large",  label: "Large",  scale: 1.15 },
];

// "Choose a template" collapsed into a dropdown — closed state shows just the
// currently selected template's swatch + name (was a permanently-open 15-tile
// grid eating vertical space above the service picker); opening it reveals
// the same swatch grid as before, now inside a floating panel.
function TemplateDropdown({
  templateId,
  onSelect,
}: {
  templateId: MenuCardTemplateId;
  onSelect: (id: MenuCardTemplateId) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = MENU_CARD_TEMPLATES.find((t) => t.id === templateId) ?? MENU_CARD_TEMPLATES[0];

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <div className="pmc-template-dd" ref={rootRef}>
      <button type="button" className="pmc-template-dd__trigger" onClick={() => setOpen((v) => !v)}>
        <span className="pmc-template-dd__swatch" style={{ background: selected.cardBg }}>
          <span className="pmc-template-dd__swatch-bar" style={{ background: selected.accentColor }} />
        </span>
        <span className="pmc-template-dd__label">{selected.label}</span>
        <ChevronDown size={13} className={`pmc-template-dd__chevron${open ? " pmc-template-dd__chevron--open" : ""}`} />
      </button>

      {open && (
        <div className="pmc-template-dd__panel">
          <div className="pmc-templates">
            {MENU_CARD_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                title={`${t.label} — ${t.description}`}
                className={`pmc-template${templateId === t.id ? " pmc-template--active" : ""}`}
                onClick={() => { onSelect(t.id); setOpen(false); }}
              >
                <span className="pmc-template__swatch" style={{ background: t.cardBg }}>
                  <span className="pmc-template__swatch-bar" style={{ background: t.accentColor }} />
                  <span className="pmc-template__swatch-line" style={{ background: t.textColor, opacity: 0.55 }} />
                  <span className="pmc-template__swatch-line" style={{ background: t.textColor, opacity: 0.3, width: "60%" }} />
                </span>
                <span className="pmc-template__label">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// A4 at 96dpi (the same pixel grid the preview iframe and print window both
// render at — see .pmc-preview-scale's iframe width/height in the SCSS).
// Used to turn the preview's measured content height into a page count and
// to draw page-break divider lines, now that a selection is allowed to span
// more than one printed page.
const A4_HEIGHT_PX = 1123;
const PREVIEW_SCALE = 0.46;

const PrintMenuCardModal: React.FC<Props> = ({ onClose }) => {
  const currentSalon = useReduxSelector(selectCurrentSalon);
  const { formatAmount } = useCurrency();
  const dispatch = useAppDispatch();
  const { can } = usePermissions();
  const settingItems = useAppSelector((s) => s.setting.items);

  useEffect(() => { if (settingItems.length === 0) dispatch(fetchSettingsThunk()); }, [dispatch, settingItems.length]);

  // Combined rate of every active tax rule that applies to services — 0 when
  // GST is off or no rule targets services, in which case the menu card
  // simply never mentions GST at all (see buildMenuCardDocument).
  const gstPercent = useMemo(() => {
    const taxes = getActiveTaxes(settingItems);
    return taxes
      .filter((t) => t.applicable_for.service)
      .reduce((sum, t) => sum + t.tax_value, 0);
  }, [settingItems]);

  const [loading, setLoading] = useState(true);
  const [allServices, setAllServices] = useState<Service[]>([]);
  // Starts empty — the owner builds the card up by picking services
  // themselves, rather than starting from "everything" and pruning down.
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [templateId, setTemplateId] = useState<MenuCardTemplateId>("classic");
  const [fontScale, setFontScale] = useState(1);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const fetched = await fetchAllActiveServices();
        if (cancelled) return;
        setAllServices(fetched);
      } catch (err) {
        console.error("[PrintMenuCardModal] failed to load services:", err);
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

  const selectedServices = useMemo(
    () => allServices.filter((s) => selectedIds.has(s.id)),
    [allServices, selectedIds],
  );

  const toggleService = useCallback((id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleCategory = useCallback((category: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      allServices
        .filter((s) => (s.category_name?.trim() || "Other Services") === category)
        .forEach((s) => { if (checked) next.add(s.id); else next.delete(s.id); });
      return next;
    });
  }, [allServices]);

  const selectAll = useCallback(() => setSelectedIds(new Set(allServices.map((s) => s.id))), [allServices]);
  const clearAll  = useCallback(() => setSelectedIds(new Set()), []);

  const previewHtml = useMemo(
    () => buildMenuCardDocument({ services: selectedServices, salon: currentSalon, templateId, gstPercent, formatAmount, fontScale }, false),
    [selectedServices, currentSalon, templateId, gstPercent, formatAmount, fontScale],
  );

  // Measures the ACTUAL rendered height of the preview (same markup the print
  // window uses), rather than estimating row heights in JS — the browser's
  // own layout engine is the only thing that can account for
  // template/font-size/wrapping accurately. Re-measured every time
  // previewHtml changes (new selection, template, or text size) via the
  // iframe's key forcing a fresh load each time. A selection longer than one
  // A4 page is fine — it just prints across as many pages as it needs (see
  // menuCardPrint.ts's @page rule), so this now drives the preview's height
  // and page-break markers instead of blocking printing.
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [contentHeightPx, setContentHeightPx] = useState(A4_HEIGHT_PX);

  const measurePreview = useCallback(() => {
    const page = iframeRef.current?.contentDocument?.querySelector<HTMLElement>(".mc-page");
    if (!page) { setContentHeightPx(A4_HEIGHT_PX); return; }
    setContentHeightPx(Math.max(A4_HEIGHT_PX, page.scrollHeight));
  }, []);

  const pageCount = Math.max(1, Math.ceil(contentHeightPx / A4_HEIGHT_PX));
  const canPrint = selectedServices.length > 0;

  // Clearing the selection removes the preview iframe entirely (see the JSX
  // below) — its onLoad measurement can't fire again to reset a stale height
  // left over from a bigger selection, so this does it directly.
  useEffect(() => { if (selectedServices.length === 0) setContentHeightPx(A4_HEIGHT_PX); }, [selectedServices.length]);

  const handlePrint = () => {
    if (!canPrint) return;
    // Entirely client-side (window.print()) — no backend call to deny, so
    // this is the only enforcement point print_menu_card has.
    if (!can("print_menu_card")) {
      dispatch(showPermissionDenied(
        `Your account does not have the "print_menu_card" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
      ));
      return;
    }
    const html = buildMenuCardDocument({ services: selectedServices, salon: currentSalon, templateId, gstPercent, formatAmount, fontScale }, true);
    openMenuCardPrintWindow(html);
  };

  return (
    <div className="slp__overlay" onClick={onClose}>
      <div className="slp__modal pmc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="slp__modal-header">
          <h4>Print Menu Card</h4>
          <button className="slp__modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="pmc-body">
          {/* ── Left: template + service picker ── */}
          <div className="pmc-left">
            <div className="pmc-block">
              <div className="pmc-block__title">Choose a template</div>
              <TemplateDropdown templateId={templateId} onSelect={setTemplateId} />
            </div>

            <div className="pmc-block">
              <div className="pmc-block__title">Text size</div>
              <div className="pmc-textsize">
                {TEXT_SIZE_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className={`pmc-textsize__btn${fontScale === o.scale ? " pmc-textsize__btn--active" : ""}`}
                    onClick={() => setFontScale(o.scale)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pmc-block pmc-block--grow">
              <div className="pmc-block__title-row">
                <span className="pmc-block__title">
                  Choose services ({selectedIds.size} of {allServices.length})
                </span>
                <div className="pmc-block__actions">
                  <button type="button" className="pmc-link-btn" onClick={selectAll}>Select all</button>
                  <button type="button" className="pmc-link-btn" onClick={clearAll}>Clear</button>
                </div>
              </div>

              <div className="pmc-search">
                <Search size={14} />
                <input
                  placeholder="Search services…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="pmc-picker">
                {loading ? (
                  <p className="text-muted small mb-0">Loading services…</p>
                ) : pickerGroups.length === 0 ? (
                  <p className="text-muted small mb-0">No services match your search.</p>
                ) : (
                  pickerGroups.map((g) => {
                    const checkedCount = g.services.filter((s) => selectedIds.has(s.id)).length;
                    const allChecked = checkedCount === g.services.length;
                    const someChecked = checkedCount > 0 && !allChecked;
                    return (
                      <div key={g.category} className="pmc-cat-group">
                        <label className="pmc-cat-group__header">
                          <input
                            type="checkbox"
                            checked={allChecked}
                            ref={(el) => { if (el) el.indeterminate = someChecked; }}
                            onChange={(e) => toggleCategory(g.category, e.target.checked)}
                          />
                          <span>{g.category}</span>
                          <span className="pmc-count">{checkedCount}/{g.services.length}</span>
                        </label>
                        {g.services.map((s) => (
                          <label key={s.id} className="pmc-svc-row">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(s.id)}
                              onChange={() => toggleService(s.id)}
                            />
                            <span className="pmc-svc-name">{s.name}</span>
                            <span className="pmc-svc-price">{formatServicePrice(s, formatAmount)}</span>
                          </label>
                        ))}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ── Right: live preview, WYSIWYG with the print window ── */}
          <div className="pmc-right">
            <div className="pmc-preview-label">Preview — {MENU_CARD_TEMPLATES.find((t) => t.id === templateId)?.label}</div>

            {pageCount > 1 && (
              <div className="pmc-info">
                <InfoCircle size={14} />
                This menu spans {pageCount} pages — page breaks are added automatically when printing.
              </div>
            )}

            <div className="pmc-preview-frame">
              {selectedServices.length === 0 ? (
                <div className="pmc-preview-empty">Select at least one service to see a preview.</div>
              ) : (
                <div className="pmc-preview-scale" style={{ height: contentHeightPx * PREVIEW_SCALE }}>
                  {/* Keyed on the document itself so a fresh `srcDoc` always
                      forces a full reload (and thus a fresh onLoad) rather
                      than relying on browsers to refire onLoad for an
                      in-place srcDoc change on the same iframe element. */}
                  <iframe
                    key={previewHtml}
                    ref={iframeRef}
                    title="Menu card preview"
                    srcDoc={previewHtml}
                    style={{ height: contentHeightPx }}
                    onLoad={measurePreview}
                  />
                  {Array.from({ length: pageCount - 1 }, (_, i) => (
                    <div
                      key={i}
                      className="pmc-page-break-line"
                      style={{ top: (i + 1) * A4_HEIGHT_PX * PREVIEW_SCALE }}
                    >
                      <span>Page {i + 2}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="slp__modal-footer" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <span className="pmc-footer-hint">
            {selectedServices.length === 0
              ? "Select at least one service."
              : `${selectedServices.length} service${selectedServices.length === 1 ? "" : "s"} across ${pageCount} page${pageCount === 1 ? "" : "s"}.`}
          </span>
          <div className="pmc-footer-actions">
            <button className="slp__btn slp__btn--ghost" onClick={onClose}>Cancel</button>
            <button
              className="slp__btn slp__btn--dark"
              disabled={!canPrint}
              onClick={handlePrint}
            >
              <Printer size={14} /> Print Menu Card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintMenuCardModal;
