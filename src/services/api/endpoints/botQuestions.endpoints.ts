export const BOT_QUESTIONS = {
  LIST:     "/api/v1/bot-questions",
  FREQUENT: "/api/v1/bot-questions/frequent",
  STATS:    "/api/v1/bot-questions/stats",
  ANSWER:   (id: string) => `/api/v1/bot-questions/${id}/answer`,
} as const;
