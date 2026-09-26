export const USER = {
  ME: "/api/v1/users/profile",
  UPDATE_ME: "/api/v1/users/me",
  UPDATE: "/api/v1/user/update",
  UPLOAD_AVATAR: "/api/v1/users/me/avatar",
  CHANGE_PASSWORD: "/api/v1/users/me/change-password",
  PROFILE: (id: string) => `/api/v1/profile/${id}`,
} as const;
