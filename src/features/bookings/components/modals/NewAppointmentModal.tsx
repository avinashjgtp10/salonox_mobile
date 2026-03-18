import React, { useState } from "react";
import type {
  Booking, ServiceItem, GroupItem, PackageItem, PaymentMode, DiscountType,
} from "../../types/scheduler-types";
import {
  CLIENT_LIST, CLIENT_STATS, REWARD_POINTS_OPTIONS, COUPON_CODES,
  STAFF_LIST, PACKAGES_LIST,
} from "../../utils/schedulerMockData";
import { useSchedulerContext } from "../../store/SchedulerContext";
import { addMinutes } from "../../utils/timeUtils";
import MiniCalendar from "../shared/MiniCalendar.tsx";
import ServiceRow from "./ServiceRow";
import GroupRow from "./GroupRow";
import TotalsPanel from "./TotalsPanel";
import "../../styles/NewAppointmentModal.scss";

interface Props {
  onClose: () => void;
  defaultStaffId?: string;
  defaultTime?: string;
  existingBooking?: Booking;
}

type TempService = ServiceItem & { tempId: string };
type TempGroup   = GroupItem   & { tempId: string };
type TempPkg     = PackageItem & { tempId: string };

const NewAppointmentModal: React.FC<Props> = ({
  onClose, defaultStaffId, defaultTime, existingBooking,
}) => {
  const { addBooking, updateBooking, currentDate } = useSchedulerContext();
  const isEditMode = !!existingBooking;

  const [clientSearch,     setClientSearch]     = useState(existingBooking?.clientName || "");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(existingBooking?.clientId || null);
  const [isWalkin,         setIsWalkin]         = useState(!existingBooking?.clientId && !!existingBooking);
  const [showClientDrop,   setShowClientDrop]   = useState(false);
  const [calDate,          setCalDate]          = useState(existingBooking?.billDate || currentDate);
  const [showCal,          setShowCal]          = useState(false);
  const [showPkgModal,     setShowPkgModal]     = useState(false);

  // ── Walk-in form state ─────────────────────────────────────────────────────
  const [showWalkinForm, setShowWalkinForm] = useState(false);
  const [walkinName,     setWalkinName]     = useState("");
  const [walkinPhone,    setWalkinPhone]    = useState("");

  const [serviceRows, setServiceRows] = useState<TempService[]>(
    existingBooking?.services.map(s => ({ ...s, tempId: "sr_" + s.id })) || [{
      tempId: "sr_" + Date.now(), id: "", service: "", staff: "",
      staffId: defaultStaffId || "", time: defaultTime || "10:00",
      price: 0, qty: 0, total: 0,
    }]
  );
  const [groupRows,   setGroupRows]   = useState<TempGroup[]>(
    existingBooking?.groupItems?.map(g => ({ ...g, tempId: "gr_" + g.id })) || []
  );
  const [packageRows, setPackageRows] = useState<TempPkg[]>(
    existingBooking?.packageItems?.map(p => ({ ...p, tempId: "pk_" + p.id })) || []
  );

  const [rewardPoints,   setRewardPoints]   = useState(existingBooking?.rewardPoints   || "");
  const [exCharges,      setExCharges]      = useState(existingBooking?.exCharges      || 0);
  const [discount,       setDiscount]       = useState(existingBooking?.discount       || 0);
  const [discountType,   setDiscountType]   = useState<DiscountType>(existingBooking?.discountType || "Percentage (%)");
  const [gst,            setGst]            = useState(existingBooking?.gst            || 0);
  const [payMode,        setPayMode]        = useState<PaymentMode>(existingBooking?.paymentMode || "Cash");
  const [adjustPayment,  setAdjustPayment]  = useState(existingBooking?.payingNow      || 0);
  const [couponInput,    setCouponInput]    = useState(existingBooking?.couponCode      || "");
  const [couponDiscount, setCouponDiscount] = useState(existingBooking?.couponDiscount  || 0);
  const [couponApplied,  setCouponApplied]  = useState(existingBooking?.couponCode      || "");
  const [couponError,    setCouponError]    = useState("");
  const [notes,          setNotes]          = useState(existingBooking?.notes           || "");

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedClient  = CLIENT_LIST.find(c => c.id === selectedClientId);
  const selectedStats   = CLIENT_STATS?.find?.((c: any) => c.clientId === selectedClientId) as any;

  const filteredClients = CLIENT_LIST.filter(c =>
    clientSearch.length >= 3 && (
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.phone.includes(clientSearch)
    )
  );

  const subtotal      = [...serviceRows, ...groupRows, ...packageRows].reduce((a, r) => a + (r.total || 0), 0);
  const discountVal   = discountType === "Percentage (%)" ? subtotal * discount / 100 : discount;
  const totalDiscount = discountVal + couponDiscount;
  const taxable       = Math.max(0, subtotal - totalDiscount);
  const grandTotal    = taxable + taxable * gst / 100 + exCharges;
  const dueAmount     = grandTotal - adjustPayment;

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleWalkinConfirm() {
    if (!walkinName.trim()) return;
    setIsWalkin(true);
    setClientSearch(walkinName.trim());
    setSelectedClientId(null);
    setShowWalkinForm(false);
    setShowClientDrop(false);
  }

  function handleApplyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (COUPON_CODES[code] !== undefined) {
      setCouponDiscount(COUPON_CODES[code]);
      setCouponApplied(code);
      setCouponError("");
    } else {
      setCouponDiscount(0); setCouponApplied(""); setCouponError("Invalid coupon code");
    }
  }

  function updateServiceRow(id: string, field: string, value: string | number | boolean) {
    setServiceRows(rows => rows.map(r => r.tempId !== id ? r : { ...r, [field]: value }));
  }
  function removeServiceRow(id: string) { setServiceRows(rows => rows.filter(r => r.tempId !== id)); }
  function updateGroupRow(id: string, field: string, value: string | number) {
    setGroupRows(rows => rows.map(r => r.tempId !== id ? r : { ...r, [field]: value }));
  }
  function removeGroupRow(id: string) { setGroupRows(rows => rows.filter(r => r.tempId !== id)); }

  function addPackage(pkg: typeof PACKAGES_LIST[0]) {
    setPackageRows(r => [...r, {
      tempId: "pk_" + Date.now(), id: "",
      packageId: pkg.id, packageName: pkg.name,
      price: pkg.price, qty: 1, total: pkg.price,
    }]);
    setShowPkgModal(false);
  }

  function handleSave() {
  const clientName  = isWalkin
    ? (walkinName || clientSearch || "Walk-In")
    : (selectedClient?.name || clientSearch || "Walk-In");
  const clientPhone = isWalkin
    ? walkinPhone
    : (selectedClient?.phone || existingBooking?.clientPhone || "");

  // Group services by staffId
  const staffServiceMap: Record<string, TempService[]> = {};
  serviceRows.forEach(r => {
    const sid = r.staffId || defaultStaffId || existingBooking?.staffId || STAFF_LIST[0].id;
    if (!staffServiceMap[sid]) staffServiceMap[sid] = [];
    staffServiceMap[sid].push(r);
  });

  const staffIds = Object.keys(staffServiceMap);

  // If editing — just update as single booking (no split)
  if (isEditMode) {
    const firstRow  = serviceRows[0];
    const startTime = firstRow?.time || existingBooking?.startTime || "10:00";
    const endTime   = addMinutes(startTime, 30);
    updateBooking({
      ...existingBooking!,
      clientId: selectedClientId || undefined,
      clientName, clientPhone,
      startTime, endTime,
      staffId: firstRow?.staffId || existingBooking?.staffId || STAFF_LIST[0].id,
      billDate: calDate,
      services: serviceRows.map(r => ({
        id: r.id || "s_" + r.tempId, service: r.service,
        staff: STAFF_LIST.find(s => s.id === r.staffId)?.name || r.staff || "",
        staffId: r.staffId, time: r.time,
        price: r.price, qty: r.qty || 1, total: r.total,
      })),
      groupItems: groupRows.map(r => ({
        id: r.id || "g_" + r.tempId, guestName: r.guestName,
        service: r.service, staffId: r.staffId,
        time: r.time, price: r.price, qty: r.qty || 1, total: r.total,
      })),
      packageItems: packageRows.map(r => ({
        id: r.id || "pk_" + r.tempId, packageId: r.packageId,
        packageName: r.packageName, price: r.price, qty: r.qty, total: r.total,
      })),
      paymentMode: payMode, rewardPoints, exCharges,
      discount, discountType, gst,
      couponCode: couponApplied, couponDiscount,
      subtotal, taxableAmount: taxable, grandTotal,
      payingNow: adjustPayment, dueAmount, notes,
      paymentStatus: adjustPayment >= grandTotal ? "Paid" : adjustPayment > 0 ? "Partial" : "Unpaid",
    });
    onClose();
    return;
  }

  // New booking — create one booking per staff
  staffIds.forEach((staffId, index) => {
    const staffServices = staffServiceMap[staffId];
    const firstRow      = staffServices[0];
    const startTime     = firstRow?.time || defaultTime || "10:00";
    const endTime       = addMinutes(startTime, 30);

    // Only first staff booking gets full payment, rest get 0
    const staffSubtotal = staffServices.reduce((a, r) => a + (r.total || 0), 0);

    const bookingData: Booking = {
      id:          "b_" + Date.now() + "_" + index,
      clientId:    selectedClientId || undefined,
      clientName,  clientPhone,
      staffId,
      date:        currentDate,
      billDate:    calDate,
      startTime,   endTime,
      services: staffServices.map(r => ({
        id: "s_" + r.tempId, service: r.service,
        staff: STAFF_LIST.find(s => s.id === r.staffId)?.name || r.staff || "",
        staffId: r.staffId, time: r.time,
        price: r.price, qty: r.qty || 1, total: r.total,
      })),
      groupItems:   [],
      packageItems: index === 0 ? packageRows.map(r => ({
        id: "pk_" + r.tempId, packageId: r.packageId,
        packageName: r.packageName, price: r.price, qty: r.qty, total: r.total,
      })) : [],
      status:        "Confirmed",
      paymentStatus: index === 0
        ? (adjustPayment >= grandTotal ? "Paid" : adjustPayment > 0 ? "Partial" : "Unpaid")
        : "Unpaid",
      paymentMode:   payMode,
      rewardPoints:  index === 0 ? rewardPoints : "",
      exCharges:     index === 0 ? exCharges : 0,
      discount:      index === 0 ? discount : 0,
      discountType,
      gst:           index === 0 ? gst : 0,
      couponCode:    index === 0 ? couponApplied : "",
      couponDiscount: index === 0 ? couponDiscount : 0,
      subtotal:      staffSubtotal,
      taxableAmount: staffSubtotal,
      grandTotal:    staffSubtotal,
      payingNow:     index === 0 ? adjustPayment : 0,
      dueAmount:     staffSubtotal,
      notes,
    };

    addBooking(bookingData);
  });

  onClose();
}


  return (
    <div className="appt-drawer-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="appt-drawer-content">
        <div className="appt-drawer-header">
          <button className="btn-close-drawer" onClick={onClose}>✕</button>
          <h2>
            {isEditMode ? "Edit Appointment" : "New Appointment"}
          </h2>
          {isEditMode && (
            <span className="edit-badge">
              Editing #{existingBooking.id}
            </span>
          )}
        </div>

        <div className="appt-drawer-body">

          {/* ── Client search row ── */}
          <div className="client-search-row">
            <div className="search-container">
              <input
                className="form-input"
                placeholder="Search By Name / Contact (min 3 chars)"
                value={clientSearch}
                onChange={e => {
                  setClientSearch(e.target.value);
                  setShowClientDrop(true);
                  setIsWalkin(false);
                  setSelectedClientId(null);
                  setWalkinName(""); setWalkinPhone("");
                }}
                onFocus={() => clientSearch.length >= 3 && setShowClientDrop(true)}
              />
              {showClientDrop && filteredClients.length > 0 && (
                <div className="client-dropdown">
                  {filteredClients.map(c => (
                    <div key={c.id}
                      className="client-dropdown__item"
                      onClick={() => {
                        setSelectedClientId(c.id);
                        setClientSearch(c.name);
                        setShowClientDrop(false);
                        setIsWalkin(false);
                        setWalkinName(""); setWalkinPhone("");
                      }}
                    >
                      <div className="client-name">{c.name}</div>
                      <div className="client-phone">{c.phone}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Walk-in button */}
            <button
              onClick={() => { setShowWalkinForm(true); setSelectedClientId(null); }}
              className={`btn-walkin ${isWalkin ? 'active' : ''}`}
            >
              {isWalkin ? `✓ ${walkinName || "Walk-In"}` : "Walkin Client"}
            </button>

            {/* Add Client button */}
            <button
              disabled
              className="btn-add-client"
            >
              + Add Client
            </button>

            {/* Bill date */}
            <div className="bill-date-container">
              <span className="section-label mb-0">Bill Date</span>
              <div style={{ position: "relative" }}>
                <input readOnly value={calDate} onClick={() => setShowCal(v => !v)}
                  className="form-input date-input" />
                {showCal && <MiniCalendar value={calDate} onChange={(d: string) => { setCalDate(d); setShowCal(false); }} onClose={() => setShowCal(false)} />}
              </div>
            </div>
          </div>

          {/* ── Walk-in form popup ── */}
          {showWalkinForm && (
            <div style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,.4)", zIndex: 3000,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
              onClick={() => setShowWalkinForm(false)}
            >
              <div
                style={{
                  background: "#fff", borderRadius: 12, padding: 28,
                  width: "min(380px,90vw)",
                  boxShadow: "0 8px 32px rgba(0,0,0,.2)",
                }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>🚶 Walk-In Client</h3>
                  <button onClick={() => setShowWalkinForm(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#6b7280" }}>✕</button>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>
                    Client Name <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    autoFocus
                    className="form-input"
                    placeholder="Enter name"
                    value={walkinName}
                    onChange={e => setWalkinName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleWalkinConfirm()}
                  />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>
                    Phone Number <span style={{ color: "#9ca3af", fontSize: 11 }}>(optional)</span>
                  </label>
                  <input
                    className="form-input"
                    placeholder="Enter phone"
                    value={walkinPhone}
                    onChange={e => setWalkinPhone(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleWalkinConfirm()}
                  />
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setShowWalkinForm(false)}
                    style={{ flex: 1, padding: "10px 0", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                  >Cancel</button>
                  <button
                    onClick={handleWalkinConfirm}
                    disabled={!walkinName.trim()}
                    style={{
                      flex: 1, padding: "10px 0", border: "none", borderRadius: 8,
                      background: walkinName.trim() ? "#1f2937" : "#d1d5db",
                      color: "#fff", fontSize: 13, fontWeight: 600,
                      cursor: walkinName.trim() ? "pointer" : "not-allowed",
                      fontFamily: "inherit",
                    }}
                  >Confirm</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Existing client stats panel ── */}
          {selectedClientId && selectedStats && (
            <div className="client-stats-panel">
              <div className="client-stats-panel__header">
                <div className="avatar">
                  {selectedClient!.name.charAt(0)}
                </div>
                <div className="info">
                  <div className="name">{selectedClient!.name}</div>
                  <div className="sub">{selectedClient!.phone} &nbsp;·&nbsp; {selectedStats.address}</div>
                </div>
                {selectedStats.membership !== "NA" && (
                  <span className={`membership-badge ${selectedStats.membership.toLowerCase()}`}>
                    ⭐ {selectedStats.membership}
                  </span>
                )}
              </div>

              <div className="client-stats-panel__grid">
                <div className="info-cell">
                  <span className="info-cell__label">Reward Points</span>
                  <span className="info-cell__value">{selectedStats.rewardPoints}</span>
                </div>
                <div className="info-cell">
                  <span className="info-cell__label">Ewallet Amt</span>
                  <span className="info-cell__value">₹{selectedStats.ewalletAmt}</span>
                </div>
                <div className={`info-cell ${selectedStats.unpaidAmt > 0 ? 'danger' : ''}`}>
                  <span className="info-cell__label">Unpaid Amt</span>
                  <span className="info-cell__value">₹{selectedStats.unpaidAmt}</span>
                </div>
                <div className="info-cell">
                  <span className="info-cell__label">Assign Discount</span>
                  <span className="info-cell__value">{selectedStats.assignDiscount}%</span>
                </div>
                <div className="info-cell">
                  <span className="info-cell__label">Disc. Validity</span>
                  <span className="info-cell__value">{selectedStats.discountValidity}</span>
                </div>
                <div className="info-cell">
                  <span className="info-cell__label">Membership</span>
                  <span className="info-cell__value">{selectedStats.membership}</span>
                </div>
                <div className={`info-cell ${selectedStats.noShow > 0 ? 'danger' : ''}`}>
                  <span className="info-cell__label">No Show</span>
                  <span className="info-cell__value">{selectedStats.noShow}</span>
                </div>
                <div className={`info-cell ${selectedStats.cancelled > 0 ? 'danger' : ''}`}>
                  <span className="info-cell__label">Cancelled</span>
                  <span className="info-cell__value">{selectedStats.cancelled}</span>
                </div>
                <div className="info-cell">
                  <span className="info-cell__label">Total Visits</span>
                  <span className="info-cell__value">{selectedStats.totalVisit}</span>
                </div>
                <div className="info-cell">
                  <span className="info-cell__label">Last Visit</span>
                  <span className="info-cell__value">{selectedStats.lastVisit}</span>
                </div>
                <div className="info-cell info">
                  <span className="info-cell__label">Total Revenue</span>
                  <span className="info-cell__value">₹{selectedStats.totalRevenue.toLocaleString()}</span>
                </div>
                <div className="info-cell link">
                  <span className="info-cell__label">View History</span>
                  <span className="info-cell__value">Click Here</span>
                </div>
              </div>

              {/* Notes + Staff alert */}
              {(selectedStats.notes || selectedStats.staffAlert) && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, paddingTop: 12, borderTop: "1px solid #e5e7eb", marginTop: 14 }}>
                  {selectedStats.notes && (
                    <div>
                      <div className="info-cell__label">📝 Notes</div>
                      <div style={{ fontSize: 12, color: "#374151" }}>{selectedStats.notes}</div>
                    </div>
                  )}
                  {selectedStats.staffAlert && (
                    <div>
                      <div className="info-cell__label" style={{ color: "#ef4444" }}>🔔 Staff Alert</div>
                      <div style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>{selectedStats.staffAlert}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Services header */}
          <div className="appt-table-header appt-table-header--services">
            <div>Services</div><div>Staff</div><div>Time</div><div>Price</div><div>Qty</div><div>Total</div><div></div>
          </div>
          {serviceRows.map(row => (
            <ServiceRow key={row.tempId} row={row} onChange={updateServiceRow} onRemove={removeServiceRow} />
          ))}

          {/* Group rows */}
          {groupRows.length > 0 && (
            <>
              <div className="appt-table-header appt-table-header--groups">
                <div>Guest</div><div>Service</div><div>Staff</div><div>Time</div><div>Price</div><div>Qty</div><div>Total</div><div></div>
              </div>
              {groupRows.map(row => (
                <GroupRow key={row.tempId} row={row} onChange={updateGroupRow} onRemove={removeGroupRow} />
              ))}
            </>
          )}

          {/* Package rows */}
          {packageRows.length > 0 && (
            <div className="package-rows-section">
              <div className="appt-table-header" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 40px", background: "#fef3c7", color: "#92400e" }}>
                <div>Package</div><div>Price</div><div>Qty</div><div>Total</div><div></div>
              </div>
              {packageRows.map(row => (
                <div key={row.tempId} className="appt-modal__package-row" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 40px", gap: 8, padding: 12, borderBottom: "1px solid #fef3c7", alignItems: "center", background: "#fffbeb" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{row.packageName}</div>
                  <input readOnly value={row.price} className="form-input" style={{ background: "#f9fafb" }} />
                  <input type="number" value={row.qty} className="form-input"
                    onChange={e => {
                      const qty = Math.max(1, parseInt(e.target.value) || 1);
                      setPackageRows(rows => rows.map(r => r.tempId === row.tempId ? { ...r, qty, total: r.price * qty } : r));
                    }} />
                  <input readOnly value={row.total} className="form-input" style={{ background: "#f9fafb" }} />
                  <button className="btn-icon btn-icon--danger" onClick={() => setPackageRows(r => r.filter(x => x.tempId !== row.tempId))}>🗑</button>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 12, marginTop: 16, marginBottom: 24, flexWrap: "wrap" }}>
            {[
              { label: "Add Services", onClick: () => setServiceRows(r => [...r, { tempId: "sr_" + Date.now(), id: "", service: "", staff: "", staffId: "", time: "10:00", price: 0, qty: 0, total: 0 }]) },
              { label: "Add To Group", onClick: () => setGroupRows(r => [...r, { tempId: "gr_" + Date.now(), id: "", guestName: "", service: "", staffId: "", time: "10:00", price: 0, qty: 0, total: 0 }]) },
              { label: "Add Package",  onClick: () => setShowPkgModal(true) },
            ].map(({ label, onClick }) => (
              <button key={label} onClick={onClick} className="btn-add-client" style={{ background: "#1f2937", color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                {label} <span style={{ fontSize: 16 }}>+</span>
              </button>
            ))}
          </div>

          {/* Extras grid */}
          <div className="appt-extras-grid">
            <div className="field-group">
              <label>Reward Points</label>
              <select className="form-select" value={rewardPoints} onChange={e => setRewardPoints(e.target.value)}>
                {REWARD_POINTS_OPTIONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="field-group">
              <label>Ex Charges</label>
              <input type="number" className="form-input" value={exCharges || ""} onChange={e => setExCharges(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="field-group">
              <label>Discount</label>
              <input type="number" className="form-input" value={discount || ""} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="field-group">
              <label>Discount Type</label>
              <select className="form-select" value={discountType} onChange={e => setDiscountType(e.target.value as DiscountType)}>
                <option>Percentage (%)</option><option>Flat (₹)</option>
              </select>
            </div>
            <div className="field-group">
              <label>GST %</label>
              <input type="number" className="form-input" value={gst || ""} onChange={e => setGst(parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          {/* Payment + Totals */}
          <div className="appt-payment-section">
            <div className="payment-left">
              <div className="pay-modes">
                {(["Cash", "Card", "UPI"] as PaymentMode[]).map(m => (
                  <label key={m}>
                    <input type="radio" name="paymode" checked={payMode === m} onChange={() => setPayMode(m)} /> {m}
                  </label>
                ))}
              </div>
              <div className="field-group" style={{ marginBottom: 16 }}>
                <label className="section-label">Adjust Payment</label>
                <input type="number" className="form-input" value={adjustPayment || ""} onChange={e => setAdjustPayment(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="field-group" style={{ marginBottom: 16 }}>
                <label className="section-label">Coupon Code</label>
                <div className="coupon-box">
                  <input className="form-input" placeholder="SAVE10, FLAT50, NEW20"
                    value={couponInput} onChange={e => { setCouponInput(e.target.value); setCouponError(""); }}
                    onKeyDown={e => e.key === "Enter" && handleApplyCoupon()} />
                  <button className="btn-add-client" style={{ background: "#1f2937", color: "#fff" }} onClick={handleApplyCoupon}>Apply</button>
                </div>
                {couponApplied && <div style={{ fontSize: 12, color: "#22c55e", marginTop: 4 }}>✓ "{couponApplied}" applied — ₹{couponDiscount} off</div>}
                {couponError   && <div style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>{couponError}</div>}
              </div>
              <textarea className="form-textarea" placeholder="Enter Notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
            </div>

            <TotalsPanel
              subtotal={subtotal} exCharges={exCharges}
              discount={discount} discountType={discountType}
              gst={gst} adjustPayment={adjustPayment}
              couponDiscount={couponDiscount}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="appt-drawer-footer">
          <button onClick={() => window.print()} className="btn-print">
            🖨 Print
          </button>
          <button className="btn-save" onClick={handleSave}>
            {isEditMode ? "Update Appointment" : "Save"}
          </button>
        </div>
      </div>

      {/* Package picker */}
      {showPkgModal && (
        <div className="pkg-picker-overlay" onClick={() => setShowPkgModal(false)}>
          <div className="pkg-picker-content" onClick={e => e.stopPropagation()}>
            <div className="pkg-picker-content__header">
              <h3>Select Package</h3>
              <button onClick={() => setShowPkgModal(false)} className="btn-close">✕</button>
            </div>
            {PACKAGES_LIST.map(pkg => (
              <div key={pkg.id} onClick={() => addPackage(pkg)} className="pkg-picker-content__item">
                <div className="pkg-info">
                  <div className="pkg-name">{pkg.name}</div>
                  <div className="pkg-services">{pkg.services.join(", ")}</div>
                </div>
                <div className="pkg-price">₹{pkg.price}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NewAppointmentModal;
