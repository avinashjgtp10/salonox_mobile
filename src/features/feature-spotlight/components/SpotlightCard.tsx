import React, { useRef, useState } from "react";
import { PlayFill, Link45deg, Check2, ImageFill, CameraFill } from "react-bootstrap-icons";
import type { SpotlightFeature } from "../types";
import { compressImage } from "../utils/compressImage";

interface SpotlightCardProps {
  feature: SpotlightFeature;
  index: number;
  isUnread: boolean;
  active?: boolean;
  isOwner?: boolean;
  onSelect: () => void;
  /** Should return/throw so the card can tell success from failure — a
   *  quota-exceeded localStorage write must not look like a successful
   *  upload to the person who just picked a file. */
  onImageUpload?: (dataUrl: string) => Promise<void>;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_LABEL: Record<SpotlightFeature["status"], string> = {
  published: "Live",
  draft: "Draft",
  archived: "Archived",
};

const SpotlightCard: React.FC<SpotlightCardProps> = ({ feature, index, isUnread, active, isOwner, onSelect, onImageUpload }) => {
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = `${window.location.origin}/dashboard/spotlight/${feature.id}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — no-op, nothing to surface for a
      // non-critical convenience action.
    }
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !onImageUpload) return;
    setUploading(true);
    setUploadError("");
    try {
      const dataUrl = await compressImage(file);
      await onImageUpload(dataUrl);
    } catch (err: any) {
      setUploadError(err?.message || "Couldn't save this image — try a smaller file.");
      setTimeout(() => setUploadError(""), 4000);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={`spotlight-card ${active ? "spotlight-card--active" : ""}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" ? onSelect() : undefined)}
    >
      <div className="spotlight-card__thumb">
        <span className="spotlight-card__index">#{index}</span>
        {isUnread && <span className="spotlight-card__new-dot" title="New" />}
        <ImageFill size={26} />
        <span className="spotlight-card__play">
          <PlayFill size={20} />
        </span>
        {isOwner && (
          <>
            <button
              type="button"
              className="spotlight-card__upload"
              onClick={handleUploadClick}
              title="Upload image"
              disabled={uploading}
            >
              <CameraFill size={13} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onClick={(e) => e.stopPropagation()}
              onChange={handleFileChange}
            />
            {uploadError && (
              <span className="spotlight-card__upload-error" onClick={(e) => e.stopPropagation()}>
                {uploadError}
              </span>
            )}
          </>
        )}
      </div>

      <div className="spotlight-card__body">
        <span className="spotlight-card__date">{formatDate(feature.releaseDate)}</span>
        <h3 className="spotlight-card__name">{feature.featureName}</h3>
        <p className="spotlight-card__desc">{feature.shortDescription}</p>

        <div className="spotlight-card__footer">
          <span className="spotlight-tag">{feature.module}</span>
          <span className={`spotlight-tag spotlight-tag--${feature.status}`}>{STATUS_LABEL[feature.status]}</span>
          <button type="button" className="spotlight-card__copy" onClick={handleCopyLink}>
            {copied ? <Check2 size={12} /> : <Link45deg size={13} />}
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SpotlightCard;
