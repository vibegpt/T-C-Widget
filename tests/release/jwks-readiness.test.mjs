import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
// The public fixture and mock error deliberately resemble sensitive data.
const fixture = 'a1'.repeat(32);
const signingMock = `export function getJwks(){if(globalThis.__jwksThrows)throw Error('${fixture}');return {keys:[{kty:'OKP',crv:'Ed25519',x:'public-fixture'}]};}`;
registerHooks({
  resolve(spec, context, next) {
    if (spec === 'next/server' || spec === '@/lib/signing') return {url:'mock:'+spec,shortCircuit:true};
    return next(spec,context);
  },
  load(url,context,next) {
    if (url === 'mock:next/server') return {format:'module',shortCircuit:true,source:'export const NextResponse={json:(v,o)=>new Response(JSON.stringify(v),o)};'};
    if (url === 'mock:@/lib/signing') return {format:'module',shortCircuit:true,source:signingMock};
    return next(url,context);
  },
});
const { GET } = await import('../../src/app/api/jwks/route.ts');
test('JWKS readiness diagnoses failures without leaking secrets or caching failures', async () => {
  const original=process.env.POLICYCHECK_SIGNING_KEY, legacy=process.env.POLICYCHECK_TAP_SIGNING_KEY;
  try {
    delete process.env.POLICYCHECK_TAP_SIGNING_KEY;
    for(const [seed,throwError,code] of [[undefined,false,'signing_key_missing'],['bad-key',false,'signing_key_malformed'],[fixture,true,'signing_runtime_error'],[fixture+'\n',true,'signing_key_whitespace']]) {
      if(seed===undefined)delete process.env.POLICYCHECK_SIGNING_KEY;else process.env.POLICYCHECK_SIGNING_KEY=seed;
      globalThis.__jwksThrows=throwError;
      const res=await GET(), body=await res.text();
      assert.equal(res.status,503); assert.equal(res.headers.get('cache-control'),'no-store');
      assert.equal(JSON.parse(body).code,code); assert.ok(!body.includes(fixture)); assert.ok(!body.includes('bad-key'));
    }
    process.env.POLICYCHECK_SIGNING_KEY=fixture; globalThis.__jwksThrows=false;
    const res=await GET(); assert.equal(res.status,200); assert.equal((await res.json()).keys[0].x,'public-fixture');
  } finally {
    for(const [key,value] of [['POLICYCHECK_SIGNING_KEY',original],['POLICYCHECK_TAP_SIGNING_KEY',legacy]]) {
      if(value===undefined)delete process.env[key];else process.env[key]=value;
    }
    delete globalThis.__jwksThrows;
  }
});
