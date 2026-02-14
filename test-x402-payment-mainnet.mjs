#!/usr/bin/env node
/**
 * Trigger a MAINNET x402 payment to PolicyCheck on Base.
 * This catalogs PolicyCheck in the x402 Bazaar via the CDP facilitator.
 *
 * Usage:
 *   EVM_PRIVATE_KEY=0x... node test-x402-payment-mainnet.mjs
 */

import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const EVM_PRIVATE_KEY = process.env.EVM_PRIVATE_KEY;
if (!EVM_PRIVATE_KEY) {
  console.error("Set EVM_PRIVATE_KEY env var (e.g. 0xabc123...)");
  process.exit(1);
}

const signer = privateKeyToAccount(EVM_PRIVATE_KEY);
console.log(`Wallet address: ${signer.address}`);

const client = new x402Client();
registerExactEvmScheme(client, { signer });

const fetchWithPayment = wrapFetchWithPayment(fetch, client);

console.log("\nSending MAINNET paid analysis request to PolicyCheck...");
console.log("Endpoint: https://policycheck.tools/api/x402/analyze");
console.log("Price: $0.03 USDC on Base MAINNET");
console.log("This payment will trigger Bazaar cataloging.\n");

try {
  const response = await fetchWithPayment("https://policycheck.tools/api/x402/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "30-day return policy on all items. Free return shipping. Full refund to original payment method within 5 business days. 1-year manufacturer warranty included. Customer service available 24/7. We stand behind every product we sell. If you're not satisfied, contact us and we'll make it right.",
    }),
  });

  console.log(`Response status: ${response.status}`);

  if (response.ok) {
    const data = await response.json();
    console.log("\n=== MAINNET payment successful! ===");

    if (data.payment) {
      console.log("\nPayment details:");
      console.log(`  Settled:     ${data.payment.settled}`);
      console.log(`  Transaction: ${data.payment.transaction}`);
      console.log(`  Network:     ${data.payment.network}`);
      console.log(`  Payer:       ${data.payment.payer}`);
      if (data.payment.transaction) {
        console.log(`  Explorer:    https://basescan.org/tx/${data.payment.transaction}`);
      }
    }

    if (data.analysis) {
      console.log("\nAnalysis result:");
      console.log(`  Risk Level:  ${data.analysis.riskLevel}`);
      console.log(`  Score:       ${data.analysis.buyerProtectionScore}/100`);
      console.log(`  Summary:     ${data.analysis.summary}`);
      if (data.analysis.keyFindings) {
        console.log("\n  Key Findings:");
        data.analysis.keyFindings.forEach((f) => console.log(`    - ${f}`));
      }
    }

    const settlement = response.headers.get("x-payment-response");
    if (settlement) {
      console.log("\nSettlement header:", settlement);
    }

    console.log("\nBazaar cataloging should now be triggered.");
    console.log("Check in ~60s: curl -s 'https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources' | python3 -m json.tool");
  } else {
    const text = await response.text();
    console.error(`\nRequest failed: ${response.status}`);
    console.error(text);
  }
} catch (err) {
  console.error("\nError:", err.message || err);
  if (err.cause) console.error("Cause:", err.cause);
}
