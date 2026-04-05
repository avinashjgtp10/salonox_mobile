export const downloadBlob = (
  data: BlobPart | Blob,
  filename: string,
  mimeType: string = "application/octet-stream"
): boolean => {
  if (typeof window === "undefined" || !window.URL?.createObjectURL) {
    return false;
  }

  if (data == null) {
    return false;
  }

  const trimmedFilename = filename?.trim();
  if (!trimmedFilename) {
    return false;
  }

  let url: string | null = null;

  try {
    const blob =
      data instanceof Blob && data.type === mimeType
        ? data
        : new Blob([data as BlobPart], { type: mimeType });

    url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = trimmedFilename;
    link.style.display = "none";
    link.setAttribute("aria-hidden", "true");

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
  } catch {
    return false;
  } finally {
    if (url !== null) {
      const capturedUrl = url;
      setTimeout(() => window.URL.revokeObjectURL(capturedUrl), 0);
    }
  }
};