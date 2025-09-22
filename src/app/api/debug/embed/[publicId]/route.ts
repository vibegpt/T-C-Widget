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

  // Summaries for current version (any locale), newest first
  const summaries = await supabaseAdmin
    .from("summaries")
    .select("id, overall_risk, grade_level, locale, is_translated, summary_json, created_at")
    .eq("policy_version_id", policy.data.current_version_id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Clauses for current version (any tag/locale), newest-ish first
  const clauses = await supabaseAdmin
    .from("clauses")
    .select("id, tag, risk, locale, plain_english, created_at")
    .eq("policy_version_id", policy.data.current_version_id)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    embed: embed.data ?? null,
    policy: policy.data ?? null,
    versions: versions.data ?? null,
    summaries: summaries.data ?? null,
    clauses: clauses.data ?? null,
  });
}
