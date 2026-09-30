import {test, beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../../',import.meta.url);
const state=globalThis.__heartbeatTest={};
const mocks={
  '@upstash/redis':`export class Redis {async set(key,value){const s=globalThis.__heartbeatTest;if(s.storageError)throw Error(s.storageError);s.writes.push({key,value});return 'OK';}}`,
  'next/server':`export class NextRequest extends Request {} export class NextResponse extends Response {static json(value,options){return new NextResponse(JSON.stringify(value),{...options,headers:{'content-type':'application/json',...options?.headers}})}}`,
};
registerHooks({
  resolve(spec,context,next){
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
process.env.KV_REST_API_URL='https://example.com';process.env.KV_REST_API_TOKEN='test';
const route=await import('../../src/app/api/cron/kv-heartbeat/route.ts');
const secret='heartbeat-secret-for-tests';
function call(authorization){return route.GET(new Request('https://policycheck.tools/api/cron/kv-heartbeat',{headers:authorization?{authorization}:{}}));}
beforeEach(()=>{Object.assign(state,{writes:[],storageError:null});process.env.CRON_SECRET=secret;});

test('heartbeat refuses every call when CRON_SECRET is not configured',async()=>{
 delete process.env.CRON_SECRET;
 for(const auth of [undefined,'Bearer ','Bearer undefined']){const r=await call(auth);assert.equal(r.status,401);}
 assert.equal(state.writes.length,0);
});
test('heartbeat rejects a missing or wrong bearer token',async()=>{
 for(const auth of [undefined,secret,'Bearer wrong',`bearer ${secret}`]){const r=await call(auth);assert.equal(r.status,401);}
 assert.equal(state.writes.length,0);
});
test('authorized heartbeat writes one timestamp key',async()=>{
 const r=await call(`Bearer ${secret}`);const body=await r.json();
 assert.equal(r.status,200);assert.equal(body.ok,true);
 assert.equal(state.writes.length,1);assert.equal(state.writes[0].key,'storage:heartbeat');assert.equal(state.writes[0].value,body.at);
 assert.ok(!Number.isNaN(Date.parse(body.at)));
});
test('storage failure returns 503 with a safe code and no raw error',async()=>{
 state.storageError='fetch failed: modest-wasp-27957.upstash.io';
 const r=await call(`Bearer ${secret}`);const text=await r.text();
 assert.equal(r.status,503);assert.equal(JSON.parse(text).code,'storage_heartbeat_failed');assert.ok(!text.includes('upstash.io'));
});
