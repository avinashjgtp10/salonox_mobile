import React, { useState } from "react";
import {
  Check2,
  BoxSeam,
  StarFill,
  Gem,
  ChevronDown,
  Search,
  Sliders,
  CardList,
  X,
  FiletypePdf,
  FiletypeXls,
  FiletypeCsv,
} from "react-bootstrap-icons";
import PackageFilterDrawer from "../components/PackageFilterDrawer";
import type { PackageFilterState } from "../components/PackageFilterDrawer";
import PackageDetailPanel from "../components/package/PackageDetailPanel";
import {
  useListPackagesQuery,
  useCreatePackageMutation,
  useDeletePackageMutation,
} from "../../../services/api/endpoints/packages.endpoints";
import type { Package as ApiPackage } from "../../../services/api/endpoints/packages.endpoints";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../../../store/store";
import { 
  exportPackagesCsvThunk, 
  exportPackagesPdfThunk, 
  exportPackagesExcelThunk 
} from "../../../middleware/package/package.thunk";
import "./Packages.scss";



interface Service {
  id: string;
  name: string;
  price: number;
  category: string;
}

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

// ── Static Data ────────────────────────────────────────────────────────
// Removed all static PACKAGES dummy data as requested.

const ALL_SERVICES: Service[] = [
  { id: "11111111-1111-1111-1111-111111111111",  name: "Head massage",    price: 499,  category: "Body"  },
  { id: "22222222-2222-2222-2222-222222222222",  name: "Swedish massage", price: 1999, category: "Body"  },
  { id: "33333333-3333-3333-3333-333333333333",  name: "Aromatherapy",    price: 1799, category: "Spa"   },
  { id: "44444444-4444-4444-4444-444444444444",  name: "Hair cut",        price: 299,  category: "Hair"  },
  { id: "55555555-5555-5555-5555-555555555555",  name: "Hair color",      price: 1499, category: "Hair"  },
  { id: "66666666-6666-6666-6666-666666666666",  name: "Facial",          price: 999,  category: "Skin"  },
  { id: "77777777-7777-7777-7777-777777777777",  name: "Cleanup",         price: 599,  category: "Skin"  },
  { id: "88888888-8888-8888-8888-888888888888",  name: "Nail art",        price: 799,  category: "Nails" },
  { id: "99999999-9999-9999-9999-999999999999",  name: "Manicure",        price: 499,  category: "Nails" },
  { id: "00000000-0000-0000-0000-000000000000", name: "Body scrub",      price: 1299, category: "Body"  },
];

const SERVICE_CATEGORIES = ["All", "Hair", "Skin", "Nails", "Body", "Spa"];
const CATEGORIES          = ["Spa", "Hair", "Skin", "Nails", "Body"];

const slugify = (v: string) =>
  v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// ─────────────────────────────────────────────────────────────────────
// ROOT VIEW TYPE
// ─────────────────────────────────────────────────────────────────────
type View = "landing" | "list" | "create" | "success";

const PackagesPage: React.FC = () => {
  const [view, setView] = useState<View>("landing");

  if (view === "landing")  return <LandingView onNavigate={setView} />;
  if (view === "list")     return <ListView     onNavigate={setView} />;
  if (view === "create")   return <CreateView   onNavigate={setView} />;
  if (view === "success")  return <SuccessView  onNavigate={setView} />;
  return null;
};

export default PackagesPage;

// ═══════════════════════════════════════════════════════════════════════
// LANDING VIEW
// ═══════════════════════════════════════════════════════════════════════
interface NavProps { onNavigate: (v: View) => void; }

