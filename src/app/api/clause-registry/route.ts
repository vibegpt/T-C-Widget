import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const registryPath = path.join(process.cwd(), "public", "clause-registry.json");
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
  return NextResponse.json(registry, {
    headers: {
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}
