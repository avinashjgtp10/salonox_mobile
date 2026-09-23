import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import api from "../../../services/api/axios";
import { DEPLOYMENT_ANNOUNCEMENTS } from "../../../services/api/endpoints";
import { getSocket } from "../../../services/socket/socket";
import "../styles/DeploymentBanner.scss";

interface ActiveAnnouncement {
  id: string;
  message: string;
  start_time: string;
  end_time: string;
}

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
// Super Admin deployment announcement is active. A single GET on mount covers
// a deployment already in progress when the page loads; after that, the
// backend pushes "deployment_announcement:started"/"stopped" over the socket
// connection every dashboard already holds open (see socket.ts), so nothing
// polls on a timer — nothing is called at all until a deployment actually
// starts or stops.
export default function DeploymentBanner() {
  const [announcement, setAnnouncement] = useState<ActiveAnnouncement | null>(null);
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleAutoHide = useCallback((a: ActiveAnnouncement | null) => {
    if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
    if (!a) return;
    const ms = new Date(a.end_time).getTime() - Date.now();
    if (ms <= 0) { setAnnouncement(null); return; }
    hideTimerRef.current = setTimeout(() => setAnnouncement(null), ms);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(DEPLOYMENT_ANNOUNCEMENTS.ACTIVE);
        if (cancelled) return;
        const a = res.data?.data ?? null;
        setAnnouncement(a);
        scheduleAutoHide(a);
      } catch {
        // Silently keep whatever state we last had.
      }
    })();
    return () => { cancelled = true; };
  }, [scheduleAutoHide]);

  useEffect(() => {
    const socket = getSocket();

    const handleStarted = (a: ActiveAnnouncement) => {
      setAnnouncement(a);
      scheduleAutoHide(a);
    };
    const handleStopped = () => {
      setAnnouncement(null);
      scheduleAutoHide(null);
    };

    socket.on("deployment_announcement:started", handleStarted);
    socket.on("deployment_announcement:stopped", handleStopped);

    return () => {
      socket.off("deployment_announcement:started", handleStarted);
      socket.off("deployment_announcement:stopped", handleStopped);
    };
  }, [scheduleAutoHide]);

  useEffect(() => () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

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
    return () => { root.style.removeProperty("--deployment-banner-height"); };
  }, [announcement]);

  if (!announcement) return null;

  return (
    <div className="deployment-banner" role="status" ref={bannerRef}>
      <span className="deployment-banner__text">
        {announcement.message}
        {" "}Estimated completion: {formatRemaining(announcement.end_time)}.
      </span>
    </div>
  );
}
