import { createHash, createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';

/** Canonical JSON for this protocol: recursively sorted keys, JSON scalar encoding. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    const encoded = JSON.stringify(value);
    if (encoded === undefined || (typeof value === 'number' && !Number.isFinite(value))) throw new Error('Payload must contain JSON values');
    return encoded;
  }
  if (Array.isArray(value)) return '['+value.map(canonicalJson).join(',')+']';
  return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonicalJson((value as Record<string,unknown>)[key])).join(',')+'}';
}
function privateKey() {
  const seed=(process.env.POLICYCHECK_SIGNING_KEY || process.env.POLICYCHECK_TAP_SIGNING_KEY)?.trim();
  if (!seed || !/^[a-fA-F0-9]{64}$/.test(seed)) throw new Error('PolicyCheck signing key is not configured correctly');
  return createPrivateKey({key:Buffer.concat([Buffer.from('302e020100300506032b657004220420','hex'),Buffer.from(seed,'hex')]),format:'der',type:'pkcs8'});
}
export function signPayload(payload: unknown) {
  const message=Buffer.from(canonicalJson(payload));
  return {signature:sign(null,message,privateKey()).toString('base64url'),signed_payload_hash:'sha256:'+createHash('sha256').update(message).digest('hex')};
}
export function verifySignature(payload: unknown, signature: string): boolean {
  if(typeof signature!=='string' || !/^[A-Za-z0-9_-]{86}$/.test(signature))return false;
  try { return verify(null,Buffer.from(canonicalJson(payload)),createPublicKey(privateKey()),Buffer.from(signature,'base64url')); }
  catch { return false; }
}
export function getJwks(): {keys: Array<Record<string,string>>} {
  const jwk=createPublicKey(privateKey()).export({format:'jwk'});
  return {keys:[{kty:'OKP',crv:'Ed25519',use:'sig',kid:'policycheck-1',x:jwk.x!}]};
}
export function checkAssessment(assessment: unknown, signature: string) {
  const a=assessment as Record<string,unknown>;
  const signatureValid=!!a && typeof a==='object' && verifySignature(a,signature);
  const expiry=typeof a?.expires_at==='string'?Date.parse(a.expires_at):NaN;
  const issued=typeof a?.timestamp==='string'?Date.parse(a.timestamp):NaN;
  const envelopeValid=signatureValid && a.provider==='policycheck.tools' && ['2.0','2.1'].includes(String(a.version)) && Number.isFinite(expiry) && Number.isFinite(issued) && issued<=Date.now()+30_000 && expiry>issued;
  const fresh=envelopeValid && expiry>Date.now();
  return {valid:fresh,signature_valid:signatureValid,fresh,reason:!signatureValid?'Signature verification failed':!envelopeValid?'Invalid assessment envelope':!fresh?'Assessment has expired':null};
}
