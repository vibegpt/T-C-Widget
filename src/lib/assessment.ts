import { randomUUID } from 'node:crypto';
import { deepAnalyze, type DeepAnalysisResult } from './deepPolicyAnalyzer';
import { parsePolicyInput } from './policy-input';
import { signPayload } from './signing';
import { writeAuditRecord, hashApiKey, storeAssessmentPayload } from './audit';

export const API_HEADERS = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization, X-API-Key, PAYMENT-SIGNATURE, X-PAYMENT','Access-Control-Expose-Headers':'PAYMENT-REQUIRED, PAYMENT-RESPONSE, EXTENSION-RESPONSES'};
export type AssessmentContext={apiKey?:string;agentId?:string|null;transactionRef?:string|null;channel?:string;event?:'check'|'signed_assessment'};
export function requestContext(req: {headers: Headers}, body: Record<string,unknown>, channel: string): AssessmentContext {
  return {apiKey:req.headers.get('x-api-key') || 'anonymous',agentId:typeof body.agent_id==='string'?body.agent_id.slice(0,256):null,transactionRef:typeof body.transaction_ref==='string'?body.transaction_ref.slice(0,256):null,channel};
}
export async function analyzeInput(body: unknown) {
  const input=parsePolicyInput(body);
  return deepAnalyze(input.sellerUrl,input.policyText,{mode:input.mode});
}
export function signedResult(result: DeepAnalysisResult, context: AssessmentContext={}) {
  let domain:string|null=null;
  try { domain=new URL(result.seller_url).hostname; } catch { /* raw text has no seller */ }
  const timestamp=new Date().toISOString();
  const policy_source=result.fetch_method==='client_provided'?'caller_supplied':'fetched';
  const envelope={
    version:'2.2',provider:'policycheck.tools',assessment_id:randomUUID(),timestamp,
    expires_at:new Date(Date.now()+5*60_000).toISOString(),
    seller:{domain,url:domain?result.seller_url:null},agent_id:context.agentId ?? null,transaction_ref:context.transactionRef ?? null,
    policy_source,
    flags:result.clauses.map(c=>c.id),clauses_summary:result.clauses.reduce<Record<string,number>>((a,c)=>{a[c.category]=(a[c.category]||0)+1;return a;},{}),
    policies:result.policies,clauses:result.clauses,positives:result.positives,summary:result.summary,
    analysis_status:result.analysis_status,analysis_method:result.analysis_method,confidence:result.confidence,
    input_mode:result.input_mode,fetch_method:result.fetch_method,sources:result.sources,coverage:result.coverage,limitations:result.limitations,
  };
  return {...result,flags:envelope.flags,signed_assessment:envelope,...signPayload(envelope),verification_url:'https://policycheck.tools/api/v1/verify',jwks_url:'https://policycheck.tools/.well-known/jwks.json'};
}

const COMPACT_POLICY_KEYS = ['returns','shipping','legal','pricing','privacy','warranty'] as const;

export function compactResult(full: ReturnType<typeof signedResult>) {
  const sa=full.signed_assessment;
  // Build compact envelope — omit jwks_url and verification_url (static, documented, budget)
  const compact: Record<string,unknown>={
    version:'2.2', provider:'policycheck.tools', assessment_id:sa.assessment_id, seller:sa.seller.domain,
    policy_source:sa.policy_source, status:full.analysis_status, confidence:full.confidence,
  };
  // Policy facts: strip nulls, omit empty categories
  for (const cat of COMPACT_POLICY_KEYS) {
    const pol=full.policies[cat];
    if (!pol) continue;
    const nonNull: Record<string,unknown>={};
    for (const [k,v] of Object.entries(pol.facts as Record<string,unknown>)) { if (v!==null) nonNull[k]=v; }
    if (Object.keys(nonNull).length) compact[cat]=nonNull;
  }
  // notable / boilerplate from merged clauses array (LLM + derived)
  const notable=full.clauses.filter(c=>!c.is_standard_boilerplate).map(c=>c.id);
  const boilerplate=full.clauses.filter(c=>c.is_standard_boilerplate).map(c=>c.id);
  if (notable.length) compact.notable=notable;
  if (boilerplate.length) compact.boilerplate=boilerplate;
  compact.expires_at=sa.expires_at;
  compact.full_record=`https://policycheck.tools/api/v1/assessments/${sa.assessment_id}`;
  const {signature,signed_payload_hash}=signPayload(compact);
  return {signed_assessment:compact, signature, signed_payload_hash, audit_recorded:false as boolean};
}
export async function recordAssessment(result: ReturnType<typeof signedResult>, context: AssessmentContext={}, latencyMs=0) {
  const id=result.signed_assessment.assessment_id;
  const [audit_recorded]=await Promise.all([
    writeAuditRecord({api_key_hash:hashApiKey(context.apiKey || 'anonymous'),event:context.event || 'signed_assessment',seller_domain:result.signed_assessment.seller.domain,agent_id:context.agentId ?? null,transaction_ref:context.transactionRef ?? null,analysis_status:result.analysis_status,confidence:result.confidence,flags:result.flags,clause_count:result.clauses.length,non_boilerplate_count:result.clauses.filter(c=>!c.is_standard_boilerplate).length,signed:true,verified:null,assessment_id:id,ip:null,channel:context.channel || 'rest',latency_ms:latencyMs}),
    storeAssessmentPayload(id, result),
  ]);
  return audit_recorded;
}

export function formatResponse(full: ReturnType<typeof signedResult>, audit_recorded: boolean, format: 'full' | 'compact') {
  if (format==='compact') {
    const compact=compactResult(full);
    return {...compact, audit_recorded};
  }
  return {...full, audit_recorded};
}
