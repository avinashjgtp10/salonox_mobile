import { useEffect, useState } from "react";
import {
  BoxSeam, CurrencyRupee, ExclamationTriangleFill, ClockHistory,
  Search, ArrowRight, CheckCircleFill, Tag, Building, X,
} from "react-bootstrap-icons";
import { useAppSelector } from "../../../hooks/useAppRedux";
import api from "../../../services/api/axios";
import Dropdown from "../../../components/ui/Dropdown";
import Loader from "../../../components/ui/Loader";
import { BRANCH_OWNER } from "../../../services/api/endpoints/branchOwner.endpoints";
import {
  SectionCard, StatTile, StatusBadge, BoEmptyState, PrimaryButton,
  inputStyle, label as labelStyle,
  usePagination, BoPagination,
} from "../components/BranchOwnerUI";

interface SalonProduct { id: string; name: string; barcode: string | null; amount: number; measure_unit: string; }
interface Transfer {
  id: string;
  source_salon_id: string; dest_salon_id: string;
  source_salon_name: string; dest_salon_name: string;
  product_name: string; quantity: number; status: string; reason: string | null; created_at: string;
}
interface BranchOverviewRow { salon_id: string; salon_name: string; product_count: number; stock_value: number; }
interface LowStockRow { product_id: string; product_name: string; amount: number; qty_alert: number; salon_name: string; }
interface Summary { total_products: number; total_stock_value: number; low_stock_count: number; pending_transfers_count: number; }
interface CategoryRow { category_name: string; product_count: number; }
interface CategoryProduct { id: string; name: string; amount: number; measure_unit: string; salon_name: string; }

const fmtMoney = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : `₹${n.toLocaleString("en-IN")}`);

