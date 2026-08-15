import { CakeConfig, migrateConfig } from "./schema";

/** Base64url so a design survives a WhatsApp forward without escaping. */
export function encodeConfig(c: CakeConfig): string {
  const json = JSON.stringify(c);
  const b64 = typeof window === "undefined"
    ? Buffer.from(json, "utf8").toString("base64")
    : btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeConfig(s: string): CakeConfig | null {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const json = typeof window === "undefined"
      ? Buffer.from(b64, "base64").toString("utf8")
      : decodeURIComponent(escape(atob(b64)));
    return migrateConfig(JSON.parse(json));
  } catch {
    return null;
  }
}

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** Short, unambiguous slug for `/d/[slug]`. No 0/O/1/l/i confusion. */
export function makeSlug(len = 7): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function makeOrderRef(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return "MC-" + (1000 + (bytes[0] % 9000)).toString();
}
