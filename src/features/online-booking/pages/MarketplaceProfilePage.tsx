import { useState, useRef, useEffect, useCallback } from "react";
import {
  Globe, Upload, Clock, Eye, CheckCircle, InfoCircle, ImageFill,
  Images, Trash3, ArrowRepeat, CloudArrowUp, PlusLg, XCircleFill,
} from "react-bootstrap-icons";
import toast from "react-hot-toast";
import "../styles/OnlineBooking.scss";
import BookingPreviewModal from "../components/BookingPreviewModal";
import api from "../../../services/api/axios";
import { GALLERY } from "../../../services/api/endpoints/gallery.endpoints";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchMarketplaceProfileThunk,
  updateMarketplaceEssentialsThunk,
  updateMarketplaceAboutThunk,
  publishMarketplaceThunk,
  unpublishMarketplaceThunk,
} from "../../../middleware/marketplace/marketplace.thunk";

// ─── Types ────────────────────────────────────────────────────────────────────

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface DayHours { open: boolean; from: string; to: string; }

interface GalleryPhoto {
  id: string;
  url: string;
  filename: string;
  size: number;
  uploading: boolean;
  progress: number;
  error: string | null;
  saved: boolean;
}

const defaultHours: Record<string, DayHours> = {
  Monday:    { open: true,  from: "09:00", to: "18:00" },
  Tuesday:   { open: true,  from: "09:00", to: "18:00" },
  Wednesday: { open: true,  from: "09:00", to: "18:00" },
  Thursday:  { open: true,  from: "09:00", to: "18:00" },
  Friday:    { open: true,  from: "09:00", to: "18:00" },
  Saturday:  { open: true,  from: "10:00", to: "17:00" },
  Sunday:    { open: false, from: "10:00", to: "16:00" },
};

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type))
    return `"${file.name}" — only JPG, PNG, WEBP allowed.`;
  if (file.size > MAX_SIZE)
    return `"${file.name}" — exceeds the 5 MB limit.`;
  return null;
}

function fmtSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MarketplaceProfilePage() {
  const dispatch = useAppDispatch();
  const { profile, loading: profileLoading } = useAppSelector((state) => state.marketplace);

  // ── Existing state ──────────────────────────────────────────────────────────
  const [enabled,      setEnabled]      = useState(true);
  const [businessName, setBusinessName] = useState("My Salon");
  const [tagline,      setTagline]      = useState("");
  const [description,  setDescription]  = useState("");
  const [website,      setWebsite]      = useState("");
  const [phone,        setPhone]        = useState("");
  const [hours,        setHours]        = useState(defaultHours);
  const [saved,        setSaved]        = useState(false);
  const [showPreview,  setShowPreview]  = useState(false);

  // Load profile from Redux
  useEffect(() => {
    dispatch(fetchMarketplaceProfileThunk());
  }, [dispatch]);

  useEffect(() => {
    if (profile) {
      setEnabled(profile.is_published);
      setBusinessName(profile.display_name || "");
      setDescription(profile.venue_description || "");
      setPhone(profile.business_phone || "");
      setLogoUrl(toRelativeUrl((profile as any).logo_url));
      setCoverUrl(toRelativeUrl((profile as any).cover_url));
    }
  }, [profile]);


  // ── Gallery state ───────────────────────────────────────────────────────────
  const [gallery,        setGallery]        = useState<GalleryPhoto[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [dragOver,       setDragOver]       = useState(false);
  const galleryInput = useRef<HTMLInputElement>(null);
  const replaceInputs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Logo & Cover state ──────────────────────────────────────────────────────
  const [logoUrl,        setLogoUrl]        = useState<string>("");
  const [coverUrl,       setCoverUrl]       = useState<string>("");
  const [logoUploading,  setLogoUploading]  = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const logoInput  = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const toRelativeUrl = (u?: string | null) => {
    if (!u) return "";
    try { const p = new URL(u); if (p.hostname === "localhost") return p.pathname + p.search; } catch { /* already relative */ }
    return u;
  };

  // ── Existing handlers ───────────────────────────────────────────────────────
  const updateHour = (day: string, key: keyof DayHours, value: string | boolean) =>
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], [key]: value } }));

  const handleSave = async () => {
    if (phone && phone.replace(/\D/g, "").length !== 10) {
      toast.error("Phone number must be exactly 10 digits");
      return;
    }

    try {
      await dispatch(updateMarketplaceEssentialsThunk({
        display_name: businessName,
        business_phone: phone,
      })).unwrap();

      await dispatch(updateMarketplaceAboutThunk({
        venue_description: description,
      })).unwrap();

      if (enabled && !profile?.is_published) {
        await dispatch(publishMarketplaceThunk()).unwrap();
      } else if (!enabled && profile?.is_published) {
        await dispatch(unpublishMarketplaceThunk()).unwrap();
      }

      setSaved(true);
      toast.success("Profile saved!");
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      toast.error(err || "Failed to save profile");
    }
  };

  // ── Gallery: fetch ──────────────────────────────────────────────────────────
  const fetchGallery = useCallback(async () => {
    setGalleryLoading(true);
    try {
      const res = await api.get(GALLERY.BASE);
      const raw: Array<{ id: string; image_url?: string; url?: string; filename?: string; size?: number }> =
        res.data?.data ?? res.data ?? [];
      const toRelative = (u?: string) => {
        if (!u) return "";
        // Strip absolute localhost origin so Vite proxy handles it
        try { const parsed = new URL(u); if (parsed.hostname === "localhost") return parsed.pathname + parsed.search; } catch { /* relative already */ }
        return u;
      };
      setGallery(
        raw.map((p) => ({
          id:        String(p.id),
          url:       toRelative(p.image_url ?? p.url),
          filename:  p.filename ?? "photo",
          size:      p.size ?? 0,
          uploading: false,
          progress:  100,
          error:     null,
          saved:     true,
        }))
      );
    } catch {
      // Silently ignore — gallery just stays empty
    } finally {
      setGalleryLoading(false);
    }
  }, []);

  useEffect(() => { fetchGallery(); }, [fetchGallery]);

  // ── Gallery: upload files ───────────────────────────────────────────────────
  const uploadFiles = useCallback(async (files: FileList) => {
    const valid: File[] = [];
    Array.from(files).forEach((f) => {
      const err = validateFile(f);
      if (err) { toast.error(err); }
      else       valid.push(f);
    });
    if (!valid.length) return;

    // Create local previews immediately
    const previews: GalleryPhoto[] = valid.map((f) => ({
      id:        `local-${Date.now()}-${Math.random()}`,
      url:       URL.createObjectURL(f),
      filename:  f.name,
      size:      f.size,
      uploading: true,
      progress:  0,
      error:     null,
      saved:     false,
    }));
    setGallery((prev) => [...prev, ...previews]);

    // Upload each file independently
    for (let i = 0; i < valid.length; i++) {
      const file  = valid[i];
      const local = previews[i];
      const formData = new FormData();
      formData.append("image", file);

      try {
        const res = await api.post(GALLERY.BASE, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) => {
            if (e.total) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setGallery((p) => p.map((g) => g.id === local.id ? { ...g, progress: pct } : g));
            }
          },
        });
        const saved: { id?: string; image_url?: string; url?: string } = res.data?.data ?? res.data ?? {};
        const toRel = (u?: string) => { if (!u) return u; try { const x = new URL(u); if (x.hostname === "localhost") return x.pathname; } catch { /* ok */ } return u; };
        setGallery((p) =>
          p.map((g) =>
            g.id === local.id
              ? { ...g, id: String(saved.id ?? local.id), url: toRel(saved.image_url ?? saved.url) ?? local.url,
                  uploading: false, progress: 100, saved: true }
              : g
          )
        );
        toast.success(`"${file.name}" uploaded!`);
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? "Upload failed. Please try again.";
        setGallery((p) =>
          p.map((g) => g.id === local.id ? { ...g, uploading: false, error: msg } : g)
        );
        toast.error(msg);
      }
    }
  }, []);

  // ── Gallery: delete ─────────────────────────────────────────────────────────
  const deletePhoto = useCallback(async (photo: GalleryPhoto) => {
    // Remove optimistically
    setGallery((p) => p.filter((g) => g.id !== photo.id));
    if (!photo.saved) return;

    try {
      await api.delete(GALLERY.BY_ID(photo.id));
      toast.success("Photo deleted.");
    } catch {
      setGallery((p) => [...p, photo]); // restore on failure
      toast.error("Could not delete photo. Please try again.");
    }
  }, []);

  // ── Gallery: replace ────────────────────────────────────────────────────────
  const replacePhoto = useCallback(
    async (photo: GalleryPhoto, file: File) => {
      const err = validateFile(file);
      if (err) { toast.error(err); return; }

      const newUrl = URL.createObjectURL(file);
      setGallery((p) =>
        p.map((g) => g.id === photo.id
          ? { ...g, url: newUrl, uploading: true, progress: 0, error: null }
          : g)
      );

      const formData = new FormData();
      formData.append("image", file);

      try {
        // Delete old, upload new
        if (photo.saved) await api.delete(GALLERY.BY_ID(photo.id));
        const res = await api.post(GALLERY.BASE, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) => {
            if (e.total) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setGallery((p) => p.map((g) => g.id === photo.id ? { ...g, progress: pct } : g));
            }
          },
        });
        const saved: { id?: string; image_url?: string; url?: string } = res.data?.data ?? res.data ?? {};
        setGallery((p) =>
          p.map((g) =>
            g.id === photo.id
              ? { ...g, id: String(saved.id ?? photo.id), url: saved.image_url ?? saved.url ?? newUrl,
                  uploading: false, progress: 100, saved: true, error: null }
              : g
          )
        );
        toast.success("Photo replaced!");
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? "Replace failed. Please try again.";
        setGallery((p) =>
          p.map((g) => g.id === photo.id ? { ...g, uploading: false, error: msg } : g)
        );
        toast.error(msg);
      }
    },
    []
  );

  // ── Logo & Cover upload handlers ────────────────────────────────────────────
  const handleLogoUpload = async (file: File) => {
    const err = validateFile(file);
    if (err) { toast.error(err); return; }
    setLogoUrl(URL.createObjectURL(file));
    setLogoUploading(true);
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await api.post("/api/v1/marketplace/logo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const saved = res.data?.data ?? res.data ?? {};
      setLogoUrl(toRelativeUrl(saved.logo_url) || URL.createObjectURL(file));
      toast.success("Logo uploaded!");
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message ?? "Logo upload failed.";
      toast.error(msg);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleCoverUpload = async (file: File) => {
    const err = validateFile(file);
    if (err) { toast.error(err); return; }
    setCoverUrl(URL.createObjectURL(file));
    setCoverUploading(true);
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await api.post("/api/v1/marketplace/cover", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const saved = res.data?.data ?? res.data ?? {};
      setCoverUrl(toRelativeUrl(saved.cover_url) || URL.createObjectURL(file));
      toast.success("Cover photo uploaded!");
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message ?? "Cover upload failed.";
      toast.error(msg);
    } finally {
      setCoverUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  };

  const savedPhotos = gallery.filter((g) => g.saved || g.uploading).map((g) => g.url);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="ob-page">

      {/* ════════════════════════════════════════════════════════════════════════
          EXISTING — Page Header
      ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="ob-page-header">
        <div>
          <h1 className="ob-page-title">Marketplace Profile</h1>
          <p className="ob-page-sub">
            Manage how your salon appears on the online booking marketplace and across integrations.
          </p>
        </div>
        <div className="ob-header-actions">
          <button className="ob-btn-outline" onClick={() => setShowPreview(true)}>
            <Eye size={15} /> Preview
          </button>
          <button className="ob-btn-primary" onClick={handleSave}
            style={saved ? { background: "#16a34a" } : {}}>
            {saved ? <><CheckCircle size={15} /> Saved</> : "Save changes"}
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          EXISTING — Online Booking Toggle
      ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="ob-card">
        <div className="ob-card-header">
          <div>
            <p className="ob-card-title">Online Booking Status</p>
            <p className="ob-card-sub">Allow clients to discover and book your services online.</p>
          </div>
          <span className={`ob-status ob-status--${enabled ? "active" : "inactive"}`}>
            <span className="ob-status-dot" />
            {enabled ? "Accepting bookings" : "Paused"}
          </span>
        </div>
        <div className="ob-toggle-row">
          <div className="ob-toggle-info">
            <p className="ob-toggle-label">Enable online booking</p>
            <p className="ob-toggle-hint">
              Clients can find and book you on the marketplace and via your booking link.
            </p>
          </div>
          <label className="ob-switch">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            <span className="ob-switch-track"><span className="ob-switch-thumb" /></span>
          </label>
        </div>
        <div className="ob-toggle-row">
          <div className="ob-toggle-info">
            <p className="ob-toggle-label">Show on marketplace</p>
            <p className="ob-toggle-hint">Your salon will appear in salonox marketplace search results.</p>
          </div>
          <label className="ob-switch">
            <input type="checkbox" defaultChecked />
            <span className="ob-switch-track"><span className="ob-switch-thumb" /></span>
          </label>
        </div>
        <div className="ob-toggle-row">
          <div className="ob-toggle-info">
            <p className="ob-toggle-label">Instant confirmation</p>
            <p className="ob-toggle-hint">Bookings are confirmed immediately without manual approval.</p>
          </div>
          <label className="ob-switch">
            <input type="checkbox" defaultChecked />
            <span className="ob-switch-track"><span className="ob-switch-thumb" /></span>
          </label>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          EXISTING — Business Information
      ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="ob-card">
        <div className="ob-card-header">
          <div>
            <p className="ob-card-title">Business Information</p>
            <p className="ob-card-sub">This is displayed to clients on your public booking page.</p>
          </div>
        </div>
        <div className="ob-section-label">Photos & Logo</div>
        <div className="ob-photo-grid" style={{ marginBottom: 24 }}>

          {/* ── Logo slot ── */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div
              className="ob-photo-slot ob-photo-slot--logo"
              onClick={() => !logoUploading && logoInput.current?.click()}
              style={{ cursor: "pointer", position: "relative", overflow: "hidden",
                border: logoUrl ? "2px solid #e5e7eb" : undefined }}
              title="Click to upload logo">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo"
                  style={{ width: "100%", height: "100%", objectFit: "cover",
                    borderRadius: "inherit", display: "block" }} />
              ) : (
                <ImageFill size={28} color="#9ca3af" />
              )}
              {logoUploading && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: "inherit" }}>
                  <div style={{ width: 22, height: 22, border: "3px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff", borderRadius: "50%",
                    animation: "gallery-spin 0.8s linear infinite" }} />
                </div>
              )}
              {/* Hover overlay */}
              <div className="ob-photo-slot-hover"
                style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: 0, transition: "opacity 0.2s", borderRadius: "inherit" }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}>
                <Upload size={18} color="#fff" />
              </div>
            </div>
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              {logoUploading ? "Uploading…" : logoUrl ? "Logo (click to change)" : "Logo"}
            </span>
            <input ref={logoInput} type="file" accept="image/jpeg,image/png,image/webp" hidden
              onChange={(e) => { if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]); e.target.value = ""; }} />
          </div>

          {/* ── Cover photo slot ── */}
          <div
            className="ob-photo-slot"
            onClick={() => !coverUploading && coverInput.current?.click()}
            style={{ minHeight: 120, cursor: "pointer", position: "relative", overflow: "hidden",
              padding: coverUrl ? 0 : undefined }}
            title="Click to upload cover photo">
            {coverUrl ? (
              <img src={coverUrl} alt="Cover"
                style={{ width: "100%", height: "100%", objectFit: "cover",
                  borderRadius: "inherit", display: "block" }} />
            ) : (
              <>
                <span className="ob-photo-upload-icon"><Upload size={22} /></span>
                <span>Upload cover photo</span>
                <span style={{ fontSize: 11.5, color: "#9ca3af" }}>PNG, JPG up to 5MB</span>
              </>
            )}
            {coverUploading && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "inherit" }}>
                <div style={{ width: 28, height: 28, border: "3px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff", borderRadius: "50%",
                  animation: "gallery-spin 0.8s linear infinite" }} />
              </div>
            )}
            {/* Hover overlay when cover exists */}
            {coverUrl && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 6, opacity: 0, transition: "opacity 0.2s",
                borderRadius: "inherit" }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}>
                <Upload size={20} color="#fff" />
                <span style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>Change cover</span>
              </div>
            )}
            <input ref={coverInput} type="file" accept="image/jpeg,image/png,image/webp" hidden
              onChange={(e) => { if (e.target.files?.[0]) handleCoverUpload(e.target.files[0]); e.target.value = ""; }} />
          </div>
        </div>
        <div className="ob-section-label">Details</div>
        <div className="ob-form-group">
          <label className="ob-label">Business name</label>
          <input className="ob-input" value={businessName}
            onChange={(e) => setBusinessName(e.target.value)} placeholder="Your salon name" />
        </div>
        <div className="ob-form-group">
          <label className="ob-label">
            Tagline <span className="ob-label-optional">(optional)</span>
          </label>
          <input className="ob-input" value={tagline} maxLength={80}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="e.g. Premium cuts & color in the heart of the city" />
          <p className="ob-char-count">{tagline.length}/80</p>
        </div>
        <div className="ob-form-group">
          <label className="ob-label">
            Description <span className="ob-label-optional">(optional)</span>
          </label>
          <textarea className="ob-textarea" value={description} maxLength={500} rows={4}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell clients what makes your salon special…" />
          <p className="ob-char-count">{description.length}/500</p>
        </div>
        <div className="ob-form-grid">
          <div className="ob-form-group">
            <label className="ob-label">Phone number</label>
            <input className="ob-input" value={phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                setPhone(val);
              }} placeholder="Enter 10-digit number" />
          </div>
          <div className="ob-form-group">
            <label className="ob-label">
              Website <span className="ob-label-optional">(optional)</span>
            </label>
            <input className="ob-input" value={website}
              onChange={(e) => setWebsite(e.target.value)} placeholder="https://yoursalon.com" />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          NEW — Salon Work Gallery
      ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="ob-card" style={{ padding: 0, overflow: "hidden" }}>

        {/* Premium Header */}
        <div style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#0f172a 100%)",
          padding: "22px 28px", display: "flex", alignItems: "center",
          justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12,
              background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Images size={20} color="#fff" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
                <span style={{ fontSize: 15.5, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>
                  Salon Work Gallery
                </span>
                {gallery.filter(g => g.saved).length > 0 && (
                  <span style={{ background: "#f59e0b", color: "#000", fontSize: 11,
                    fontWeight: 800, padding: "2px 9px", borderRadius: 20 }}>
                    {gallery.filter(g => g.saved).length} photo{gallery.filter(g => g.saved).length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>
                Showcase your best work — clients browse photos before booking
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => fetchGallery()}
              style={{ display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 14px", background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)", borderRadius: 9,
                fontSize: 12.5, fontWeight: 600, color: "#e2e8f0", cursor: "pointer" }}>
              <ArrowRepeat size={13} /> Refresh
            </button>
            <button onClick={() => galleryInput.current?.click()}
              style={{ display: "inline-flex", alignItems: "center", gap: 8,
                padding: "9px 20px", background: "#fff", color: "#0f172a",
                border: "none", borderRadius: 9, fontSize: 13,
                fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}>
              <PlusLg size={13} /> Add Photos
            </button>
          </div>
        </div>

        {/* Format hint strip */}
        <div style={{ background: "#f8fafc", padding: "8px 28px",
          borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>
            Accepted:
          </span>
          {["JPG", "PNG", "WEBP"].map(f => (
            <span key={f} style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b",
              background: "#e2e8f0", padding: "2px 8px", borderRadius: 5 }}>{f}</span>
          ))}
          <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 4 }}>· Max 5 MB each</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8" }}>
            {gallery.filter(g => g.uploading).length > 0 && (
              <span style={{ color: "#f59e0b", fontWeight: 700 }}>
                ↑ {gallery.filter(g => g.uploading).length} uploading…
              </span>
            )}
          </span>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px 28px", background: "#fafafa" }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}>

          {galleryLoading ? (
            <div style={{ display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {[1,2,3,4].map((i) => (
                <div key={i} style={{ borderRadius: 14, overflow: "hidden",
                  boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
                  <div style={{ aspectRatio: "1", background:
                    "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)",
                    backgroundSize: "200% 100%",
                    animation: "gallery-shimmer 1.4s ease infinite" }} />
                  <div style={{ background: "#fff", padding: "10px 12px" }}>
                    <div style={{ height: 10, width: "60%", borderRadius: 6,
                      background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)",
                      backgroundSize: "200% 100%", animation: "gallery-shimmer 1.4s ease infinite" }} />
                  </div>
                </div>
              ))}
              <style>{`
                @keyframes gallery-shimmer {
                  0%   { background-position: 200% 0 }
                  100% { background-position: -200% 0 }
                }
                @keyframes gallery-spin { to { transform: rotate(360deg); } }
                @keyframes gallery-fade-up {
                  from { opacity: 0; transform: translateY(8px); }
                  to   { opacity: 1; transform: translateY(0); }
                }
              `}</style>
            </div>

          ) : gallery.length === 0 ? (
            /* Premium empty/drop zone */
            <div
              onClick={() => galleryInput.current?.click()}
              style={{ borderRadius: 18,
                border: `2px dashed ${dragOver ? "#0f172a" : "#cbd5e1"}`,
                background: dragOver
                  ? "linear-gradient(135deg,#f0f9ff,#e0f2fe)"
                  : "linear-gradient(135deg,#f8fafc,#f1f5f9)",
                padding: "64px 32px", textAlign: "center",
                cursor: "pointer", transition: "all 0.25s",
                boxShadow: dragOver ? "0 0 0 4px rgba(15,23,42,0.06)" : "none" }}>
              <div style={{ width: 80, height: 80, borderRadius: 24,
                background: dragOver
                  ? "linear-gradient(135deg,#0f172a,#334155)"
                  : "linear-gradient(135deg,#e2e8f0,#cbd5e1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px",
                boxShadow: dragOver ? "0 8px 24px rgba(15,23,42,0.25)" : "0 4px 12px rgba(0,0,0,0.08)",
                transition: "all 0.25s" }}>
                <CloudArrowUp size={36} color={dragOver ? "#fff" : "#64748b"} />
              </div>
              <p style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800,
                color: dragOver ? "#0f172a" : "#1e293b", letterSpacing: "-0.02em" }}>
                {dragOver ? "Release to upload" : "Upload your salon work"}
              </p>
              <p style={{ margin: "0 0 28px", fontSize: 13.5, color: "#64748b", lineHeight: 1.7 }}>
                Drag & drop photos here, or click to browse your files.<br/>
                Show clients your best cuts, colors and transformations.
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); galleryInput.current?.click(); }}
                style={{ display: "inline-flex", alignItems: "center", gap: 10,
                  padding: "13px 32px", background: "linear-gradient(135deg,#0f172a,#1e293b)",
                  color: "#fff", border: "none", borderRadius: 12,
                  fontSize: 14, fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(15,23,42,0.3)", letterSpacing: "-0.01em" }}>
                <CloudArrowUp size={18} /> Choose Photos to Upload
              </button>
            </div>

          ) : (
            /* Photo grid */
            <div>
              {dragOver && (
                <div style={{ textAlign: "center", padding: "16px", marginBottom: 18,
                  border: "2.5px dashed #0f172a", borderRadius: 14,
                  background: "linear-gradient(135deg,#f0f9ff,#e0f2fe)",
                  fontSize: 14, fontWeight: 800, color: "#0f172a",
                  letterSpacing: "-0.01em" }}>
                  📸 Drop to add to your gallery
                </div>
              )}

              <div style={{ display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                {gallery.map((photo) => (
                  <GalleryCard
                    key={photo.id}
                    photo={photo}
                    replaceInputRef={(el) => { replaceInputs.current[photo.id] = el; }}
                    onDelete={() => deletePhoto(photo)}
                    onReplace={(file) => replacePhoto(photo, file)}
                    onRetry={() => galleryInput.current?.click()}
                  />
                ))}

                {/* Add more tile */}
                <div onClick={() => galleryInput.current?.click()}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "#0f172a";
                    (e.currentTarget as HTMLDivElement).style.background = "linear-gradient(135deg,#f0f9ff,#e0f2fe)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "#cbd5e1";
                    (e.currentTarget as HTMLDivElement).style.background = "#f8fafc";
                  }}
                  style={{ aspectRatio: "1", border: "2px dashed #cbd5e1",
                    borderRadius: 14, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    gap: 10, cursor: "pointer", background: "#f8fafc",
                    transition: "all 0.2s" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12,
                    background: "#e2e8f0", display: "flex", alignItems: "center",
                    justifyContent: "center" }}>
                    <PlusLg size={20} color="#475569" />
                  </div>
                  <span style={{ fontSize: 12.5, color: "#64748b", fontWeight: 600 }}>Add more</span>
                </div>
              </div>

              {/* Footer stats */}
              <div style={{ marginTop: 20, display: "flex", alignItems: "center",
                justifyContent: "space-between", padding: "12px 16px",
                background: "linear-gradient(135deg,#f8fafc,#f1f5f9)",
                borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <span style={{ fontSize: 12.5, color: "#475569", display: "flex",
                    alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%",
                      background: "#22c55e", display: "inline-block" }} />
                    <strong style={{ color: "#0f172a" }}>{gallery.filter(g => g.saved).length}</strong> saved
                  </span>
                  {gallery.filter(g => g.uploading).length > 0 && (
                    <span style={{ fontSize: 12.5, color: "#475569", display: "flex",
                      alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%",
                        background: "#f59e0b", display: "inline-block",
                        animation: "gallery-spin 1s linear infinite" }} />
                      <strong style={{ color: "#0f172a" }}>{gallery.filter(g => g.uploading).length}</strong> uploading
                    </span>
                  )}
                  {gallery.filter(g => g.error).length > 0 && (
                    <span style={{ fontSize: 12.5, color: "#ef4444", display: "flex",
                      alignItems: "center", gap: 6 }}>
                      <strong>{gallery.filter(g => g.error).length}</strong> failed
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 11.5, color: "#94a3b8", display: "flex",
                  alignItems: "center", gap: 5 }}>
                  <ImageFill size={12} /> Drag & drop to add more
                </span>
              </div>
            </div>
          )}
        </div>

        <style>{`
          @keyframes gallery-shimmer {
            0%   { background-position: 200% 0 }
            100% { background-position: -200% 0 }
          }
          @keyframes gallery-spin { to { transform: rotate(360deg); } }
        `}</style>

        {/* Hidden inputs */}
        <input ref={galleryInput} type="file"
          accept="image/jpeg,image/png,image/webp" multiple hidden
          onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); e.target.value = ""; }} />
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          EXISTING — Booking Settings
      ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="ob-card">
        <div className="ob-card-header">
          <div>
            <p className="ob-card-title">Booking Settings</p>
            <p className="ob-card-sub">Control when and how far ahead clients can book.</p>
          </div>
        </div>
        <div className="ob-form-grid">
          <div className="ob-form-group">
            <label className="ob-label">Maximum advance booking</label>
            <select className="ob-select">
              <option value={30}>1 month</option>
              <option value={60}>2 months</option>
              <option value={90}>3 months</option>
              <option value={180}>6 months</option>
            </select>
          </div>
          <div className="ob-form-group">
            <label className="ob-label">Minimum notice period</label>
            <select className="ob-select">
              <option value={0}>No notice required</option>
              <option value={1}>1 hour</option>
              <option value={4}>4 hours</option>
              <option value={24}>24 hours</option>
              <option value={48}>48 hours</option>
            </select>
          </div>
          <div className="ob-form-group">
            <label className="ob-label">Cancellation notice</label>
            <select className="ob-select">
              <option value={0}>No restriction</option>
              <option value={2}>2 hours before</option>
              <option value={12}>12 hours before</option>
              <option value={24}>24 hours before</option>
            </select>
          </div>
          <div className="ob-form-group">
            <label className="ob-label">Slot interval</label>
            <select className="ob-select">
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </div>
        </div>
        <div className="ob-info-banner">
          <InfoCircle size={16} className="ob-info-icon" />
          <p className="ob-info-text">
            <strong>Advance booking & notice periods</strong> control when clients can start and end
            booking appointments online. These settings apply to all services unless overridden at
            service level.
          </p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          EXISTING — Business Hours
      ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="ob-card">
        <div className="ob-card-header">
          <div>
            <p className="ob-card-title">
              <Clock size={16} style={{ marginRight: 7, verticalAlign: "middle" }} />
              Business Hours
            </p>
            <p className="ob-card-sub">Set your opening times shown to clients on your booking page.</p>
          </div>
        </div>
        {DAYS.map((day) => {
          const h = hours[day];
          return (
            <div key={day} className="ob-hours-row">
              <div className="ob-hours-day">{day}</div>
              {h.open ? (
                <div className="ob-hours-times">
                  <input type="time" className="ob-input" value={h.from}
                    onChange={(e) => updateHour(day, "from", e.target.value)} />
                  <span className="ob-hours-sep">to</span>
                  <input type="time" className="ob-input" value={h.to}
                    onChange={(e) => updateHour(day, "to", e.target.value)} />
                </div>
              ) : (
                <span className="ob-hours-closed">Closed</span>
              )}
              <label className="ob-switch">
                <input type="checkbox" checked={h.open}
                  onChange={(e) => updateHour(day, "open", e.target.checked)} />
                <span className="ob-switch-track"><span className="ob-switch-thumb" /></span>
              </label>
            </div>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          EXISTING — Booking Link
      ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="ob-card">
        <div className="ob-card-header">
          <div>
            <p className="ob-card-title">Your Booking Link</p>
            <p className="ob-card-sub">Share this link with clients to let them book directly.</p>
          </div>
        </div>
        <div className="ob-link-display">
          <Globe size={14} style={{ flexShrink: 0, color: "#6b7280" }} />
          <span className="ob-link-url">https://book.salonox.com/my-salon</span>
          <button className="ob-copy-btn">Copy</button>
        </div>
      </div>

      {/* Preview Modal */}
      <BookingPreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        previewName={businessName}
        previewTagline={tagline}
        previewDescription={description}
        galleryPhotos={savedPhotos}
      />
    </div>
  );
}

// ─── GalleryCard ──────────────────────────────────────────────────────────────

interface GalleryCardProps {
  photo: GalleryPhoto;
  replaceInputRef: (el: HTMLInputElement | null) => void;
  onDelete: () => void;
  onReplace: (file: File) => void;
  onRetry: () => void;
}

function GalleryCard({ photo, replaceInputRef, onDelete, onReplace }: GalleryCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 16, overflow: "hidden", background: "#fff",
        boxShadow: hovered
          ? "0 12px 40px rgba(0,0,0,0.18)"
          : photo.error
            ? "0 0 0 2px #fca5a5, 0 2px 8px rgba(0,0,0,0.06)"
            : "0 2px 10px rgba(0,0,0,0.07)",
        transform: hovered && !photo.uploading && !photo.error ? "translateY(-3px)" : "none",
        transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
        position: "relative",
      }}>

      {/* Image area */}
      <div style={{ position: "relative", aspectRatio: "1", overflow: "hidden",
        background: "linear-gradient(135deg,#f1f5f9,#e2e8f0)" }}>
        <img
          src={photo.url}
          alt={photo.filename}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block",
            transition: "transform 0.4s cubic-bezier(0.4,0,0.2,1)",
            transform: hovered && !photo.uploading && !photo.error ? "scale(1.08)" : "scale(1)" }}
        />

        {/* Gradient overlay always visible at bottom for readability */}
        {!photo.uploading && !photo.error && (
          <div style={{ position: "absolute", inset: 0,
            background: hovered
              ? "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0) 100%)"
              : "linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 50%)",
            transition: "background 0.3s" }} />
        )}

        {/* Upload progress overlay */}
        {photo.uploading && (
          <div style={{ position: "absolute", inset: 0,
            background: "linear-gradient(135deg,rgba(15,23,42,0.85),rgba(30,41,59,0.85))",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 14 }}>
            <div style={{ position: "relative", width: 52, height: 52 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%",
                border: "3px solid rgba(255,255,255,0.15)",
                borderTopColor: "#f59e0b",
                animation: "gallery-spin 0.8s linear infinite" }} />
              <span style={{ position: "absolute", inset: 0, display: "flex",
                alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800, color: "#fff" }}>
                {photo.progress}%
              </span>
            </div>
            <div style={{ width: "72%", height: 5, borderRadius: 5,
              background: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 5,
                background: "linear-gradient(90deg,#f59e0b,#fbbf24)",
                width: `${photo.progress}%`, transition: "width 0.3s" }} />
            </div>
            <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
              Uploading photo…
            </span>
          </div>
        )}

        {/* Error overlay */}
        {photo.error && (
          <div style={{ position: "absolute", inset: 0,
            background: "linear-gradient(135deg,rgba(239,68,68,0.92),rgba(185,28,28,0.92))",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 8, padding: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <XCircleFill size={22} color="#fff" />
            </div>
            <span style={{ fontSize: 12, color: "#fff", textAlign: "center",
              fontWeight: 700, lineHeight: 1.4 }}>Upload failed</span>
            <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.75)",
              textAlign: "center", lineHeight: 1.4 }}>Tap delete to remove</span>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
              style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 5,
                padding: "6px 14px", background: "rgba(255,255,255,0.2)",
                border: "1px solid rgba(255,255,255,0.35)", borderRadius: 8,
                color: "#fff", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
              <Trash3 size={11} /> Remove
            </button>
          </div>
        )}

        {/* Hover action buttons */}
        {!photo.uploading && !photo.error && (
          <>
            {/* Top-right action strip */}
            <div style={{ position: "absolute", top: 8, right: 8,
              display: "flex", gap: 6,
              opacity: hovered ? 1 : 0,
              transform: hovered ? "translateY(0)" : "translateY(-6px)",
              transition: "all 0.2s" }}>
              <button
                title="Replace photo"
                onClick={(e) => {
                  e.stopPropagation();
                  const inp = document.createElement("input");
                  inp.type = "file"; inp.accept = "image/jpeg,image/png,image/webp";
                  inp.onchange = (ev) => {
                    const f = (ev.target as HTMLInputElement).files?.[0];
                    if (f) onReplace(f);
                  };
                  inp.click();
                }}
                style={{ width: 32, height: 32, borderRadius: 10,
                  background: "rgba(255,255,255,0.92)",
                  backdropFilter: "blur(8px)",
                  border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                <ArrowRepeat size={14} color="#1e293b" />
              </button>
              <button
                title="Delete photo"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                style={{ width: 32, height: 32, borderRadius: 10,
                  background: "rgba(239,68,68,0.92)",
                  backdropFilter: "blur(8px)",
                  border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(239,68,68,0.35)" }}>
                <Trash3 size={14} color="#fff" />
              </button>
            </div>

            {/* Bottom filename bar slides up on hover */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0,
              padding: "20px 12px 10px",
              background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
              transform: hovered ? "translateY(0)" : "translateY(4px)",
              opacity: hovered ? 1 : 0,
              transition: "all 0.25s" }}>
              <p style={{ margin: 0, fontSize: 11.5, color: "#fff", fontWeight: 600,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {photo.filename}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 10.5, color: "rgba(255,255,255,0.65)" }}>
                {fmtSize(photo.size)}
              </p>
            </div>
          </>
        )}

        {/* Saved indicator */}
        {photo.saved && !hovered && !photo.uploading && !photo.error && (
          <div style={{ position: "absolute", bottom: 8, left: 8,
            width: 8, height: 8, borderRadius: "50%", background: "#22c55e",
            boxShadow: "0 0 0 2px rgba(255,255,255,0.8)" }} />
        )}
      </div>

      {/* Hidden replace input */}
      <input
        type="file" accept="image/jpeg,image/png,image/webp" hidden
        ref={replaceInputRef}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onReplace(f); }}
      />
    </div>
  );
}
