import './imports.mjs';
import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {handleAssessment} from '../../src/lib/agent-service.ts';
import {ServiceError} from '../../src/lib/billing.ts';
import {boundedBody} from '../../src/lib/service-http.ts';
let calls, dependencies;
const body={policy_text:'Items may be returned within 30 days of delivery. Original payment method refunds apply.'};
function request(value=body,key='request-123') {return new Request('https://example.com/api/v1/assessments',{method:'POST',headers:{'content-type':'application/json',...(key?{'idempotency-key':key}:{})},body:typeof value==='string'?value:JSON.stringify(value)});}
beforeEach(()=>{
  process.env.POLICYCHECK_AGENT_API_ENABLED='true';calls=[];
  dependencies={
    authenticate:async()=>{calls.push('auth');return 'acct_test';},
    reserve:async()=>{calls.push('reserve');return {reservation:{accountId:'acct_test',requestKey:'r1',token:'t1',price:30000}};},
    finish:async(_r,response)=>{calls.push(response?'commit':'release');},
    analyzeInput:async()=>{calls.push('analyze');return {analysis_status:'complete',policies:{returns:{facts:{window_days:30}}},clauses:[]};},
    signedResult:r=>{calls.push('sign');return {...r,signed_assessment:{assessment_id:'assessment-1'}};},
    recordAssessment:async()=>{calls.push('audit');return true;},
  };
});
test('signs and records evidence before atomic charge; only then returns success',async()=>{
  const response=await handleAssessment(request(),dependencies);
  assert.equal(response.status,200);assert.equal((await response.json()).billing.amount_micro_usd,30000);
  assert.deepEqual(calls,['auth','reserve','analyze','sign','audit','commit']);
  assert.equal(response.headers.get('cache-control'),'no-store');
});
test('replay returns stored result without extraction or another charge',async()=>{
  const original={analysis:{id:'old'},billing:{charged:true}};
  dependencies.reserve=async()=>({replay:original});
  const response=await handleAssessment(request(),dependencies);
  assert.deepEqual(await response.json(),original);assert.equal(response.headers.get('idempotency-replayed'),'true');assert.deepEqual(calls,['auth']);
});
test('authentication and request validation happen before admission',async()=>{
  dependencies.authenticate=async()=>{throw new ServiceError(401,'invalid_api_key','Invalid key');};
  assert.equal((await handleAssessment(request(),dependencies)).status,401);assert.deepEqual(calls,[]);
});
test('invalid JSON, input types and missing idempotency cannot reserve credit',async()=>{
  for (const req of [request('{broken'),request({...body,include_source_text:'true'}),request(body,null),request({...body,unknown:'x'}),request({url:'file:///tmp/test'})]) {
    calls=[];assert.equal((await handleAssessment(req,dependencies)).status,400);assert.deepEqual(calls,['auth']);
  }
});
test('upstream failure, no content and no facts all release credit',async()=>{
  for (const status of ['extraction_failed','no_content','no_facts']) {
    calls=[];dependencies.analyzeInput=async()=>({analysis_status:status,summary:'No result',policies:{},clauses:[]});
    const response=await handleAssessment(request(),dependencies), data=await response.json();
    assert.equal(response.status,status==='extraction_failed'?503:422);assert.equal(data.billing.charged,false);assert.equal(calls.at(-1),'release');assert.equal(calls.includes('commit'),false);
  }
});
test('signing and audit failures release the reservation',async()=>{
  dependencies.signedResult=()=>{throw Error('private signing detail');};
  let response=await handleAssessment(request(),dependencies);assert.equal(response.status,503);assert.equal(calls.at(-1),'release');assert.doesNotMatch(await response.text(),/private signing detail/);
  dependencies.signedResult=x=>x;dependencies.recordAssessment=async()=>false;calls=[];
  response=await handleAssessment(request(),dependencies);assert.equal(response.status,503);assert.equal(calls.at(-1),'release');assert.equal(calls.includes('commit'),false);
});
test('ambiguous commit returns retryable error and preserves idempotency recovery',async()=>{
  dependencies.finish=async(_r,response)=>{calls.push(response?'commit':'release');if(response)throw Error('storage acknowledgement lost');};
  const response=await handleAssessment(request(),dependencies), data=await response.json();
  assert.equal(response.status,503);assert.equal(data.error.retryable,true);assert.deepEqual(calls.slice(-2),['commit','release']);
});
test('changed body is bound to the idempotency fingerprint',async()=>{
  let first;
  dependencies.reserve=async(_account,_key,fingerprint)=>{if(first && first!==fingerprint)throw new ServiceError(409,'conflict','Changed request');first=fingerprint;return {replay:{ok:true}};};
  assert.equal((await handleAssessment(request(),dependencies)).status,200);
  assert.equal((await handleAssessment(request({...body,include_source_text:true}),dependencies)).status,409);
});
test('feature gate fails closed before authentication or spending',async()=>{
  delete process.env.POLICYCHECK_AGENT_API_ENABLED;
  assert.equal((await handleAssessment(request(),dependencies)).status,503);assert.deepEqual(calls,[]);
});
test('body size is checked on streamed bytes even without Content-Length',async()=>{
  await assert.rejects(boundedBody(request('x'.repeat(5000)),1024),e=>e.code==='body_too_large');
});
