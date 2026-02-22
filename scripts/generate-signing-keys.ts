import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";

// Configure sha512 for Ed25519 v3
(ed as any).hashes.sha512 = sha512;

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

const privKey = ed.utils.randomSecretKey();
const pubKey = ed.getPublicKey(privKey);

const privHex = Buffer.from(privKey).toString("hex");
const pubB64 = toBase64Url(pubKey);

console.log("=== PolicyCheck Signing Keys ===\n");
console.log("Private key (hex) — add to .env as POLICYCHECK_SIGNING_KEY:");
console.log(privHex);
console.log("\nPublic key (base64url) — for reference:");
console.log(pubB64);
console.log("\nUsage:");
console.log(`  export POLICYCHECK_SIGNING_KEY=${privHex}`);
