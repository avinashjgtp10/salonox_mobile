import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { X } from "react-bootstrap-icons";
import {
  useGetPackageByIdQuery,
  useUpdatePackageMutation,
} from "../../../services/api/endpoints/packages.endpoints";
import type { UpdatePackageDTO } from "../../../services/api/endpoints/packages.endpoints";
import { useServices } from "../hooks/useServices";
import type { Service as ApiService } from "../types/catalog.types";
import { useCurrency } from "../../../hooks/useCurrency";

type Service = ApiService;

interface Offer {
  id: number;
  name: string;
  couponCode: string;
  discount: number;
  type: "Percent (%)" | "Fixed (₹)";
  startDate: string;
  endDate: string;
  minOrder: number;
  active: boolean;
}

const CATEGORIES = ["Spa", "Hair", "Skin", "Nails", "Body"];

const slugify = (v: string) =>
  v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const EditPackagePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currencySymbol, formatAmount } = useCurrency();

  const { data: pkg, isLoading, isError } = useGetPackageByIdQuery(id!, { skip: !id });
  const [updatePackage] = useUpdatePackageMutation();

  // ── All state declarations first ─────────────────────────────────────────
  const [step, setStep]               = useState(1);
  const [pkgName, setPkgName]         = useState("");
  const [slug, setSlug]               = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice]     = useState("0");
  const [discountValue, setDV]        = useState("0");
  const [discountType, setDT]         = useState("Fixed (₹)");
  const [duration, setDuration]       = useState("90");
  const [category, setCategory]       = useState("");
  const [colour, setColour]           = useState("#10b981");
  const [status, setStatus]           = useState<"Active" | "Draft" | "Inactive">("Active");
  const [serviceFilter, setSF]        = useState("All");
  const [selectedServices, setSelSvcs] = useState<Service[]>([]);
  const [offers, setOffers]           = useState<Offer[]>([]);
  const [saving, setSaving]           = useState(false);
  const [initialized, setInitialized] = useState(false);

  // ── Real services from API ──────────────────────────────────────────────
  const { services, fetchServices } = useServices();

  useEffect(() => {
    fetchServices({ limit: 1000 });
  }, [fetchServices]);

  const serviceCategories = useMemo(() => {
    const cats = new Set<string>();
    services.forEach((s) => { if (s.category_name) cats.add(s.category_name); });
    return ["All", ...Array.from(cats)];
  }, [services]);

  const visibleSvcs = useMemo(() =>
    serviceFilter === "All"
      ? services
      : services.filter((s) => s.category_name === serviceFilter),
  [services, serviceFilter]);

  const estDuration = useMemo(() =>
    selectedServices.reduce((sum, s) => sum + (Number(s.duration) || 0), 0),
  [selectedServices]);

  // Pre-fill form fields once package data is available (runs once)
  useEffect(() => {
    if (pkg && !initialized) {
      setPkgName(pkg.name ?? "");
      setSlug(pkg.slug ?? "");
      setDescription(pkg.description ?? "");
      setBasePrice(String(pkg.basePrice ?? 0));
      setDV(String(pkg.discountValue ?? 0));
      setDT(pkg.discountType === "percentage" ? "Percent (%)" : "Fixed (₹)");
      setDuration(String(pkg.durationMinutes ?? 90));
      setCategory(pkg.category ?? "");
      setColour(pkg.colour ?? "#10b981");
      setStatus(pkg.status ?? "Active");

      // Pre-fill offers
      if (pkg.offers?.length) {
        setOffers(
          pkg.offers.map((o, idx) => ({
            id: idx + 1,
            name: o.name ?? "",
            couponCode: o.couponCode,
            discount: o.discount,
            type: o.type,
            startDate: o.startDate ?? "",
            endDate: o.endDate ?? "",
            minOrder: o.minOrder ?? 0,
            active: o.active,
          }))
        );
      }

      setInitialized(true);
    }
  }, [pkg, initialized]);

  // Pre-select services — runs whenever services (from API) or pkg changes.
  // This handles the race condition where services load after the first effect.
  useEffect(() => {
    if (pkg?.serviceIds?.length && services.length > 0) {
      const preSelected = services.filter((s) =>
        pkg.serviceIds!.includes(String(s.id))
      );
      if (preSelected.length > 0) setSelSvcs(preSelected);
    }
  }, [pkg?.serviceIds, services]);

  const handleNameChange = (v: string) => {
    setPkgName(v);
    setSlug(slugify(v));
  };

  const toggleService = (svc: Service) =>
    setSelSvcs((prev) =>
      prev.find((s) => s.id === svc.id) ? prev.filter((s) => s.id !== svc.id) : [...prev, svc]
    );

  // visibleSvcs and serviceCategories are computed via useMemo above

  const addOffer = () =>
    setOffers((prev) => [
      ...prev,
      { id: Date.now(), name: "", couponCode: "", discount: 0, type: "Percent (%)", startDate: "", endDate: "", minOrder: 0, active: true },
    ]);

  const removeOffer = (id: number) => setOffers((prev) => prev.filter((o) => o.id !== id));

  const updateOffer = (id: number, field: keyof Offer, value: string | number | boolean) =>
    setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)));

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const payload: UpdatePackageDTO = {
        name: pkgName,
        slug: slug || undefined,
        description: description || undefined,
        basePrice: Number(basePrice),
        discountValue: Number(discountValue),
        discountType: discountType === "Percent (%)" ? "percentage" : "fixed",
        durationMinutes: Number(duration),
        category,
        status,
        colour,
        serviceIds: selectedServices.map((s) => String(s.id)),
        offers: offers.map(({ id: _id, ...rest }) => rest),
      };
      await updatePackage({ id, data: payload }).unwrap();
      navigate(-1);
    } catch {
      alert("Failed to update package. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const isValid = pkgName.trim() !== "" && category !== "" && Number(basePrice) > 0;

  if (isLoading) {
    return (
      <div className="pkg-create d-flex align-items-center justify-content-center" style={{ minHeight: "60vh" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  if (isError || !pkg) {
    return (
      <div className="pkg-create d-flex flex-column align-items-center justify-content-center gap-3" style={{ minHeight: "60vh" }}>
        <p className="text-danger fw-semibold">Package not found.</p>
        <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>Go back</button>
      </div>
    );
  }

  return (
    <div className="pkg-create">
      {/* Topbar */}
      <div className="pkg-create__topbar d-flex align-items-center justify-content-between px-4">
        <button className="pkg-create__close-btn" onClick={() => navigate(-1)}>
          <X size={20} />
        </button>
        <span className="pkg-create__topbar-title">
          {step === 1 ? "Edit package information" : step === 2 ? "Edit services" : "Edit dynamic offers"}
        </span>
        {step === 3 ? (
          <button className="pkg-create__submit-btn" onClick={handleSave} disabled={saving || !isValid}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        ) : (
          <button className="pkg-create__submit-btn" onClick={() => setStep((s) => s + 1)} disabled={step === 1 && !isValid}>
            Next →
          </button>
        )}
      </div>

      {/* Step indicator */}
      <div className="pkg-create__steps">
        {["Package info", "Services", "Dynamic offers"].map((label, idx) => {
          const s = idx + 1;
          return (
            <div key={label} className={`pkg-create__step ${step === s ? "active" : ""} ${step > s ? "done" : ""}`}>
              <span className="pkg-create__step-circle">{String(s).padStart(2, "0")}</span>
              <span className="pkg-create__step-label">{label}</span>
              {idx < 2 && <div className={`pkg-create__step-line ${step > s ? "done" : ""}`} />}
            </div>
          );
        })}
      </div>

      {/* Body */}
      <div className="pkg-create__body">
        <div className="container-narrow">

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <>
              <div className="pkg-create__section">
                <div className="pkg-create__section-title">Core details</div>
                <div className="pkg-create__section-sub">Name, slug, and description</div>

                <div className="mb-3">
                  <label className="pkg-create__label">PACKAGE NAME <span className="text-danger">*</span></label>
                  <input
                    className="form-control pkg-create__input"
                    placeholder="e.g. Premium Glow Package"
                    value={pkgName}
                    onChange={(e) => handleNameChange(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="pkg-create__label">SLUG</label>
                  <input className="form-control pkg-create__input" value={slug} onChange={(e) => setSlug(e.target.value)} />
                  <div className="small text-muted mt-1">https://salon.com/packages/{slug || "…"}</div>
                </div>
                <div className="mb-0">
                  <label className="pkg-create__label">DESCRIPTION</label>
                  <textarea
                    className="form-control pkg-create__textarea"
                    rows={3}
                    placeholder="Describe what's included, the experience, and benefits…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="pkg-create__section">
                <div className="pkg-create__section-title">Pricing &amp; duration</div>
                <div className="pkg-create__section-sub">Set the price, discount, and duration</div>

                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <label className="pkg-create__label">BASE PRICE ({currencySymbol}) <span className="text-danger">*</span></label>
                    <div className="position-relative">
                      <span className="pkg-create__currency">{currencySymbol}</span>
                      <input type="number" min="0" className="form-control pkg-create__input pkg-create__input--price" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} onKeyDown={(e) => { if (e.key === "-" || e.key === "e" || e.key === "E") e.preventDefault(); }} />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label className="pkg-create__label">DISCOUNT VALUE</label>
                    <input type="number" className="form-control pkg-create__input" value={discountValue} onChange={(e) => setDV(e.target.value)} />
                  </div>
                  <div className="col-md-4">
                    <label className="pkg-create__label">DISCOUNT TYPE</label>
                    <select className="form-select pkg-create__select" value={discountType} onChange={(e) => setDT(e.target.value)}>
                      <option>Fixed (₹)</option>
                      <option>Percent (%)</option>
                    </select>
                  </div>
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="pkg-create__label">DURATION (MIN) <span className="text-danger">*</span></label>
                    <input type="number" className="form-control pkg-create__input" value={duration} onChange={(e) => setDuration(e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label className="pkg-create__label">CATEGORY <span className="text-danger">*</span></label>
                    <select className="form-select pkg-create__select" value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="">Select…</option>
                      {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="pkg-create__label">STATUS</label>
                    <select className="form-select pkg-create__select" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                      <option>Active</option>
                      <option>Draft</option>
                      <option>Inactive</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="pkg-create__label">ACCENT COLOUR</label>
                    <div className="d-flex align-items-center gap-2">
                      <input
                        type="color"
                        className="form-control form-control-color"
                        value={colour}
                        onChange={(e) => setColour(e.target.value)}
                        style={{ width: "48px", height: "38px", padding: "2px" }}
                      />
                      <span className="small text-muted font-monospace">{colour}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div className="pkg-create__section">
              <div className="pkg-create__section-title">Services</div>
              <div className="pkg-create__section-sub">Map services from the master table — click to add or remove</div>

              <label className="pkg-create__label mb-2">FILTER BY CATEGORY</label>
              <div className="pkg-chips mb-4">
                {serviceCategories.map((cat) => (
                  <button key={cat} className={`pkg-chip ${serviceFilter === cat ? "active" : ""}`} onClick={() => setSF(cat)}>
                    {cat}
                  </button>
                ))}
              </div>

              <label className="pkg-create__label mb-2">AVAILABLE SERVICES</label>
              <div className="pkg-service-pool">
                {visibleSvcs.map((svc) => {
                  const picked = !!selectedServices.find((s) => s.id === svc.id);
                  return (
                    <button key={svc.id} className={`pkg-service-tag ${picked ? "picked" : ""}`} onClick={() => toggleService(svc)}>
                      {svc.name} <span className="pkg-service-tag__price">{formatAmount(Number(svc.price))}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pkg-service-summary mt-3">
                <span>Selected: <strong>{selectedServices.length} services</strong></span>
                <span>Est. duration: <strong>{estDuration} min</strong></span>
              </div>
            </div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <div className="pkg-create__section">
              <div className="pkg-create__section-title">Dynamic offers</div>
              <div className="pkg-create__section-sub">Time-bound discounts, coupon codes, and seasonal deals</div>

              {offers.map((offer, idx) => (
                <div key={offer.id} className="pkg-offer-card mb-3">
                  <div className="pkg-offer-card__header">
                    <strong>Offer #{idx + 1}</strong>
                    <div className="d-flex align-items-center gap-2">
                      <label className="d-flex align-items-center gap-1 mb-0">
                        <input type="checkbox" checked={offer.active} onChange={(e) => updateOffer(offer.id, "active", e.target.checked)} />
                        <span className={`pkg-offer-badge ${offer.active ? "active" : ""}`}>Active</span>
                      </label>
                      <button className="pkg-offer-close" onClick={() => removeOffer(offer.id)}><X size={13} /></button>
                    </div>
                  </div>

                  <div className="row g-2 mt-1">
                    <div className="col-md-6">
                      <label className="pkg-create__label">OFFER NAME</label>
                      <input className="form-control pkg-create__input" placeholder="e.g. Monsoon Special" value={offer.name} onChange={(e) => updateOffer(offer.id, "name", e.target.value)} />
                    </div>
                    <div className="col-md-6">
                      <label className="pkg-create__label">COUPON CODE</label>
                      <input className="form-control pkg-create__input" value={offer.couponCode} onChange={(e) => updateOffer(offer.id, "couponCode", e.target.value)} />
                    </div>
                    <div className="col-md-6">
                      <label className="pkg-create__label">DISCOUNT</label>
                      <input type="number" className="form-control pkg-create__input" value={offer.discount} onChange={(e) => updateOffer(offer.id, "discount", Number(e.target.value))} />
                    </div>
                    <div className="col-md-6">
                      <label className="pkg-create__label">TYPE</label>
                      <select className="form-select pkg-create__select" value={offer.type} onChange={(e) => updateOffer(offer.id, "type", e.target.value)}>
                        <option>Percent (%)</option>
                        <option>Fixed (₹)</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="pkg-create__label">START DATE</label>
                      <input type="date" className="form-control pkg-create__input" value={offer.startDate} onChange={(e) => updateOffer(offer.id, "startDate", e.target.value)} />
                    </div>
                    <div className="col-md-4">
                      <label className="pkg-create__label">END DATE</label>
                      <input type="date" className="form-control pkg-create__input" value={offer.endDate} onChange={(e) => updateOffer(offer.id, "endDate", e.target.value)} />
                    </div>
                    <div className="col-md-4">
                      <label className="pkg-create__label">MIN ORDER ({currencySymbol})</label>
                      <input type="number" className="form-control pkg-create__input" value={offer.minOrder} onChange={(e) => updateOffer(offer.id, "minOrder", Number(e.target.value))} />
                    </div>
                  </div>
                </div>
              ))}

              <button className="pkg-add-offer-btn" onClick={addOffer}>+ Add offer / coupon</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditPackagePage;
