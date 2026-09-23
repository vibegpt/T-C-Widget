import {NextResponse} from 'next/server';
import {POLICY_DESCRIPTION,INPUT_SCHEMA,OUTPUT_EXAMPLE} from '@/lib/discovery';
export async function GET(){return NextResponse.json({x402Version:2,resources:[{url:'https://policycheck.tools/api/x402/analyze',method:'POST',description:POLICY_DESCRIPTION,mimeType:'application/json',input:{bodyType:'json',schema:INPUT_SCHEMA},output:{example:OUTPUT_EXAMPLE}}],provider:{name:'PolicyCheck',url:'https://policycheck.tools'}},{headers:{'Cache-Control':'public, max-age=300','Access-Control-Allow-Origin':'*'}});}
