import React, { useState, useRef, useEffect } from "react";
import type { ServiceItem } from "../../types/scheduler-types";
import { currencySymbol } from "../../../../utils/currency";
import { useSchedulerContext } from "../../store/SchedulerContext";
import TimeSelect from "../shared/TimeSelect";
import { Trash } from "react-bootstrap-icons";
import api from "../../../../services/api/axios";
import { SERVICES } from "../../../../services/api/endpoints/services.endpoints";
import "../../styles/AppointmentModal.scss";

const MIN_SEARCH_LENGTH = 3;
const DEBOUNCE_MS = 350;

interface StaffDto {
  id: string | number;
  name: string;
}

interface SearchServiceResult {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface RawServiceItem {
  id?: string | number;
  name?: string;
  price?: string | number;
  duration?: string | number;
  duration_minutes?: string | number;
}

interface ServiceRowProps {
  row: ServiceItem & { tempId: string };
  onChange: (id: string, field: string, value: string | number | boolean) => void;
  onRemove: (id: string) => void;
  onClearError?: (tempId: string, field: string) => void;
  hasError?: boolean;
  errorFields?: { service?: boolean; staff?: boolean; time?: boolean; price?: boolean; qty?: boolean };
  disabled?: boolean;
}

function fmtName(name: string) {
  return name.includes(" ") ? name : name.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function getSafeQty(qty?: number) {
  return Number.isInteger(qty) && (qty ?? 0) > 0 ? Number(qty) : 1;
}

function formatPriceForSearch(value: number) {
  const fixed = value.toFixed(2);
  return fixed.endsWith(".00") ? String(Math.trunc(value)) : fixed.replace(/0+$/, "").replace(/\.$/, "");
}

function mapServiceSearchResult(service: RawServiceItem): SearchServiceResult {
  return {
    id: String(service.id ?? ""),
    name: service.name ?? "",
    price: parseFloat(String(service.price ?? 0)) || 0,
    duration: Number(service.duration ?? service.duration_minutes) || 30,
  };
}

function matchesServicePrice(service: SearchServiceResult, searchValue: string) {
  const numericValue = Number(service.price);
  if (!Number.isFinite(numericValue)) return false;

  return numericValue === Number(searchValue) || formatPriceForSearch(numericValue).includes(searchValue);
}

function matchesServiceSearch(service: SearchServiceResult, searchValue: string, isNumericSearch: boolean) {
  if (isNumericSearch) return matchesServicePrice(service, searchValue);
  return service.name.toLowerCase().includes(searchValue.toLowerCase());
}

function extractServiceResults(response: any): RawServiceItem[] {
  const payload = response?.data?.data ?? response?.data ?? {};

  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

function extractServiceTotalPages(response: any) {
  const payload = response?.data?.data ?? response?.data ?? {};
  const totalPages = Number(
    payload?.totalPages ??
    payload?.total_pages ??
    payload?.pagination?.totalPages ??
    payload?.pagination?.total_pages ??
    response?.data?.pagination?.totalPages ??
    response?.data?.pagination?.total_pages ??
    1
  );

  return Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1;
}

function mergeServiceResults(
  base: SearchServiceResult[],
  incoming: SearchServiceResult[],
) {
  const merged = [...base];

  incoming.forEach((service) => {
    if (!merged.some((existing) => String(existing.id || existing.name) === String(service.id || service.name))) {
      merged.push(service);
    }
  });

  return merged;
}

const ServiceRow: React.FC<ServiceRowProps> = ({
  row,
  onChange,
  onRemove,
  onClearError,
  errorFields = {},
  disabled,
}) => {
  const schedulerContext = useSchedulerContext();
  const interval = schedulerContext.interval;
  const staffList = schedulerContext.staffList as StaffDto[] | undefined;
  const servicesList = schedulerContext.servicesList as RawServiceItem[] | undefined;
  const [serviceSearch, setServiceSearch] = useState(row.service || "");
  const [showDrop, setShowDrop] = useState(false);
  const [qtyInput, setQtyInput] = useState(String(getSafeQty(row.qty)));
  const [discountInput, setDiscountInput] = useState(String(row.discount || ""));
  const [apiResults, setApiResults] = useState<SearchServiceResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const trimmedSearch = serviceSearch.trim();
  const meetsMinSearchLength = trimmedSearch.length >= MIN_SEARCH_LENGTH;
  const showSearchHelper = !disabled && trimmedSearch.length < MIN_SEARCH_LENGTH;

  useEffect(() => {
    setServiceSearch(row.service || "");
  }, [row.service]);

  useEffect(() => {
    setQtyInput(String(getSafeQty(row.qty)));
  }, [row.qty, row.tempId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(event.target as Node)) {
        setShowDrop(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  async function fetchServiceResults(term: string) {
    if (abortRef.current) abortRef.current.abort();

    const controller = new AbortController();
    const normalizedTerm = term.trim();
    const isNumericSearch = /^\d+(\.\d+)?$/.test(normalizedTerm);
    const localMatches = (servicesList || [])
      .map(mapServiceSearchResult)
      .filter((service) => matchesServiceSearch(service, normalizedTerm, isNumericSearch));
    abortRef.current = controller;

    try {
      let apiMatches: SearchServiceResult[] = [];

      if (isNumericSearch) {
        let page = 1;
        let totalPages = 1;

        do {
          const params = `page=${page}&limit=100&pageSize=100&is_active=true`;
          const res = await api.get(SERVICES.LIST(params), { signal: controller.signal });
          const mapped = extractServiceResults(res)
            .map(mapServiceSearchResult)
            .filter((service) => matchesServiceSearch(service, normalizedTerm, true));

          apiMatches = mergeServiceResults(apiMatches, mapped);
          totalPages = extractServiceTotalPages(res);
          page += 1;
        } while (page <= totalPages);
      } else {
        const params = `search=${encodeURIComponent(term)}&is_active=true&limit=20`;
        const res = await api.get(SERVICES.LIST(params), { signal: controller.signal });
        apiMatches = extractServiceResults(res)
          .map(mapServiceSearchResult)
          .filter((service) => matchesServiceSearch(service, normalizedTerm, false));
      }

      if (abortRef.current === controller) {
        setApiResults(mergeServiceResults(localMatches, apiMatches));
      }
    } catch {
      if (abortRef.current === controller) {
        setApiResults(localMatches);
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsSearching(false);
      }
    }
  }

  function handleServiceSearchChange(value: string) {
    const nextSearch = value.trim();

    setServiceSearch(value);
    onChange(row.tempId, "service", value);

    if (nextSearch) onClearError?.(row.tempId, "service");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    if (nextSearch.length < MIN_SEARCH_LENGTH) {
      setApiResults(null);
      setIsSearching(false);
      setShowDrop(false);
      return;
    }

    setApiResults(null);
    setShowDrop(true);
    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      fetchServiceResults(nextSearch);
    }, DEBOUNCE_MS);
  }

  function calcTotal(price: number, qty: number, discount: number) {
    return Math.max(0, price * qty - discount);
  }

  function selectService(service: { id?: string; name: string; price: number; duration?: number }) {
    setServiceSearch(service.name);
    onChange(row.tempId, "id", service.id ?? "");
    onChange(row.tempId, "service", service.name);
    onChange(row.tempId, "price", service.price);
    onChange(row.tempId, "duration", service.duration ?? 30);

    const qty = getSafeQty(row.qty);
    const discount = parseFloat(discountInput) || 0;
    onChange(row.tempId, "qty", qty);
    onChange(row.tempId, "total", calcTotal(service.price, qty, discount));

    setShowDrop(false);
    onClearError?.(row.tempId, "service");
    onClearError?.(row.tempId, "price");
  }

  function handlePriceChange(value: string) {
    const price = Math.max(0, parseFloat(value) || 0);
    const qty = getSafeQty(row.qty);
    const discount = parseFloat(discountInput) || 0;

    onChange(row.tempId, "price", price);
    onChange(row.tempId, "total", calcTotal(price, qty, discount));

    if (price > 0) onClearError?.(row.tempId, "price");
  }

  function handleQtyChange(value: string) {
    const normalizedValue = value.slice(0, 2);
    setQtyInput(normalizedValue);

    if (!normalizedValue) return;

    const qty = parseInt(normalizedValue, 10);
    if (Number.isInteger(qty) && qty > 0) {
      const discount = parseFloat(discountInput) || 0;
      onChange(row.tempId, "qty", qty);
      onChange(row.tempId, "total", calcTotal(row.price || 0, qty, discount));
      onClearError?.(row.tempId, "qty");
    }
  }

  function handleQtyBlur() {
    const qty = parseInt(qtyInput, 10);
    const clampedQty = Number.isInteger(qty) && qty > 0 ? Math.min(qty, 99) : 1;
    const discount = parseFloat(discountInput) || 0;

    setQtyInput(String(clampedQty));
    onChange(row.tempId, "qty", clampedQty);
    onChange(row.tempId, "total", calcTotal(row.price || 0, clampedQty, discount));
    onClearError?.(row.tempId, "qty");
  }

  function handleDiscountChange(value: string) {
    const normalizedValue = value.slice(0, 5);
    setDiscountInput(normalizedValue);

    const discount = parseFloat(normalizedValue) || 0;
    const qty = getSafeQty(row.qty);
    onChange(row.tempId, "discount", discount);
    onChange(row.tempId, "total", calcTotal(row.price || 0, qty, discount));
  }

  function handleDiscountBlur() {
    const discount = Math.min(99999, Math.max(0, parseFloat(discountInput) || 0));
    const qty = getSafeQty(row.qty);

    setDiscountInput(discount > 0 ? String(discount) : "");
    onChange(row.tempId, "discount", discount);
    onChange(row.tempId, "total", calcTotal(row.price || 0, qty, discount));
  }

  function handleStaffChange(staffId: string) {
    const staffName =
      ((staffList || []) as StaffDto[]).find((staff: StaffDto) => String(staff.id) === staffId)?.name || "";

    onChange(row.tempId, "staffId", staffId);
    onChange(row.tempId, "staff", staffName);

    if (staffId) onClearError?.(row.tempId, "staff");
  }

  return (
    <div className="svc-row">
      <div className="svc-field" ref={dropRef}>
        <span className="svc-field__label">Service</span>
        <div className="svc-field__input-wrap">
          <input
            className={`svc-field__input${errorFields.service ? " svc-field__input--error" : ""}`}
            placeholder="Search service..."
            value={serviceSearch}
            disabled={disabled}
            onChange={(e) => handleServiceSearchChange(e.target.value)}
            onFocus={() => setShowDrop(meetsMinSearchLength && (isSearching || apiResults !== null))}
          />
          {showDrop && meetsMinSearchLength && (
            <div className="svc-dropdown">
              {isSearching ? (
                <div className="svc-dropdown__searching">Searching...</div>
              ) : apiResults && apiResults.length > 0 ? (
                apiResults.map((service) => (
                  <button
                    type="button"
                    key={service.id || service.name}
                    className="svc-dropdown__item"
                    onMouseDown={() => selectService(service)}
                  >
                    <span className="svc-dropdown__name">{service.name}</span>
                    <span className="svc-dropdown__price">{currencySymbol}{service.price}</span>
                  </button>
                ))
              ) : (
                <div className="svc-dropdown__searching">No services found.</div>
              )}
            </div>
          )}
        </div>
        {showSearchHelper && (
          <span className="svc-field__hint">Type at least 3 characters to search services.</span>
        )}
        {errorFields.service && <span className="svc-field__err">Select a service</span>}
      </div>

      <div className="svc-field">
        <span className="svc-field__label">Staff</span>
        <div className={`svc-staff-pill${errorFields.staff ? " svc-staff-pill--error" : ""}`}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              onChange(row.tempId, "staffId", "");
              onChange(row.tempId, "staff", "");
            }}
            className="svc-staff-pill__clear"
          >
            ×
          </button>
          <select
            disabled={disabled}
            value={row.staffId}
            onChange={(e) => handleStaffChange(e.target.value)}
            className="svc-staff-pill__select"
            style={{ color: row.staffId ? "#111827" : "#6b7280" }}
          >
            <option value="" disabled style={{ color: "#000", background: "#fff" }}>
              Select Staff
            </option>
            {(staffList || []).map((staff: StaffDto) => (
              <option
                key={String(staff.id)}
                value={String(staff.id)}
                style={{ color: "#000", background: "#fff" }}
              >
                {fmtName(staff.name)}
              </option>
            ))}
          </select>
        </div>
        {errorFields.staff && <span className="svc-field__err">Select staff</span>}
      </div>

      <div className="svc-field">
        <span className="svc-field__label">Time</span>
        <TimeSelect
          disabled={disabled}
          value={row.time}
          onChange={(value) => onChange(row.tempId, "time", value)}
          interval={interval || "30 Mins"}
          className={`svc-field__input svc-field__select${errorFields.time ? " svc-field__input--error" : ""}`}
        />
        {errorFields.time && <span className="svc-field__err">Select time</span>}
      </div>

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

      <div className="svc-field">
        <span className="svc-field__label">Qty</span>
        <input
          type="text"
          disabled={disabled}
          inputMode="numeric"
          maxLength={2}
          placeholder="1"
          value={qtyInput}
          className={`svc-field__input${errorFields.qty ? " svc-field__input--error" : ""}`}
          onChange={(e) => handleQtyChange(e.target.value.replace(/\D/g, ""))}
          onBlur={handleQtyBlur}
        />
        {errorFields.qty && <span className="svc-field__err">Enter qty</span>}
      </div>

      <div className="svc-field">
        <span className="svc-field__label">Disc ({currencySymbol})</span>
        <input
          type="text"
          disabled={disabled}
          inputMode="numeric"
          maxLength={5}
          placeholder="0"
          value={discountInput}
          className="svc-field__input"
          onChange={(e) => handleDiscountChange(e.target.value.replace(/\D/g, ""))}
          onBlur={handleDiscountBlur}
        />
      </div>

      <div className="svc-field">
        <span className="svc-field__label">Total</span>
        <input
          readOnly
          value={row.total ? (row.total as number).toFixed(2) : "0.00"}
          className="svc-field__input svc-field__input--readonly"
        />
      </div>

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
