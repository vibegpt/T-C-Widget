import { NextRequest, NextResponse } from "next/server";
import { recordStorageHeartbeat } from "@/lib/audit";

export const runtime = "nodejs";

// Invoked daily by Vercel Cron (vercel.json). Vercel sends CRON_SECRET as a
// Bearer token; without the secret configured the route refuses every call.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const at = await recordStorageHeartbeat();
    return NextResponse.json({ ok: true, at });
  } catch {
    console.error("PolicyCheck KV heartbeat failed");
    return NextResponse.json({ ok: false, code: "storage_heartbeat_failed" }, { status: 503 });
  }
}
