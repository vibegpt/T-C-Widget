import { NextRequest, NextResponse } from 'next/server';
import { analyzeInput,signedResult,recordAssessment,requestContext,API_HEADERS } from '@/lib/assessment';
import { InputError, inputFromMessage } from '@/lib/policy-input';
import { randomUUID } from 'node:crypto';
export const runtime='nodejs';
export const maxDuration=60;
function error(id:unknown,code:number,message:string) {return NextResponse.json({jsonrpc:'2.0',id:id??null,error:{code,message}},{headers:API_HEADERS});}
export async function POST(req:NextRequest) {
  let id:unknown=null;const start=Date.now();
  try {
    const body=await req.json(); id=body.id??null;
    if(body.jsonrpc!=='2.0' || typeof body.method!=='string')return error(id,-32600,'Invalid JSON-RPC request');
    if(body.method!=='message/send')return error(id,-32601,'Only message/send is supported; tasks complete synchronously');
    const input=inputFromMessage(body.params?.message);
    const context=requestContext(req,input,'a2a');
    const result=signedResult(await analyzeInput(input),context);
    const audit_recorded=await recordAssessment(result,context,Date.now()-start);
    return NextResponse.json({jsonrpc:'2.0',id,result:{id:randomUUID(),contextId:body.params?.message?.contextId || randomUUID(),status:{state:'completed',message:{role:'agent',messageId:randomUUID(),parts:[{kind:'text',text:result.summary}]}},artifacts:[{artifactId:randomUUID(),name:'policy_analysis',parts:[{kind:'data',data:{...result,audit_recorded}},{kind:'text',text:result.summary}]}]}},{headers:API_HEADERS});
  } catch(err) {return error(id,err instanceof SyntaxError?-32700:err instanceof InputError?-32602:-32000,err instanceof InputError?'Invalid input: '+err.message:'Policy analysis unavailable');}
}
export async function GET(){return NextResponse.json({name:'PolicyCheck',agentCard:'https://policycheck.tools/.well-known/agent.json'},{headers:API_HEADERS});}
export async function OPTIONS(){return new NextResponse(null,{status:204,headers:API_HEADERS});}
