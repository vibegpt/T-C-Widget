import {test, beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createPublicKey,verify,randomBytes} from 'node:crypto';
const root=new URL('../../',import.meta.url);
const state=globalThis.__policyTest={};
const mocks={
  'openai':`export default class OpenAI { chat={completions:{create:async p=>{if(globalThis.__policyTest.llmError)throw new Error('offline');const task=JSON.parse(p.messages[1].content);globalThis.__policyTest.prompt=task;const source=task.sources[0];const raw=globalThis.__policyTest.llmOutput ?? {policies:{returns:{facts:{window_days:30},evidence:{window_days:{source_id:source.source_id,quote:'Items may be returned within 30 days of delivery.'}}}},clauses:[]};return {choices:[{message:{content:JSON.stringify(raw)}}]};}}}; }`,
  '@upstash/redis':`export class Redis {async set(_key,record){globalThis.__policyTest.auditWrites++;globalThis.__policyTest.lastAudit=JSON.parse(record);} async zadd(){} pipeline(){return {hincrby(){},hset(){},async exec(){}}}}`,
  'next/server':`export class NextRequest extends Request {} export class NextResponse extends Response {static json(value,options){return new NextResponse(JSON.stringify(value),{...options,headers:{'content-type':'application/json',...options?.headers}})}}`,
  '@x402/core/server':`export class HTTPFacilitatorClient {} export class x402ResourceServer {registerExtension(){}} export class x402HTTPResourceServer {constructor(server,routes){globalThis.__policyTest.routes=routes;} async initialize(){if(globalThis.__policyTest.initError)throw Error('init failed');} async processHTTPRequest(){return {type:'payment-verified',paymentPayload:{},paymentRequirements:{},declaredExtensions:{bazaar:{info:{}}}};} async processSettlement(payload){globalThis.__policyTest.settles++;globalThis.__policyTest.settlePayload=payload;return {success:true,transaction:'0xtest',network:'eip155:8453',payer:'0xpayer'};}}`,
  '@x402/evm/exact/server':`export function registerExactEvmScheme(){}`,
  '@coinbase/x402':`export function createFacilitatorConfig(){return {url:'https://example.com'}}`,
  '@x402/extensions/bazaar':`export const bazaarResourceServerExtension={}; export function declareDiscoveryExtension(config){return {bazaar:{info:config}};}`,
  '@modelcontextprotocol/sdk/server/index.js':`export class Server {constructor(){globalThis.__policyTest.mcp=this;this.handlers={};}setRequestHandler(schema,fn){this.handlers[schema]=fn;}async connect(){}}`,
  '@modelcontextprotocol/sdk/server/stdio.js':`export class StdioServerTransport {}`,
  '@modelcontextprotocol/sdk/types.js':`export const CallToolRequestSchema='call';export const ListToolsRequestSchema='list';`,
  'policy-fetch-mock':`export async function fetchPolicyPage(url){const s=globalThis.__policyTest;s.fetched.push(url);if(s.fetchError)throw Error('fetch failed');return {text:s.sourceText,url,retrieved_at:'2026-09-23T00:00:00.000Z',content_hash:'sha256:test'};}`,
};
registerHooks({
  resolve(spec,context,next){
    if(spec==='./policy-analysis' && context.parentURL?.endsWith('deepPolicyAnalyzer.ts'))return {url:'mock:policy-fetch-mock',shortCircuit:true};
    if(mocks[spec])return {url:'mock:'+spec,shortCircuit:true};
    if(spec.startsWith('@/'))spec=new URL('src/'+spec.slice(2),root).href;
    if(spec.startsWith('.') || spec.startsWith('file:')){
      const url=new URL(spec,context.parentURL);
      if(!/\.(ts|js|mjs|json)$/.test(url.pathname) && existsSync(fileURLToPath(url)+'.ts'))return next(url.href+'.ts',context);
    }
    return next(spec,context);
  },
  load(url,context,next){if(url.startsWith('mock:'))return {format:'module',source:mocks[url.slice(5)],shortCircuit:true};return next(url,context);},
});
process.env.POLICYCHECK_SIGNING_KEY=randomBytes(32).toString('hex');
process.env.KV_REST_API_URL='https://example.com';process.env.KV_REST_API_TOKEN='test';
process.env.CDP_API_KEY_ID='test';process.env.CDP_API_KEY_SECRET='test';
const input=await import('../../src/lib/policy-input.ts');
const analyzer=await import('../../src/lib/deepPolicyAnalyzer.ts');
const signing=await import('../../src/lib/signing.ts');
const assessment=await import('../../src/lib/assessment.ts');
const a2a=await import('../../src/app/api/a2a/route.ts');
const x402=await import('../../src/app/api/x402/analyze/route.ts');
const rest=await import('../../src/app/api/check/route.ts');
const fetcher=await import('../../src/lib/policy-analysis.ts');
const verifyRoute=await import('../../src/app/api/v1/verify/route.ts');
await import('../../policycheck-mcp/server.js');
const mcp=state.mcp;
const text='Items may be returned within 30 days of delivery. Refunds are sent to the original payment method. Read more at https://example.com/help.';
function request(body){return new Request('https://policycheck.tools/api/test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});}
beforeEach(()=>{Object.assign(state,{fetched:[],sourceText:text,fetchError:false,llmError:false,llmOutput:undefined,settles:0,auditWrites:0});});

test('policy-page URL fetches that page once',async()=>{
 const result=await assessment.analyzeInput({url:'https://example.com/policies/refund-policy'});
 assert.deepEqual(state.fetched,['https://example.com/policies/refund-policy']);assert.equal(result.policies.returns.facts.window_days,30);
});
test('seller discovery uses origin, deduplicates identical pages and reports partial coverage',async()=>{
 const r=await assessment.analyzeInput({seller_url:'https://example.com/products/one'});
 assert.ok(state.fetched.every(u=>!u.includes('/products/')));assert.equal(r.sources.length,1);assert.equal(r.analysis_status,'partial');
});
test('text containing links never becomes a URL command',async()=>{
 const data=input.inputFromMessage({parts:[{kind:'text',text}]});assert.equal(data.policy_text,text);
 const r=await assessment.analyzeInput(data);assert.equal(state.fetched.length,0);assert.equal(r.sources[0].url,null);assert.equal(r.fetch_method,'client_provided');
});
test('input rejects invalid schemes, oversized text, and ambiguous URLs',()=>{
 for(const b of [{url:'file:///etc/passwd'},{url:'https://a.com',seller_url:'https://b.com'},{text:'x'.repeat(100001)},{url:7}])assert.throws(()=>input.parsePolicyInput(b));
});
test('boilerplate classification uses evidence source category',()=>{
 for(const category of ['terms_of_service','return_policy','shipping_policy','unknown']){
  const source={source:{id:'s1',category},text:'Disputes require binding arbitration.'};
  const r=analyzer.normalizeExtraction({clauses:[{id:'binding_arbitration',found_in:'terms_of_service',is_standard_boilerplate:true,evidence:{source_id:'s1',quote:source.text}}]},[source]);
  assert.equal(r.clauses[0].is_standard_boilerplate,category==='terms_of_service');assert.equal(r.clauses[0].found_in,category);
 }
});
test('invented evidence and malformed scalar facts are rejected',()=>{
 const r=analyzer.normalizeExtraction({policies:{returns:{facts:{window_days:'30',restocking_fee:true},evidence:{window_days:{source_id:'s1',quote:text},restocking_fee:{source_id:'s1',quote:'A fee of 90% is required.'}}}}},[{source:{id:'s1'},text}]);
 assert.deepEqual(r.policies,{});assert.equal(r.rejected,2);
});
test('LLM failure yields no judgments or high confidence',async()=>{
 state.llmError=true;const r=await assessment.analyzeInput({text});assert.equal(r.analysis_status,'extraction_failed');assert.equal(r.confidence,'none');assert.deepEqual(r.policies,{});assert.equal(analyzer.isBillableAnalysis(r),false);assert.doesNotMatch(r.summary,/strong buyer|risk|safe to buy/i);
});
test('truncated sources disclose incomplete coverage',async()=>{
 const r=await assessment.analyzeInput({text:text+'x'.repeat(13000)});assert.equal(r.analysis_status,'partial');assert.equal(r.sources[0].truncated,true);
});
test('signed envelope binds provenance, context and facts; public-key verification works',async()=>{
 const r=assessment.signedResult(await assessment.analyzeInput({text,seller_url:'https://example.com'}),{agentId:'agent-1',transactionRef:'order-1'});
 assert.equal(r.signed_assessment.fetch_method,'client_provided');assert.equal(r.signed_assessment.transaction_ref,'order-1');
 const key=createPublicKey({key:signing.getJwks().keys[0],format:'jwk'});
 assert.equal(verify(null,Buffer.from(signing.canonicalJson(r.signed_assessment)),key,Buffer.from(r.signature,'base64url')),true);
 const altered=structuredClone(r.signed_assessment);altered.policies.returns.facts.window_days=90;assert.equal(signing.verifySignature(altered,r.signature),false);
});
test('expired assessment keeps historical signature validity but is not fresh',()=>{
 const a={version:'2.1',provider:'policycheck.tools',timestamp:'2020-01-01T00:00:00.000Z',expires_at:'2020-01-01T00:05:00.000Z'};
 const r=signing.checkAssessment(a,signing.signPayload(a).signature);assert.equal(r.signature_valid,true);assert.equal(r.fresh,false);assert.equal(r.valid,false);
});
test('REST and A2A both return signed facts and await audit recording',async()=>{
 const r=await (await rest.POST(request({text}))).json();assert.equal(signing.verifySignature(r.signed_assessment,r.signature),true);assert.equal(r.audit_recorded,true);assert.equal(state.lastAudit.event,'check');
 const a=await (await a2a.POST(request({jsonrpc:'2.0',id:0,method:'message/send',params:{message:{parts:[{kind:'data',data:{policy_text:text}}]}}}))).json();
 const facts=a.result.artifacts[0].parts[0].data;assert.equal(a.id,0);assert.equal(signing.verifySignature(facts.signed_assessment,facts.signature),true);assert.equal(state.auditWrites,2);assert.equal(state.lastAudit.event,'signed_assessment');
});
test('x402 does not settle failed, empty, or unsupported analyses',async()=>{
 state.fetchError=true;let response=await x402.POST(request({url:'https://example.com/returns'}));assert.equal(response.status,422);assert.equal(state.settles,0);
 state.llmError=true;response=await x402.POST(request({text}));assert.equal(response.status,503);assert.equal(state.settles,0);
 state.llmError=false;state.llmOutput={policies:{},clauses:[]};response=await x402.POST(request({text}));assert.equal(response.status,422);assert.equal(state.settles,0);
});
test('x402 signs before settling, includes discovery resource, and accepts partial billing',async()=>{
 const response=await x402.POST(request({text}));assert.equal(response.status,200);const r=await response.json();assert.equal(state.settles,1);assert.equal(r.payment.settled,true);assert.equal(signing.verifySignature(r.analysis.signed_assessment,r.analysis.signature),true);assert.equal(state.settlePayload.resource.url,'https://policycheck.tools/api/x402/analyze');assert.equal(state.auditWrites,1);
});
test('signing failure cannot charge the buyer',async()=>{
 const seed=process.env.POLICYCHECK_SIGNING_KEY;delete process.env.POLICYCHECK_SIGNING_KEY;
 try{const r=await x402.POST(request({text}));assert.equal(r.status,503);assert.equal(state.settles,0);}finally{process.env.POLICYCHECK_SIGNING_KEY=seed;}
});
test('MCP advertises the new name and sends raw text as structured data',async()=>{
 const list=await mcp.handlers.list();assert.ok(list.tools.some(t=>t.name==='check_seller_policies'));assert.ok(!list.tools.some(t=>t.name==='quick_risk_check'));
 const original=globalThis.fetch;let body;
 globalThis.fetch=async(_u,opts)=>{body=JSON.parse(opts.body);return a2a.POST(request(body));};
 try{
  const r=await mcp.handlers.call({params:{name:'check_policy_text',arguments:{text}}});assert.equal(body.params.message.parts[0].data.policy_text,text);assert.equal(r.isError,false);
  const data=JSON.parse(r.content[0].text);assert.equal(data.success,true);assert.equal(signing.verifySignature(data.signed_assessment,data.signature),true);
  await mcp.handlers.call({params:{name:'quick_risk_check',arguments:{seller_url:'https://example.com'}}});assert.equal(body.params.message.parts[0].data.seller_url,'https://example.com');
 }finally{globalThis.fetch=original;}
});
test('public fetch rejects private IPv4 and IPv6 destinations',()=>{
 for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','::1','::ffff:127.0.0.1','fc00::1'])assert.equal(fetcher.isPublicAddress(ip),false,ip);
 assert.equal(fetcher.isPublicAddress('8.8.8.8'),true);
});
test('verify route rejects a modified envelope',async()=>{
 const signed=assessment.signedResult(await assessment.analyzeInput({text}));signed.signed_assessment.summary='modified';
 const r=await(await verifyRoute.POST(request(signed))).json();assert.equal(r.valid,false);assert.equal(r.signature_valid,false);assert.equal(state.auditWrites,0);
});
