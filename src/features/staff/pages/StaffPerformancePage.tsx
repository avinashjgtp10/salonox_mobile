import { useEffect, useState, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import { selectCurrentSalon } from "../../../store/selectors/slices.selectors";
import {
  ChevronLeft,
  ChevronRight,
  PersonFill,
  CalendarEvent,
  Scissors,
  Cart3,
  CurrencyRupee,
  Receipt,
  Clock,
} from "react-bootstrap-icons";
import toast from "react-hot-toast";
import api from "../../../services/api/axios";
import { STAFF, BOOKING, SALE } from "../../../services/api/endpoints";
import "../styles/StaffPerformancePage.scss";

// ── Types ────────────────────────────────────────────────────────────────────

interface StaffMember {
  id: string | number;
  first_name?: string;
  last_name?: string;
  fullName?: string;
  name?: string;
  user_id?: string;
  uuid?: string;
  role?: string;
}

interface ApptRow {
  id: string | number;
  client_name?: string;
  service_name?: string;
  start_time?: string;
  end_time?: string;
  status?: string;
  total?: number | string;
  staff_id?: string;
  staff_name?: string;
}

interface SaleRow {
  id: string | number;
  name: string;
  item_type: string;
  quantity: number;
  total_price: string;
  staff_id?: string | null;
  staff_name?: string | null;
  sale_id: string | number;
  client_name?: string | null;
  created_at?: string;
}

interface DaySummary {
  bookings: number;
  servicesSold: number;
  productsSold: number;
  revenue: number;
  appointments: ApptRow[];
  saleItems: SaleRow[];
}

// ── Calendar helpers ─────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function getMonthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Formatters ───────────────────────────────────────────────────────────────

function fmtTime(val?: string) {
  if (!val) return "—";
  try { return new Date(val).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); }
  catch { return val; }
}

