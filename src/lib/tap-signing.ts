// Backward-compatibility shim — use @/lib/signing instead
export { signPayload as signTapPayload, verifySignature as verifyTapSignature, getJwks } from "./signing";
