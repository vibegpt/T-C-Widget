#!/usr/bin/env node
/**
 * Test x402 payment to PolicyCheck's paid endpoint on Base Sepolia testnet.
 *
 * Usage:
 *   EVM_PRIVATE_KEY=0x... node test-x402-payment.mjs
 *
 * Prerequisites:
 *   - Wallet must have testnet USDC on Base Sepolia (chain 84532)
 *   - Get testnet USDC from https://faucet.circle.com/
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

// Create signer from private key
const signer = privateKeyToAccount(EVM_PRIVATE_KEY);
console.log(`Wallet address: ${signer.address}`);

// Create x402 client and register EVM scheme
const client = new x402Client();
registerExactEvmScheme(client, { signer });

// Wrap fetch with automatic payment handling
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

// Make paid request to PolicyCheck
console.log("\nSending paid analysis request to PolicyCheck...");
console.log("Endpoint: https://policycheck.tools/api/x402/analyze");
console.log("Price: $0.03 USDC on Base Sepolia\n");

try {
  const response = await fetchWithPayment("https://policycheck.tools/api/x402/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "All disputes shall be resolved through binding arbitration. No refunds under any circumstances. We reserve the right to modify terms at any time without notice. Class action lawsuits are waived. Liability shall not exceed $25. Your account may be terminated at any time for any reason. This subscription auto-renews annually.",
    }),
  });

  console.log(`Response status: ${response.status}`);

  if (response.ok) {
    const data = await response.json();
    console.log("\n=== Payment successful! ===");

    if (data.payment) {
      console.log("\nPayment details:");
      console.log(`  Settled:     ${data.payment.settled}`);
      console.log(`  Transaction: ${data.payment.transaction}`);
      console.log(`  Network:     ${data.payment.network}`);
      console.log(`  Payer:       ${data.payment.payer}`);
      if (data.payment.transaction) {
        console.log(`  Explorer:    https://sepolia.basescan.org/tx/${data.payment.transaction}`);
      }
    }

    if (data.analysis) {
      console.log("\nAnalysis result:");
      console.log(`  Risk Level:  ${data.analysis.riskLevel}`);
      console.log(`  Score:       ${data.analysis.buyerProtectionScore}/100`);
      console.log(`  Summary:     ${data.analysis.summary}`);
      if (data.analysis.keyFindings) {
        console.log("\n  Key Findings:");
        data.analysis.keyFindings.forEach((f) => console.log(`    ${f}`));
      }
    }

    // Check settlement header
    const settlement = response.headers.get("x-payment-response");
    if (settlement) {
      console.log("\nSettlement header:", settlement);
    }
  } else {
    const text = await response.text();
    console.error(`\nRequest failed: ${response.status}`);
    console.error(text);
  }
} catch (err) {
  console.error("\nError:", err.message || err);
  if (err.cause) console.error("Cause:", err.cause);
}
