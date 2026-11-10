/** A connected salon cannot become another parent; this is a server rule. */
export function isBranchManagementRestricted(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (error as Error & { status?: number }).status === 403 && /branch account.*(?:can.t|cannot) manage branches/i.test(error.message);
}
