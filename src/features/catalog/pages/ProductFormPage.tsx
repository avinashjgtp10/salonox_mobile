import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Trash } from "react-bootstrap-icons";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../store/store";
import { fetchBrandsThunk, fetchCategoriesThunk, createProductThunk, updateProductThunk, createBrandThunk, createCategoryThunk } from "../../../middleware/catalog/products.thunk";
import { fetchSuppliersThunk, createSupplierThunk } from "../../../middleware/inventory/inventory.thunk";
import { fetchServicesThunk } from "../../../middleware/services/services.thunk";
import api from "../../../services/api/axios";
import { PRODUCTS } from "../../../services/api/endpoints/products.endpoints";
import { toTitleCase } from "../../../utils/titleCase";
import { SERVICES } from "../../../services/api/endpoints/services.endpoints";
import { INVENTORY } from "../../../services/api/endpoints/inventory.endpoints";
import { PRODUCT_UNITS, TAX_TYPE_OPTIONS, type ProductType, type ProductUnit, type TaxType } from "../types/product.types";
import { getCompatibleUnits, FAMILY_HINT, getUnitFamily } from "../utils/unitFamilies";
import type { ConsumableDetail } from "../../../types/inventory.types";
// Shared with ServiceFormPage — see components/form/. Both catalog forms must
// stay visually and behaviourally identical, so they use one control, not two.
import SearchSelect from "../components/form/SearchSelect";
import QuickAdd from "../components/form/QuickAdd";
import { DatePicker } from "../../../components/ui";
import Dropdown from "../../../components/ui/Dropdown";
import "../styles/ConsumableFormPage.scss";

interface AssignedServiceDraft {
  service_id: string;
  name: string;
  qty: string;
  unit: string;
}

interface UnitConversionDraft {
  unit_name: string;
  conversion_to_base: string;
}

const MIN_SEARCH_LENGTH = 2;
const MAX_NAME_LENGTH = 100;

const PRODUCT_TYPE_OPTIONS: { value: ProductType; label: string }[] = [
  { value: "retail", label: "Retail" },
  { value: "consumable", label: "Consumable" },
  { value: "both", label: "Both (also sold retail)" },
];

const ProductFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { categories: rawCategories, brands } = useSelector((s: RootState) => s.products);
  // service_categories is one shared table — only a category explicitly
  // tagged 'service' is excluded here, so 'product'/'both'/untagged (legacy
  // cache) entries still appear.
  const categories = useMemo(
    () => (rawCategories as any[]).filter((c: any) => c?.type !== "service"),
    [rawCategories],
  );
  const suppliers = useSelector((s: RootState) => s.inventory.suppliers);

  // Same form is mounted at two route groups (Catalog > Products, and
  // Catalog > Consumable Inventory) — where the user entered from decides
  // both the default Product Type and where Save/Close return to.
  const fromConsumables = location.pathname.includes("/inventory/consumables");
  const listPath = fromConsumables ? "/dashboard/catalog/inventory/consumables" : "/dashboard/catalog/products";

  // ── Basic info ──────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [description, setDescription] = useState("");
  const [remark, setRemark] = useState("");

  // ── Inventory setup ─────────────────────────────────────────────────────
  const [productQty, setProductQty] = useState("");
  const [unitSize, setUnitSize] = useState("");
  const [unit, setUnit] = useState<ProductUnit>(fromConsumables ? "ml" : "pcs");
  const [qtyAlert, setQtyAlert] = useState("");
  const [lotNumber, setLotNumber] = useState("");

  const [productType, setProductType] = useState<ProductType>(fromConsumables ? "consumable" : "retail");
  const isConsumable = productType === "consumable" || productType === "both";
  const sellsRetail = productType === "retail" || productType === "both";

  // ── Unit conversion (consumable/both only) ──────────────────────────────
  // Named units (e.g. "Bottle" = 1000 ml) staff can log usage in, alongside
  // the base unit — display/entry only, inventory itself always stays in
  // the base unit. Saved to product_unit_conversions after the product
  // itself is created/updated (needs a real product id).
  const [unitConversions, setUnitConversions] = useState<UnitConversionDraft[]>([]);

  // ── Service assignment (consumable/both only) ───────────────────────────
  const [assignedServices, setAssignedServices] = useState<AssignedServiceDraft[]>([]);
  const [originalAssignedIds, setOriginalAssignedIds] = useState<Set<string>>(new Set());
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceResults, setServiceResults] = useState<{ id: string; name: string }[]>([]);
  const [showServiceDrop, setShowServiceDrop] = useState(false);
  const serviceDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Supply info ──────────────────────────────────────────────────────────
  const [supplyPrice, setSupplyPrice] = useState("");
  const [taxType, setTaxType] = useState<TaxType>("no_tax");
  const [customTaxRate, setCustomTaxRate] = useState("");
  const [taxGroup, setTaxGroup] = useState("");
  const [hsnSac, setHsnSac] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  // "YYYY-MM-DD", or "" when not set — same internal format DatePicker uses
  // everywhere else; only its displayed label is dd-mm-yyyy (see below).
  const [expiryDate, setExpiryDate] = useState("");

  // ── Usage stats, for the live preview (edit mode only — a new product has no history yet) ──
  const [usageStats, setUsageStats] = useState<ConsumableDetail["usage_stats"] | null>(null);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Refs for scroll-to-first-error-on-submit — one per field that has inline
  // validation, in the same top-to-bottom order they appear on the page.
  const nameRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const unitSizeRef = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLInputElement>(null);
  const expiryDateRef = useRef<HTMLDivElement>(null);
  const retailPriceRef = useRef<HTMLInputElement>(null);
  // Submit-only validation: no error shows just from focusing/blurring a
  // field (blur-triggered validation fires when focus moves to ANOTHER
  // field, e.g. an autofocused Product Name, surfacing its error before the
  // user had even reached it). Errors only appear after a Save attempt;
  // once that's happened, they clear live as each field becomes valid.
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    dispatch(fetchCategoriesThunk());
    dispatch(fetchBrandsThunk());
    dispatch(fetchSuppliersThunk());
  }, [dispatch]);

  useEffect(() => {
    if (!isEdit || !id) return;
    (async () => {
      try {
        const productRes = await api.get(PRODUCTS.BY_ID(id));
        const p = productRes.data?.data;
        const consumableType = p.product_type === "consumable" || p.product_type === "both";
        const detail: ConsumableDetail | null = consumableType
          ? (await api.get(`/api/v1/inventory/consumables/${id}`)).data?.data
          : null;
        setName(p.name || "");
        setBarcode(p.barcode || "");
        setCategoryId(p.category_id || "");
        setBrandId(p.brand_id || "");
        setSupplierId(p.supplier_id || "");
        setDescription(p.description || "");
        setRemark(p.remark || "");
        setUnit((p.measure_unit || "ml") as ProductUnit);
        setUnitSize(p.bottle_size != null ? String(p.bottle_size) : "");
        setProductQty(
          detail ? (p.bottle_size ? String(detail.product_qty) : String(p.amount ?? "")) : String(p.amount ?? "")
        );
        setQtyAlert(p.qty_alert != null ? String(p.qty_alert) : "");
        setLotNumber(p.lot_number || "");
        setProductType((p.product_type as ProductType) || "retail");
        setSupplyPrice(p.supply_price != null ? String(p.supply_price) : "");
        setTaxType((p.tax_type || "no_tax") as TaxType);
        setCustomTaxRate(p.custom_tax_rate != null ? String(p.custom_tax_rate) : "");
        setTaxGroup(p.tax_group || "");
        setHsnSac(p.hsn_sac || "");
        setRetailPrice(p.retail_price != null ? String(p.retail_price) : "");
        setExpiryDate(p.expiry_date ? String(p.expiry_date).slice(0, 10) : "");
        setIsPublic(p.is_public !== undefined ? !!p.is_public : true);
        if (detail) {
          setUsageStats(detail.usage_stats);
          const drafts = detail.assigned_services.map((s) => ({ service_id: s.service_id, name: s.name, qty: String(s.qty), unit: s.unit || "" }));
          setAssignedServices(drafts);
          setOriginalAssignedIds(new Set(drafts.map((d) => d.service_id)));
          setUnitConversions(detail.unit_conversions.map((c) => ({ unit_name: c.unit_name, conversion_to_base: String(c.conversion_to_base) })));
        }
      } catch {
        setError("Failed to load this product — try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, id]);

  // ── Service search ──────────────────────────────────────────────────────
  function handleServiceSearch(term: string) {
    setServiceSearch(term);
    setShowServiceDrop(true);
    if (serviceDebounceRef.current) clearTimeout(serviceDebounceRef.current);
    if (term.trim().length < MIN_SEARCH_LENGTH) { setServiceResults([]); return; }
    serviceDebounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(SERVICES.LIST(`search=${encodeURIComponent(term.trim())}&is_active=true&limit=20`));
        const raw = res.data?.data?.data ?? res.data?.data ?? [];
        setServiceResults(Array.isArray(raw) ? raw.map((s: any) => ({ id: String(s.id), name: s.name })) : []);
      } catch {
        setServiceResults([]);
      }
    }, 300);
  }

  function assignService(service: { id: string; name: string }) {
    if (assignedServices.some((a) => a.service_id === service.id)) { setServiceSearch(""); setShowServiceDrop(false); return; }
    setAssignedServices((prev) => [...prev, { service_id: service.id, name: service.name, qty: unitSize || "1", unit }]);
    setServiceSearch("");
    setShowServiceDrop(false);
  }

  async function handleAddCategory(name: string) {
    const result = await dispatch(createCategoryThunk({ name, type: "product" })).unwrap();
    if (result?.id) setCategoryId(result.id);
  }

  async function handleAddBrand(name: string) {
    const result = await dispatch(createBrandThunk({ name })).unwrap();
    if (result?.id) setBrandId(result.id);
  }

  async function handleAddSupplier(name: string) {
    const result = await dispatch(createSupplierThunk({ name })).unwrap();
    if (result?.id) setSupplierId(result.id);
  }

  // Switching Base Unit to a different measurement family (e.g. ml → gm)
  // invalidates any already-added conversion rows from the old family
  // (Bottle/Tube/Sachet are volume-only) — drop them rather than silently
  // saving a now-cross-family row the backend would reject anyway.
  useEffect(() => {
    setUnitConversions((prev) => prev.filter((row) =>
      getCompatibleUnits(unit).some((cu) => cu.name.toLowerCase() === row.unit_name.toLowerCase())
    ));
  }, [unit]);

  // Only units compatible with the product's own Base Unit family (Volume:
  // ml/L, Weight: gm/kg, Count: pcs) are ever offered — the same restriction
  // the backend enforces (unit-families.ts), so nothing entered here can
  // fail validation on save.
  const compatibleUnits = getCompatibleUnits(unit);
  const availableCompatibleUnits = compatibleUnits.filter(
    (cu) => !unitConversions.some((row) => row.unit_name.toLowerCase() === cu.name.toLowerCase())
  );

  function addUnitConversionRow() {
    const next = availableCompatibleUnits[0];
    if (!next) return; // every compatible unit for this base already added
    setUnitConversions((prev) => [
      ...prev,
      { unit_name: next.name, conversion_to_base: next.fixedRatio !== undefined ? String(next.fixedRatio) : "" },
    ]);
  }

  function updateUnitConversionRow(index: number, field: keyof UnitConversionDraft, value: string) {
    setUnitConversions((prev) => prev.map((row, i) => {
      if (i !== index) return row;
      if (field === "unit_name") {
        // Switching the dropdown to a system-fixed unit (L, kg) locks the
        // ratio to its real value instead of whatever was typed for the
        // previously-selected row.
        const picked = compatibleUnits.find((cu) => cu.name === value);
        return { unit_name: value, conversion_to_base: picked?.fixedRatio !== undefined ? String(picked.fixedRatio) : "" };
      }
      return { ...row, [field]: value };
    }));
  }

  function removeUnitConversionRow(index: number) {
    setUnitConversions((prev) => prev.filter((_, i) => i !== index));
  }

  async function syncUnitConversions(productId: string) {
    // Blank rows (left over from clicking "+ Add" without filling it in) are
    // silently dropped rather than blocked as a validation error — this
    // section is optional, so an incomplete row shouldn't hold up saving
    // the rest of the product.
    const valid = unitConversions
      .map((c) => ({ unit_name: c.unit_name.trim(), conversion_to_base: parseFloat(c.conversion_to_base) }))
      .filter((c) => c.unit_name && Number.isFinite(c.conversion_to_base) && c.conversion_to_base > 0);
    await api.put(INVENTORY.CONSUMABLE_UNIT_CONVERSIONS(productId), { unit_conversions: valid });
  }

  function removeAssignedService(serviceId: string) {
    setAssignedServices((prev) => prev.filter((a) => a.service_id !== serviceId));
  }

  function updateAssignedServiceQty(serviceId: string, qty: string) {
    setAssignedServices((prev) => prev.map((a) => (a.service_id === serviceId ? { ...a, qty } : a)));
  }

  // ── Live preview calc ────────────────────────────────────────────────────
  const qtyNum = parseFloat(productQty) || 0;
  const sizeNum = parseFloat(unitSize) || 0;
  // Retail-only products track plain stock count — no bottle-size multiplier.
  const totalAvailable = isConsumable && sizeNum > 0 ? qtyNum * sizeNum : qtyNum;
  const alertNum = parseFloat(qtyAlert) || 0;
  const previewStatus = qtyNum <= 0 ? "out_of_stock" : (alertNum > 0 && qtyNum <= alertNum ? "low" : "healthy");
  const avgUsage = usageStats?.average_per_service ?? 0;
  const estimatedServices = avgUsage > 0 ? Math.floor(totalAvailable / avgUsage) : null;

  const nameError = submitAttempted && !name.trim()
    ? "Product name is required"
    : name.length > MAX_NAME_LENGTH
      ? `Product name must be ${MAX_NAME_LENGTH} characters or fewer`
      : "";
  const categoryError = submitAttempted && !categoryId ? "Category is required" : "";
  const qtyError = submitAttempted && (!productQty || qtyNum < 0) ? "Product quantity is required" : "";
  const unitSizeError = submitAttempted && isConsumable && !unitSize ? "Unit size is required" : "";
  const retailPriceError = submitAttempted && sellsRetail && (!retailPrice || parseFloat(retailPrice) <= 0)
    ? "Retail price is required" : "";
  // Both figures are package counts here (Product Quantity is in bottles for a
  // consumable, and the alert is labelled "in bottles/units"), so they compare
  // directly. The backend enforces the same rule — surfacing it inline just
  // saves a round-trip that previously only rejected retail products anyway,
  // since its own check compared bottles against base units.
  const alertError = submitAttempted && qtyAlert.trim() !== "" && qtyNum > 0 && alertNum >= qtyNum
    ? "Low Stock Alert must be less than the Product Quantity" : "";
  // Only enforced when adding a fresh product — an already-expired product
  // being edited (e.g. old stock entered late) must still be saveable, so
  // this doesn't retroactively block edits to a date that was fine when set.
  const todayIso = new Date().toISOString().slice(0, 10);
  const isExpiryInPast = !!expiryDate && expiryDate < todayIso;
  const expiryDateError = submitAttempted && !isEdit && isExpiryInPast
    ? "Expiry date cannot be in the past" : "";
  const isValid = !!name.trim() && name.length <= MAX_NAME_LENGTH && !!categoryId && !!productQty && qtyNum >= 0
    && (!isConsumable || !!unitSize) && (!sellsRetail || (!!retailPrice && parseFloat(retailPrice) > 0))
    && !(qtyAlert.trim() !== "" && qtyNum > 0 && alertNum >= qtyNum)
    && !(!isEdit && isExpiryInPast);

  async function syncServiceAssignments(productId: string) {
    const currentIds = new Set(assignedServices.map((a) => a.service_id));
    const removed = [...originalAssignedIds].filter((sid) => !currentIds.has(sid));

    const upsertOne = async (serviceId: string, qty: number, itemUnit: string) => {
      const res = await api.get(SERVICES.BY_ID(serviceId));
      const svc = res.data?.data;
      const recipe = (svc?.consumables_used ?? []).filter((c: any) => c.product_id !== productId);
      await api.patch(SERVICES.BY_ID(serviceId), { consumables_used: [...recipe, { product_id: productId, qty, unit: itemUnit }] });
    };
    const removeOne = async (serviceId: string) => {
      const res = await api.get(SERVICES.BY_ID(serviceId));
      const svc = res.data?.data;
      const recipe = (svc?.consumables_used ?? []).filter((c: any) => c.product_id !== productId);
      await api.patch(SERVICES.BY_ID(serviceId), { consumables_used: recipe });
    };

    for (const a of assignedServices) {
      await upsertOne(a.service_id, parseFloat(a.qty) || 0, a.unit || unit);
    }
    for (const serviceId of removed) {
      await removeOne(serviceId);
    }
  }

  // On a failed submit, jump the user straight to the first invalid field
  // instead of leaving them to hunt through the page for the inline error —
  // same top-to-bottom order the fields appear in and errors are computed in.
  function focusFirstError() {
    const firstInvalid =
      (nameError && nameRef.current) ||
      (categoryError && categoryRef.current) ||
      (qtyError && qtyRef.current) ||
      (unitSizeError && unitSizeRef.current) ||
      (alertError && alertRef.current) ||
      (expiryDateError && expiryDateRef.current) ||
      (retailPriceError && retailPriceRef.current) ||
      null;
    if (!firstInvalid) return;
    firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
    if ("focus" in firstInvalid && typeof firstInvalid.focus === "function") {
      firstInvalid.focus({ preventScroll: true });
    }
  }

  async function handleSubmit() {
    setSubmitAttempted(true);
    if (!isValid) {
      // Errors above are computed from the current `submitAttempted`, which
      // is still stale in this render (setState hasn't flushed yet) — wait a
      // tick so nameError/categoryError/etc. reflect submitAttempted=true
      // before deciding which field to jump to.
      setTimeout(focusFirstError, 0);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, any> = {
        name: toTitleCase(name.trim()),
        barcode: barcode.trim() || undefined,
        category_id: categoryId,
        brand_id: brandId || undefined,
        supplier_id: supplierId || undefined,
        description: description.trim() || undefined,
        remark: remark.trim() || undefined,
        measure_unit: unit,
        product_type: productType,
        amount: totalAvailable,
        bottle_size: isConsumable && sizeNum > 0 ? sizeNum : null,
        qty_alert: isConsumable ? (alertNum > 0 ? alertNum : undefined) : Math.round(alertNum),
        lot_number: lotNumber.trim() || undefined,
        supply_price: parseFloat(supplyPrice) || 0,
        tax_type: taxType,
        custom_tax_rate: taxType === "custom" ? parseFloat(customTaxRate) || 0 : undefined,
        tax_group: taxGroup.trim() || undefined,
        hsn_sac: hsnSac.trim() || undefined,
        retail_sales_enabled: sellsRetail,
        retail_price: sellsRetail ? (parseFloat(retailPrice) || 0) : undefined,
        expiry_date: expiryDate || null,
        is_public: isPublic,
      };

      let productId = id;
      if (isEdit && id) {
        await dispatch(updateProductThunk({ id, data: payload })).unwrap();
      } else {
        const created = await dispatch(createProductThunk(payload)).unwrap();
        productId = created.id;
      }

      if (isConsumable && productId) {
        await syncServiceAssignments(productId);
        await syncUnitConversions(productId);
        // syncServiceAssignments PATCHes consumables_used straight onto the
        // affected SERVICES over raw axios, so the services slice — which
        // scheduler.servicesList (and therefore Quick Sale / the Appointment
        // modal) is derived from — still holds the pre-edit recipes. Refresh
        // it here so every consumer sees the new assignment without having to
        // revisit a page that happens to refetch services. Deliberately not
        // .unwrap()'d: a failed refresh must not surface as "Failed to save"
        // when the save itself already succeeded.
        await dispatch(fetchServicesThunk({ limit: 200, isActive: true }));
      }

      navigate(listPath);
    } catch (err: any) {
      setError(typeof err === "string" ? err : "Failed to save — try again");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="cf-page cf-page--loading">Loading…</div>;

  return (
    <div className="cf-page">
      <div className="cf-topbar">
        <h1>{isEdit ? "Edit Product" : "Add Product"}</h1>
        <div className="cf-topbar-actions">
          <button className="cf-close" onClick={() => navigate(listPath)}>Close</button>
          <button className="cf-save-btn" disabled={saving} onClick={handleSubmit}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error && <div className="cf-error-banner">{error}</div>}

      <div className="cf-body">
        {/* 1. Basic Information */}
        <section className="cf-card">
          <h3>Basic Information</h3>
          <div className="cf-field">
            <label>Product Name *</label>
            <input
              ref={nameRef}
              value={name}
              maxLength={MAX_NAME_LENGTH}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="cf-field__footer">
              {nameError && <span className="cf-field__error">{nameError}</span>}
              <span className={`cf-char-count${name.length >= MAX_NAME_LENGTH ? " cf-char-count--max" : ""}`}>
                {name.length}/{MAX_NAME_LENGTH}
              </span>
            </div>
          </div>
          <div className="cf-field">
            <label>Barcode (Optional)</label>
            <input value={barcode} onChange={(e) => setBarcode(e.target.value)} />
          </div>
          <div className="cf-row">
            <div className="cf-field" ref={categoryRef}>
              <label>Category *</label>
              <SearchSelect
                value={categoryId}
                options={categories.map((c: any) => ({ id: c.id, name: c.name }))}
                placeholder="Search category…"
                onChange={setCategoryId}
              />
              {categoryError && <span className="cf-field__error">{categoryError}</span>}
              <QuickAdd label="Add a category" onAdd={handleAddCategory} />
            </div>
            <div className="cf-field">
              <label>Brand</label>
              <SearchSelect
                value={brandId}
                options={brands.map((b: any) => ({ id: b.id, name: b.name }))}
                placeholder="Search brand…"
                onChange={setBrandId}
                allowNone
              />
              <QuickAdd label="Add a brand" onAdd={handleAddBrand} />
            </div>
          </div>
          <div className="cf-field">
            <label>Supplier</label>
            <SearchSelect
              value={supplierId}
              options={suppliers.map((s: any) => ({ id: s.id, name: s.name }))}
              placeholder="Search supplier…"
              onChange={setSupplierId}
              allowNone
            />
            <QuickAdd label="Add a supplier" onAdd={handleAddSupplier} />
          </div>
          <div className="cf-field">
            <label>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="cf-field">
            <label>Remark</label>
            <textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} />
          </div>
          <div className="cf-field">
            <label>Product Type</label>
            <div className="cf-pill-toggle">
              {PRODUCT_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={productType === opt.value ? "active" : ""}
                  onClick={() => {
                    setProductType(opt.value);
                    // Retail-only products are a plain unit count — no
                    // ml/g/kg measurement, so drop the unit selector and
                    // just track them as "pcs" behind the scenes.
                    if (opt.value === "retail") setUnit("pcs");
                    else if (unit === "pcs") setUnit("ml");
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 2. Inventory Setup */}
        <section className="cf-card cf-card--highlight">
          <h3>Inventory Setup</h3>
          {isConsumable ? (
            <>
              <div className="cf-row">
                <div className="cf-field">
                  <label>Product Quantity *</label>
                  <input ref={qtyRef} type="number" min={0} value={productQty} onChange={(e) => setProductQty(e.target.value)} />
                  {qtyError && <span className="cf-field__error">{qtyError}</span>}
                </div>
                <div className="cf-field">
                  <label>Unit Size *</label>
                  <input ref={unitSizeRef} type="number" min={0} value={unitSize} onChange={(e) => setUnitSize(e.target.value)} placeholder="e.g. 1000" />
                  {unitSizeError && <span className="cf-field__error">{unitSizeError}</span>}
                </div>
                <div className="cf-field">
                  <label>Unit</label>
                  <Dropdown
                    searchable={false}
                    value={unit}
                    options={PRODUCT_UNITS.map((u) => ({ id: u, name: u }))}
                    onChange={(id) => setUnit(id as ProductUnit)}
                  />
                </div>
              </div>
              <div className="cf-total-display">
                Total Available Stock: <strong>{qtyNum || 0} × {sizeNum || 0} {unit} = {totalAvailable.toLocaleString()} {unit}</strong>
              </div>
              <div className="cf-field">
                <label>Low Stock Alert (in bottles/units)</label>
                <input ref={alertRef} type="number" min={0} value={qtyAlert} onChange={(e) => setQtyAlert(e.target.value)} />
                {alertError && <span className="cf-field__error">{alertError}</span>}
              </div>
              <div className="cf-field">
                <label>Lot Number</label>
                <input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} />
              </div>
            </>
          ) : (
            <>
              <div className="cf-field">
                <label>Stock Quantity *</label>
                <input ref={qtyRef} type="number" min={0} step={1} value={productQty} onChange={(e) => setProductQty(e.target.value)} />
                {qtyError && <span className="cf-field__error">{qtyError}</span>}
              </div>
              <div className="cf-field">
                <label>Low Stock Alert</label>
                <input ref={alertRef} type="number" min={0} step={1} value={qtyAlert} onChange={(e) => setQtyAlert(e.target.value)} />
                {alertError && <span className="cf-field__error">{alertError}</span>}
              </div>
              <div className="cf-field">
                <label>Lot Number</label>
                <input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} />
              </div>
            </>
          )}
        </section>

        {/* Unit Conversion — consumable/both only */}
        {isConsumable && (
          <section className="cf-card">
            <h3>Unit Conversion</h3>
            <p className="cf-hint">
              Display units staff can log usage in (e.g. Bottle, Sachet) — inventory itself always stays in the
              base unit ({unit}) above. Only units in the same measurement family as the base unit are allowed
              ({FAMILY_HINT[getUnitFamily(unit)]}).
            </p>
            {unitConversions.length > 0 && (
              <div className="cf-assigned-list">
                {unitConversions.map((row, i) => {
                  const picked = compatibleUnits.find((cu) => cu.name === row.unit_name);
                  const isFixed = picked?.fixedRatio !== undefined;
                  // The currently-selected unit must stay in its own dropdown's
                  // options even though it's "already used" (excluded from
                  // availableCompatibleUnits), or picking it would make it vanish.
                  const rowOptions = picked ? [picked, ...availableCompatibleUnits] : availableCompatibleUnits;
                  return (
                    <div key={i} className="cf-assigned-row">
                      <Dropdown
                        className="cf-assigned-row__name"
                        searchable={false}
                        value={row.unit_name}
                        options={rowOptions.map((cu) => ({ id: cu.name, name: cu.name }))}
                        onChange={(id) => updateUnitConversionRow(i, "unit_name", id)}
                      />
                      <span>1 {row.unit_name || "unit"} =</span>
                      <input
                        type="number" min={0} className="cf-assigned-row__qty"
                        placeholder="0"
                        value={row.conversion_to_base}
                        disabled={isFixed}
                        title={isFixed ? "Fixed system conversion — not editable" : undefined}
                        onChange={(e) => updateUnitConversionRow(i, "conversion_to_base", e.target.value)}
                      />
                      <span className="cf-assigned-row__unit">{unit}</span>
                      <button type="button" onClick={() => removeUnitConversionRow(i)}><Trash size={13} /></button>
                    </div>
                  );
                })}
              </div>
            )}
            {availableCompatibleUnits.length > 0 ? (
              <button type="button" className="cf-quick-add-link" onClick={addUnitConversionRow}>+ Add a unit</button>
            ) : (
              <p className="cf-hint" style={{ margin: 0 }}>All compatible units for {unit} have been added.</p>
            )}
          </section>
        )}

        {/* 3. Service Assignment — consumable/both only */}
        {isConsumable && (
          <section className="cf-card">
            <h3>Service Assignment</h3>
            <p className="cf-hint">Assign this product to the services that consume it, with how much each one uses.</p>
            <div className="cf-service-search">
              <input
                placeholder="Search a service to assign…"
                value={serviceSearch}
                onChange={(e) => handleServiceSearch(e.target.value)}
                onFocus={() => setShowServiceDrop(true)}
                onBlur={() => setTimeout(() => setShowServiceDrop(false), 180)}
              />
              {showServiceDrop && serviceResults.length > 0 && (
                <div className="cf-service-drop">
                  {serviceResults.map((s) => (
                    <div key={s.id} className="cf-service-drop__item" onMouseDown={() => assignService(s)}>{s.name}</div>
                  ))}
                </div>
              )}
            </div>
            {assignedServices.length > 0 && (
              <div className="cf-assigned-list">
                {assignedServices.map((a) => (
                  <div key={a.service_id} className="cf-assigned-row">
                    <span className="cf-assigned-row__name">{a.name}</span>
                    <input
                      type="number" min={0} className="cf-assigned-row__qty"
                      value={a.qty}
                      onChange={(e) => updateAssignedServiceQty(a.service_id, e.target.value)}
                    />
                    <span className="cf-assigned-row__unit">{unit}</span>
                    <button type="button" onClick={() => removeAssignedService(a.service_id)}><Trash size={13} /></button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 4. Supply Information */}
        <section className="cf-card">
          <h3>Supply Information</h3>
          <div className="cf-row">
            <div className="cf-field">
              <label>Supply Price</label>
              <input type="number" min={0} value={supplyPrice} onChange={(e) => setSupplyPrice(e.target.value)} />
            </div>
            <div className="cf-field">
              <label>Tax Type</label>
              <Dropdown
                searchable={false}
                value={taxType}
                options={TAX_TYPE_OPTIONS.map((t) => ({ id: t.value, name: t.label }))}
                onChange={(id) => setTaxType(id as TaxType)}
              />
            </div>
          </div>
          {taxType === "custom" && (
            <div className="cf-field">
              <label>Custom Tax Rate (%)</label>
              <input type="number" min={0} value={customTaxRate} onChange={(e) => setCustomTaxRate(e.target.value)} />
            </div>
          )}
          <div className="cf-field">
            <label>Tax Group</label>
            <input value={taxGroup} onChange={(e) => setTaxGroup(e.target.value)} />
          </div>
          <div className="cf-field">
            <label>HSN/SAC</label>
            <input value={hsnSac} onChange={(e) => setHsnSac(e.target.value)} />
          </div>
          <div className="cf-field" ref={expiryDateRef}>
            <label>Expiry Date</label>
            <DatePicker
              value={expiryDate}
              onChange={setExpiryDate}
              placeholder="dd-mm-yyyy"
              separator="-"
              min={isEdit ? undefined : todayIso}
            />
            {expiryDateError && <span className="cf-field__error">{expiryDateError}</span>}
          </div>
          {sellsRetail && (
            <div className="cf-field">
              <label>Retail Price *</label>
              <input ref={retailPriceRef} type="number" min={0} value={retailPrice} onChange={(e) => setRetailPrice(e.target.value)} />
              {retailPriceError && <span className="cf-field__error">{retailPriceError}</span>}
            </div>
          )}
        </section>

        {/* Visibility */}
        <section className="cf-card">
          <h3>Visibility</h3>
          <div className="cf-field">
            <label className="cf-check">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              <span>Is Public</span>
            </label>
          </div>
        </section>

        {/* 5. Inventory Preview */}
        <section className="cf-card">
          <h3>Inventory Preview</h3>
          {/* Stock = package/bottle count (1, 2, 3…); Total Unit = that count
              converted into the base unit's volume/weight (1000 ml, 1 L,
              200 gm…) — two different things, kept on separate rows rather
              than folded into one "Available Stock" figure. */}
          <div className="cf-preview-row"><span>Stock</span><span>{qtyNum.toLocaleString()}</span></div>
          {isConsumable && sizeNum > 0 && (
            <div className="cf-preview-row"><span>Total Unit</span><span>{totalAvailable.toLocaleString()} {unit}</span></div>
          )}
          {isConsumable && (
            <>
              <div className="cf-preview-row">
                <span>Average Service Usage</span>
                <span>{usageStats ? `${avgUsage.toLocaleString()} ${unit}` : "No usage data yet"}</span>
              </div>
              <div className="cf-preview-row"><span>Estimated Services</span><span>{estimatedServices ?? "—"}</span></div>
            </>
          )}
          <div className="cf-preview-row">
            <span>Status</span>
            <span className={`cf-status cf-status--${previewStatus}`}>
              {previewStatus === "healthy" ? "Healthy" : previewStatus === "low" ? "Low Stock" : "Out of Stock"}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProductFormPage;
