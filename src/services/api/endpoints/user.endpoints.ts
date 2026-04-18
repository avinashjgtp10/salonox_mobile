export const USER = {
  ME: "/api/v1/users/me",
  UPDATE_ME: "/api/v1/users/me",
  UPLOAD_AVATAR: "/api/v1/users/me/avatar",
  CHANGE_PASSWORD: "/api/v1/users/me/change-password",
  PROFILE: (id: string) => `/api/v1/profile/${id}`,
} as const;
