---
name: policycheck
description: Retrieve independent seller policy facts and evidence before an agent-assisted purchase.
---

# PolicyCheck

Use when a buyer asks about returns, shipping, warranty terms or seller policy clauses.
PolicyCheck supplies facts; apply the buyer's requirements yourself. Do not interpret a
signature or the absence of detected clauses as an endorsement of a merchant.

## Tools

Install `policycheck-mcp@1.0.3` in an MCP client using stdio (`npx -y policycheck-mcp@1.0.3`).
- `check_seller_policies({seller_url})`: discover common policy pages.
- `analyze_seller({url})`: fetch exactly one policy page.
- `check_policy_text({text})`: extract from supplied text; embedded URLs are not followed.

## HTTP

POST https://policycheck.tools/api/v1/signed-assessment with JSON containing
`seller_url`, `url`, or `policy_text` (50–100,000 characters). Optional `agent_id`
and `transaction_ref` are bound into the signed envelope. A URL supplied alongside
text identifies the claimed seller only; it does not verify the text's origin.

## Interpret the result

Read `signed_assessment`. Its `policies` contain typed facts and evidence quotes;
`clauses` contain source-aware boilerplate flags. `sources` record retrieval times,
content hashes, truncation, and whether content was fetched or supplied.

Check `analysis_status`: `no_content`, `no_facts`, and `extraction_failed` provide
no usable conclusions. `partial` means there are coverage or extraction gaps.
Never treat a missing policy or null fact as proof that a restriction does not exist.
Excerpts match the analyzed source text; extraction is still model-assisted and can err.

Verify Ed25519 using the trusted public keys at
https://policycheck.tools/.well-known/jwks.json and recursively key-sorted JSON
with no whitespace. The signature covers `signed_assessment`, not duplicated
convenience fields outside it. Check seller, timestamp, expiry and transaction
context. Alternatively POST `{signed_assessment, signature}` to
https://policycheck.tools/api/v1/verify. `signature_valid` reports authenticity;
`fresh` reports current eligibility; legacy `valid` requires both.

## Paid calls

POST https://policycheck.tools/api/x402/analyze with the same input. Use an x402 v2
client to handle PAYMENT-REQUIRED, PAYMENT-SIGNATURE and PAYMENT-RESPONSE.
Honor the live advertised price. Successful partial results are billable and disclose
limitations. No settlement occurs for no_content, no_facts or extraction_failed.
