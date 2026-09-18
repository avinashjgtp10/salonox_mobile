import React, { useState } from "react";
import Button from "./Button";
import { downloadBlob } from "../../utils/downloadBlob";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Static mode  — data is already available (string, BlobPart, or Blob).
 * Async mode   — an async fetcher returns the data right before the download.
 *
 * Both modes share the same filename / mimeType props.
 */
type StaticSource = {
  /** Pre-built data to download (string, ArrayBuffer, Blob, …) */
  data: BlobPart | Blob;
  /** No fetcher needed when data is static */
  fetcher?: never;
};

type AsyncSource = {
  data?: never;
  /**
   * Called when the user clicks. Must resolve to the data to download.
   * Throw (or reject) to trigger the error flash.
   */
  fetcher: () => Promise<BlobPart | Blob>;
};

interface DownloadButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick" | "onError"
> {
  /** Download file name, e.g. "staff.csv" */
  filename: string;
  /** MIME type – defaults to "application/octet-stream" */
  mimeType?: string;
  /** Text shown while fetching (async mode only) */
  loadingLabel?: string;
  /** How long (ms) to show the success/error flash – 0 to disable */
  flashDuration?: number;
  /** Forwarded to the underlying Button */
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  pill?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
  children?: React.ReactNode;
}

type Props = DownloadButtonProps & (StaticSource | AsyncSource);

// ─── Component ───────────────────────────────────────────────────────────────

type Status = "idle" | "loading" | "success" | "error";

const DownloadButton: React.FC<Props> = ({
  data,
  fetcher,
  filename,
  mimeType = "application/octet-stream",
  loadingLabel = "Downloading…",
  flashDuration = 2000,
  variant = "outline-dark",
  size,
  pill,
  iconLeft,
  iconRight,
  fullWidth,
  className = "",
  children = "Download",
  disabled,
  ...rest
}) => {
  const [status, setStatus] = useState<Status>("idle");

  // ── Flash helper ──────────────────────────────────────────────────────────
  const flash = (next: "success" | "error") => {
    setStatus(next);
    if (flashDuration > 0) {
      setTimeout(() => setStatus("idle"), flashDuration);
    }
  };

  // ── Click handler ─────────────────────────────────────────────────────────
  const handleClick = async () => {
    if (status === "loading") return;

    try {
      // Resolve data --------------------------------------------------------
      let payload: BlobPart | Blob;

      if (fetcher) {
        setStatus("loading");
        payload = await fetcher();
      } else {
        // Static: data is always defined here (TypeScript union narrows it)
        payload = data!;
      }

      // Trigger download ----------------------------------------------------
      const ok = downloadBlob(payload, filename, mimeType);
      flash(ok ? "success" : "error");
    } catch {
      flash("error");
    }
  };

  // ── Derived display values ────────────────────────────────────────────────
  const isLoading = status === "loading";
  const isDisabled = disabled || isLoading;

  const label = isLoading
    ? loadingLabel
    : status === "success"
      ? "✓ Downloaded"
      : status === "error"
        ? "✗ Failed"
        : children;

  // Tint the button during flash states
  const flashVariant: typeof variant =
    status === "success" ? "success" : status === "error" ? "danger" : variant;

  return (
    <Button
      variant={flashVariant}
      size={size}
      pill={pill}
      iconLeft={!isLoading ? iconLeft : undefined}
      iconRight={!isLoading ? iconRight : undefined}
      fullWidth={fullWidth}
      loading={isLoading}
      disabled={isDisabled}
      className={className}
      onClick={handleClick}
      aria-label={`Download ${filename}`}
      {...rest}
    >
      {label}
    </Button>
  );
};

export default DownloadButton;
