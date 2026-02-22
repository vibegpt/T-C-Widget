import { NextResponse } from "next/server";
import { getJwks } from "@/lib/signing";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getJwks(), {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
