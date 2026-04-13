import React, { useState, useRef, useEffect } from "react";
import type { ServiceItem } from "../../types/scheduler-types";
import { STAFF_LIST, SERVICES_LIST } from "../../utils/schedulerMockData";
import { useSchedulerContext } from "../../store/SchedulerContext";
import TimeSelect from "../shared/TimeSelect";

interface ServiceRowProps {
  row: ServiceItem & { tempId: string };
  onChange: (
    id: string,
    field: string,
    value: string | number | boolean,
  ) => void;
  onRemove: (id: string) => void;
  hasError?: boolean;
  errorFields?: {
    service?: boolean;
    staff?: boolean;
    price?: boolean;
    qty?: boolean;
  };
}

const ERR_MSG: Record<string, string> = {
  service: "Please select a service",
  staff: "Please select staff",
  price: "Please enter price",
  qty: "Please enter qty",
};

const inputStyle = (hasErr: boolean): React.CSSProperties => ({
  width: "100%",
  padding: "5px 8px",
  fontSize: 12,
  border: `1px solid ${hasErr ? "#ef4444" : "#e5e7eb"}`,
  borderRadius: 6,
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
  background: hasErr ? "#fff5f5" : "#fff",
});

const errText: React.CSSProperties = {
  fontSize: 10,
  color: "#ef4444",
  marginTop: 2,
  display: "block",
};

const ServiceRow: React.FC<ServiceRowProps> = ({
  row,
  onChange,
  onRemove,
  errorFields = {},
}) => {
  const { interval } = useSchedulerContext() as any;

  const [serviceSearch, setServiceSearch] = useState(row.service || "");
  const [showDrop, setShowDrop] = useState(false);
  // Local string state for qty so user can freely type (e.g. clear field, type "4")
  const [qtyInput, setQtyInput] = useState(String(row.qty > 0 ? row.qty : 1));
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setServiceSearch(row.service || "");
  }, [row.service]);

  // Keep local qty in sync if parent resets the row
  useEffect(() => {
    setQtyInput(String(row.qty > 0 ? row.qty : 1));
  }, [row.tempId]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        setShowDrop(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const filtered = SERVICES_LIST.filter((s) =>
    s.name.toLowerCase().includes(serviceSearch.toLowerCase()),
  );

  function selectService(s: { name: string; price: number }) {
    setServiceSearch(s.name);
    onChange(row.tempId, "service", s.name);
    onChange(row.tempId, "price", s.price);
    const qty = row.qty > 0 ? row.qty : 1;
    onChange(row.tempId, "qty", qty);
    onChange(row.tempId, "total", s.price * qty);
    setShowDrop(false);
  }

  function handlePriceChange(val: string) {
    const num = Math.max(0, parseFloat(val) || 0);
    onChange(row.tempId, "price", num);
    const qty = row.qty > 0 ? row.qty : 1;
    onChange(row.tempId, "total", num * qty);
  }

  function handleQtyChange(val: string) {
    // Allow free typing — store raw string locally
    setQtyInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      onChange(row.tempId, "qty", num);
      onChange(row.tempId, "total", (row.price || 0) * num);
    }
  }

  function handleQtyBlur() {
    // On blur, clamp to minimum 1 if empty or invalid
    const num = parseFloat(qtyInput);
    const clamped = !isNaN(num) && num >= 1 ? num : 1;
    setQtyInput(String(clamped));
    onChange(row.tempId, "qty", clamped);
    onChange(row.tempId, "total", (row.price || 0) * clamped);
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 1.6fr 1.1fr 0.9fr 0.7fr 0.9fr 32px",
        gap: 6,
        padding: "8px 10px",
        borderBottom: "1px solid #f0f0f0",
        alignItems: "start",
        background: "#fff",
      }}
    >
      {/* Service */}
      <div ref={dropRef} style={{ position: "relative" }}>
        <input
          style={inputStyle(!!errorFields.service)}
          placeholder="Search service…"
          value={serviceSearch}
          onChange={(e) => {
            setServiceSearch(e.target.value);
            onChange(row.tempId, "service", e.target.value);
            setShowDrop(true);
          }}
          onFocus={() => setShowDrop(true)}
        />
        {errorFields.service && <span style={errText}>{ERR_MSG.service}</span>}
        {showDrop && filtered.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 200,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              boxShadow: "0 4px 16px rgba(0,0,0,.1)",
              maxHeight: 200,
              overflowY: "auto",
            }}
          >
            {filtered.map((s) => (
              <div
                key={s.name}
                onMouseDown={() => selectService(s)}
                style={{
                  padding: "7px 10px",
                  cursor: "pointer",
                  fontSize: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid #f3f4f6",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#f5f3ff")
                }
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
              >
                <span style={{ fontWeight: 500 }}>{s.name}</span>
                <span style={{ color: "#6b7280", fontSize: 11 }}>
                  ₹{s.price}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Staff */}
      <div>
        <div
          style={{
            background: "#1f2937",
            borderRadius: 16,
            padding: "4px 10px",
            display: "flex",
            alignItems: "center",
            gap: 4,
            border: `1px solid ${errorFields.staff ? "#ef4444" : "transparent"}`,
          }}
        >
          <span
            style={{
              color: "#9ca3af",
              cursor: "pointer",
              fontSize: 12,
              lineHeight: 1,
            }}
            onClick={() => onChange(row.tempId, "staffId", "")}
          >
            ×
          </span>
          <select
            value={row.staffId}
            onChange={(e) => onChange(row.tempId, "staffId", e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              width: "100%",
            }}
          >
            <option value="" style={{ color: "#000", background: "#fff" }}>
              Staff
            </option>
            {STAFF_LIST.map((s) => (
              <option
                key={s.id}
                value={s.id}
                style={{ color: "#000", background: "#fff" }}
              >
                {s.name}
              </option>
            ))}
          </select>
        </div>
        {errorFields.staff && <span style={errText}>{ERR_MSG.staff}</span>}
      </div>

      {/* Time */}
      <div>
        <div style={{ fontSize: 12 }}>
          <TimeSelect
            value={row.time}
            onChange={(val) => onChange(row.tempId, "time", val)}
            interval={interval || "30 Mins"}
            className="form-select"
          />
        </div>
      </div>

      {/* Price */}
      <input
        type="number"
        min={0}
        placeholder="0"
        value={row.price || ""}
        style={inputStyle(!!errorFields.price)}
        onChange={(e) => handlePriceChange(e.target.value)}
      />

      {/* Qty — free-type with local string state, clamps to 1 on blur */}
      <div>
        <input
          type="number"
          min={1}
          placeholder="1"
          value={qtyInput}
          style={inputStyle(!!errorFields.qty)}
          onChange={(e) => handleQtyChange(e.target.value)}
          onBlur={handleQtyBlur}
        />
        {errorFields.qty && <span style={errText}>{ERR_MSG.qty}</span>}
      </div>

      {/* Total */}
      <input
        readOnly
        value={row.total ? (row.total as number).toFixed(2) : "0.00"}
        style={{
          ...inputStyle(false),
          background: "#f3f4f6",
          color: "#374151",
          fontWeight: 600,
        }}
      />

      {/* Delete */}
      <button
        onClick={() => onRemove(row.tempId)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#ef4444",
          fontSize: 16,
          padding: "4px",
          marginTop: 2,
        }}
      >
        🗑
      </button>
    </div>
  );
};

export default ServiceRow;