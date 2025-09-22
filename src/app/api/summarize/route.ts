import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { chunkText, buildPrompt, callOpenAIJson, safeParseClauses, aggregatePage } from "@/lib/summarize";

export const runtime = "nodejs";

type Body = {
  policy_version_id: string;
  locale?: "en";
  publish?: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Body;
    if (!body?.policy_version_id) {
      return NextResponse.json({ error: "policy_version_id required" }, { status: 400 });
    }
    const locale = body.locale || "en";

    // 1) Load version
    const { data: version, error: vErr } = await supabaseAdmin
      .from("policy_versions")
      .select("id, policy_id, raw_text")
      .eq("id", body.policy_version_id)
      .single();
    if (vErr || !version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

    // 2) Chunk + summarize
    const chunks = chunkText(version.raw_text);
    if (!chunks.length) return NextResponse.json({ error: "Empty document" }, { status: 400 });

    let clausesAll: ReturnType<typeof safeParseClauses> = [];
    for (const ch of chunks) {
      const messages = buildPrompt(ch);
      const raw = await callOpenAIJson(messages);
      clausesAll = clausesAll.concat(safeParseClauses(raw));
    }
    if (!clausesAll.length) return NextResponse.json({ error: "No clauses produced" }, { status: 422 });

    // 3) Aggregate
    const page = aggregatePage(clausesAll);

    // 4) Upsert summary
    const { data: sumUpsert, error: sErr } = await supabaseAdmin
      .from("summaries")
      .upsert({
        policy_version_id: version.id,
        overall_risk: page.overall_risk,
        grade_level: 9,
        locale,
        is_translated: false,
        summary_json: { highlights: page.highlights, changes: [] }
      }, { onConflict: "policy_version_id,locale" })
      .select("id")
      .single();
    if (sErr || !sumUpsert) return NextResponse.json({ error: sErr?.message ?? "Summary upsert failed" }, { status: 500 });

    // 5) Replace existing clauses (idempotent)
    const { error: delErr } = await supabaseAdmin
      .from("clauses")
      .delete()
      .eq("policy_version_id", version.id)
      .eq("locale", locale);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    const rows = clausesAll.map(c => ({
      policy_version_id: version.id,
      tag: c.tag,
      risk: c.risk,
      text_excerpt: c.text_excerpt ?? null,
      plain_english: c.plain_english,
      rationale: c.rationale,
      locale,
      is_translated: false
    }));
    if (rows.length) {
      const { error: insErr } = await supabaseAdmin.from("clauses").insert(rows);
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    // 6) Optional publish
    if (body.publish) {
      const { error: pub1 } = await supabaseAdmin
        .from("policy_versions")
        .update({ published_at: new Date().toISOString() })
        .eq("id", version.id);
      if (pub1) return NextResponse.json({ error: pub1.message }, { status: 500 });

      const { error: pub2 } = await supabaseAdmin
        .from("policies")
        .update({ current_version_id: version.id })
        .eq("id", version.policy_id);
      if (pub2) return NextResponse.json({ error: pub2.message }, { status: 500 });
    }

    return NextResponse.json({
      summary_id: sumUpsert.id,
      overall_risk: page.overall_risk,
      highlights: page.highlights,
      clauses_inserted: rows.length,
      published: !!body.publish
    }, { status: 200 });

  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}