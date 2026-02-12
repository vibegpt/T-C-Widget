import { NextResponse } from "next/server";
import agentCard from "../../../../public/.well-known/agent.json";

/**
 * GET /api/agent-card
 * Serves the PolicyCheck A2A Agent Card (programmatic fallback).
 * Primary location: /.well-known/agent.json (static file)
 */
export async function GET() {
  return NextResponse.json(agentCard, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
