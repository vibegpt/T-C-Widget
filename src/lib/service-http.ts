import { ServiceError } from './billing';

export const SERVICE_HEADERS = {
  'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Methods':'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type, Authorization, X-API-Key, Idempotency-Key',
  'Access-Control-Expose-Headers':'Idempotency-Replayed, Retry-After', 'Cache-Control':'no-store',
};
export function json(value: unknown, status=200, headers: Record<string,string>={}) {
  return Response.json(value,{status,headers:{...SERVICE_HEADERS,...headers}});
}
export async function boundedBody(req: Request, limit=450_000): Promise<string> {
  if (Number(req.headers.get('content-length'))>limit) throw new ServiceError(413,'body_too_large','Request body is too large.');
  if (!req.body) throw new ServiceError(400,'invalid_json','A JSON body is required.');
  const reader=req.body.getReader(), chunks: Uint8Array[]=[]; let size=0;
  try {
    while (true) {
      const {done,value}=await reader.read(); if (done) break;
      size+=value.byteLength;
      if (size>limit) { await reader.cancel(); throw new ServiceError(413,'body_too_large','Request body is too large.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString('utf8');
}
export async function jsonBody(req: Request, limit?: number): Promise<Record<string,unknown>> {
  const raw=await boundedBody(req,limit);
  let body: unknown;
  try { body=JSON.parse(raw); } catch { throw new ServiceError(400,'invalid_json','Invalid JSON body.'); }
  if (!body || typeof body!=='object' || Array.isArray(body)) throw new ServiceError(400,'invalid_json','A JSON object is required.');
  return body as Record<string,unknown>;
}
export function serviceError(error: unknown) {
  if (error instanceof ServiceError) return json({error:{code:error.code,message:error.message,retryable:error.status>=500 || error.code==='in_progress' || error.code==='reservation_expired' || error.status===429}},error.status,
    error.status===429 || error.code==='in_progress'?{'Retry-After':error.status===429?'60':'3'}:{});
  // Never echo provider, credential, Redis or Stripe error messages.
  return json({error:{code:'service_unavailable',message:'Service unavailable. Retry with the same Idempotency-Key.',retryable:true}},503);
}
export const preflight = () => new Response(null,{status:204,headers:SERVICE_HEADERS});
export function requireEnabled() {
  if (process.env.POLICYCHECK_AGENT_API_ENABLED!=='true') throw new ServiceError(503,'service_not_enabled','The prepaid agent service is not enabled.');
}
