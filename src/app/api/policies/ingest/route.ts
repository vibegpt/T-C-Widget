import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { fetchAndExtract } from "@/lib/extractHtml";

export const runtime = "nodejs"; // jsdom needs Node, not Edge

type Body = {
  customer_id: string;              // UUID of tenant
  url: string;                      // source URL to ingest
  title?: string;                   // optional override ("Terms of Service")
  type?: "terms" | "privacy" | "refund" | "other";
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    if (!body?.customer_id || !body?.url) {
      return NextResponse.json(
        { error: "customer_id and url are required" },
        { status: 400 }
      );
    }

    const type = body.type ?? "terms";

    // 1) Ensure a policy row exists (by (customer_id, url))
    const { data: existingPolicy } = await supabaseAdmin
      .from("policies")
      .select("id")
      .eq("customer_id", body.customer_id)
      .eq("url", body.url)
      .maybeSingle();

    let policyId = existingPolicy?.id;

    if (!policyId) {
      // create policy
      const { data: newPol, error: insErr } = await supabaseAdmin
        .from("policies")
        .insert([
          {
            customer_id: body.customer_id,
            url: body.url,
            title: body.title ?? "Terms",
            type
          }
        ])
        .select("id")
        .single();

      if (insErr || !newPol) {
        return NextResponse.json(
          { error: insErr?.message ?? "Failed to create policy" },
          { status: 500 }
        );
      }
      policyId = newPol.id;
    }

    // 2) Fetch + extract text + content hash
    const extracted = await fetchAndExtract(body.url);
    const content_hash = extracted.content_hash;

    // 3) Insert version if hash is new (unique(policy_id, content_hash))
    const { data: ver, error: verErr } = await supabaseAdmin
      .from("policy_versions")
      .insert([
        {
          policy_id: policyId,
          raw_text: extracted.text,
          content_hash
        }
      ])
      .select("id")
      .single();

    if (verErr?.code === "23505") {
      // duplicate hash → find the existing version
      const { data: existingVer, error: findErr } = await supabaseAdmin
        .from("policy_versions")
        .select("id")
        .eq("policy_id", policyId)
        .eq("content_hash", content_hash)
        .single();

      if (findErr || !existingVer) {
        return NextResponse.json(
          { error: "Version already exists but could not be fetched" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          policy_id: policyId,
          policy_version_id: existingVer.id,
          content_hash,
          approx_length: extracted.approx_length,
          existed: true
        },
        { status: 200 }
      );
    }

    if (verErr || !ver) {
      return NextResponse.json(
        { error: verErr?.message ?? "Failed to create version" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        policy_id: policyId,
        policy_version_id: ver.id,
        content_hash,
        approx_length: extracted.approx_length,
        existed: false
      },
      { status: 201 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

export function OPTIONS() {
  const res = new Response(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}