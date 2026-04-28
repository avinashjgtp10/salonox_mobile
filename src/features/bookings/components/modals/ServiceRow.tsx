import React, { useState, useRef, useEffect } from "react";
import type { ServiceItem } from "../../types/scheduler-types";
import { useSchedulerContext } from "../../store/SchedulerContext";
import TimeSelect from "../shared/TimeSelect";

interface ServiceRowProps {
  row: ServiceItem & { tempId: string };
  onChange: (id: string, field: string, value: string | number | boolean) => void;
  onRemove: (id: string) => void;
  onClearError?: (tempId: string, field: string) => void;
  hasError?: boolean;
  errorFields?: { service?: boolean; staff?: boolean; price?: boolean; qty?: boolean };
  disabled?: boolean;
}

const ERR_MSG: Record<string, string> = {
  service: "Please select a service",
  staff: "Please select staff",
  price: "Please enter price",
  qty: "Please enter qty",
};

const ServiceRow: React.FC<ServiceRowProps> = ({ row, onChange, onRemove, onClearError, errorFields = {}, disabled }) => {
  const { interval, staffList, servicesList } = useSchedulerContext() as any;
  const [serviceSearch, setServiceSearch] = useState(row.service || "");
  const [showDrop, setShowDrop] = useState(false);
  const [qtyInput, setQtyInput] = useState(String(row.qty > 0 ? row.qty : 1));
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setServiceSearch(row.service || ""); }, [row.service]);
  useEffect(() => { setQtyInput(String(row.qty > 0 ? row.qty : 1)); }, [row.tempId]);
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const filtered = (servicesList || []).filter((s: { name: string; duration?: number }) => s.name.toLowerCase().includes(serviceSearch.toLowerCase()));

  function selectService(s: { id?: string; name: string; price: number; duration?: number }) {
    setServiceSearch(s.name);
    onChange(row.tempId, "id", s.id ?? "");
    onChange(row.tempId, "service", s.name);
    onChange(row.tempId, "price", s.price);
    onChange(row.tempId, "duration", s.duration ?? 30);
    const qty = row.qty > 0 ? row.qty : 1;
    onChange(row.tempId, "qty", qty);
    onChange(row.tempId, "total", s.price * qty);
    setShowDrop(false);
    onClearError?.(row.tempId, "service");
    onClearError?.(row.tempId, "price");
  }

  function handlePriceChange(val: string) {
    const num = Math.max(0, parseFloat(val) || 0);
    onChange(row.tempId, "price", num);
    const qty = row.qty > 0 ? row.qty : 1;
    onChange(row.tempId, "total", num * qty);
    if (num > 0) onClearError?.(row.tempId, "price");
  }

  function handleQtyChange(val: string) {
    setQtyInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      onChange(row.tempId, "qty", num);
      onChange(row.tempId, "total", (row.price || 0) * num);
      onClearError?.(row.tempId, "qty");
    }
  }

  function handleQtyBlur() {
    const num = parseFloat(qtyInput);
    const clamped = !isNaN(num) && num >= 1 ? num : 1;
    setQtyInput(String(clamped));
    onChange(row.tempId, "qty", clamped);
    onChange(row.tempId, "total", (row.price || 0) * clamped);
  }

  function handleStaffChange(staffId: string) {
    const staffName = (staffList || []).find((s: any) => String(s.id) === staffId)?.name || "";
    onChange(row.tempId, "staffId", staffId);
    onChange(row.tempId, "staff", staffName);
    if (staffId) onClearError?.(row.tempId, "staff");
  }

  return (
    <div className="row g-1 px-2 py-2 border-bottom align-items-start bg-white mx-0">
      {/* Service */}
      <div className="col position-relative" ref={dropRef} style={{ minWidth: 140 }}>
        <input
          className={`form-control form-control-sm${errorFields.service ? " is-invalid" : ""}`}
          placeholder="Search service…"
          value={serviceSearch}
          disabled={disabled}
          onChange={(e) => { setServiceSearch(e.target.value); onChange(row.tempId, "service", e.target.value); setShowDrop(true); if (e.target.value.trim()) onClearError?.(row.tempId, "service"); }}
          onFocus={() => setShowDrop(true)}
        />
        {errorFields.service && <div className="invalid-feedback d-block" style={{ fontSize: 10 }}>{ERR_MSG.service}</div>}
        {showDrop && filtered.length > 0 && (
          <div className="dropdown-menu show w-100 p-0" style={{ maxHeight: 200, overflowY: "auto", zIndex: 200 }}>
            {filtered.map((s: { id?: string; name: string; price: number }) => (
              <button key={s.name} className="dropdown-item d-flex justify-content-between py-1" style={{ fontSize: 12 }} onMouseDown={() => selectService(s)}>
                <span className="fw-semibold">{s.name}</span>
                <span className="text-muted small">₹{s.price}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Staff */}
      <div className="col" style={{ minWidth: 130 }}>
        <div className={`d-flex align-items-center gap-1 rounded-pill px-2 py-1${errorFields.staff ? " border border-danger" : ""}`} style={{ background: "#1f2937" }}>
          <span className="text-secondary" style={{ cursor: disabled ? "default" : "pointer", fontSize: 12, opacity: disabled ? 0.5 : 1 }} onClick={() => !disabled && onChange(row.tempId, "staffId", "")}>×</span>
          <select disabled={disabled} value={row.staffId} onChange={(e) => handleStaffChange(e.target.value)} className="border-0 bg-transparent w-100" style={{ outline: "none", color: row.staffId ? "#fff" : "#9ca3af", fontSize: 12, fontWeight: 600, cursor: disabled ? "default" : "pointer", fontFamily: "inherit" }}>
            <option value="" disabled style={{ color: "#000", background: "#fff" }}>Select Staff</option>
            {(staffList || []).map((s: { id: string; name: string }) => <option key={s.id} value={s.id} style={{ color: "#000", background: "#fff" }}>{s.name}</option>)}
          </select>
        </div>
        {errorFields.staff && <div className="text-danger" style={{ fontSize: 10 }}>{ERR_MSG.staff}</div>}
      </div>

      {/* Time */}
      <div className="col" style={{ minWidth: 90 }}>
        <TimeSelect disabled={disabled} value={row.time} onChange={(val) => onChange(row.tempId, "time", val)} interval={interval || "30 Mins"} className="form-select form-select-sm" />
      </div>

      {/* Price */}
      <div className="col" style={{ minWidth: 70 }}>
        <input type="text" disabled={disabled} inputMode="numeric" placeholder="0" value={row.price || ""} className={`form-control form-control-sm${errorFields.price ? " is-invalid" : ""}`} onChange={(e) => handlePriceChange(e.target.value.replace(/[^0-9.]/g, ""))} />
        {errorFields.price && <div className="invalid-feedback d-block" style={{ fontSize: 10 }}>{ERR_MSG.price}</div>}
      </div>

      {/* Qty */}
      <div className="col" style={{ minWidth: 60 }}>
        <input type="text" disabled={disabled} inputMode="numeric" placeholder="1" value={qtyInput} className={`form-control form-control-sm${errorFields.qty ? " is-invalid" : ""}`} onChange={(e) => handleQtyChange(e.target.value.replace(/[^0-9.]/g, ""))} onBlur={handleQtyBlur} />
        {errorFields.qty && <div className="invalid-feedback d-block" style={{ fontSize: 10 }}>{ERR_MSG.qty}</div>}
      </div>

      {/* Total */}
      <div className="col" style={{ minWidth: 70 }}>
        <input readOnly value={row.total ? (row.total as number).toFixed(2) : "0.00"} className="form-control form-control-sm bg-light fw-semibold text-secondary" />
      </div>

      {/* Delete */}
      <div className="col-auto d-flex align-items-start pt-1">
        {!disabled && <button className="btn btn-sm btn-link text-danger p-0" style={{ fontSize: 16 }} onClick={() => onRemove(row.tempId)}>🗑</button>}
      </div>
    </div>
  );
};

export default ServiceRow;