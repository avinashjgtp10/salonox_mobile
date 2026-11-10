import { getApiErrorMessage } from "@/services/api";

export function staffAttendanceErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "code" in error && error.code === "PREVIOUS_CHECKOUT_PENDING") {
    return "Complete your pending checkout before checking in for today.";
  }
  return getApiErrorMessage(error);
}