function fmtCurrency(val: number) {
  return `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

const STATUS_CLASS: Record<string, string> = {
  confirmed: "spp-badge--blue",
  pending: "spp-badge--amber",
  completed: "spp-badge--green",
  cancelled: "spp-badge--red",
};

const TYPE_LABEL: Record<string, string> = {
  service: "Service",
  product: "Product",
  membership: "Membership",
  gift_card: "Gift Card",
  quick: "Quick",
};

// ── Main component ───────────────────────────────────────────────────────────

export default function StaffPerformancePage() {
  const currentSalon = useSelector(selectCurrentSalon);
  const salonId = currentSalon?.id;

  // staff list
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");

  // calendar
  const todayStr = today();
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // day data
  const [dayData, setDayData] = useState<DaySummary | null>(null);
  const [dayLoading, setDayLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ── Load staff list ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!salonId) return;
    setStaffLoading(true);
    api.get(STAFF.BASE, { params: { salon_id: salonId } })
      .then((res) => {
        const data = res.data?.data;
        const arr: StaffMember[] = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        setStaffList(arr);
        if (arr.length > 0 && !selectedStaffId) {
          setSelectedStaffId(String(arr[0].id));
        }
      })
      .catch(() => toast.error("Failed to load staff"))
      .finally(() => setStaffLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salonId]);

  // ── Build staff name map (all possible ID fields → name) ────────────────
  const staffNameMap = useCallback(() => {
    const map = new Map<string, string>();
    staffList.forEach((s) => {
      const name = `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.fullName || s.name || "";
      if (!name) return;
      [s.id, s.user_id, s.uuid].filter(Boolean).forEach((uid) => map.set(String(uid), name));
    });
    return map;
  }, [staffList]);

  // ── Resolve auth UUID for the selected staff member ──────────────────────
  const getStaffAuthIds = useCallback((staffId: string): string[] => {
    const s = staffList.find((m) => String(m.id) === staffId);
    if (!s) return [staffId];
    return [s.id, s.user_id, s.uuid].filter(Boolean).map(String);
  }, [staffList]);

  // ── Fetch day data ───────────────────────────────────────────────────────
  const fetchDayData = useCallback(async (date: string, staffId: string) => {
    if (!salonId || !staffId) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setDayLoading(true);
    setDayData(null);

    try {
      const authIds = getStaffAuthIds(staffId);
      const nameMap = staffNameMap();

      const [apptRes, saleRes] = await Promise.all([
        api.get(BOOKING.BASE, {
          params: { start_date: date, end_date: date, limit: 200 },
          signal: ctrl.signal,
        }),
        api.get(SALE.BASE, {
          params: { start_date: date, end_date: date, limit: 200 },
          signal: ctrl.signal,
        }),
      ]);

      if (ctrl.signal.aborted) return;

      // ── Appointments ──
      const apptRaw = apptRes.data?.data?.items ?? apptRes.data?.data ?? apptRes.data ?? [];
      const appts: ApptRow[] = (Array.isArray(apptRaw) ? apptRaw : [])
        .filter((a: any) => {
          const sid = String(a.staff_id ?? "");
          return authIds.includes(sid);
        });

      // ── Quick sales ──
      const salesRaw = saleRes.data?.data?.items ?? saleRes.data?.data ?? saleRes.data ?? [];
      const salesArr: any[] = Array.isArray(salesRaw) ? salesRaw : [];

      const saleItems: SaleRow[] = [];
      salesArr.forEach((sale: any) => {
        const items: any[] = Array.isArray(sale.items) ? sale.items : [];
        items.forEach((it: any) => {
          const sid = String(it.staff_id ?? "");
          if (!authIds.includes(sid)) return;
          saleItems.push({
            id: it.id,
            name: it.name ?? "—",
            item_type: it.item_type ?? "quick",
            quantity: Number(it.quantity ?? 1),
            total_price: String(it.total_price ?? it.unit_price ?? "0"),
            staff_id: it.staff_id,
            staff_name: nameMap.get(sid) || it.staff_name,
            sale_id: sale.id,
            client_name: sale.client_name,
            created_at: sale.created_at,
          });
        });
      });

      // ── Summary ──
      const bookings = appts.length;
      let servicesSold = 0;
      let productsSold = 0;
      let revenue = 0;

      appts.forEach((a) => {
        revenue += parseFloat(String(a.total ?? 0)) || 0;
        servicesSold += 1;
      });

      saleItems.forEach((it) => {
        const price = parseFloat(it.total_price) || 0;
        const qty = it.quantity;
        revenue += price;
        if (it.item_type === "product") productsSold += qty;
        else servicesSold += qty;
      });

      setDayData({ bookings, servicesSold, productsSold, revenue, appointments: appts, saleItems });
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.name === "AbortError") return;
      toast.error("Failed to load data for selected date");
    } finally {
      if (!ctrl.signal.aborted) setDayLoading(false);
    }
  }, [salonId, getStaffAuthIds, staffNameMap]);

  useEffect(() => {
    if (selectedDate && selectedStaffId) {
      fetchDayData(selectedDate, selectedStaffId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedStaffId]);

  // ── Calendar navigation ──────────────────────────────────────────────────
  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const calendarCells = getMonthGrid(viewYear, viewMonth);

  const selectedStaff = staffList.find((s) => String(s.id) === selectedStaffId);
  const selectedStaffName = selectedStaff
    ? `${selectedStaff.first_name ?? ""} ${selectedStaff.last_name ?? ""}`.trim() || selectedStaff.fullName || selectedStaff.name || "Staff"
    : "";

  const selectedDateFormatted = selectedDate
    ? new Date(selectedDate + "T12:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <div className="spp">
      {/* ── Page header ── */}
      <div className="spp__header">
        <div>
          <h1 className="spp__title">Staff Performance</h1>
          <p className="spp__subtitle">Select a staff member and date to view their appointments and sales.</p>
        </div>
      </div>

      {/* ── Staff selector ── */}
      <div className="spp__staff-row">
        <div className="spp__staff-select-wrap">
          <PersonFill size={14} className="spp__staff-icon" />
          {staffLoading ? (
            <div className="spp__staff-skeleton" />
          ) : (
            <select
              className="spp__staff-select"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
            >
              <option value="">— Select staff member —</option>
              {staffList.map((s) => {
                const name = `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.fullName || s.name || String(s.id);
                return <option key={String(s.id)} value={String(s.id)}>{name}{s.role ? ` (${s.role})` : ""}</option>;
              })}
            </select>
          )}
        </div>
      </div>

      {/* ── Main layout: calendar + detail ── */}
      <div className="spp__body">
        {/* Calendar panel */}
        <div className="spp__calendar-panel">
          <div className="spp__cal-nav">
            <button className="spp__cal-nav-btn" onClick={prevMonth}><ChevronLeft size={14} /></button>
            <span className="spp__cal-month-label">{MONTH_NAMES[viewMonth]} {viewYear}</span>
            <button className="spp__cal-nav-btn" onClick={nextMonth}><ChevronRight size={14} /></button>
          </div>

          <div className="spp__cal-grid">
            {DAY_LABELS.map((d) => (
              <div key={d} className="spp__cal-day-label">{d}</div>
            ))}
            {calendarCells.map((cell, i) => {
              if (!cell) return <div key={`empty-${i}`} className="spp__cal-cell spp__cal-cell--empty" />;
              const isToday = cell === todayStr;
              const isSelected = cell === selectedDate;
              return (
                <button
                  key={cell}
                  className={[
                    "spp__cal-cell",
                    isToday ? "spp__cal-cell--today" : "",
                    isSelected ? "spp__cal-cell--selected" : "",
                  ].filter(Boolean).join(" ")}
                  onClick={() => setSelectedDate(cell)}
                >
                  {parseInt(cell.slice(8), 10)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div className="spp__detail-panel">
          {!selectedStaffId ? (
            <div className="spp__empty-state">
              <PersonFill size={40} className="spp__empty-icon" />
              <p className="spp__empty-text">Select a staff member to view their performance.</p>
            </div>
          ) : (
            <>
              {/* Date heading */}
              <div className="spp__detail-header">
                <CalendarEvent size={16} className="spp__detail-header-icon" />
                <div>
                  <div className="spp__detail-date">{selectedDateFormatted}</div>
                  <div className="spp__detail-staff">{selectedStaffName}</div>
                </div>
              </div>

              {dayLoading ? (
                <div className="spp__detail-loading">
                  <div className="spp__spinner" />
                  <span>Loading…</span>
                </div>
              ) : dayData ? (
                <>
                  {/* Summary cards */}
                  <div className="spp__summary-grid">
                    <div className="spp__summary-card spp__summary-card--blue">
                      <div className="spp__summary-icon"><CalendarEvent size={18} /></div>
                      <div className="spp__summary-val">{dayData.bookings}</div>
                      <div className="spp__summary-label">Bookings</div>
                    </div>
                    <div className="spp__summary-card spp__summary-card--purple">
                      <div className="spp__summary-icon"><Scissors size={18} /></div>
                      <div className="spp__summary-val">{dayData.servicesSold}</div>
                      <div className="spp__summary-label">Services Sold</div>
                    </div>
                    <div className="spp__summary-card spp__summary-card--orange">
                      <div className="spp__summary-icon"><Cart3 size={18} /></div>
                      <div className="spp__summary-val">{dayData.productsSold}</div>
                      <div className="spp__summary-label">Products Sold</div>
                    </div>
                    <div className="spp__summary-card spp__summary-card--green">
                      <div className="spp__summary-icon"><CurrencyRupee size={18} /></div>
                      <div className="spp__summary-val">{fmtCurrency(dayData.revenue)}</div>
                      <div className="spp__summary-label">Revenue</div>
                    </div>
                  </div>

                  {/* Appointments */}
                  <div className="spp__section">
                    <div className="spp__section-title">
                      <CalendarEvent size={14} />
                      Appointments ({dayData.appointments.length})
                    </div>
                    {dayData.appointments.length === 0 ? (
                      <div className="spp__no-data">No appointments on this date.</div>
                    ) : (
                      <div className="spp__table-wrap">
                        <table className="spp__table">
                          <thead>
                            <tr>
                              <th>Time</th>
                              <th>Client</th>
                              <th>Service</th>
                              <th>Status</th>
                              <th>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dayData.appointments.map((a) => (
                              <tr key={a.id}>
                                <td>
                                  <span className="spp__time">
                                    <Clock size={11} />
                                    {fmtTime(a.start_time)}
                                    {a.end_time ? ` – ${fmtTime(a.end_time)}` : ""}
                                  </span>
                                </td>
                                <td className="spp__cell-primary">{a.client_name || "—"}</td>
                                <td className="spp__cell-muted">{a.service_name || "—"}</td>
                                <td>
                                  {a.status ? (
                                    <span className={`spp__badge ${STATUS_CLASS[a.status.toLowerCase()] ?? "spp__badge--gray"}`}>
                                      {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                                    </span>
                                  ) : "—"}
                                </td>
                                <td className="spp__cell-amount">
                                  {a.total != null ? fmtCurrency(parseFloat(String(a.total)) || 0) : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Quick Sales */}
                  <div className="spp__section">
                    <div className="spp__section-title">
                      <Receipt size={14} />
                      Quick Sales ({dayData.saleItems.length} item{dayData.saleItems.length !== 1 ? "s" : ""})
                    </div>
                    {dayData.saleItems.length === 0 ? (
                      <div className="spp__no-data">No quick sale items on this date.</div>
                    ) : (
                      <div className="spp__table-wrap">
                        <table className="spp__table">
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th>Type</th>
                              <th>Client</th>
                              <th>Qty</th>
                              <th>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dayData.saleItems.map((it, idx) => (
                              <tr key={`${it.sale_id}-${idx}`}>
                                <td className="spp__cell-primary">{it.name}</td>
                                <td>
                                  <span className={`spp__type-pill spp__type-pill--${it.item_type}`}>
                                    {TYPE_LABEL[it.item_type] ?? it.item_type}
                                  </span>
                                </td>
                                <td className="spp__cell-muted">{it.client_name || "—"}</td>
                                <td className="spp__cell-muted">{it.quantity}</td>
                                <td className="spp__cell-amount">
                                  {fmtCurrency(parseFloat(it.total_price) || 0)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="spp__empty-state">
                  <CalendarEvent size={36} className="spp__empty-icon" />
                  <p className="spp__empty-text">Click a date on the calendar to view activity.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
