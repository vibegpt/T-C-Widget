import { NextRequest,NextResponse } from 'next/server';
import { checkAssessment } from '@/lib/signing';
import { writeAuditRecord,hashApiKey } from '@/lib/audit';
import { API_HEADERS } from '@/lib/assessment';
export const runtime='nodejs';
export async function OPTIONS(){return new NextResponse(null,{status:204,headers:API_HEADERS});}
export async function POST(req:NextRequest){
  try {
    const body=await req.json();const assessment=body.signed_assessment || body.tap_seller_trust;
    if(!assessment || typeof body.signature!=='string')return NextResponse.json({valid:false,signature_valid:false,fresh:false,reason:'Missing assessment or signature'},{status:400,headers:API_HEADERS});
    const status=checkAssessment(assessment,body.signature);
    // Never store attacker-controlled contents from invalid envelopes in the audit log.
    if(status.signature_valid)await writeAuditRecord({api_key_hash:hashApiKey(req.headers.get('x-api-key')||'anonymous'),event:'verify',seller_domain:assessment.seller?.domain??null,agent_id:assessment.agent_id??null,transaction_ref:assessment.transaction_ref??null,analysis_status:assessment.analysis_status??null,confidence:assessment.confidence??null,flags:assessment.flags??[],clause_count:assessment.clauses?.length??0,non_boilerplate_count:assessment.clauses?.filter((c:{is_standard_boilerplate:boolean})=>!c.is_standard_boilerplate).length??0,signed:true,verified:status.valid,assessment_id:assessment.assessment_id??null,ip:null,channel:'verify'});
    return NextResponse.json({...status,...(status.signature_valid?{assessment_id:assessment.assessment_id,seller_domain:assessment.seller?.domain,expires_at:assessment.expires_at}:{}),verified_at:new Date().toISOString()},{headers:API_HEADERS});
  } catch {return NextResponse.json({valid:false,signature_valid:false,fresh:false,reason:'Invalid verification request'},{status:400,headers:API_HEADERS});}
}
