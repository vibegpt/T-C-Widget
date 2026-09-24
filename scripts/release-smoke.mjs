// Read-only public checks plus an unpaid challenge. Never submits payment.
import assert from 'node:assert/strict';
const origin=new URL(process.argv[2] || 'https://policycheck.tools').origin;
for(const path of ['/.well-known/agent.json','/.well-known/agent-registration.json','/.well-known/jwks.json','/openapi.json','/skill.md']) {
 const response=await fetch(origin+path,{signal:AbortSignal.timeout(15000)});
 assert.equal(response.status,200,`${path}: HTTP ${response.status}`);
 const text=await response.text();assert.ok(text.length>20,`${path}: empty response`);
 if(path.endsWith('.json'))JSON.parse(text);
 console.log(`OK ${path}`);
}
const response=await fetch(origin+'/api/x402/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:'Items may be returned within 30 days of delivery. Refunds are sent to the original payment method.'}),signal:AbortSignal.timeout(30000)});
assert.equal(response.status,402,`Expected unpaid challenge, got HTTP ${response.status}`);
const encoded=response.headers.get('payment-required');assert.ok(encoded,'Missing PAYMENT-REQUIRED header');
const challenge=JSON.parse(Buffer.from(encoded,'base64').toString('utf8'));
assert.equal(challenge.x402Version,2);
assert.equal(challenge.resource?.url,origin+'/api/x402/analyze');
assert.ok(challenge.extensions?.bazaar?.info,'Missing extensions.bazaar.info');
assert.ok(challenge.extensions?.bazaar?.schema,'Missing extensions.bazaar.schema');
assert.ok(challenge.accepts?.length,'Missing accepted payment requirements');
console.log('OK unpaid x402 v2 challenge and Bazaar metadata; no payment made');
