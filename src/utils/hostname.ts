// feedback.salonox.com serves the same SPA build as the main app (nginx has
// no host-based routing — see nginx.conf), so the root "/" route has to be
// picked at runtime based on hostname instead of by a separate deployment.
export const isFeedbackHost =
  typeof window !== "undefined" && window.location.hostname.startsWith("feedback.");
