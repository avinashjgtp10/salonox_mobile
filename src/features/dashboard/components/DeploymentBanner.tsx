import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import api from "../../../services/api/axios";
import { DEPLOYMENT_ANNOUNCEMENTS } from "../../../services/api/endpoints";
import "../styles/DeploymentBanner.scss";

interface ActiveAnnouncement {
  id: string;
  message: string;
  start_time: string;
  end_time: string;
}

const POLL_INTERVAL_MS = 45_000;

function formatRemaining(endTime: string): string {
  const ms = new Date(endTime).getTime() - Date.now();
  if (ms <= 0) return "shortly";
  const totalMinutes = Math.ceil(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

// Persistent, non-dismissible banner shown on every dashboard page while a
// Super Admin deployment announcement is active — polled rather than pushed
// over Socket.IO (that infra is salon-room-scoped, not built for a global
// broadcast), so there's up to one poll interval of latency both when a
// deployment starts and when it's stopped/elapses. Renders nothing when no
// announcement is active.
export default function DeploymentBanner() {
  const [announcement, setAnnouncement] = useState<ActiveAnnouncement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bannerRef = useRef<HTMLDivElement | null>(null);

  const checkActive = useCallback(async () => {
    try {
      const res = await api.get(DEPLOYMENT_ANNOUNCEMENTS.ACTIVE);
      setAnnouncement(res.data?.data ?? null);
    } catch {
      // Silently keep whatever state we last had — a transient failure here
      // shouldn't flicker the banner on/off.
    }
  }, []);

  useEffect(() => {
    checkActive();
    intervalRef.current = setInterval(checkActive, POLL_INTERVAL_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [checkActive]);

  // The banner is position:fixed (so it stacks above the also-fixed topbar
  // instead of being hidden behind it) — push the topbar/body down by its
  // real rendered height via a CSS var so both stay layout-consistent.
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (announcement && bannerRef.current) {
      root.style.setProperty("--deployment-banner-height", `${bannerRef.current.offsetHeight}px`);
    } else {
      root.style.removeProperty("--deployment-banner-height");
    }
    return () => root.style.removeProperty("--deployment-banner-height");
  }, [announcement]);

  if (!announcement) return null;

  return (
    <div className="deployment-banner" role="status" ref={bannerRef}>
      <span className="deployment-banner__icon">🚧</span>
      <span className="deployment-banner__text">
        <strong>Deployment in Progress</strong> — {announcement.message}
        {" "}Estimated completion: {formatRemaining(announcement.end_time)}.
      </span>
    </div>
  );
}
