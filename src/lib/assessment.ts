import { randomUUID } from 'node:crypto';
import { deepAnalyze, type DeepAnalysisResult } from './deepPolicyAnalyzer';
import { parsePolicyInput } from './policy-input';
import { signPayload } from './signing';
import { writeAuditRecord, hashApiKey } from './audit';

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
  const envelope={
    version:'2.1',provider:'policycheck.tools',assessment_id:randomUUID(),timestamp,
    expires_at:new Date(Date.now()+5*60_000).toISOString(),
    seller:{domain,url:domain?result.seller_url:null},agent_id:context.agentId ?? null,transaction_ref:context.transactionRef ?? null,
    flags:result.clauses.map(c=>c.id),clauses_summary:result.clauses.reduce<Record<string,number>>((a,c)=>{a[c.category]=(a[c.category]||0)+1;return a;},{}),
    policies:result.policies,clauses:result.clauses,positives:result.positives,summary:result.summary,
    analysis_status:result.analysis_status,analysis_method:result.analysis_method,confidence:result.confidence,
    input_mode:result.input_mode,fetch_method:result.fetch_method,sources:result.sources,coverage:result.coverage,limitations:result.limitations,
  };
  return {...result,flags:envelope.flags,signed_assessment:envelope,...signPayload(envelope),verification_url:'https://policycheck.tools/api/v1/verify',jwks_url:'https://policycheck.tools/.well-known/jwks.json'};
}
export async function recordAssessment(result: ReturnType<typeof signedResult>, context: AssessmentContext={}, latencyMs=0) {
  return writeAuditRecord({api_key_hash:hashApiKey(context.apiKey || 'anonymous'),event:context.event || 'signed_assessment',seller_domain:result.signed_assessment.seller.domain,agent_id:context.agentId ?? null,transaction_ref:context.transactionRef ?? null,analysis_status:result.analysis_status,confidence:result.confidence,flags:result.flags,clause_count:result.clauses.length,non_boilerplate_count:result.clauses.filter(c=>!c.is_standard_boilerplate).length,signed:true,verified:null,assessment_id:result.signed_assessment.assessment_id,ip:null,channel:context.channel || 'rest',latency_ms:latencyMs});
}
