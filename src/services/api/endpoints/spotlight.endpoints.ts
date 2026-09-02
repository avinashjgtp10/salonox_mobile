// Spotlight has no backend yet (see src/features/feature-spotlight — it runs
// entirely on localStorage mock data). This is the one real endpoint the
// backend team needs to add so Spotlight images stop being stored as base64
// data URLs in localStorage:
//
//   POST /api/v1/spotlight/upload-image
//   Content-Type: multipart/form-data
//   Field: "image" (single file)
//   Response: { data: { url: string } }  — a URL the frontend can store as-is
//   and later pass straight into <img src>.
//
// Same shape as the existing staff/client/user avatar upload endpoints
// (see staff.endpoints.ts UPLOAD_AVATAR) — mirror that implementation.
export const SPOTLIGHT = {
  UPLOAD_IMAGE: "/api/v1/spotlight/upload-image",
} as const;
