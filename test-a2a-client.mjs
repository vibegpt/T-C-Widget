#!/usr/bin/env node

/**
 * PolicyCheck A2A Test Client
 * Simulates a purchasing agent discovering and calling PolicyCheck.
 * 
 * Usage:
 *   node test-a2a-client.mjs                          # test against localhost
 *   node test-a2a-client.mjs https://some-store.com   # test with a real seller URL
 *   POLICYCHECK_URL=https://legaleasy.tools node test-a2a-client.mjs  # test production
 */

const BASE_URL = process.env.POLICYCHECK_URL || "http://localhost:3000";
const AGENT_CARD_URL = `${BASE_URL}/.well-known/agent.json`;
const A2A_ENDPOINT = `${BASE_URL}/api/a2a`;

async function discoverAgent() {
  console.log("\n═══ STEP 1: Agent Discovery ═══");
  console.log(`Fetching: ${AGENT_CARD_URL}\n`);
  try {
    const res = await fetch(AGENT_CARD_URL);
    const card = await res.json();
    console.log(`  Name:     ${card.name}`);
    console.log(`  Version:  ${card.version}`);
    console.log(`  Protocol: A2A v${card.protocolVersion}`);
    console.log(`  Endpoint: ${card.url}`);
    console.log(`  Skills:   ${card.skills.length}`);
    card.skills.forEach((s) => console.log(`    • ${s.id}`));
    console.log("");
    return card;
  } catch (err) {
    console.error(`❌ Discovery failed: ${err.message}`);
    console.error(`   Is the server running at ${BASE_URL}?\n`);
    process.exit(1);
  }
}

async function sendRequest(id, desc, message) {
  console.log(`─── ${desc} ───`);
  try {
    const res = await fetch(A2A_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id, method: "message/send", params: { message } }),
    });
    const result = await res.json();
    if (result.error) {
      console.log(`  ❌ Error: ${result.error.message}\n`);
      return;
    }
    const task = result.result;
    console.log(`  ✅ Task: ${task.id} (${task.status.state})`);
    if (task.status.message?.parts?.[0]?.text) {
      task.status.message.parts[0].text.split("\n").forEach((l) => console.log(`  │ ${l}`));
    }
    console.log("");
  } catch (err) {
    console.log(`  ❌ ${err.message}\n`);
  }
}

async function main() {
  console.log("\n🛡️  PolicyCheck A2A Test Client\n");
  await discoverAgent();

  console.log("═══ STEP 2: Send Requests ═══\n");
  const url = process.argv[2] || "https://example-store.com";

  await sendRequest("t1", `Natural language quick check (${url})`, {
    role: "user", parts: [{ kind: "text", text: `Quick risk check on ${url}` }],
  });

  await sendRequest("t2", "Structured data input", {
    role: "user", parts: [{ kind: "data", data: { skill: "quick-risk-check", seller_url: url } }],
  });

  await sendRequest("t3", "Raw terms analysis", {
    role: "user", parts: [{ kind: "text", text: "Analyse these terms: All disputes shall be resolved by binding arbitration. You waive the right to participate in class actions. Our total liability shall not exceed $100. We may terminate your account at any time. This agreement automatically renews annually." }],
  });

  await sendRequest("t4", "Error handling (empty)", {
    role: "user", parts: [],
  });

  console.log("═══ ✅ All tests complete ═══\n");
}

main();
