import { useState, useEffect, useCallback } from "react";
import { History } from "lucide-react";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { fetchAuditLogThunk, type AuditLogEntry } from "../../../middleware/roles/roles.thunk";

const ACTION_LABELS: Record<string, string> = {
  role_created: "created role",
  role_edit: "edited role",
  role_assigned: "assigned role",
  permission_granted: "granted permission",
  permission_revoked: "revoked permission",
  override_reset: "reset overrides",
};

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "ON" : "OFF";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default function PermissionActivityTab() {
  const dispatch = useAppDispatch();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (nextCursor?: string) => {
    const setBusy = nextCursor ? setLoadingMore : setLoading;
    setBusy(true);
    const result = await dispatch(fetchAuditLogThunk(nextCursor ? { cursor: nextCursor } : undefined));
    if (fetchAuditLogThunk.fulfilled.match(result)) {
      setEntries((prev) => (nextCursor ? [...prev, ...result.payload.items] : result.payload.items));
      setCursor(result.payload.nextCursor);
    }
    setBusy(false);
  }, [dispatch]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="settings-section">
      <div className="settings-section-header" style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: "#f3f4f6", color: "#111827",
        }}>
          <History size={18} />
        </span>
        <div>
          <p className="settings-section-title">Permission Activity</p>
          <p className="settings-section-desc">
            A record of every role and staff permission change made in this salon.
          </p>
        </div>
      </div>
      <div className="settings-section-body">
        {loading ? (
          <p style={{ fontSize: 13, color: "#6b7280" }}>Loading activity…</p>
        ) : entries.length === 0 ? (
          <p style={{ fontSize: 13, color: "#6b7280" }}>No permission changes recorded yet.</p>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {entries.map((entry) => {
                const actorName = [entry.actor_first_name, entry.actor_last_name].filter(Boolean).join(" ") || entry.actor_email || "Someone";
                const actionLabel = ACTION_LABELS[entry.action] ?? entry.action;
                return (
                  <div key={entry.id} className="settings-security-item" style={{ alignItems: "flex-start" }}>
                    <div className="settings-security-info">
                      <p className="settings-security-name">
                        <strong>{actorName}</strong> {actionLabel}
                        {entry.permission_key && <> — <code>{entry.permission_key}</code></>}
                      </p>
                      {(entry.before_value !== null || entry.after_value !== null) && (
                        <p className="settings-security-desc">
                          {formatValue(entry.before_value)} → {formatValue(entry.after_value)}
                          <span style={{ marginLeft: 8, color: "#9ca3af" }}>
                            ({entry.target_type} • {entry.source.replace(/_/g, " ")})
                          </span>
                        </p>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
            {cursor && (
              <div className="mt-3">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => load(cursor)} disabled={loadingMore}>
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
