import { analyzeInput, recordAssessment, signedResult } from './assessment';
import { authenticate, digest, finish, idempotencyKey, reserve, ServiceError } from './billing';
import { canonicalJson } from './signing';
import { InputError, parsePolicyInput } from './policy-input';
import { isBillableAnalysis } from './deepPolicyAnalyzer';
import { json, jsonBody, requireEnabled, serviceError } from './service-http';

// Dependencies are explicit so timeout/commit ambiguity and charge ordering can be tested.
const defaults={authenticate,reserve,finish,analyzeInput,signedResult,recordAssessment};
export async function handleAssessment(req: Request, dependencies=defaults) {
  let reservation: Awaited<ReturnType<typeof reserve>>['reservation'];
  try {
    requireEnabled();
    const accountId=await dependencies.authenticate(req);
    const key=idempotencyKey(req), body=await jsonBody(req);
    for (const field of Object.keys(body)) if (!['seller_url','url','policy_text','include_source_text','agent_id','transaction_ref'].includes(field)) throw new ServiceError(400,'invalid_input',`Unknown input field: ${field.slice(0,80)}`);
    if (body.include_source_text!==undefined && typeof body.include_source_text!=='boolean') throw new ServiceError(400,'invalid_input','include_source_text must be boolean.');
    for (const field of ['agent_id','transaction_ref']) if (body[field]!==undefined && (typeof body[field]!=='string' || (body[field] as string).length>256)) throw new ServiceError(400,'invalid_input',`${field} must be a string of at most 256 characters.`);
    if (body.url!==undefined && (body.seller_url!==undefined || body.policy_text!==undefined)) throw new ServiceError(400,'invalid_input','url cannot be combined with seller_url or policy_text.');
    const input=parsePolicyInput(body);
    const fingerprint=digest(canonicalJson({input,include_source_text:body.include_source_text ?? false,agent_id:body.agent_id ?? null,transaction_ref:body.transaction_ref ?? null}));
    const admission=await dependencies.reserve(accountId,key,fingerprint);
    if (admission.replay) return json(admission.replay,200,{'Idempotency-Replayed':'true'});
    reservation=admission.reservation!;
    const start=Date.now();
    const result=await dependencies.analyzeInput(body,{includeSourceText:body.include_source_text===true});
    if (!isBillableAnalysis(result)) {
      await dependencies.finish(reservation,null); reservation=undefined;
      return json({error:{code:result.analysis_status,message:result.summary,retryable:result.analysis_status==='extraction_failed'},analysis:result,billing:{charged:false,amount_micro_usd:0,currency:'USD'}},result.analysis_status==='extraction_failed'?503:422);
    }
    const billing={account_id:accountId,request_fingerprint:fingerprint,amount_micro_usd:reservation.price,currency:'USD' as const};
    const context={agentId:body.agent_id as string|undefined,transactionRef:body.transaction_ref as string|undefined,apiKey:accountId,channel:'prepaid_rest',billing};
    const analysis=dependencies.signedResult(result,context);
    const auditRecorded=await dependencies.recordAssessment(analysis,context,Date.now()-start);
    if (!auditRecorded) throw new ServiceError(503,'audit_unavailable','The assessment could not be recorded. No credit was charged.');
    const response={schema_version:'1.0',analysis,billing:{...billing,charged:true},audit_recorded:true};
    // Store the exact response and debit in the same atomic operation, before returning it.
    await dependencies.finish(reservation,response); reservation=undefined;
    return json(response,200,{'Idempotency-Replayed':'false'});
  } catch (error) {
    if (reservation) {
      // If a commit succeeded but its acknowledgement was lost, release is a no-op.
      try { await dependencies.finish(reservation,null); } catch { /* 90s lease is recovered by the next admission. */ }
    }
    return serviceError(error instanceof InputError?new ServiceError(400,'invalid_input',error.message):error);
  }
}
