// A supplied-text extraction verifies the deployed contract. No payment is sent.
import assert from 'node:assert/strict';
import { createPublicKey, verify } from 'node:crypto';
import { canonicalJson } from '../src/lib/signing.ts';
const origin='https://policycheck.tools';
const get=async path=>{
 const r=await fetch(origin+path,{signal:AbortSignal.timeout(15000),cache:'no-store'});
 assert.equal(r.status,200,`${path}: HTTP ${r.status}`);return r.json();
};
let ready=false;
for(let attempt=0;attempt<12;attempt++){
 try{const card=await get('/api/agent-card');if(card.version==='1.0.3'){ready=true;break;}}catch{/* Deployment may still be starting. */}
 await new Promise(resolve=>setTimeout(resolve,15000));
}
assert.ok(ready,'Production did not expose agent card 1.0.3');
await get('/.well-known/agent-registration.json');
const jwks=await get('/.well-known/jwks.json');
const text='Items may be returned within 30 days of delivery. Refunds are sent to the original payment method. The customer pays return shipping. No restocking fee applies.';
const response=await fetch(origin+'/api/check',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({policy_text:text}),signal:AbortSignal.timeout(65000)});
assert.equal(response.status,200,`Signed analysis: HTTP ${response.status}`);
const result=await response.json(), envelope=result.signed_assessment;
assert.equal(envelope?.version,'2.1');
assert.ok(['text_provided','partial'].includes(envelope.analysis_status),`Analysis status: ${envelope.analysis_status}; ${envelope.limitations?.join("; ")}`);
assert.equal(envelope.fetch_method,'client_provided');
assert.equal(envelope.policies.returns.facts.window_days,30);
assert.equal(envelope.sources[0].acquisition,'client_provided');
assert.ok(verify(null,Buffer.from(canonicalJson(envelope)),createPublicKey({key:jwks.keys[0],format:'jwk'}),Buffer.from(result.signature,'base64url')),'Public-key signature verification failed');
assert.ok(Date.parse(envelope.expires_at)>Date.now());
assert.equal(result.audit_recorded,true,'Production audit write failed');
console.log(JSON.stringify({core:'passed',version:envelope.version,analysis_status:envelope.analysis_status,audit_recorded:result.audit_recorded}));
// Report paid readiness separately. It does not establish real settlement or indexing.
const paid=await fetch(origin+'/api/x402/analyze',{signal:AbortSignal.timeout(30000)});
const diagnostic=await paid.json();
console.log(JSON.stringify({paid_http_status:paid.status,initialized:diagnostic.initialized,facilitator:diagnostic.facilitator}));
