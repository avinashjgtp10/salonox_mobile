// Spotlight images are stored as base64 data URLs in localStorage (no upload
// endpoint exists yet — see spotlightStorage.ts), which caps out around
// 5-10MB per origin shared across everything else the app stores there. A
// full-resolution screenshot can easily be 1-3MB once base64-encoded, so a
// handful of feature images can silently blow the quota. Downscaling and
// re-encoding as JPEG before storing keeps each image in the tens-of-KB
// range instead, without a visible quality loss at thumbnail/preview size.
export function compressImage(file: File, maxWidth = 900, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not decode the image file."));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas is not supported in this browser."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // GIFs would lose their animation if re-encoded as JPEG — pass those
        // through as-is (already small in practice) rather than compress.
        if (file.type === "image/gif") {
          resolve(reader.result as string);
          return;
        }
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// Same downscale/re-encode as compressImage, but for an image already
// stored as a data URL — used to shrink existing Spotlight images in place
// when localStorage is full (see spotlightStorage.ts's saveFeaturesResilient),
// since there's no File to re-read from at that point.
export function recompressDataUrl(dataUrl: string, maxWidth = 700, quality = 0.55): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl.startsWith("data:image") || dataUrl.startsWith("data:image/gif")) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    // Best-effort: if it can't be decoded/redrawn for any reason, keep the
    // original rather than losing the image entirely.
    img.onerror = () => resolve(dataUrl);
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = dataUrl;
  });
}
