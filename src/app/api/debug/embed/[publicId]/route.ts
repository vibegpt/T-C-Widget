import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
export const runtime = "nodejs";

export async function GET(_: Request, ctx: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await ctx.params;

  const embed = await supabaseAdmin.from("embeds").select("*").eq("public_id", publicId).single();
  if (embed.error || !embed.data) {
    return NextResponse.json({ step:"embed", error: embed.error?.message || "not found" }, { status: 404 });
  }

  const policy = await supabaseAdmin.from("policies").select("*").eq("id", embed.data.policy_id).single();
  if (policy.error || !policy.data) {
    return NextResponse.json({ step:"policy", error: policy.error?.message || "not found", embed: embed.data }, { status: 404 });
  }

  const versions = await supabaseAdmin
    .from("policy_versions")
    .select("id,policy_id,created_at")
    .eq("policy_id", embed.data.policy_id)
    .order("created_at",{ascending:false})
    .limit(10);

  let summaries: any = null;
  let clauses: any = null;

  if (policy.data.current_version_id) {
    const summariesResult = await supabaseAdmin
      .from("summaries")
      .select("id,policy_version_id,locale,overall_risk,updated_at")
      .eq("policy_version_id", policy.data.current_version_id);

    const clausesResult = await supabaseAdmin
      .from("clauses")
      .select("tag,risk,locale,substring(plain_english,1,100)")
      .eq("policy_version_id", policy.data.current_version_id)
      .limit(20);

    summaries = summariesResult;
    clauses = clausesResult;
  }

  return NextResponse.json({
    envProject: process.env.NEXT_PUBLIC_SUPABASE_URL,   // confirms project your server is using
    embed: embed.data,
    policy: policy.data,
    versions: versions.data,
    summaries: summaries?.data ?? null,
    clauses: clauses?.data ?? null
  });
}
