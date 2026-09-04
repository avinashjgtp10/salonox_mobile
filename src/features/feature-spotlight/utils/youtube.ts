// Accepts the handful of URL shapes YouTube actually issues/shares:
// watch?v=, youtu.be/, embed/, shorts/ — with or without extra query params
// (playlist context, timestamps, etc.), which a naive `new URL().searchParams`
// approach would otherwise choke on for the youtu.be/embed/shorts path forms.
const YOUTUBE_ID_RE =
  /(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

export function extractYouTubeId(url: string): string | null {
  const match = url.trim().match(YOUTUBE_ID_RE);
  return match ? match[1] : null;
}

export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeId(url) !== null;
}

export function youTubeEmbedUrl(url: string): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

// YouTube always hosts a thumbnail at this fixed path for every video —
// used as the cover image for a video-only feature that has no uploaded
// screenshot of its own (see SpotlightFeaturePreview.tsx), so it never
// falls back to the empty-state icon just because no image was attached.
export function youTubeThumbnailUrl(url: string): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}
