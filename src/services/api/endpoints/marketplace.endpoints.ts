export const MARKETPLACE = {
  PROFILE: "/api/v1/marketplace/profile",
  ESSENTIALS: "/api/v1/marketplace/essentials",
  ABOUT: "/api/v1/marketplace/about",
  LOCATION: "/api/v1/marketplace/location",
  WORKING_HOURS: "/api/v1/marketplace/working-hours",
  IMAGES: "/api/v1/marketplace/images",
  IMAGES_REORDER: "/api/v1/marketplace/images/reorder",
  IMAGE_COVER: (id: string) => `/api/v1/marketplace/images/${id}/cover`,
  IMAGE_BY_ID: (id: string) => `/api/v1/marketplace/images/${id}`,
  FEATURES: "/api/v1/marketplace/features",
  PUBLISH: "/api/v1/marketplace/publish",
  UNPUBLISH: "/api/v1/marketplace/unpublish",
} as const;
