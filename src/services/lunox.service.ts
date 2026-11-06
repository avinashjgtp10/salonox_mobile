import { api, ApiError } from "@/services/api";
import { isInvalidLunoxReply, LUNOX_INVALID_REPLY } from "@/utils/lunoxReply";

/** One turn of the Lunox conversation, as the backend's chat history expects it. */
export type LunoxTurn = { role: "user" | "assistant"; content: string };

type AskDataResponse = { data: { reply: string; toolsUsed?: string[] } };

/**
 * Lunox "ask your data" (same endpoint as the web dashboard): read-only answers about
 * this salon's numbers, plus campaign ideas. Each data tool on the server checks the
 * user's own report permissions.
 */
export const lunoxService = {
  async ask(message: string, history: LunoxTurn[]) {
    const response = await api.post<AskDataResponse>("/ai-assistant/ask-data", { message, history });
    const reply = response.data.data.reply;
    if (isInvalidLunoxReply(reply)) throw new Error(LUNOX_INVALID_REPLY);
    return reply;
  },
};

/** Plain-language message for a failed Lunox request (never the server's own wording). */
export function lunoxErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Lunox couldn’t answer just now. Please try again.";
  const data = error.responseData as { error?: { code?: string }; code?: string } | undefined;
  const code = String(data?.error?.code ?? data?.code ?? "").toUpperCase();
  if (error.status === undefined) return "You’re offline. Connect to the internet to ask Lunox.";
  if (code === "MODULE_LOCKED") return "Lunox isn’t switched on for your salon yet. Ask SalonOX support to turn it on.";
  if (code === "AI_QUOTA_EXCEEDED") return "Your salon has used this month’s Lunox limit. It resets next month.";
  if (code === "RATE_LIMITED" || error.status === 429) return "You’re asking a little fast. Please wait a moment and try again.";
  if (error.status === 403) return "You don’t have access to Lunox. Ask your salon owner to give you access.";
  return "Lunox couldn’t answer just now. Please try again.";
}

export type LunoxDailyInsight = { text: string; date: string };

/** Dashboard "AI insight" card (mobile-only endpoint). `null` when Lunox is off for the salon. */
export async function fetchLunoxDailyInsight(): Promise<LunoxDailyInsight | null> {
  const response = await api.get<{ data: { insight: LunoxDailyInsight | null } }>("/mobile/lunox/daily-insight");
  return response.data.data.insight ?? null;
}
