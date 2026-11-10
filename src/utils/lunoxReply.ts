// Protocol tokens are never a customer-facing answer, even when the provider
// accidentally puts them in its public content field.
export const LUNOX_INVALID_REPLY = "Lunox couldn’t complete that answer. Please try again.";

export function isInvalidLunoxReply(value: unknown): boolean {
  return typeof value !== "string" || !value.trim() ||
    /<\|(?:im_start|im_end|start|end|channel|message|call|return|constrain|meta_sep|meta_start|fim_suffix|ghissue|ghreview)[\s|>]/i.test(value) ||
    /(?:^|\n)\s*(?:analysis\s*(?:\n|$)|assistant\s+to=functions\.|to=functions\.)/i.test(value);
}
