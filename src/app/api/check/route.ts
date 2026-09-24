import { NextRequest, NextResponse } from 'next/server';
import { analyzeInput, signedResult, recordAssessment, requestContext, API_HEADERS } from '@/lib/assessment';
import { InputError } from '@/lib/policy-input';
export const runtime='nodejs';
export const maxDuration=60;
export async function OPTIONS() { return new NextResponse(null,{status:204,headers:API_HEADERS}); }
export async function POST(req:NextRequest) {
  const start=Date.now();
  try {
    const body=await req.json();
    const context=requestContext(req,body,'rest');
    const result=signedResult(await analyzeInput(body),context);
    const audit_recorded=await recordAssessment(result,context,Date.now()-start);
    return NextResponse.json({...result,audit_recorded},{headers:API_HEADERS});
  } catch(err) {
    const badInput=err instanceof InputError || err instanceof SyntaxError;
    return NextResponse.json({error:badInput?(err as Error).message:'Policy analysis unavailable'},{status:badInput?400:503,headers:API_HEADERS});
  }
}
