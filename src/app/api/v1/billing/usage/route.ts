import { authenticate, balance } from '@/lib/billing';
import { json, preflight, requireEnabled, serviceError } from '@/lib/service-http';
export const runtime='nodejs';
export async function GET(req: Request) {
  try { requireEnabled(); return json(await balance(await authenticate(req))); }
  catch (error) { return serviceError(error); }
}
export const OPTIONS=preflight;
