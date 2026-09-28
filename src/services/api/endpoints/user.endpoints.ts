export const USER = {
  // Base for the self-service writes (PATCH /users/me, /me/change-password,
  // /me/avatar). The server has no GET /users/me — a GET there falls through
  // to the admin-only GET /users/:id — so reads must use PROFILE.
  ME: "/users/me",
  PROFILE: "/users/profile",
} as const;
