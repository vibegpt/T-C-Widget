import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {verifyStripeEvent,applyStripeEvent} from '../../src/lib/stripe-billing.ts';
const now=1800000000000,secret='whsec_test_value';
const value={id:'evt_test',type:'checkout.session.completed',livemode:false,data:{object:{}}};
const raw=JSON.stringify(value);
const signature=(body=raw,stamp=now/1000)=>`t=${stamp},v1=${createHmac('sha256',secret).update(stamp+'.'+body).digest('hex')}`;
test('Stripe raw-body signature validates and tolerates rotating v1 signatures',()=>{
  assert.deepEqual(verifyStripeEvent(raw,signature(),secret,now),value);
  assert.deepEqual(verifyStripeEvent(raw,signature()+',v1='+'0'.repeat(64),secret,now),value);
});
test('tampering, stale/future timestamps, malformed signatures and duplicate timestamps fail',()=>{
  for(const header of [signature(raw,now/1000-301),signature(raw,now/1000+301),'t=1,v1=x',signature()+',t='+now/1000,null])assert.throws(()=>verifyStripeEvent(raw,header,secret,now));
  assert.throws(()=>verifyStripeEvent(raw+' ',signature(),secret,now));
});
test('unpaid and unrelated checkout events cannot issue credit',async()=>{
  process.env.STRIPE_SECRET_KEY='sk_test_placeholder';const db={get(){throw Error('must not read');},eval(){throw Error('must not credit');}};
  assert.equal(await applyStripeEvent(value,db),'ignored');
  assert.equal(await applyStripeEvent({...value,data:{object:{metadata:{service:'policycheck_credits_v1'},payment_status:'unpaid'}}},db),'unpaid');
});
test('live event cannot issue sandbox credit',async()=>{
  process.env.STRIPE_SECRET_KEY='sk_test_placeholder';await assert.rejects(applyStripeEvent({...value,livemode:true},{}),e=>e.code==='wrong_stripe_mode');
});
test('paid checkout must match account, amount, currency and persisted purchase',async()=>{
  process.env.STRIPE_SECRET_KEY='sk_test_placeholder';const id='acct_'+'a'.repeat(32);
  const valid={id:'cs_test',mode:'payment',payment_status:'paid',currency:'usd',amount_total:1000,client_reference_id:id,payment_intent:'pi_test',metadata:{service:'policycheck_credits_v1',account_id:id}};
  let credits=0;const db={get:async()=>({account_id:id,amount_cents:1000,credit_micro_usd:10000000}),eval:async()=>{credits++;return ['credited'];}};
  for(const override of [{amount_total:1},{currency:'aud'},{client_reference_id:'someone-else'},{mode:'subscription'},{payment_intent:null}])await assert.rejects(applyStripeEvent({...value,data:{object:{...valid,...override}}},db),e=>e.code==='checkout_mismatch');
  assert.equal(credits,0);assert.equal(await applyStripeEvent({...value,data:{object:valid}},db),'credited');assert.equal(credits,1);
});
test('missing purchase retries webhook instead of acknowledging and losing funds',async()=>{
  process.env.STRIPE_SECRET_KEY='sk_test_placeholder';
  await assert.rejects(applyStripeEvent({...value,data:{object:{id:'cs_missing',payment_status:'paid',metadata:{service:'policycheck_credits_v1'}}}},{get:async()=>null}),e=>e.status===503);
});
