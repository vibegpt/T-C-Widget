import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Redis} from '@upstash/redis';
import {reserve} from '../../src/lib/billing.ts';
test('real Upstash SDK JSON deserialization preserves idempotent replays',async()=>{
  const response={analysis:{assessment_id:'original'},billing:{charged:true}};
  const raw=JSON.stringify({state:'complete',fingerprint:'fp',token:'t',price:30000,response:JSON.stringify(response)});
  const db=new Redis({request:async()=>({result:['replay',raw]})});
  assert.deepEqual((await reserve('acct_'+'a'.repeat(32),'request-123','fp',db)).replay,response);
});
