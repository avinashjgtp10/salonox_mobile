/**
 * Hashes a plaintext password using SHA-256 via the browser's built-in
 * Web Crypto API. Returns a lowercase hex string (64 chars).
 *
 * This ensures the raw password is never sent over the wire.
 */
export async function hashPassword(plain: string): Promise<string> {
  const encoded = new TextEncoder().encode(plain)
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}
