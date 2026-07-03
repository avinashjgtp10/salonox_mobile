import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { XLg, Search, Award } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import type { Membership, MembershipsListResponse, ApiResponse } from "../../../services/api/endpoints/memberships.endpoints";
import "./MembershipPickerModal.scss";

interface Props {
  onSelect: (membership: Membership) => void;
  onClose: () => void;
}

const MembershipPickerModal: React.FC<Props> = ({ onSelect, onClose }) => {
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState<Membership[]>([]);
  const [loading,  setLoading]  = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.get<ApiResponse<MembershipsListResponse>>("/api/v1/memberships", {
          params: { search: query.trim() || undefined, limit: 8 },
          signal: controller.signal,
        });
        setResults(res.data?.data?.items ?? []);
      } catch (err: any) {
        if (err?.name !== "CanceledError" && err?.code !== "ERR_CANCELED") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { clearTimeout(t); controller.abort(); };
  }, [query]);

  return createPortal(
    <div className="mpm-overlay" onClick={onClose}>
      <div className="mpm" onClick={e => e.stopPropagation()}>

        <div className="mpm__header">
          <div>
            <h3 className="mpm__title">Sell to client</h3>
            <p className="mpm__sub">Choose a membership plan to sell</p>
          </div>
          <button className="mpm__close" onClick={onClose}>
            <XLg size={16} />
          </button>
        </div>

        <div className="mpm__search">
          <Search size={15} className="mpm__search-icon" />
          <input
            autoFocus
            placeholder="Search by membership name…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <div className="mpm__list">
          {loading && (
            <div className="mpm__state">Searching…</div>
          )}
          {!loading && results.length === 0 && (
            <div className="mpm__state">
              <Award size={32} className="mpm__empty-icon" />
              No memberships found.
            </div>
          )}
          {!loading && results.map(m => (
            <button key={m.id} className="mpm__item" onClick={() => onSelect(m)}>
              <span className="mpm__color-dot" style={{ background: m.colour || "#1a1a2e" }} />
              <div className="mpm__item-info">
                <span className="mpm__item-name">{m.name}</span>
                <span className="mpm__item-meta">
                  {m.validFor} &middot; {m.sessionType === "unlimited" ? "No cap" : `${m.numberOfSessions ?? "–"} visits`}
                </span>
              </div>
              <span className="mpm__item-price">₹{Number(m.price).toLocaleString("en-IN")}</span>
            </button>
          ))}
        </div>

      </div>
    </div>,
    document.body
  );
};

export default MembershipPickerModal;
