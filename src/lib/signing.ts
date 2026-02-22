import * as ed from "@noble/ed25519";
import { sha512, sha256 } from "@noble/hashes/sha2.js";

// Configure sha512 for Ed25519 v3
(ed as any).hashes.sha512 = sha512;

// ── Helpers ──────────────────────────────────────────────────────────────────

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(Buffer.from(padded, "base64"));
}

/** Canonical JSON: recursively sort object keys, no whitespace. */
function canonicalJson(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalJson).join(",") + "]";
  }
  const sorted = Object.keys(obj as Record<string, unknown>).sort();
  const entries = sorted.map(
    (k) => JSON.stringify(k) + ":" + canonicalJson((obj as Record<string, unknown>)[k]),
  );
  return "{" + entries.join(",") + "}";
}

// ── Key management ───────────────────────────────────────────────────────────

function getPrivateKey(): Uint8Array {
  const hex = process.env.POLICYCHECK_SIGNING_KEY || process.env.POLICYCHECK_TAP_SIGNING_KEY;
  if (!hex) {
    throw new Error("POLICYCHECK_SIGNING_KEY env var not set. Run: npx tsx scripts/generate-signing-keys.ts");
  }
  return Uint8Array.from(Buffer.from(hex, "hex"));
}

let _cachedPubKey: Uint8Array | null = null;

function getPublicKey(): Uint8Array {
  if (!_cachedPubKey) {
    _cachedPubKey = ed.getPublicKey(getPrivateKey());
  }
  return _cachedPubKey;
}

// ── Signing ──────────────────────────────────────────────────────────────────

export function signPayload(payload: unknown): {
  signature: string;
  signed_payload_hash: string;
} {
  const canonical = canonicalJson(payload);
  const messageBytes = new TextEncoder().encode(canonical);
  const hash = sha256(messageBytes);

  const sig = ed.sign(messageBytes, getPrivateKey());

  return {
    signature: toBase64Url(sig),
    signed_payload_hash: "sha256:" + Buffer.from(hash).toString("hex"),
  };
}

// ── Verification ─────────────────────────────────────────────────────────────

export function verifySignature(payload: unknown, signatureB64: string): boolean {
  const canonical = canonicalJson(payload);
  const messageBytes = new TextEncoder().encode(canonical);
  const sig = fromBase64Url(signatureB64);

  return ed.verify(sig, messageBytes, getPublicKey());
}

// ── JWKS ─────────────────────────────────────────────────────────────────────

export function getJwks(): { keys: Array<Record<string, string>> } {
  const pub = getPublicKey();
  return {
    keys: [
      {
        kty: "OKP",
        crv: "Ed25519",
        use: "sig",
        kid: "policycheck-1",
        x: toBase64Url(pub),
      },
    ],
  };
}
