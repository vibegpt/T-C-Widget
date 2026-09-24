import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {EventEmitter} from 'node:events';
const state=globalThis.__dnsTest={};
registerHooks({
 resolve(spec,context,next){
  if(spec==='node:dns/promises')return {url:'mock:dns',shortCircuit:true};
  if(spec==='node:https')return {url:'mock:https',shortCircuit:true};
  if(spec==='./policy-input')return next(new URL('../../src/lib/policy-input.ts',import.meta.url).href,context);
  return next(spec,context);
 },
 load(url,context,next){
  if(url==='mock:dns')return {format:'module',shortCircuit:true,source:'export async function lookup(){return globalThis.__dnsTest.addresses;}'};
  if(url==='mock:https')return {format:'module',shortCircuit:true,source:'export const request=(...args)=>globalThis.__dnsTest.request(...args);'};
  return next(url,context);
 }
});
const {fetchPolicyPage}=await import('../../src/lib/policy-analysis.ts');
test('fetch offers all validated addresses to Node connection fallback and rejects mixed private DNS',async()=>{
 state.addresses=[{address:'2606:4700:4700::1111',family:6},{address:'1.1.1.1',family:4}];
 let requests=0;
 state.request=(_url,options,onResponse)=>{
  requests++;
  assert.equal(options.autoSelectFamily,true);
  options.lookup('example.com',{all:true},(err,addresses)=>{
   assert.equal(err,null);assert.deepEqual(addresses,state.addresses);
  });
  const req=new EventEmitter();
  req.end=()=>{
   const res=new EventEmitter();res.statusCode=200;res.headers={'content-type':'text/plain'};
   onResponse(res);res.emit('data',Buffer.from('Returns are accepted within thirty days of delivery. '.repeat(3)));res.emit('end');
  };
  return req;
 };
 const result=await fetchPolicyPage('https://example.com/returns');assert.match(result.text,/Returns/);assert.equal(requests,1);
 state.addresses.push({address:'127.0.0.1',family:4});
 await assert.rejects(fetchPolicyPage('https://example.com/returns'),/Non-public/);assert.equal(requests,1);
});
