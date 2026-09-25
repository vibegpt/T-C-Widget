import { createAccount, issueKey, requireAccountId, requireAdmin, revokeKey } from '@/lib/billing';
import { json, jsonBody, serviceError } from '@/lib/service-http';
export const runtime='nodejs';
export async function POST(req: Request) {
  try { requireAdmin(req); return json(await createAccount(),201); }
  catch (error) { return serviceError(error); }
}
export async function DELETE(req: Request) {
  try { requireAdmin(req); const body=await jsonBody(req,1024); await revokeKey(body.api_key); return json({revoked:true}); }
  catch (error) { return serviceError(error); }
}
export async function PUT(req: Request) {
  try { requireAdmin(req); const body=await jsonBody(req,1024); return json(await issueKey(requireAccountId(body.account_id)),201); }
  catch (error) { return serviceError(error); }
}
