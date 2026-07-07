import type { StaffMember } from "@/data/teamData";

/**
 * Automatically generates the next unique employee code based on existing staff members.
 * It looks for the last sequence of digits in each existing code, finds the highest numeric
 * value, increments it, and constructs the next code keeping the same prefix and digit padding width.
 * If no code has digits, or the list is empty, it starts with a default "EMP-1001".
 */
export function generateNextEmployeeCode(staffMembers: StaffMember[]): string {
  const defaultCode = "EMP-1001";
  if (!staffMembers || staffMembers.length === 0) {
    return defaultCode;
  }

  let maxNum = 0;
  let bestPrefix = "EMP-";
  let bestWidth = 4;
  let found = false;

  for (const member of staffMembers) {
    const code = member.employeeCode?.trim();
    if (!code || code === "-") continue;

    // Match any prefix followed by digits at the end
    const match = code.match(/^(.*?)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const digits = match[2];
      const num = parseInt(digits, 10);
      if (num > maxNum) {
        maxNum = num;
        bestPrefix = prefix;
        bestWidth = digits.length;
        found = true;
      }
    }
  }

  if (!found) {
    return defaultCode;
  }

  const nextNum = maxNum + 1;
  const nextDigits = String(nextNum).padStart(bestWidth, "0");
  return `${bestPrefix}${nextDigits}`;
}
