import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { Redis } from '@upstash/redis';
import { CREATE_ACCOUNT, CREDIT, FINISH, RESERVE, SUSPEND_PAYMENT } from './billing-scripts';

export class ServiceError extends Error {
  status: number; code: string;
  constructor(status: number, code: string, message: string) { super(message); this.status=status; this.code=code; }
}
export interface BillingRedis {
  eval<T>(script: string, keys: string[], args: (string | number)[]): Promise<T>;
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, options?: {ex?: number; nx?: boolean}): Promise<unknown>;
  hgetall<T extends Record<string, unknown>>(key: string): Promise<T | null>;
  del(...keys: string[]): Promise<unknown>;
}
let client: BillingRedis | undefined;
export function billingRedis(): BillingRedis {
  if (client) return client;
  const url=process.env.KV_REST_API_URL, token=process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new ServiceError(503,'billing_unavailable','Billing storage is not configured.');
  client=new Redis({url,token,retry:{retries:0}});
  return client;
}
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const accountKey = (id: string) => `billing:{${id}}:account`;
export const ledgerKey = (id: string) => `billing:{${id}}:ledger`;
export const keyRecord = (key: string) => `billing:key:${digest(key)}`;
export function requireAccountId(value: unknown): string {
  if (typeof value!=='string' || !/^acct_[a-f0-9]{32}$/.test(value)) throw new ServiceError(400,'invalid_account','Invalid account ID.');
  return value;
}
export function priceMicroUsd(): number {
  const value=process.env.POLICYCHECK_PRICE_MICRO_USD ?? '30000';
  const n=Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(n) || n<1 || n>1_000_000) throw new ServiceError(503,'pricing_unavailable','Invalid service price configuration.');
  return n;
}
export function idempotencyKey(req: Request): string {
  const key=req.headers.get('idempotency-key');
  if (!key || !/^[A-Za-z0-9_.:-]{8,128}$/.test(key)) throw new ServiceError(400,'idempotency_key_required','Send an Idempotency-Key with 8–128 letters, digits, dots, colons, hyphens or underscores.');
  return key;
}
export async function authenticate(req: Request, db=billingRedis()): Promise<string> {
  const key=req.headers.get('x-api-key') || req.headers.get('authorization')?.replace(/^Bearer /i,'');
  if (!key || !/^pc_live_[a-f0-9]{64}$/.test(key)) throw new ServiceError(401,'invalid_api_key','A valid PolicyCheck API key is required.');
  const id=await db.get<string>(keyRecord(key));
  if (!id) throw new ServiceError(401,'invalid_api_key','API key is invalid or revoked.');
  requireAccountId(id);
  const account=await db.hgetall(accountKey(id));
  if (account?.status!=='active') throw new ServiceError(403,'account_inactive','Account is inactive. Contact the service operator.');
  return id;
}
export function requireAdmin(req: Request) {
  const configured=process.env.POLICYCHECK_BILLING_ADMIN_TOKEN;
  if (!configured || configured.length<32) throw new ServiceError(503,'admin_unavailable','Billing administration is not configured.');
  const supplied=req.headers.get('authorization')?.replace(/^Bearer /i,'') || '';
  if (!timingSafeEqual(Buffer.from(digest(configured)),Buffer.from(digest(supplied)))) throw new ServiceError(401,'unauthorized','Invalid administration credential.');
}
export async function createAccount(db=billingRedis()) {
  const id='acct_'+randomBytes(16).toString('hex'), key='pc_live_'+randomBytes(32).toString('hex');
  const ok=await db.eval<number>(CREATE_ACCOUNT,[accountKey(id),keyRecord(key)],[id,new Date().toISOString()]);
  if (ok!==1) throw new ServiceError(503,'account_creation_failed','Could not create an account.');
  return {account_id:id,api_key:key,balance_micro_usd:0};
}
export async function issueKey(accountId: string, db=billingRedis()) {
  requireAccountId(accountId);
  const key='pc_live_'+randomBytes(32).toString('hex');
  const ok=await db.eval<number>("if redis.call('HGET',KEYS[1],'status') ~= 'active' then return 0 end; redis.call('SET',KEYS[2],ARGV[1]); return 1",[accountKey(accountId),keyRecord(key)],[accountId]);
  if (ok!==1) throw new ServiceError(403,'account_inactive','Account is missing or inactive.');
  return {account_id:accountId,api_key:key};
}
export async function revokeKey(key: unknown, db=billingRedis()) {
  if (typeof key!=='string' || !/^pc_live_[a-f0-9]{64}$/.test(key)) throw new ServiceError(400,'invalid_api_key','Invalid key format.');
  await db.del(keyRecord(key));
}
export type Reservation = {accountId: string; requestKey: string; token: string; price: number};
function keys(r: Reservation) { return [accountKey(r.accountId),r.requestKey,`billing:{${r.accountId}}:pending`,ledgerKey(r.accountId)]; }
export async function reserve(accountId: string, key: string, fingerprint: string, db=billingRedis(), now=Date.now()) {
  const reservation: Reservation={accountId,requestKey:`billing:{${accountId}}:request:${digest(key)}`,token:randomUUID(),price:priceMicroUsd()};
  const result=await db.eval<[string, unknown?]>(RESERVE,keys(reservation),[now,fingerprint,reservation.token,reservation.price,now+90_000,Math.floor(now/60_000)]);
  if (result[0]==='replay') {
    // Upstash auto-deserializes JSON inside array results; raw RESP clients do not.
    const entry=typeof result[1]==='string'?JSON.parse(result[1]):result[1] as {response: string};
    return {replay:JSON.parse(entry.response) as Record<string,unknown>};
  }
  if (result[0]==='reserved') return {reservation};
  const codes: Record<string,[number,string]>={conflict:[409,'This Idempotency-Key was already used for a different request.'],in_progress:[409,'This request is still processing. Retry with the same key.'],insufficient:[402,'Insufficient prepaid credit.'],inactive:[403,'Account is inactive.'],busy:[429,'At most five concurrent assessments are allowed.'],rate_limited:[429,'At most 60 new assessment attempts per minute are allowed.']};
  const [status,message]=codes[result[0]] ?? [503,'Billing is unavailable.'];
  throw new ServiceError(status,result[0],message);
}
export async function finish(r: Reservation, response: unknown | null, db=billingRedis(), now=Date.now()) {
  const result=await db.eval<string[]>(FINISH,keys(r),[r.token,response===null?'release':'commit',response===null?'':JSON.stringify(response),now]);
  if (response!==null && result[0]!=='complete') throw new ServiceError(409,'reservation_expired','Reservation expired; retry with the same Idempotency-Key.');
}
export async function balance(accountId: string, db=billingRedis()) {
  const account=await db.hgetall(accountKey(accountId));
  if (!account) throw new ServiceError(404,'account_not_found','Account not found.');
  return {account_id:accountId,currency:'USD',balance_micro_usd:Number(account.balance),reserved_micro_usd:Number(account.reserved),spent_micro_usd:Number(account.spent),successful_requests:Number(account.successful_requests),price_micro_usd:priceMicroUsd(),idempotency_retention_seconds:86400};
}
export async function creditAccount(accountId: string, sessionId: string, intentId: string, amountMicroUsd: number, db=billingRedis()) {
  requireAccountId(accountId);
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId) || !/^pi_[A-Za-z0-9_]+$/.test(intentId) || !Number.isSafeInteger(amountMicroUsd) || amountMicroUsd<1 || amountMicroUsd>1_000_000_000) throw new ServiceError(400,'invalid_payment','Invalid payment details.');
  const result=await db.eval<string[]>(CREDIT,[accountKey(accountId),`billing:checkout:${sessionId}:credited`,ledgerKey(accountId),`billing:payment:${intentId}`,`billing:payment:${intentId}:blocked`],[amountMicroUsd,sessionId,accountId]);
  if (['missing_account','conflict'].includes(result[0])) throw new ServiceError(503,'payment_reconciliation_required','Payment requires reconciliation.');
  return result[0];
}
export async function suspendPayment(intentId: string, eventId: string, db=billingRedis()) {
  if (!/^pi_[A-Za-z0-9_]+$/.test(intentId)) throw new ServiceError(400,'invalid_payment','Invalid payment intent.');
  return db.eval<string>(SUSPEND_PAYMENT,[`billing:payment:${intentId}:blocked`,`billing:payment:${intentId}`],[eventId]);
}
