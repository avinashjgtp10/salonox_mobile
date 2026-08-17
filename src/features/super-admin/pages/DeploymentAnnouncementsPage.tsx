import { useState, useEffect, useCallback } from "react";
import api from "../../../services/api/axios";
import { DEPLOYMENT_ANNOUNCEMENTS } from "../../../services/api/endpoints";
import TimeDropdown from "../../../components/ui/TimeDropdown";

const SECOND_OPTS_60 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

interface Announcement {
  id: string;
  message: string;
  start_time: string;
  end_time: string;
  status: "active" | "stopped";
  created_at: string;
}

const DURATION_PRESETS = [
  { label: "30 sec", seconds: 30 },
  { label: "1 min", seconds: 60 },
  { label: "5 min", seconds: 300 },
  { label: "1 hour", seconds: 3600 },
];

function toLocalDatetimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDisplay(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function isCurrentlyActive(a: Announcement): boolean {
  const now = Date.now();
  return a.status === "active" && new Date(a.start_time).getTime() <= now && new Date(a.end_time).getTime() > now;
}

// mm:ss (or hh:mm:ss once it runs past an hour) countdown to `endIso`,
// floored at 0 so it never shows a negative time once expired.
function formatCountdown(endIso: string, nowMs: number): string {
  const remainingMs = new Date(endIso).getTime() - nowMs;
  const totalSec = Math.max(0, Math.floor(remainingMs / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function DeploymentAnnouncementsPage() {
  const [message, setMessage] = useState("");
  const [startTime, setStartTime] = useState(() => toLocalDatetimeInput(new Date()));

  // Custom duration — minutes + seconds, e.g. "1 minute 30 seconds".
  const [durationMinutes, setDurationMinutes] = useState(1);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [useCustomEnd, setUseCustomEnd] = useState(false);
  const [customEndTime, setCustomEndTime] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [stoppingId, setStoppingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [recent, setRecent] = useState<Announcement[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  // Ticks every second so any live countdowns on screen stay in sync, and
  // triggers a refetch right as the active announcement's timer hits zero.
  const [nowTick, setNowTick] = useState(() => Date.now());

  const loadRecent = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const res = await api.get(DEPLOYMENT_ANNOUNCEMENTS.RECENT);
      setRecent(res.data?.data ?? []);
    } catch {
      setRecent([]);
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  useEffect(() => { loadRecent(); }, [loadRecent]);

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const activeAnnouncement = recent.find(isCurrentlyActive) ?? null;

  // Once the active announcement's countdown reaches zero, refresh so it
  // drops out of the "active" banner without waiting for a manual reload.
  useEffect(() => {
    if (activeAnnouncement && new Date(activeAnnouncement.end_time).getTime() <= nowTick) {
      loadRecent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowTick]);

  const customDurationSeconds = Math.max(0, durationMinutes) * 60 + Math.max(0, Math.min(59, durationSeconds));

  const handleStart = async () => {
    if (!message.trim()) { setError("Message is required."); return; }
    setError("");
    setSuccessMsg("");

    const start = startTime ? new Date(startTime) : new Date();
    const end = useCustomEnd
      ? (customEndTime ? new Date(customEndTime) : null)
      : new Date(start.getTime() + customDurationSeconds * 1000);

    if (!end || isNaN(end.getTime())) { setError("A valid end time is required."); return; }
    if (end <= start) { setError("End time must be after start time."); return; }
    if (!useCustomEnd && customDurationSeconds <= 0) { setError("Duration must be greater than 0."); return; }

    setSubmitting(true);
    try {
      await api.post(DEPLOYMENT_ANNOUNCEMENTS.CREATE, {
        message: message.trim(),
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      });
      setSuccessMsg("Deployment announcement started.");
      setMessage("");
      setUseCustomEnd(false);
      setCustomEndTime("");
      setStartTime(toLocalDatetimeInput(new Date()));
      await loadRecent();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to start deployment announcement.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStop = async (id: string) => {
    setStoppingId(id);
    try {
      await api.post(DEPLOYMENT_ANNOUNCEMENTS.STOP(id));
      await loadRecent();
    } finally {
      setStoppingId(null);
    }
  };

  return (
    <div style={{ padding: "28px 28px 60px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(99,102,241,0.35)", flexShrink: 0 }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Deployment Announcements</h1>
          <p style={{ margin: "2px 0 0", color: "#94a3b8", fontSize: 13 }}>
            Broadcast a deployment notice to every dashboard for a custom duration while you deploy.
          </p>
        </div>
      </div>

      {activeAnnouncement && (
        <div style={{ background: "linear-gradient(135deg,#fffbeb,#fef3c7)", border: "1px solid #fde68a", borderRadius: 14, padding: "18px 22px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, boxShadow: "0 4px 16px rgba(217,119,6,0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
            <div style={{ width: 54, height: 54, borderRadius: 14, background: "#fff", border: "1.5px solid #fde68a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#b45309", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                {formatCountdown(activeAnnouncement.end_time, nowTick)}
              </span>
              <span style={{ fontSize: 8.5, fontWeight: 700, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>left</span>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#d97706", flexShrink: 0, animation: "da-pulse 1.4s infinite" }} />
                Deployment currently active
              </div>
              <div style={{ fontSize: 12.5, color: "#92400e", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeAnnouncement.message}</div>
              <div style={{ fontSize: 11, color: "#a16207", marginTop: 3 }}>
                {formatDisplay(activeAnnouncement.start_time)} → {formatDisplay(activeAnnouncement.end_time)}
              </div>
            </div>
          </div>
          <button
            onClick={() => handleStop(activeAnnouncement.id)}
            disabled={stoppingId === activeAnnouncement.id}
            style={{ padding: "9px 20px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: stoppingId === activeAnnouncement.id ? "not-allowed" : "pointer", flexShrink: 0, boxShadow: "0 2px 8px rgba(220,38,38,0.3)" }}
          >
            {stoppingId === activeAnnouncement.id ? "Stopping…" : "Stop Deployment"}
          </button>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 24, marginBottom: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Start a New Deployment</h2>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Message</label>
          <textarea
            rows={3}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Deployment is in progress. Please wait..."
            style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 9, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box", color: "#0f172a" }}
          />
        </div>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 18 }}>
          <div style={{ flex: "1 1 220px" }}>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Start Time</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 9, padding: "9px 12px", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", color: "#0f172a" }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Duration</label>

          {!useCustomEnd ? (
            <>
              {/* Custom minutes + seconds duration — the same click-to-open
                  TimeDropdown used by the Check-in / Check-out time fields. */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", marginBottom: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, width: 64 }}>
                  <TimeDropdown
                    ariaLabel="Minutes"
                    value={String(durationMinutes).padStart(2, "0")}
                    options={SECOND_OPTS_60}
                    onChange={(v) => setDurationMinutes(Number(v))}
                  />
                  <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>min</span>
                </div>
                <span style={{ fontSize: 18, color: "#cbd5e1", fontWeight: 700 }}>:</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6, width: 64 }}>
                  <TimeDropdown
                    ariaLabel="Seconds"
                    value={String(durationSeconds).padStart(2, "0")}
                    options={SECOND_OPTS_60}
                    onChange={(v) => setDurationSeconds(Number(v))}
                  />
                  <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>sec</span>
                </div>
                <span style={{ marginLeft: "auto", fontSize: 12, color: "#6366f1", fontWeight: 700, background: "#eef2ff", padding: "5px 12px", borderRadius: 20 }}>
                  = {customDurationSeconds}s total
                </span>
              </div>

              {/* Quick-fill presets */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {DURATION_PRESETS.map(p => (
                  <button
                    key={p.seconds}
                    type="button"
                    onClick={() => { setDurationMinutes(Math.floor(p.seconds / 60)); setDurationSeconds(p.seconds % 60); }}
                    style={{
                      padding: "7px 13px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                      border: `1.5px solid ${customDurationSeconds === p.seconds ? "#6366f1" : "#e2e8f0"}`,
                      background: customDurationSeconds === p.seconds ? "#eef2ff" : "#fff",
                      color: customDurationSeconds === p.seconds ? "#6366f1" : "#64748b",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setUseCustomEnd(true)}
                  style={{ padding: "7px 13px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b" }}
                >
                  Use exact end time instead
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="datetime-local"
                value={customEndTime}
                onChange={e => setCustomEndTime(e.target.value)}
                style={{ flex: 1, border: "1.5px solid #e2e8f0", borderRadius: 9, padding: "9px 12px", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", color: "#0f172a" }}
              />
              <button
                type="button"
                onClick={() => { setUseCustomEnd(false); setCustomEndTime(""); }}
                style={{ padding: "8px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b" }}
              >
                Use Timer
              </button>
            </div>
          )}
        </div>

        {error && (
          <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 9, color: "#dc2626", fontSize: 12.5, marginBottom: 14 }}>
            {error}
          </div>
        )}
        {successMsg && (
          <div style={{ padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 9, color: "#16a34a", fontSize: 12.5, marginBottom: 14 }}>
            {successMsg}
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={submitting}
          style={{ padding: "10px 24px", background: submitting ? "#a5b4fc" : "#6366f1", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", boxShadow: submitting ? "none" : "0 4px 14px rgba(99,102,241,0.35)" }}
        >
          {submitting ? "Starting…" : "Start Deployment"}
        </button>
      </div>

      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Recent Announcements</h2>
        </div>
        {loadingRecent ? (
          <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Loading…</div>
        ) : recent.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No announcements yet.</div>
        ) : recent.map((a, i) => {
          const active = isCurrentlyActive(a);
          return (
            <div key={a.id} style={{ padding: "14px 20px", borderBottom: i < recent.length - 1 ? "1px solid #f8fafc" : "none", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 500 }}>{a.message}</div>
                <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 3 }}>
                  {formatDisplay(a.start_time)} → {formatDisplay(a.end_time)}
                </div>
              </div>
              <span style={{
                fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 20, flexShrink: 0, fontVariantNumeric: "tabular-nums",
                color: active ? "#92400e" : a.status === "stopped" ? "#64748b" : "#16a34a",
                background: active ? "#fef3c7" : a.status === "stopped" ? "#f1f5f9" : "#f0fdf4",
              }}>
                {active ? `Active — ${formatCountdown(a.end_time, nowTick)} left` : a.status === "stopped" ? "Stopped" : "Ended"}
              </span>
            </div>
          );
        })}
      </div>

      <style>{`@keyframes da-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }`}</style>
    </div>
  );
}