export default function BranchOwnerInventoryPage() {
  const salons = useAppSelector((s) => s.branchOwner.salons);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [branchOverview, setBranchOverview] = useState<BranchOverviewRow[]>([]);
  const [lowStock, setLowStock] = useState<LowStockRow[]>([]);
  const [recent, setRecent] = useState<Transfer[]>([]);
  const [branchFilter, setBranchFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);

  const [showCategoryPopup, setShowCategoryPopup] = useState(false);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<CategoryProduct[]>([]);

  const [sourceSalonId, setSourceSalonId] = useState("");
  const [destSalonId, setDestSalonId] = useState("");
  const [sourceProducts, setSourceProducts] = useState<SalonProduct[]>([]);
  // Multi-product selection — one row of {quantity, destProductId, suggestedId}
  // per selected product, keyed by source product id.
  const [sourceProductIds, setSourceProductIds] = useState<string[]>([]);
  const [productRows, setProductRows] = useState<Record<string, { quantity: string; destProductId: string; suggestedId: string | null }>>({});
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");
  const [formBusy, setFormBusy] = useState(false);

  const loadAll = () => {
    Promise.all([
      api.get(BRANCH_OWNER.INVENTORY_SUMMARY).then((r) => setSummary(r.data?.data ?? null)).catch(() => {}),
      api.get(BRANCH_OWNER.INVENTORY_BRANCH_OVERVIEW).then((r) => setBranchOverview(r.data?.data ?? [])).catch(() => {}),
      api.get(BRANCH_OWNER.INVENTORY_LOW_STOCK).then((r) => setLowStock(r.data?.data ?? [])).catch(() => {}),
      api.get(BRANCH_OWNER.STOCK_TRANSFERS).then((r) => setRecent(r.data?.data ?? [])).catch(() => {}),
    ]).finally(() => setLoaded(true));
  };
  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (salons.length >= 2 && !sourceSalonId) setSourceSalonId(salons[0].id);
    if (salons.length >= 2 && !destSalonId) setDestSalonId(salons[1].id);
  }, [salons, sourceSalonId, destSalonId]);

  // Fetches the full product list for the selected From Branch — search is
  // filtered client-side by the Dropdown itself (see below), so this must
  // NOT depend on the page's `search` box: that box filters the unrelated
  // Branch Stock Overview panel, and wiring it in here meant typing there
  // silently narrowed (or emptied) the transfer product list and wiped any
  // already-selected products every keystroke.
  useEffect(() => {
    if (!sourceSalonId) return;
    api.get(BRANCH_OWNER.SALON_PRODUCTS(sourceSalonId))
      .then((res) => setSourceProducts(res.data?.data ?? []))
      .catch(() => setSourceProducts([]));
    setSourceProductIds([]);
    setProductRows({});
  }, [sourceSalonId]);

  // Zero-stock products can't be transferred, so they're excluded from the
  // picker entirely rather than being selectable with nothing to send.
  const transferableProducts = sourceProducts.filter((p) => p.amount > 0);

  // Toggling a product on fetches its suggested destination match once and
  // seeds its row; toggling off just drops the row — same "toggle by id,
  // parent owns the array" contract the shared Dropdown expects everywhere
  // else it's used in multiple mode.
  function toggleSourceProduct(id: string) {
    setSourceProductIds((prev) => {
      if (prev.includes(id)) {
        setProductRows((rows) => { const next = { ...rows }; delete next[id]; return next; });
        return prev.filter((x) => x !== id);
      }
      setProductRows((rows) => ({ ...rows, [id]: { quantity: "", destProductId: "", suggestedId: null } }));
      if (sourceSalonId && destSalonId) {
        api.get(BRANCH_OWNER.SUGGEST_MATCH, {
          params: { source_salon_id: sourceSalonId, source_product_id: id, dest_salon_id: destSalonId },
        }).then((res) => {
          const suggested = res.data?.data?.suggested;
          setProductRows((rows) => (rows[id] ? { ...rows, [id]: { ...rows[id], destProductId: suggested?.id ?? "", suggestedId: suggested?.id ?? null } } : rows));
        }).catch(() => {});
      }
      return [...prev, id];
    });
  }

  function setRowQuantity(id: string, quantity: string) {
    setProductRows((rows) => (rows[id] ? { ...rows, [id]: { ...rows[id], quantity } } : rows));
  }

  const salonName = (id: string) => salons.find((s) => s.id === id)?.name ?? id;

  async function handleCreateTransfer() {
    setFormError("");
    if (!sourceSalonId || !destSalonId || sourceProductIds.length === 0) {
      setFormError("Pick source, destination and at least one product.");
      return;
    }
    if (sourceSalonId === destSalonId) {
      setFormError("Source and destination salon must be different.");
      return;
    }
    const missingQty = sourceProductIds.find((id) => !productRows[id]?.quantity);
    if (missingQty) {
      setFormError("Enter a quantity for every selected product.");
      return;
    }

    setFormBusy(true);
    try {
      // No batch endpoint on the backend — fire one transfer request per
      // selected product, sequentially, so a failure partway through leaves
      // a clear "these succeeded, this one didn't" state rather than an
      // all-or-nothing Promise.all that's harder to explain to the user.
      for (const id of sourceProductIds) {
        const row = productRows[id];
        await api.post(BRANCH_OWNER.STOCK_TRANSFER, {
          source_salon_id: sourceSalonId, dest_salon_id: destSalonId,
          source_product_id: id, dest_product_id: row.destProductId || undefined,
          quantity: Number(row.quantity), reason: reason || undefined,
        });
      }
      setSourceProductIds([]); setProductRows({}); setReason("");
      loadAll();
    } catch (err: any) {
      setFormError(err?.response?.data?.error?.message || "Failed to create one or more transfers.");
    } finally {
      setFormBusy(false);
    }
  }

  function openCategoryPopup() {
    setShowCategoryPopup(true);
    setActiveCategory(null);
    api.get(BRANCH_OWNER.INVENTORY_CATEGORIES).then((r) => setCategories(r.data?.data ?? [])).catch(() => setCategories([]));
  }

  function openCategory(name: string) {
    setActiveCategory(name);
    api.get(BRANCH_OWNER.INVENTORY_CATEGORY_PRODUCTS(name)).then((r) => setCategoryProducts(r.data?.data ?? [])).catch(() => setCategoryProducts([]));
  }

  const visibleBranchOverview = branchFilter === "all" ? branchOverview : branchOverview.filter((b) => b.salon_id === branchFilter);
  const maxStockValue = Math.max(1, ...branchOverview.map((b) => b.stock_value));

  const branchPage = usePagination(visibleBranchOverview, 4);
  const lowStockPage = usePagination(lowStock, 5);
  const recentPage = usePagination(recent, 8);

  if (salons.length < 2) {
    return (
      <div style={{ padding: 28, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a" }}>Inventory &amp; Stock Transfer</h1>
        <SectionCard title="">
          <BoEmptyState icon={<BoxSeam size={30} />} text="You need at least two salons to transfer stock between them." />
        </SectionCard>
      </div>
    );
  }

  return (
    <div style={{ padding: "26px 28px 44px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", maxWidth: 1280 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Inventory &amp; Stock Transfer</h1>
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>Move and manage inventory across your salons</p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <div onClick={openCategoryPopup} style={{ cursor: "pointer" }}>
          <StatTile icon={<BoxSeam size={18} />} label="Products" value={loaded ? summary?.total_products ?? 0 : "—"} sub="Tap to browse by category" />
        </div>
        <StatTile icon={<CurrencyRupee size={18} />} label="Stock Value" value={loaded ? fmtMoney(summary?.total_stock_value ?? 0) : "—"} />
        <StatTile icon={<ExclamationTriangleFill size={16} />} label="Low Stock" value={loaded ? summary?.low_stock_count ?? 0 : "—"} />
        <StatTile icon={<ClockHistory size={17} />} label="Transfers Today" value={loaded ? recent.filter((t) => new Date(t.created_at).toDateString() === new Date().toDateString()).length : "—"} />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} style={{ ...inputStyle, width: 190 }}>
          <option value="all">All Branches</option>
          {salons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product…"
            style={{ ...inputStyle, paddingLeft: 34 }}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Branch Stock Overview */}
        <SectionCard title="Branch Stock Overview" noPadding>
          {!loaded ? <Loader message="Loading branch overview…" /> : visibleBranchOverview.length === 0 ? (
            <BoEmptyState icon={<Building size={26} />} text="No branch data yet." />
          ) : (<>
            <div style={{ padding: "6px 20px 16px" }}>
              {branchPage.pageItems.map((b) => (
                <div key={b.salon_id} style={{ padding: "12px 0", borderBottom: "1px solid #f8fafc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>{b.salon_name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#16a34a" }}>{fmtMoney(b.stock_value)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, height: 6, borderRadius: 4, background: "#f1f5f9", overflow: "hidden" }}>
                      <div style={{ width: `${(b.stock_value / maxStockValue) * 100}%`, height: "100%", background: "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 11.5, color: "#94a3b8", whiteSpace: "nowrap" }}>{b.product_count} products</span>
                  </div>
                </div>
              ))}
            </div>
            <BoPagination {...branchPage} />
          </>)}
        </SectionCard>

        {/* Low Stock Alerts */}
        <SectionCard title="Low Stock Alerts" noPadding>
          {!loaded ? <Loader message="Loading low stock alerts…" /> : lowStock.length === 0 ? (
            <BoEmptyState icon={<CheckCircleFill size={26} />} text="Nothing low on stock." />
          ) : (<>
            {lowStockPage.pageItems.map((r) => (
              <div key={`${r.product_id}-${r.salon_name}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 20px", borderBottom: "1px solid #f8fafc" }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "#fef2f2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <ExclamationTriangleFill size={13} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.product_name}</div>
                  <div style={{ fontSize: 11.5, color: "#94a3b8" }}>{r.salon_name}</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#dc2626" }}>{r.amount}</span>
              </div>
            ))}
            <BoPagination {...lowStockPage} />
          </>)}
        </SectionCard>
      </div>

      {/* Create Stock Transfer */}
      <div style={{ marginBottom: 16 }}>
        <SectionCard title="Create Stock Transfer">
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 14, alignItems: "end", marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>From Branch</label>
              <Dropdown
                value={sourceSalonId}
                onChange={setSourceSalonId}
                options={salons.map((s) => ({ id: s.id, name: s.name }))}
                placeholder="Select branch…"
                style={inputStyle}
              />
            </div>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#eef2ff", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ArrowRight size={15} />
            </div>
            <div>
              <label style={labelStyle}>To Branch</label>
              <Dropdown
                value={destSalonId}
                onChange={setDestSalonId}
                options={salons.map((s) => ({ id: s.id, name: s.name }))}
                placeholder="Select branch…"
                style={inputStyle}
              />
            </div>
          </div>

          <label style={labelStyle}>Products</label>
          <Dropdown
            multiple
            value={sourceProductIds}
            options={transferableProducts.map((p) => ({ id: p.id, name: `${p.name} — ${p.amount} ${p.measure_unit} available` }))}
            onChange={toggleSourceProduct}
            placeholder="Search and select products…"
            className="bo-transfer-product-dropdown"
            style={inputStyle}
          />
          {sourceProducts.length > 0 && transferableProducts.length === 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>
              No products with available stock at this branch to transfer.
            </div>
          )}

          {sourceProductIds.length > 0 && (
            <div style={{ marginTop: 12, marginBottom: 4 }}>
              {sourceProductIds.map((id) => {
                const p = sourceProducts.find((sp) => sp.id === id);
                const row = productRows[id];
                if (!p || !row) return null;
                return (
                  <div key={id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#f1f5f9", color: "#334155", fontWeight: 600 }}>
                          Available: {p.amount} {p.measure_unit}
                        </span>
                        {row.suggestedId ? (
                          <span style={{ fontSize: 11, color: "#16a34a", display: "flex", alignItems: "center", gap: 3, fontWeight: 600 }}>
                            <CheckCircleFill size={10} /> Auto-matched in {salonName(destSalonId)}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: "#d97706", fontWeight: 600 }}>Will create new in {salonName(destSalonId)}</span>
                        )}
                      </div>
                    </div>
                    <input
                      type="number" min={1} max={p.amount} value={row.quantity}
                      onChange={(e) => setRowQuantity(id, e.target.value)}
                      style={{ ...inputStyle, width: 90 }} placeholder="Qty"
                    />
                    <button
                      type="button" onClick={() => toggleSourceProduct(id)}
                      style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: "#fef2f2", color: "#dc2626", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                      title="Remove"
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 16, marginBottom: 16 }}>
            <label style={labelStyle}>Reason (optional)</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} style={inputStyle} placeholder="e.g. Low stock at destination" />
          </div>

          {formError && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginBottom: 16 }}>
              {formError}
            </div>
          )}

          <div style={{ textAlign: "right" }}>
            <PrimaryButton onClick={handleCreateTransfer} disabled={formBusy}>
              {formBusy ? "Creating…" : "Create Transfer"}
            </PrimaryButton>
          </div>
        </SectionCard>
      </div>

      {/* Recent Stock Movements */}
      <SectionCard title="Recent Stock Movements" noPadding>
        {!loaded ? <Loader message="Loading stock movements…" /> : recent.length === 0 ? (
          <BoEmptyState icon={<BoxSeam size={26} />} text="No transfers yet." />
        ) : (<>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Product", "From", "To", "Qty", "Status", "Date"].map((h) => (
                  <th key={h} style={{ padding: "10px 20px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentPage.pageItems.map((t) => (
                <tr key={t.id} style={{ borderTop: "1px solid #f8fafc" }}>
                  <td style={{ padding: "11px 20px", fontWeight: 600, color: "#0f172a" }}>{t.product_name}</td>
                  <td style={{ padding: "11px 20px", color: "#475569" }}>{t.source_salon_name}</td>
                  <td style={{ padding: "11px 20px", color: "#475569" }}>{t.dest_salon_name}</td>
                  <td style={{ padding: "11px 20px", color: "#0f172a", fontWeight: 600 }}>{t.quantity}</td>
                  <td style={{ padding: "11px 20px" }}><StatusBadge status={t.status} /></td>
                  <td style={{ padding: "11px 20px", color: "#94a3b8" }}>{new Date(t.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <BoPagination {...recentPage} />
        </>)}
      </SectionCard>

      {/* Category popup */}
      {showCategoryPopup && (
        <div
          onClick={() => setShowCategoryPopup(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: "22px 24px", width: 440, maxHeight: "72vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.22)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: "#eef2ff", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Tag size={15} />
                </div>
                <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: "#0f172a" }}>
                  {activeCategory || "Products by Category"}
                </h3>
              </div>
              <button onClick={() => setShowCategoryPopup(false)} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" }}>
                <X size={15} />
              </button>
            </div>

            {activeCategory && (
              <button onClick={() => setActiveCategory(null)} style={{ alignSelf: "flex-start", margin: "8px 0 4px", background: "none", border: "none", color: "#6366f1", fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: 0 }}>
                ← All categories
              </button>
            )}

            <div style={{ overflowY: "auto", flex: 1, marginTop: 10, borderTop: "1px solid #f1f5f9" }}>
              {!activeCategory ? (
                categories.length === 0 ? (
                  <BoEmptyState icon={<Tag size={22} />} text="No categorized products." />
                ) : categories.map((c) => (
                  <button
                    key={c.category_name}
                    onClick={() => openCategory(c.category_name)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "13px 6px", border: "none", borderBottom: "1px solid #f8fafc", background: "#fff", cursor: "pointer", fontSize: 13.5, textAlign: "left" }}
                  >
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>{c.category_name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#6366f1", background: "#eef2ff", padding: "3px 10px", borderRadius: 20 }}>{c.product_count}</span>
                  </button>
                ))
              ) : (
                categoryProducts.length === 0 ? (
                  <BoEmptyState icon={<BoxSeam size={22} />} text="No products." />
                ) : categoryProducts.map((p) => (
                  <div key={`${p.id}-${p.salon_name}`} style={{ display: "flex", justifyContent: "space-between", padding: "10px 6px", borderBottom: "1px solid #f8fafc", fontSize: 13 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{p.name}</div>
                      <div style={{ fontSize: 11.5, color: "#94a3b8" }}>{p.salon_name}</div>
                    </div>
                    <span style={{ color: "#0f172a", fontWeight: 600, alignSelf: "center" }}>{p.amount} {p.measure_unit}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
