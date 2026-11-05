import './imports.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPublicKey,randomBytes,verify} from 'node:crypto';
import {normalizeExtraction,isBillableAnalysis} from '../../src/lib/deepPolicyAnalyzer.ts';
import {normalizeSourceText,textHash,locateEvidence,numericQuoteSupports} from '../../src/lib/evidence.ts';
import {signedResult} from '../../src/lib/assessment.ts';
import {canonicalJson,getJwks} from '../../src/lib/signing.ts';
const quote='Items may be returned within 30 days of delivery.';
const source={source:{id:'s1',category:'return_policy'},text:quote};
function extraction(facts,evidence,category='returns',sources=[source]) { return normalizeExtraction({policies:{[category]:{facts,evidence}}},sources); }
const cited=q=>({source_id:'s1',quote:q});

test('evidence can be independently checked against normalized text and hash',()=>{
  const text='Policy 🛍️\n\n'+quote.replaceAll(' ','  ');
  const e=locateEvidence('s1',quote,text), normalized=normalizeSourceText(text);
  assert.equal(normalized.slice(e.start_char,e.end_char),quote);
  assert.equal(e.analyzed_text_hash,textHash(normalized));assert.equal(e.quote_hash,textHash(quote));
  assert.equal(e.validation,'exact_substring');
});
test('mismatched numeric value is discarded even when the quote exists',()=>{
  const r=extraction({window_days:90},{window_days:cited(quote)});
  assert.equal(r.rejected,1);assert.deepEqual(r.policies,{});
});
test('numeric checks allow explicit units and conservative conversions',()=>{
  assert.equal(numericQuoteSupports('duration_months',24,'The warranty lasts for 2 years.'),true);
  assert.equal(numericQuoteSupports('window_days',14,'Return within 2 weeks of delivery.'),true);
  assert.equal(numericQuoteSupports('window_days',365,'Return anytime during the warranty.'),false);
});
test('absent facts are null and are never defaulted to false',()=>{
  const r=extraction({window_days:30},{window_days:cited(quote)}).policies.returns;
  assert.equal(r.facts.restocking_fee,null);assert.equal(r.field_status.restocking_fee,'not_extracted');
  assert.equal(r.field_status.window_days,'supported');
});
test('a real quote assigned to a nonexistent source is rejected',()=>{
  const r=extraction({window_days:30},{window_days:{source_id:'fake',quote}});
  assert.equal(r.rejected,1);assert.deepEqual(r.policies,{});
});
test('schema violations and missing evidence cannot become billable facts',()=>{
  for (const value of [-1,30.5,'30',Infinity]) {
    const r=extraction({window_days:value},{window_days:cited(quote)});
    assert.deepEqual(r.policies,{});assert.equal(r.rejected,1);
  }
  const r=extraction({window_days:30},{});
  assert.equal(isBillableAnalysis({...r,analysis_status:'complete'}),false);
});
test('contradictory shipping range is discarded',()=>{
  const text='Shipping takes between 2 and 5 days.';
  const r=extraction({estimated_days_min:5,estimated_days_max:2},{estimated_days_min:cited(text),estimated_days_max:cited(text)},'shipping',[{...source,text}]);
  assert.equal(r.rejected,2);assert.deepEqual(r.policies,{});
});
test('contradictory no-fee and positive fee values are discarded',()=>{
  const text='No restocking fee. A 15 percent restocking fee applies to selected items.';
  const r=extraction({restocking_fee:false,restocking_fee_percent:15},{restocking_fee:cited(text),restocking_fee_percent:cited(text)},'returns',[{...source,text}]);
  assert.equal(r.rejected,2);assert.deepEqual(r.policies,{});
});
test('percentages above 100 and malformed currencies are rejected',()=>{
  const text='The restocking fee is 150 percent, payable in AUD.';
  const r=extraction({restocking_fee_percent:150,restocking_fee_currency:'dollars'},{restocking_fee_percent:cited(text),restocking_fee_currency:cited(text)},'returns',[{...source,text}]);
  assert.equal(r.rejected,2);assert.deepEqual(r.policies,{});
});
test('duplicate clauses are collapsed; unknown clause identifiers are rejected',()=>{
  const text='All opened items are final sale.';
  const c={id:'final_sale',evidence:cited(text)};
  const r=normalizeExtraction({clauses:[c,c,{...c,id:'buy_now'}]},[{...source,text}]);
  assert.equal(r.clauses.length,1);assert.equal(r.rejected,1);
});
test('billing and evidence are bound to the signed envelope',()=>{
  process.env.POLICYCHECK_SIGNING_KEY=randomBytes(32).toString('hex');
  const extracted=extraction({window_days:30},{window_days:cited(quote)});
  const result={seller_url:'https://example.com',...extracted,positives:[],summary:'One fact',analysis_status:'complete',analysis_method:'llm_evidence_checked',confidence:'medium',input_mode:'text',fetch_method:'client_provided',sources:[],coverage:{attempted:1,retrieved:1,analyzed:1},limitations:[]};
  const signed=signedResult(result,{billing:{account_id:'acct_test',request_fingerprint:'abc',amount_micro_usd:30000,currency:'USD'}});
  const key=createPublicKey({key:getJwks().keys[0],format:'jwk'});
  const valid=data=>verify(null,Buffer.from(canonicalJson(data)),key,Buffer.from(signed.signature,'base64url'));
  assert.equal(valid(signed.signed_assessment),true);
  const changed=structuredClone(signed.signed_assessment);changed.billing.amount_micro_usd=1;assert.equal(valid(changed),false);
  const quoteChange=structuredClone(signed.signed_assessment);quoteChange.policies.returns.evidence.window_days.start_char=99;assert.equal(valid(quoteChange),false);
});
