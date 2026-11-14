import { NextRequest, NextResponse } from 'next/server';
import { getAssessmentPayload } from '@/lib/audit';
import { API_HEADERS } from '@/lib/assessment';
export const runtime='nodejs';
export async function OPTIONS(){return new NextResponse(null,{status:204,headers:API_HEADERS});}
export async function GET(_req:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const stored=await getAssessmentPayload(id);
  if (!stored) return NextResponse.json({error:'Assessment not found or expired'},{status:404,headers:API_HEADERS});
  const expiresAt=(stored.assessment as Record<string,unknown>)?.signed_assessment as Record<string,unknown>|undefined;
  const expired=typeof expiresAt?.expires_at==='string' && new Date(expiresAt.expires_at)<new Date();
  return NextResponse.json({expired,stored_at:stored.stored_at,assessment:stored.assessment},{headers:API_HEADERS});
}
