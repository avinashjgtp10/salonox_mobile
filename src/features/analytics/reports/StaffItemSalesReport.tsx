import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useDispatch } from "react-redux";
import { ChevronLeft } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { BOOKING } from "../../../services/api/endpoints";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import type { AppDispatch } from "../../../store/store";
import Button from "../../../components/ui/Button";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import "./StaffItemSalesReport.scss";

const REPORT_NAME = "Service, Product, Membership & Package Sold by Staff";

type ItemType = "service" | "product" | "membership" | "package";

interface ItemRow {
  staffName: string;
  itemName: string;
  quantity: number;
  revenue: number;
  date: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function StaffItemSalesReport({ onBack }: { onBack: () => void }) {
  const dispatch = useDispatch<AppDispatch>();
  const today      = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,      setDateFrom]      = useState(monthStart);
  const [dateTo,        setDateTo]        = useState(today);
  const [itemType,      setItemType]      = useState<ItemType>("service");
  const [staffFilter,   setStaffFilter]   = useState("All");
  const [staffOptions,  setStaffOptions]  = useState<{ label: string; value: string }[]>([{ label: "All", value: "All" }]);
  const [showStaffDrop, setShowStaffDrop] = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [serviceRows,    setServiceRows]    = useState<ItemRow[]>([]);
  const [productRows,    setProductRows]    = useState<ItemRow[]>([]);
  const [membershipRows, setMembershipRows] = useState<ItemRow[]>([]);
  const [packageRows,    setPackageRows]    = useState<ItemRow[]>([]);
  const [currentPage,   setCurrentPage]   = useState(1);
  const [pageSize,      setPageSize]      = useState(10);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    dispatch(fetchStaffThunk()).unwrap().then((list: any[]) => {
      const opts = list.map((s: any) => ({
        label: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.name || "",
        value: String(s.id ?? ""),
      })).filter((o: any) => o.label && o.value);
      setStaffOptions([{ label: "All", value: "All" }, ...opts]);
    }).catch(() => {});
  }, [dispatch]);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const params = new URLSearchParams({ start_date: dateFrom, end_date: dateTo, limit: "500" });
      const [apptRes, staffList] = await Promise.all([
        api.get(`${BOOKING.BASE}?${params}`, { signal: ctrl.signal }),
        dispatch(fetchStaffThunk()).unwrap(),
      ]);
      const staffNameMap = new Map<string, string>();
      staffList.forEach((s: any) => {
        const name = `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.name || "";
        if (!name) return;
        [s.id, s.user_id, s.uuid, s.staff_id, s.auth_id, s.auth_user_id]
          .filter(Boolean)
          .forEach((uid: any) => staffNameMap.set(String(uid), name));
        Object.values(s).forEach((val: any) => {
          if (typeof val === "string" && (UUID_RE.test(val) || /^\d+$/.test(val))) staffNameMap.set(val, name);
          else if (typeof val === "number") staffNameMap.set(String(val), name);
        });
      });
      const rawAppt = apptRes.data?.data;
      const appts: any[] =
        Array.isArray(rawAppt?.items) ? rawAppt.items :
        Array.isArray(rawAppt?.data)  ? rawAppt.data  :
        Array.isArray(rawAppt)        ? rawAppt        : [];

      const svc: ItemRow[] = [];
      const prod: ItemRow[] = [];
      const mem: ItemRow[] = [];
      const pkg: ItemRow[] = [];

      appts.forEach((appt: any) => {
        const sid = String(appt.staff_id ?? appt.staffId ?? "");
        if (staffFilter !== "All" && sid !== staffFilter) return;
        const inlineName = `${appt.staff_first_name ?? ""} ${appt.staff_last_name ?? ""}`.trim()
          || appt.staff_name || appt.staff?.name || "";
        const staffName = staffNameMap.get(sid) || inlineName || "Unknown";
        const date = String(appt.scheduled_at ?? appt.created_at ?? "").slice(0, 10);

        (Array.isArray(appt.services) ? appt.services : []).forEach((it: any) => {
          const price = parseFloat(String(it.price ?? 0)) || 0;
          svc.push({ staffName, itemName: String(it.name ?? it.service_name ?? "Service"), quantity: 1, revenue: Math.round(price), date });
        });

        (Array.isArray(appt.product_items) ? appt.product_items : []).forEach((it: any) => {
          const qty = Number(it.quantity ?? it.qty ?? 1) || 1;
          const price = parseFloat(String(it.price ?? 0)) || 0;
          prod.push({ staffName, itemName: String(it.name ?? it.product_name ?? "Product"), quantity: qty, revenue: Math.round(price * qty), date });
        });

        (Array.isArray(appt.membership_items) ? appt.membership_items : Array.isArray(appt.membershipItems) ? appt.membershipItems : []).forEach((it: any) => {
          const price = parseFloat(String(it.price ?? it.pricePaid ?? 0)) || 0;
          mem.push({ staffName, itemName: String(it.name ?? it.membership_name ?? "Membership"), quantity: 1, revenue: Math.round(price), date });
        });

        (Array.isArray(appt.package_items) ? appt.package_items : []).forEach((it: any) => {
          const qty = Number(it.quantity ?? 1) || 1;
          const price = parseFloat(String(it.price ?? 0)) || 0;
          pkg.push({ staffName, itemName: String(it.name ?? it.package_name ?? "Package"), quantity: qty, revenue: Math.round(price * qty), date });
        });
      });

      svc.sort((a, b) => b.revenue - a.revenue);
      prod.sort((a, b) => b.revenue - a.revenue);
      mem.sort((a, b) => b.revenue - a.revenue);
      pkg.sort((a, b) => b.revenue - a.revenue);
      setServiceRows(svc);
      setProductRows(prod);
      setMembershipRows(mem);
      setPackageRows(pkg);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setServiceRows([]); setProductRows([]); setMembershipRows([]); setPackageRows([]);
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, staffFilter, dispatch]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [itemType, serviceRows, productRows, membershipRows, packageRows]);

  useEffect(() => {
    const close = () => setShowStaffDrop(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const rows =
    itemType === "service"    ? serviceRows :
    itemType === "product"    ? productRows :
    itemType === "membership" ? membershipRows :
    packageRows;
  const itemColLabel =
    itemType === "service"    ? "Service Name" :
    itemType === "product"    ? "Product Name" :
    itemType === "membership" ? "Membership Name" :
    "Package Name";

  const totalQty = rows.reduce((s, r) => s + r.quantity, 0);
  const totalRev = rows.reduce((s, r) => s + r.revenue, 0);
  const topItem = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach(r => map.set(r.itemName, (map.get(r.itemName) ?? 0) + r.revenue));
    return [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  }, [rows]);
  const topStaff = rows[0]?.staffName ?? "—";

  const HEADERS = ["Staff Name", itemColLabel, "Quantity", "Revenue (₹)", "Date"];
  const exportRows = () => rows.map(r => [r.staffName, r.itemName, r.quantity, r.revenue, r.date]);
  const paged = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {REPORT_NAME}
          </Button>
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`staff-item-sales-${itemType}-${dateFrom}-${dateTo}`} csv print />
          </div>
        </div>
        <div className="rp-detail-tab-bar">
          {(["service", "product", "membership", "package"] as ItemType[]).map(t => (
            <span key={t} className={`rp-detail-tab rp-sis-type-tab ${itemType === t ? "active" : ""}`}
              onClick={() => setItemType(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </span>
          ))}
        </div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Date Range</label>
          <div className="rp-detail-date-range">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rp-detail-date-input" />
            <span className="rp-detail-date-sep">-</span>
            <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="rp-detail-date-input" />
          </div>
        </div>
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Staff Member</label>
          <button className="rp-detail-select" onClick={() => setShowStaffDrop(v => !v)}>
            {(staffOptions.find(o => o.value === staffFilter)?.label ?? "All").slice(0, 16)}
            <span className="rp-detail-caret">▼</span>
          </button>
          {showStaffDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {staffOptions.map(o => (
                <div key={o.value} className={`rp-detail-dropdown-item ${o.value === staffFilter ? "active" : ""}`}
                  onClick={() => { setStaffFilter(o.value); setShowStaffDrop(false); }}>{o.label}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-actions">
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={fetchData} loading={loading}>
            Run Report
          </Button>
        </div>
      </div>

      {loading ? <SkeletonStatCards count={4} /> : (
        <div className="rp-sra-summary-row">
          {[
            { label: "Total Quantity Sold", value: totalQty.toString() },
            { label: "Total Revenue",       value: `₹${totalRev.toLocaleString()}` },
            { label: "Top Item",            value: topItem },
            { label: "Top Staff",           value: topStaff },
          ].map(c => (
            <div key={c.label} className="rp-sra-summary-card">
              <div className="rp-sra-summary-val rp-sis-val">{c.value}</div>
              <div className="rp-sra-summary-label">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Staff Name</th>
              <th>{itemColLabel}</th>
              <th>Quantity</th>
              <th>Revenue (₹)</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={6} />
            ) : paged.length === 0 ? (
              <tr><td colSpan={6} className="rp-detail-empty-cell">No {itemType} sales data available</td></tr>
            ) : paged.map((r, i) => (
              <tr key={i}>
                <td className="rp-sis-idx">#{(currentPage - 1) * pageSize + i + 1}</td>
                <td className="fw-semibold">{r.staffName}</td>
                <td>{r.itemName}</td>
                <td>{r.quantity}</td>
                <td>₹{r.revenue.toLocaleString()}</td>
                <td>{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={rows.length}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />
    </div>
  );
}
