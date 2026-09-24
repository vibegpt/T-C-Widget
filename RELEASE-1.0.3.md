# PolicyCheck 1.0.3 stabilization

This release makes the buyer-side facts contract consistent across REST, A2A, MCP and x402. It preserves caller judgment and independent retrieval.

## Changes and migration

- MCP advertises `check_seller_policies`; `quick_risk_check` remains a hidden callable alias. Existing `analyze_seller` and `check_policy_text` names remain.
- `seller_url` discovers common paths; `url` fetches one page. Supplied text containing hyperlinks remains text. Discovery is bounded and incomplete coverage is disclosed.
- Non-null facts require a matching source excerpt. Return fees and warranty duration are represented explicitly. Unavailable extraction has no scoring fallback. Standard boilerplate classification depends on the source category.
- API responses include an Ed25519-signed v2.1 envelope binding facts, provenance, limitations and caller context. The existing seed format is preserved. Verification distinguishes signature validity from freshness. A genuine expired assessment remains authentic but is not current.
- `no_content`, `no_facts` and `extraction_failed` never settle x402 payment. A partial analysis with supported facts is billable; clients must read limitations. Signing succeeds before settlement. CDP settlement receives the resource metadata used for discovery.
- All analysis transports await their audit write and disclose failure. Audit retrieval rejects anonymous/shared keys. Metadata advertises deployed transports and agent-registration has an explicit route/rewrite.
- Homepage and active API documentation no longer turn returned facts into grades or scores. Legacy `/api/chatgpt/analyze` and `/api/chatgpt/analyze-url` now use the shared facts response; consumers expecting the old score schema must migrate.
- Clause registry v2.1 uses `standard_boilerplate_in` to describe eligible source categories, replacing unconditional registry flags. Individual extracted clauses still expose `is_standard_boilerplate`.

## Release checks

`npm run test:release` covers exact-page routing, raw text with links, unsupported evidence, source-aware boilerplate, failures, truncation, signatures/tampering/expiry, awaited audits, MCP compatibility, SSRF address filtering and payment settlement gating. External SDKs/services are mocked in that suite. CI additionally installs locked dependencies, checks release TypeScript, builds the site and packs the MCP package. Passing these checks is not evidence of live payment or Bazaar indexing.

## Production verification

1. Preserve the signing seed; configure OpenAI, Redis, CDP facilitator credentials and recipient address in Vercel. Confirm all release CI gates pass and deploy the reviewed commit.
2. Run `node scripts/release-smoke.mjs https://policycheck.tools` for public metadata and an unpaid 402 challenge. This script never signs or settles a payment.
3. Validate the deployed resource with CDP's x402 validation endpoint, using the canonical `/api/x402/analyze` resource and POST method. Confirm validation and simulation acceptance. Capture returned diagnostic errors before changing metadata again.
4. Use a funded x402 client for one explicitly reviewed real request. Verify the 402 challenge, receipt, returned signature, audit status, canonical resource metadata, and subsequent Bazaar search indexing. A successful validation alone does not prove indexing; a listing position is not a ranking claim.
5. In `policycheck-mcp`, run `npm ci --ignore-scripts`, `npm pack --ignore-scripts`, review the tarball, then `npm publish --access public` with the npm owner's authorized credentials. Confirm registry version 1.0.3 before announcing availability.

No npm publication, deployed endpoint health, CDP settlement or Bazaar indexing should be claimed solely from a source commit. Retries following an uncertain network failure can create another paid request; clients should reconcile the payment receipt before retrying. This release does not introduce an application-level idempotency store.
