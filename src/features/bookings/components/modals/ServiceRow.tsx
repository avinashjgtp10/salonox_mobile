import React, { useState, useRef, useEffect } from "react";
import type { ServiceItem } from "../../types/scheduler-types";
import { useSchedulerContext } from "../../store/SchedulerContext";
import TimeSelect from "../shared/TimeSelect";
import { Trash } from "react-bootstrap-icons";
import api from "../../../../services/api/axios";
import { SERVICES } from "../../../../services/api/endpoints/services.endpoints";

const DEBOUNCE_MS = 350;

interface SearchServiceResult {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface ServiceRowProps {
  row: ServiceItem & { tempId: string };
  onChange: (id: string, field: string, value: string | number | boolean) => void;
  onRemove: (id: string) => void;
  onClearError?: (tempId: string, field: string) => void;
  hasError?: boolean;
  errorFields?: { service?: boolean; staff?: boolean; price?: boolean; qty?: boolean };
  disabled?: boolean;
}

function fmtName(n: string) { return n.includes(" ") ? n : n.replace(/([a-z])([A-Z])/g, "$1 $2"); }

const ServiceRow: React.FC<ServiceRowProps> = ({ row, onChange, onRemove, onClearError, errorFields = {}, disabled }) => {
  const { interval, staffList, servicesList } = useSchedulerContext() as any;
  const [serviceSearch, setServiceSearch] = useState(row.service || "");
  const [showDrop, setShowDrop] = useState(false);
  const [qtyInput, setQtyInput] = useState(String(row.qty > 0 ? row.qty : 1));
  const [discountInput, setDiscountInput] = useState(String(row.discount || ""));
  const [apiResults, setApiResults] = useState<SearchServiceResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { setServiceSearch(row.service || ""); }, [row.service]);
  useEffect(() => { setQtyInput(String(row.qty > 0 ? row.qty : 1)); }, [row.tempId]);
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  async function fetchServiceResults(term: string) {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    try {
      const params = `search=${encodeURIComponent(term)}&is_active=true&limit=20`;
      const res = await api.get(SERVICES.LIST(params), { signal: abortRef.current.signal });
      const payload = (res.data as any)?.data;
      const items: any[] = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);
      setApiResults(
        items.map((s: any) => ({
          id: String(s.id ?? ""),
          name: s.name ?? "",
          price: parseFloat(String(s.price ?? 0)) || 0,
          duration: Number(s.duration) || 30,
        }))
      );
    } catch {
      // aborted or failed — keep showing existing results
    } finally {
      setIsSearching(false);
    }
  }

  function handleServiceSearchChange(value: string) {
    setServiceSearch(value);
    onChange(row.tempId, "service", value);
    setShowDrop(true);
    if (value.trim()) onClearError?.(row.tempId, "service");

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setApiResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(() => fetchServiceResults(value.trim()), DEBOUNCE_MS);
  }

  const localFiltered = (servicesList || []).filter((s: { name: string }) =>
    s.name.toLowerCase().includes(serviceSearch.toLowerCase())
  );
  const displayResults: Array<{ id?: string; name: string; price: number; duration?: number }> =
    apiResults !== null ? apiResults : localFiltered;

  function calcTotal(price: number, qty: number, disc: number) {
    return Math.max(0, price * qty - disc);
  }

  function selectService(s: { id?: string; name: string; price: number; duration?: number }) {
    setServiceSearch(s.name);
    onChange(row.tempId, "id", s.id ?? "");
    onChange(row.tempId, "service", s.name);
    onChange(row.tempId, "price", s.price);
    onChange(row.tempId, "duration", s.duration ?? 30);
    const qty = row.qty > 0 ? row.qty : 1;
    const disc = parseFloat(discountInput) || 0;
    onChange(row.tempId, "qty", qty);
    onChange(row.tempId, "total", calcTotal(s.price, qty, disc));
    setShowDrop(false);
    onClearError?.(row.tempId, "service");
    onClearError?.(row.tempId, "price");
  }

  function handlePriceChange(val: string) {
    const num = Math.max(0, parseFloat(val) || 0);
    const qty = row.qty > 0 ? row.qty : 1;
    const disc = parseFloat(discountInput) || 0;
    onChange(row.tempId, "price", num);
    onChange(row.tempId, "total", calcTotal(num, qty, disc));
    if (num > 0) onClearError?.(row.tempId, "price");
  }

  function handleQtyChange(val: string) {
    setQtyInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const disc = parseFloat(discountInput) || 0;
      onChange(row.tempId, "qty", num);
      onChange(row.tempId, "total", calcTotal(row.price || 0, num, disc));
      onClearError?.(row.tempId, "qty");
    }
  }

  function handleQtyBlur() {
    const num = parseFloat(qtyInput);
    const clamped = !isNaN(num) && num >= 1 ? num : 1;
    const disc = parseFloat(discountInput) || 0;
    setQtyInput(String(clamped));
    onChange(row.tempId, "qty", clamped);
    onChange(row.tempId, "total", calcTotal(row.price || 0, clamped, disc));
  }

  function handleDiscountChange(val: string) {
    setDiscountInput(val);
    const disc = parseFloat(val) || 0;
    const qty = row.qty > 0 ? row.qty : 1;
    onChange(row.tempId, "discount", disc);
    onChange(row.tempId, "total", calcTotal(row.price || 0, qty, disc));
  }

  function handleDiscountBlur() {
    const disc = Math.max(0, parseFloat(discountInput) || 0);
    const qty = row.qty > 0 ? row.qty : 1;
    setDiscountInput(disc > 0 ? String(disc) : "");
    onChange(row.tempId, "discount", disc);
    onChange(row.tempId, "total", calcTotal(row.price || 0, qty, disc));
  }

  function handleStaffChange(staffId: string) {
    const staffName = (staffList || []).find((s: any) => String(s.id) === staffId)?.name || "";
    onChange(row.tempId, "staffId", staffId);
    onChange(row.tempId, "staff", staffName);
    if (staffId) onClearError?.(row.tempId, "staff");
  }

  return (
    <div className="svc-row">

      {/* ── SERVICE ── */}
      <div className="svc-field" ref={dropRef}>
        <span className="svc-field__label">Service</span>
        <div className="svc-field__input-wrap">
          <input
            className={`svc-field__input${errorFields.service ? " svc-field__input--error" : ""}`}
            placeholder="Search service…"
            value={serviceSearch}
            disabled={disabled}
            onChange={(e) => handleServiceSearchChange(e.target.value)}
            onFocus={() => setShowDrop(true)}
          />
          {showDrop && (isSearching || displayResults.length > 0) && (
            <div className="svc-dropdown">
              {isSearching ? (
                <div className="svc-dropdown__searching">Searching…</div>
              ) : (
                displayResults.map((s) => (
                  <button
                    key={s.id ?? s.name}
                    className="svc-dropdown__item"
                    onMouseDown={() => selectService(s)}
                  >
                    <span className="svc-dropdown__name">{s.name}</span>
                    <span className="svc-dropdown__price">₹{s.price}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {errorFields.service && <span className="svc-field__err">Select a service</span>}
      </div>

      {/* ── STAFF ── */}
      <div className="svc-field">
        <span className="svc-field__label">Staff</span>
        <div className={`svc-staff-pill${errorFields.staff ? " svc-staff-pill--error" : ""}`}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(row.tempId, "staffId", "")}
            className="svc-staff-pill__clear"
          >×</button>
          <select
            disabled={disabled}
            value={row.staffId}
            onChange={(e) => handleStaffChange(e.target.value)}
            className="svc-staff-pill__select"
            style={{ color: row.staffId ? "#fff" : "#9ca3af" }}
          >
            <option value="" disabled style={{ color: "#000", background: "#fff" }}>Select Staff</option>
            {(staffList || []).map((s: { id: string; name: string }) => (
              <option key={s.id} value={s.id} style={{ color: "#000", background: "#fff" }}>
                {fmtName(s.name)}
              </option>
            ))}
          </select>
        </div>
        {errorFields.staff && <span className="svc-field__err">Select staff</span>}
      </div>

      {/* ── TIME ── */}
      <div className="svc-field">
        <span className="svc-field__label">Time</span>
        <TimeSelect
          disabled={disabled}
          value={row.time}
          onChange={(val) => onChange(row.tempId, "time", val)}
          interval={interval || "30 Mins"}
          className="svc-field__input svc-field__select"
        />
      </div>

      {/* ── PRICE ── */}
      <div className="svc-field">
        <span className="svc-field__label">Price</span>
        <input
          type="text"
          disabled={disabled}
          inputMode="numeric"
          placeholder="0"
          value={row.price || ""}
          className={`svc-field__input${errorFields.price ? " svc-field__input--error" : ""}`}
          onChange={(e) => handlePriceChange(e.target.value.replace(/[^0-9.]/g, ""))}
        />
        {errorFields.price && <span className="svc-field__err">Enter price</span>}
      </div>

      {/* ── QTY ── */}
      <div className="svc-field">
        <span className="svc-field__label">Qty</span>
        <input
          type="text"
          disabled={disabled}
          inputMode="numeric"
          placeholder="1"
          value={qtyInput}
          className={`svc-field__input${errorFields.qty ? " svc-field__input--error" : ""}`}
          onChange={(e) => handleQtyChange(e.target.value.replace(/[^0-9.]/g, ""))}
          onBlur={handleQtyBlur}
        />
        {errorFields.qty && <span className="svc-field__err">Enter qty</span>}
      </div>

      {/* ── DISCOUNT ── */}
      <div className="svc-field">
        <span className="svc-field__label">Disc (₹)</span>
        <input
          type="text"
          disabled={disabled}
          inputMode="numeric"
          placeholder="0"
          value={discountInput}
          className="svc-field__input"
          onChange={(e) => handleDiscountChange(e.target.value.replace(/[^0-9.]/g, ""))}
          onBlur={handleDiscountBlur}
        />
      </div>

      {/* ── TOTAL ── */}
      <div className="svc-field">
        <span className="svc-field__label">Total</span>
        <input
          readOnly
          value={row.total ? (row.total as number).toFixed(2) : "0.00"}
          className="svc-field__input svc-field__input--readonly"
        />
      </div>

      {/* ── DELETE ── */}
      <div className="svc-field svc-field--del">
        <span className="svc-field__label">&nbsp;</span>
        {!disabled && (
          <button className="svc-del-btn" onClick={() => onRemove(row.tempId)} title="Remove">
            <Trash size={14} />
          </button>
        )}
      </div>

    </div>
  );
};

export default ServiceRow;
