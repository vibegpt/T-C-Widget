import { authenticate, idempotencyKey } from '@/lib/billing';
import { createCheckout } from '@/lib/stripe-billing';
import { json, jsonBody, preflight, requireEnabled, serviceError } from '@/lib/service-http';
export const runtime='nodejs';
export async function POST(req: Request) {
  try {
    requireEnabled(); const accountId=await authenticate(req), key=idempotencyKey(req);
    const body=await jsonBody(req,1024);
    return json(await createCheckout(accountId,body.pack,key));
  } catch (error) { return serviceError(error); }
}
export const OPTIONS=preflight;
