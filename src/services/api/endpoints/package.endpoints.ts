export const PACKAGE = {
  CLIENT_ASSIGNMENTS: "/client-packages",
  DELETE: (id: string) => `/packages/${id}`,
  LIST: "/packages",
  TEMPLATE_CREATE: "/package-templates",
  TEMPLATE_DELETE: (id: string) => `/package-templates/${id}`,
  TEMPLATE_DETAIL: (id: string) => `/package-templates/${id}`,
  TEMPLATE_UPDATE: (id: string) => `/package-templates/${id}`,
  TEMPLATES: "/package-templates",
} as const;
