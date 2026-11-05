import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {TestRedis} from './redis-client.mjs';
import {createAccount,creditAccount,authenticate,reserve,finish,balance,revokeKey,suspendPayment,priceMicroUsd} from '../../src/lib/billing.ts';
const redisUrl=process.env.REDIS_TEST_URL;
const redis=redisUrl?new TestRedis(redisUrl):null;
const integration=(name,fn)=>test(name,{skip:!redisUrl},fn);
const unique=()=>randomUUID().replaceAll('-','');
const now=Date.now();
async function funded(amount=300000) {
  const account=await createAccount(redis),suffix=unique();
  await creditAccount(account.account_id,'cs_'+suffix,'pi_'+suffix,amount,redis);
  return account;
}
const authRequest=key=>new Request('https://example.com',{headers:{'x-api-key':key}});

integration('real Redis: API keys authenticate by hash and revocation takes effect',async()=>{
  const a=await funded();assert.equal(await authenticate(authRequest(a.api_key),redis),a.account_id);
  await revokeKey(a.api_key,redis);await assert.rejects(authenticate(authRequest(a.api_key),redis),e=>e.status===401);
});
integration('real Redis: duplicate top-up cannot credit an account twice',async()=>{
  const a=await createAccount(redis),suffix=unique();
  const results=await Promise.all(Array.from({length:20},()=>creditAccount(a.account_id,'cs_'+suffix,'pi_'+suffix,100000,redis)));
  assert.equal(results.filter(x=>x==='credited').length,1);assert.equal((await balance(a.account_id,redis)).balance_micro_usd,100000);
});
integration('real Redis: concurrent reservations cannot overspend',async()=>{
  const a=await funded(priceMicroUsd()*3);
  const results=await Promise.allSettled(Array.from({length:20},(_,i)=>reserve(a.account_id,'request-'+i,'fp-'+i,redis,now)));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,3);
  const usage=await balance(a.account_id,redis);assert.equal(usage.balance_micro_usd,0);assert.equal(usage.reserved_micro_usd,priceMicroUsd()*3);
});
integration('real Redis: concurrent identical requests admit one extraction',async()=>{
  const a=await funded();const results=await Promise.allSettled(Array.from({length:20},()=>reserve(a.account_id,'same-request','same-fp',redis,now)));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected' && r.reason.code==='in_progress').length,19);
});
integration('real Redis: completed request replays exact response after lost acknowledgement',async()=>{
  const a=await funded(), r=(await reserve(a.account_id,'request-1','fp',redis,now)).reservation;
  const original={analysis:{signed_assessment:{id:'original'}},billing:{charged:true}};
  await finish(r,original,redis,now+1);await finish(r,null,redis,now+2);await finish(r,original,redis,now+3);
  assert.deepEqual((await reserve(a.account_id,'request-1','fp',redis,now+4)).replay,original);
  const usage=await balance(a.account_id,redis);assert.equal(usage.spent_micro_usd,priceMicroUsd());assert.equal(usage.successful_requests,1);assert.equal(usage.reserved_micro_usd,0);
});
integration('real Redis: failed request releases once and can retry',async()=>{
  const a=await funded(), r=(await reserve(a.account_id,'request-1','fp',redis,now)).reservation;
  await finish(r,null,redis,now+1);await finish(r,null,redis,now+2);
  assert.equal((await balance(a.account_id,redis)).balance_micro_usd,300000);
  const retry=(await reserve(a.account_id,'request-1','fp',redis,now+3)).reservation;
  await finish(retry,{ok:true},redis,now+4);assert.equal((await balance(a.account_id,redis)).spent_micro_usd,priceMicroUsd());
});
integration('real Redis: changed request conflicts for same account and key',async()=>{
  const a=await funded();await reserve(a.account_id,'request-1','fp',redis,now);
  await assert.rejects(reserve(a.account_id,'request-1','changed',redis,now),e=>e.status===409 && e.code==='conflict');
});
integration('real Redis: same idempotency key is isolated between accounts',async()=>{
  const a=await funded(),b=await funded();
  const first=await reserve(a.account_id,'request-1','fp',redis,now),second=await reserve(b.account_id,'request-1','fp',redis,now);
  assert.notEqual(first.reservation.requestKey,second.reservation.requestKey);
});
integration('real Redis: crash reservation is recovered and old worker cannot charge',async()=>{
  const a=await funded(),old=(await reserve(a.account_id,'request-1','fp',redis,now)).reservation;
  const retry=(await reserve(a.account_id,'request-1','fp',redis,now+91000)).reservation;
  await assert.rejects(finish(old,{stale:true},redis,now+92000),e=>e.code==='reservation_expired');
  await finish(retry,{ok:true},redis,now+92000);
  const usage=await balance(a.account_id,redis);assert.equal(usage.spent_micro_usd,priceMicroUsd());assert.equal(usage.reserved_micro_usd,0);
});
integration('real Redis: new request recovers abandoned credits for a different key',async()=>{
  const a=await funded(priceMicroUsd());await reserve(a.account_id,'abandoned','fp',redis,now);
  const next=await reserve(a.account_id,'new-request','new-fp',redis,now+91000);assert.ok(next.reservation);
});
integration('real Redis: failed attempts still consume rate budget',async()=>{
  const a=await funded();
  for(let i=0;i<60;i++){const r=(await reserve(a.account_id,'rate-'+i,'fp-'+i,redis,now)).reservation;await finish(r,null,redis,now);}
  await assert.rejects(reserve(a.account_id,'rate-over','fp-over',redis,now),e=>e.status===429);
  assert.equal((await balance(a.account_id,redis)).balance_micro_usd,300000);
});
integration('real Redis: late commit after lease expiry refunds instead of charging',async()=>{
  const a=await funded(),r=(await reserve(a.account_id,'request-1','fp',redis,now)).reservation;
  await assert.rejects(finish(r,{too_late:true},redis,now+91000),e=>e.code==='reservation_expired');
  assert.equal((await balance(a.account_id,redis)).spent_micro_usd,0);assert.equal((await balance(a.account_id,redis)).reserved_micro_usd,0);
});
integration('real Redis: refund before payment completion blocks late credit',async()=>{
  const a=await createAccount(redis),suffix=unique();await suspendPayment('pi_'+suffix,'evt_refund',redis);
  assert.equal(await creditAccount(a.account_id,'cs_'+suffix,'pi_'+suffix,100000,redis),'blocked');
  assert.equal((await balance(a.account_id,redis)).balance_micro_usd,0);
  await assert.rejects(authenticate(authRequest(a.api_key),redis),e=>e.status===403);
});
integration('real Redis: refund suspends an account and releases in-flight work',async()=>{
  const a=await createAccount(redis),suffix=unique();await creditAccount(a.account_id,'cs_'+suffix,'pi_'+suffix,100000,redis);
  const r=(await reserve(a.account_id,'request-1','fp',redis,now)).reservation;
  await suspendPayment('pi_'+suffix,'evt_refund',redis);
  await assert.rejects(finish(r,{ok:true},redis,now+1),e=>e.code==='reservation_expired');
  assert.equal((await balance(a.account_id,redis)).spent_micro_usd,0);
  await assert.rejects(reserve(a.account_id,'request-2','fp2',redis,now+2),e=>e.status===403);
});
