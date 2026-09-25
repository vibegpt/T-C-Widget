import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
globalThis.__prepaidMcp={};
const mocks={
  '@modelcontextprotocol/sdk/server/index.js':`export class Server {constructor(){globalThis.__prepaidMcp.server=this;this.handlers={};}setRequestHandler(schema,fn){this.handlers[schema]=fn;}async connect(){}}`,
  '@modelcontextprotocol/sdk/server/stdio.js':`export class StdioServerTransport {}`,
  '@modelcontextprotocol/sdk/types.js':`export const CallToolRequestSchema='call';export const ListToolsRequestSchema='list';`,
};
registerHooks({resolve(spec,context,next){return mocks[spec]?{url:'mock:'+spec,shortCircuit:true}:next(spec,context);},load(url,context,next){return url.startsWith('mock:')?{format:'module',source:mocks[url.slice(5)],shortCircuit:true}:next(url,context);}});
process.env.POLICYCHECK_API_KEY='pc_live_'+'a'.repeat(64);
await import('../../policycheck-mcp/server.js');
const server=globalThis.__prepaidMcp.server;
test('prepaid MCP tools disclose spending and expose retry key input',async()=>{
  const {tools}=await server.handlers.list();
  for(const tool of tools){assert.equal(tool.annotations.readOnlyHint,false);assert.ok(tool.inputSchema.properties.idempotency_key);}
});
test('prepaid MCP forwards a stable key to the paid endpoint and returns billing',async()=>{
  const original=globalThis.fetch;let call;
  globalThis.fetch=async(url,options)=>{call={url,options};return Response.json({analysis:{analysis_status:'complete'},billing:{charged:true}});};
  try {
    const result=await server.handlers.call({params:{name:'check_seller_policies',arguments:{seller_url:'https://example.com',idempotency_key:'stable-request-1',include_source_text:true}}});
    assert.equal(String(call.url),'https://policycheck.tools/api/v1/assessments');assert.equal(call.options.headers['Idempotency-Key'],'stable-request-1');
    assert.equal(call.options.headers['X-API-Key'],process.env.POLICYCHECK_API_KEY);assert.equal(call.options.redirect,'error');
    assert.deepEqual(JSON.parse(call.options.body),{seller_url:'https://example.com',include_source_text:true});
    assert.equal(result.isError,false);assert.equal(JSON.parse(result.content[0].text).billing.charged,true);
  } finally {globalThis.fetch=original;}
});
test('prepaid MCP lost response returns generated idempotency key for recovery',async()=>{
  const original=globalThis.fetch;let key;
  globalThis.fetch=async(_url,options)=>{key=options.headers['Idempotency-Key'];throw Error('network failure');};
  try {
    const result=await server.handlers.call({params:{name:'check_policy_text',arguments:{text:'Policy text example'}}});
    assert.equal(result.isError,true);assert.equal(JSON.parse(result.content[0].text).idempotency_key,key);assert.match(key,/^[a-f0-9-]{36}$/);
  } finally {globalThis.fetch=original;}
});
