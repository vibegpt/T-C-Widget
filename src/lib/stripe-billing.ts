import { createHmac, timingSafeEqual } from 'node:crypto';
import { billingRedis, creditAccount, digest, requireAccountId, ServiceError, suspendPayment, type BillingRedis } from './billing';

export const CREDIT_PACKS = {starter:{amount_cents:1000,credit_micro_usd:10_000_000},growth:{amount_cents:5000,credit_micro_usd:50_000_000}} as const;
type PackId = keyof typeof CREDIT_PACKS;
type CheckoutRecord = {account_id:string;amount_cents:number;credit_micro_usd:number};
type StripeObject = Record<string,unknown>;
export type StripeEvent = {id:string;type:string;livemode:boolean;data:{object:StripeObject}};
const object = (value: unknown): StripeObject => value && typeof value==='object' && !Array.isArray(value)?value as StripeObject:{};

/** Stripe's documented v1 HMAC protocol, raw body, 5-minute tolerance, key rotation. */
export function verifyStripeEvent(raw: string, header: string|null, secret: string, now=Date.now()): StripeEvent {
  if (!header || !secret) throw new ServiceError(400,'invalid_signature','Invalid webhook signature.');
  const parts=header.split(',').map(p=>p.trim().split('='));
  const times=parts.filter(([key])=>key==='t');
  const stamp=times[0]?.[1];
  if (times.length!==1 || !stamp || !/^\d+$/.test(stamp) || Math.abs(now/1000-Number(stamp))>300) throw new ServiceError(400,'invalid_signature','Invalid webhook signature.');
  const expected=createHmac('sha256',secret).update(stamp+'.'+raw).digest();
  const valid=parts.some(([key,value])=>key==='v1' && /^[a-fA-F0-9]{64}$/.test(value || '') && timingSafeEqual(expected,Buffer.from(value,'hex')));
  if (!valid) throw new ServiceError(400,'invalid_signature','Invalid webhook signature.');
  let event: StripeObject;
  try { event=object(JSON.parse(raw)); } catch { throw new ServiceError(400,'invalid_event','Invalid event JSON.'); }
  if (typeof event.id!=='string' || !/^evt_[A-Za-z0-9_]+$/.test(event.id) || typeof event.type!=='string' || typeof event.livemode!=='boolean' || !object(event.data).object) throw new ServiceError(400,'invalid_event','Invalid event.');
  return event as StripeEvent;
}

async function stripeRequest(path: string, params?: URLSearchParams, idempotency?: string) {
  const key=process.env.STRIPE_SECRET_KEY;
  if (!key || !/^sk_(test|live)_/.test(key)) throw new ServiceError(503,'stripe_unavailable','Stripe is not configured.');
  const response=await fetch('https://api.stripe.com/v1/'+path,{
    method:params?'POST':'GET',
    headers:{Authorization:`Bearer ${key}`,'Stripe-Version':'2026-02-25.clover',...(params?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(idempotency?{'Idempotency-Key':idempotency}:{})},
    body:params?.toString(),signal:AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new ServiceError(503,'stripe_unavailable','Payment provider is temporarily unavailable.');
  return object(await response.json());
}

export async function createCheckout(accountId: string, pack: unknown, key: string, db=billingRedis()) {
  requireAccountId(accountId);
  if (typeof pack!=='string' || !Object.hasOwn(CREDIT_PACKS,pack)) throw new ServiceError(400,'invalid_pack','Choose starter or growth.');
  const selected=CREDIT_PACKS[pack as PackId];
  const origin=process.env.POLICYCHECK_PUBLIC_ORIGIN || 'https://policycheck.tools';
  const url=new URL(origin);
  if (url.protocol!=='https:' || url.username || url.password || url.pathname!=='/' || url.search || url.hash) throw new ServiceError(503,'checkout_unavailable','Public origin must be an HTTPS origin.');
  const params=new URLSearchParams({
    mode:'payment',client_reference_id:accountId,
    success_url:url.origin+'/billing?status=success',cancel_url:url.origin+'/billing?status=cancelled',
    'payment_method_types[0]':'card','line_items[0][price_data][currency]':'usd',
    'line_items[0][price_data][unit_amount]':String(selected.amount_cents),
    'line_items[0][price_data][product_data][name]':'PolicyCheck prepaid API credit',
    'line_items[0][quantity]':'1','metadata[service]':'policycheck_credits_v1','metadata[account_id]':accountId,
    'metadata[pack]':pack,'payment_intent_data[metadata][service]':'policycheck_credits_v1',
    'payment_intent_data[metadata][account_id]':accountId,
  });
  // Stripe rejects reuse with a changed pack; scope keys to authenticated accounts.
  const session=await stripeRequest('checkout/sessions',params,'pc_'+digest(accountId+':'+key));
  if (typeof session.id!=='string' || !/^cs_[A-Za-z0-9_]+$/.test(session.id) || typeof session.url!=='string' || new URL(session.url).origin!=='https://checkout.stripe.com') throw new ServiceError(503,'checkout_unavailable','Checkout could not be created.');
  await db.set(`billing:checkout:${session.id}:expected`,{account_id:accountId,...selected});
  return {checkout_url:session.url,session_id:session.id,pack,currency:'USD',...selected};
}

export async function applyStripeEvent(event: StripeEvent, db: BillingRedis=billingRedis()) {
  // Separate sandbox from live balances even if the wrong webhook secret is configured.
  const mode=process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_');
  if (!process.env.STRIPE_SECRET_KEY || event.livemode!==mode) throw new ServiceError(400,'wrong_stripe_mode','Event mode does not match configuration.');
  const value=object(event.data.object);
  if (['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)) {
    if (object(value.metadata).service!=='policycheck_credits_v1') return 'ignored';
    if (value.payment_status!=='paid') return 'unpaid';
    if (typeof value.id!=='string' || !/^cs_[A-Za-z0-9_]+$/.test(value.id)) throw new ServiceError(400,'invalid_payment','Invalid checkout ID.');
    const expected=await db.get<CheckoutRecord>(`billing:checkout:${value.id}:expected`);
    if (!expected) throw new ServiceError(503,'unknown_checkout','Checkout is not registered. Retry later.');
    if (value.mode!=='payment' || value.currency!=='usd' || value.amount_total!==expected.amount_cents || value.client_reference_id!==expected.account_id || object(value.metadata).account_id!==expected.account_id || typeof value.payment_intent!=='string') throw new ServiceError(400,'checkout_mismatch','Checkout does not match the recorded purchase.');
    return creditAccount(expected.account_id,value.id,value.payment_intent,expected.credit_micro_usd,db);
  }
  if (['charge.refunded','charge.dispute.created'].includes(event.type)) {
    let intent=value.payment_intent;
    if (typeof intent!=='string' && typeof value.charge==='string' && /^ch_[A-Za-z0-9_]+$/.test(value.charge)) intent=(await stripeRequest('charges/'+value.charge)).payment_intent;
    if (typeof intent!=='string') throw new ServiceError(503,'payment_reconciliation_required','Payment intent is unavailable.');
    // Suspend spending for operator review (partial refunds included); never auto-refund twice.
    await suspendPayment(intent,event.id,db);
    return 'suspended_or_marked';
  }
  return 'ignored';
}
