import { useState, useEffect, useCallback } from "react";
import api from "../../../services/api/axios";
import { DEPLOYMENT_ANNOUNCEMENTS } from "../../../services/api/endpoints";

interface Announcement {
  id: string;
  message: string;
  start_time: string;
  end_time: string;
  status: "active" | "stopped";
  created_at: string;
}

const DURATION_PRESETS = [
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "4 hours", minutes: 240 },
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

export default function DeploymentAnnouncementsPage() {
  const [message, setMessage] = useState("");
  const [startTime, setStartTime] = useState(() => toLocalDatetimeInput(new Date()));
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [useCustomEnd, setUseCustomEnd] = useState(false);
  const [customEndTime, setCustomEndTime] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [stoppingId, setStoppingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [recent, setRecent] = useState<Announcement[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

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

  const activeAnnouncement = recent.find(isCurrentlyActive) ?? null;

  const handleStart = async () => {
    if (!message.trim()) { setError("Message is required."); return; }
    setError("");
    setSuccessMsg("");

    const start = startTime ? new Date(startTime) : new Date();
    const end = useCustomEnd
      ? (customEndTime ? new Date(customEndTime) : null)
      : new Date(start.getTime() + durationMinutes * 60_000);

    if (!end || isNaN(end.getTime())) { setError("A valid end time is required."); return; }
    if (end <= start) { setError("End time must be after start time."); return; }

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
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Deployment Announcements</h1>
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>
          Broadcast a deployment notice to every dashboard while you deploy.
        </p>
      </div>

      {activeAnnouncement && (
        <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>🚧 Deployment currently active</div>
            <div style={{ fontSize: 12.5, color: "#92400e", marginTop: 4 }}>{activeAnnouncement.message}</div>
            <div style={{ fontSize: 11.5, color: "#a16207", marginTop: 4 }}>
              {formatDisplay(activeAnnouncement.start_time)} → {formatDisplay(activeAnnouncement.end_time)}
            </div>
          </div>
          <button
            onClick={() => handleStop(activeAnnouncement.id)}
            disabled={stoppingId === activeAnnouncement.id}
            style={{ padding: "8px 18px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: stoppingId === activeAnnouncement.id ? "not-allowed" : "pointer", flexShrink: 0 }}
          >
            {stoppingId === activeAnnouncement.id ? "Stopping…" : "Stop Deployment"}
          </button>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 24, marginBottom: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Start a New Deployment</h2>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Message</label>
          <textarea
            rows={3}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Deployment is in progress. Please wait..."
            style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 9, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box", color: "#0f172a" }}
          />
        </div>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ flex: "1 1 220px" }}>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Start Time</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 9, padding: "9px 12px", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", color: "#0f172a" }}
            />
          </div>

          <div style={{ flex: "1 1 260px" }}>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Duration</label>
            {!useCustomEnd ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {DURATION_PRESETS.map(p => (
                  <button
                    key={p.minutes}
                    type="button"
                    onClick={() => setDurationMinutes(p.minutes)}
                    style={{
                      padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                      border: `1.5px solid ${durationMinutes === p.minutes ? "#6366f1" : "#e2e8f0"}`,
                      background: durationMinutes === p.minutes ? "#eef2ff" : "#fff",
                      color: durationMinutes === p.minutes ? "#6366f1" : "#64748b",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setUseCustomEnd(true)}
                  style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer", border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b" }}
                >
                  Custom End Time
                </button>
              </div>
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
                  Use Preset
                </button>
              </div>
            )}
          </div>
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
          style={{ padding: "10px 24px", background: submitting ? "#a5b4fc" : "#6366f1", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer" }}
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
                fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 20, flexShrink: 0,
                color: active ? "#92400e" : a.status === "stopped" ? "#64748b" : "#16a34a",
                background: active ? "#fef3c7" : a.status === "stopped" ? "#f1f5f9" : "#f0fdf4",
              }}>
                {active ? "Active" : a.status === "stopped" ? "Stopped" : "Ended"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