const LandingView: React.FC<NavProps> = ({ onNavigate }) => (
  <div className="pkg-landing">
    <div className="container-fluid py-4 px-4">
      {/* Page header */}
      <div className="row align-items-center mb-4">
        <div className="col">
          <h4 className="pkg-landing__title fw-bold mb-0">Packages</h4>
          <p className="text-muted small mb-0">Manage service packages for your clients</p>
        </div>
      </div>

      {/* Hero */}
      <div className="pkg-landing__hero row align-items-center">
        {/* Left copy */}
        <div className="col-12 col-lg-6 pkg-landing__hero-copy">
          <span className="pkg-landing__badge mb-3 d-inline-block">Free to use</span>
          <h2 className="pkg-landing__headline fw-bold mb-3">
            Bundle services into<br />powerful packages
          </h2>
          <p className="pkg-landing__subtext mb-4">
            Boost your revenue by combining multiple treatments into a package
            and turn one-time visitors into loyal regulars.
          </p>

          <ul className="pkg-landing__checklist list-unstyled mb-4">
            {[
              "Guarantee steady income with pre-paid service bundles",
              "Encourage clients to commit to a full treatment course",
              "Clients can easily track remaining services in their package",
            ].map((item) => (
              <li key={item} className="d-flex align-items-start gap-2 mb-2">
                <Check2 className="pkg-landing__check-icon mt-1" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="d-flex align-items-center gap-3 flex-wrap">
            <button className="btn pkg-landing__cta-btn" onClick={() => onNavigate("create")}>
              Create package
            </button>
            <button className="btn pkg-landing__learn-btn" onClick={() => onNavigate("list")}>
              View packages
            </button>
          </div>
        </div>

        {/* Right illustration */}
        <div className="col-12 col-lg-6 d-flex justify-content-center justify-content-lg-end mt-5 mt-lg-0">
          <div className="pkg-landing__illustration-wrap">
            {/* Main card */}
            <div className="pkg-landing__salon-card shadow">
              <div className="pkg-landing__salon-img-wrap">
                <div className="pkg-landing__salon-img-placeholder">
                  <BoxSeam size={48} className="text-white opacity-50" />
                </div>
              </div>
              <div className="p-3">
                <div className="fw-semibold small">Trendy Studio</div>
                <div className="d-flex align-items-center gap-1 mb-2" style={{ fontSize: "0.7rem" }}>
                  <span className="text-warning">★</span>
                  <span className="fw-medium">5.0</span>
                  <span className="text-muted">700 reviews</span>
                </div>
                {[
                  { name: "Swedish massage", note: "included in package", highlight: true },
                  { name: "Aromatherapy",    note: "60 min" },
                  { name: "Body scrub",      note: "45 min" },
                ].map((svc) => (
                  <div key={svc.name} className="pkg-landing__service-row">
                    <div className="small fw-medium">{svc.name}</div>
                    <div
                      className={`pkg-landing__service-note ${svc.highlight ? "pkg-landing__service-note--green" : "text-muted"}`}
                      style={{ fontSize: "0.68rem" }}
                    >
                      {svc.note}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating packages card */}
            <div className="pkg-landing__plans-card shadow-lg">
              <div className="fw-semibold small mb-3">Packages</div>
              {[
                { icon: BoxSeam, color: "#4CAF50", name: "Premium Glow",      sub: "90 min · Spa"    },
                { icon: StarFill, color: "#2196F3", name: "Hair Transformation", sub: "120 min · Hair"  },
                { icon: Gem,      color: "#9C27B0", name: "Bridal Skin Prep",   sub: "150 min · Skin"  },
              ].map((plan) => (
                <div key={plan.name} className="pkg-landing__plan-row d-flex align-items-center gap-2 mb-2">
                  <div className="pkg-landing__plan-icon-wrap" style={{ background: plan.color + "1a" }}>
                    <plan.icon style={{ color: plan.color, fontSize: "0.85rem" }} />
                  </div>
                  <div>
                    <div className="small fw-medium lh-1">{plan.name}</div>
                    <div className="text-muted lh-1" style={{ fontSize: "0.68rem" }}>{plan.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════
// LIST VIEW
// ═══════════════════════════════════════════════════════════════════════
const PAGE_SIZE = 8;

const ListView: React.FC<NavProps> = ({ onNavigate }) => {
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);
  const [showOptions, setShowOptions] = useState(false);
  const [exporting, setExporting] = useState<"csv" | "excel" | "pdf" | null>(null);

  // ── Detail panel state ──────────────────────────────────────────────
  const [selectedPkgId, setSelectedPkgId] = useState<string | null>(null);
  
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [filters, setFilters] = useState<PackageFilterState>({
    category: "All categories",
    status:   "All statuses",
  });

  const dispatch = useDispatch<AppDispatch>();
  const [deletePackage] = useDeletePackageMutation();
  
  const { data, isLoading } = useListPackagesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    category: filters.category === "All categories" ? undefined : filters.category,
    status: filters.status === "All statuses" ? undefined : filters.status,
  });

  const paged = data?.items || [];
  const totalItems = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  const selectedPkg = React.useMemo(() => {
    if (!selectedPkgId) return null;
    return paged.find((pkg) => pkg.id === selectedPkgId) || null;
  }, [paged, selectedPkgId]);

  const handleExport = async (type: "csv" | "excel" | "pdf") => {
    setExporting(type);
    setShowOptions(false);
    try {
      if (type === "csv") await dispatch(exportPackagesCsvThunk()).unwrap();
      else if (type === "pdf") await dispatch(exportPackagesPdfThunk()).unwrap();
      else if (type === "excel") await dispatch(exportPackagesExcelThunk()).unwrap();
    } finally {
      setExporting(null);
    }
  };

  const handleRowClick = (pkg: ApiPackage) => {
    setSelectedPkgId((prev) => (prev === pkg.id ? null : pkg.id));
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Delete this package?")) return;
    try {
      await deletePackage(id).unwrap();
      // Close panel if the deleted package was selected
      if (selectedPkgId === id) setSelectedPkgId(null);
    } catch {
      alert("Failed to delete the package.");
    }
  };

  const statusBadge = (s: ApiPackage["status"]) => {
    const map: Record<ApiPackage["status"], string> = {
      Active: "pkg-status--active",
      Draft: "pkg-status--draft",
      Inactive: "pkg-status--inactive",
    };
    return <span className={`pkg-status ${map[s]}`}>{s}</span>;
  };

  return (
    <div className={`pkg-list${selectedPkg ? " pkg-list--panel-open" : ""}`}>
      {/* Header */}
      <header className="pkg-list__header">
        <div className="header-left">
          <h1>Packages</h1>
        </div>
        <div className="header-actions">
          <div className="dropdown position-relative">
            <button className="btn-options" onClick={() => setShowOptions((prev) => !prev)}>
              Options <ChevronDown size={14} className="ms-1" />
            </button>
            {showOptions && (
              <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 rounded-3 py-2 show position-absolute" style={{ top: "100%", right: 0 }}>
                <li>
                  <button
                    className="dropdown-item py-2 px-3 fw-medium d-flex align-items-center gap-2"
                    onClick={() => handleExport("pdf")}
                    disabled={exporting !== null}
                  >
                    <FiletypePdf size={18} className="text-secondary" /> {exporting === "pdf" ? "Downloading…" : "Download PDF"}
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item py-2 px-3 fw-medium d-flex align-items-center gap-2"
                    onClick={() => handleExport("excel")}
                    disabled={exporting !== null}
                  >
                    <FiletypeXls size={18} className="text-secondary" /> {exporting === "excel" ? "Downloading…" : "Download Excel"}
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item py-2 px-3 fw-medium d-flex align-items-center gap-2"
                    onClick={() => handleExport("csv")}
                    disabled={exporting !== null}
                  >
                    <FiletypeCsv size={18} className="text-secondary" /> {exporting === "csv" ? "Downloading…" : "Download CSV"}
                  </button>
                </li>
              </ul>
            )}
          </div>
          <button className="btn-add" onClick={() => onNavigate("create")}>Add</button>
        </div>
      </header>

      {/* Controls */}
      <div className="pkg-list__controls">
        <div className="search-box">
          <Search className="search-icon-abs" size={18} />
          <input
            type="text"
            placeholder="Search by package name or ID"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        
        {(() => {
           const activeFilterCount = [
             filters.category !== "All categories",
             filters.status   !== "All statuses",
           ].filter(Boolean).length;
           
           return (
             <button 
               className={`filter-btn ${activeFilterCount > 0 ? 'filter-btn--active' : ''}`}
               onClick={() => setShowFilterDrawer(true)}
             >
               Filters {activeFilterCount > 0 && `(${activeFilterCount})`} <Sliders size={16} />
             </button>
           );
        })()}
      </div>

      {/* Table */}
      <main className="pkg-list__content">
        <table className="pkg-table">
          <thead>
            <tr>
              <th>Package name</th>
              <th>Category</th>
              <th>Duration</th>
              <th>Base price</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : paged.length > 0 ? (
              paged.map((pkg) => (
                <tr
                  key={pkg.id}
                  onClick={() => handleRowClick(pkg)}
                  style={{ cursor: "pointer" }}
                  className={selectedPkg?.id === pkg.id ? "pkg-row--selected" : ""}
                >
                  <td className="pkg-name-cell">
                    <div className="pkg-icon" style={{ background: pkg.colour + "22" }}>
                      <CardList size={20} style={{ color: pkg.colour }} />
                    </div>
                    <div className="name-info">
                      <span className="name">{pkg.name}</span>
                      <span className="sub">{pkg.id}</span>
                    </div>
                  </td>
                  <td>{pkg.category}</td>
                  <td>{pkg.durationMinutes ? `${pkg.durationMinutes} min` : "N/A"}</td>
                  <td className="price-cell">₹{pkg.basePrice.toLocaleString("en-IN")}</td>
                  <td>{statusBadge(pkg.status)}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={(e) => handleDelete(e, pkg.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-5">No packages found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </main>

      {/* Pagination */}
      <footer className="pkg-list__pagination">
        <span className="page-info">{paged.length} of {totalItems} packages</span>
        <div className="pagination-controls">
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >‹ Prev</button>
          <span className="page-num">Page {page} of {totalPages}</span>
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >Next ›</button>
        </div>
      </footer>

      {/* Filter Drawer */}
      {showFilterDrawer && (
        <PackageFilterDrawer
          onClose={() => setShowFilterDrawer(false)}
          initialFilters={filters}
          onApply={(newFilters) => {
            setFilters(newFilters);
            setPage(1);
          }}
        />
      )}

      {/* Detail Panel */}
      <PackageDetailPanel
        pkg={selectedPkg}
        onClose={() => setSelectedPkgId(null)}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// CREATE VIEW
// ═══════════════════════════════════════════════════════════════════════
const CreateView: React.FC<NavProps> = ({ onNavigate }) => {
  const [step, setStep]               = useState(1);
  const [pkgName, setPkgName]         = useState("");
  const [slug, setSlug]               = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice]     = useState("0");
  const [discountValue, setDV]        = useState("0");
  const [discountType, setDT]         = useState("Fixed (₹)");
  const [duration, setDuration]       = useState("90");
  const [category, setCategory]       = useState("");
  const [serviceFilter, setSF]        = useState("All");
  const [selectedServices, setSelSvcs] = useState<Service[]>([]);
  const [offers, setOffers]           = useState<Offer[]>([
    { id: 1, name: "", couponCode: "SAVE20", discount: 20, type: "Percent (%)", startDate: "2026-04-15", endDate: "2026-05-15", minOrder: 0, active: true },
  ]);
  const [saving, setSaving]           = useState(false);

  const handleNameChange = (v: string) => { setPkgName(v); setSlug(slugify(v)); };

  const toggleService = (svc: Service) =>
    setSelSvcs((prev) =>
      prev.find((s) => s.id === svc.id) ? prev.filter((s) => s.id !== svc.id) : [...prev, svc]
    );

  const visibleSvcs = serviceFilter === "All" ? ALL_SERVICES : ALL_SERVICES.filter((s) => s.category === serviceFilter);

  const addOffer = () =>
    setOffers((prev) => [
      ...prev,
      { id: Date.now(), name: "", couponCode: "", discount: 0, type: "Percent (%)", startDate: "", endDate: "", minOrder: 0, active: true },
    ]);

  const removeOffer = (id: number) => setOffers((prev) => prev.filter((o) => o.id !== id));

  const updateOffer = (id: number, field: keyof Offer, value: string | number | boolean) =>
    setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)));

  const [createPackage] = useCreatePackageMutation();

  const handleSave = async () => {
    setSaving(true);
    try {
      await createPackage({
        name: pkgName,
        slug,
        description,
        basePrice: Number(basePrice),
        discountValue: Number(discountValue),
        discountType: discountType === "Percent (%)" ? "percentage" : "fixed",
        durationMinutes: Number(duration),
        category,
        status: "Active",
        colour: "#10b981",
        serviceIds: selectedServices.map((s) => s.id),
        offers: offers.map((o) => ({ ...o, id: undefined })),
      }).unwrap();
      onNavigate("success");
    } catch (e) {
      console.error("Failed to create package", e);
      alert("Failed to save package! Make sure your backend API is running.");
    } finally {
      setSaving(false);
    }
  };

  const isValid = pkgName.trim() !== "" && category !== "" && Number(basePrice) > 0;

  return (
    <div className="pkg-create">
      {/* Topbar */}
      <div className="pkg-create__topbar d-flex align-items-center justify-content-between px-4">
        <button className="pkg-create__close-btn" onClick={() => onNavigate("list")}>
          <X size={20} />
        </button>
        <span className="pkg-create__topbar-title">
          {step === 1 ? "Package information" : step === 2 ? "Services" : "Dynamic offers"}
        </span>
        {step === 3 ? (
          <button className="pkg-create__submit-btn" onClick={handleSave} disabled={saving || !isValid}>
            {saving ? "Saving…" : "Save package"}
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
                    <label className="pkg-create__label">BASE PRICE (₹) <span className="text-danger">*</span></label>
                    <div className="position-relative">
                      <span className="pkg-create__currency">₹</span>
                      <input type="number" className="form-control pkg-create__input pkg-create__input--price" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
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
                <div className="row g-3">
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
                {SERVICE_CATEGORIES.map((cat) => (
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
                      {svc.name} <span className="pkg-service-tag__price">₹{svc.price}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pkg-service-summary mt-3">
                <span>Selected: <strong>{selectedServices.length} services</strong></span>
                <span>Est. duration: <strong>{selectedServices.length * 30} min</strong></span>
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
                      <label className="pkg-create__label">MIN ORDER (₹)</label>
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

// ═══════════════════════════════════════════════════════════════════════
// SUCCESS VIEW
// ═══════════════════════════════════════════════════════════════════════
const SuccessView: React.FC<NavProps> = ({ onNavigate }) => (
  <div className="pkg-success-wrap">
    <div className="pkg-success glass-fx">
      <div className="pkg-success__icon-container">
        <div className="pkg-success__icon">
          <Check2 size={40} />
        </div>
      </div>
      <h5>Package created successfully</h5>
      <p>Your new salon package is now live and ready for clients to book.</p>
      <div className="btn-group-custom">
        <button className="btn btn-create-another" onClick={() => onNavigate("create")}>
          Create another
        </button>
        <button className="btn btn-view-pkgs" onClick={() => onNavigate("list")}>
          View packages
        </button>
      </div>
    </div>
  </div>
);
