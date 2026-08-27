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
